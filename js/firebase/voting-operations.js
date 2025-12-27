// Voting Firebase operations - batch voting system

import { db, doc, updateDoc, getDoc } from '../../firebase-config.js';
import { state } from '../state/core.js';
import { showToast } from '../ui/toast.js';
import { t } from '../i18n/translations.js';
import { ROOM_STATUS } from '../constants.js';
import { debugLog, normalizeAnswer } from '../utils/string.js';

/**
 * Initiate the voting phase
 * Sets room status to VOTING and triggers processNextCategory
 */
export async function initiateVotingPhase() {
    try {
        await updateDoc(doc(db, "rooms", state.room.roomId), {
            status: ROOM_STATUS.VOTING,
            votingState: null,
            lastActivity: Date.now()
        });
        setTimeout(processNextCategory, 2000);
    } catch (e) {
        console.error("Error initiating voting phase:", e);
        showToast(t('errorGeneric') + ': ' + e.message, 'error', 6000);
    }
}

/**
 * Process next category for batch voting
 * Auto-approves library answers on first call
 * Sets up voting state for each category with unverified answers
 * Triggers score calculation when all categories are processed
 */
export async function processNextCategory() {
    if (!state.room.isHost) return;

    const roomRef = doc(db, "rooms", state.room.roomId);
    const snap = await getDoc(roomRef);
    const data = snap.data();

    // Auto-approve library answers for ALL players first (only once at the start)
    // Check if this is the first call by seeing if any player has verifiedResults
    const isFirstCall = !data.players.some(p => p.verifiedResults && Object.keys(p.verifiedResults).length > 0);

    // Track if we did auto-approvals
    let didAutoApprove = false;

    if (isFirstCall) {
        debugLog('First processNextCategory call - auto-approving library answers');
        const currentHistory = data.gameHistory || [];
        let hasUpdatedPlayers = false;

        // Import library check function
        const { checkLibrary } = await import('./library.js');
        const { markAnswerVerified } = await import('./voting-results.js');

        for (let pIndex = 0; pIndex < data.players.length; pIndex++) {
            const player = data.players[pIndex];
            for (const cat of state.game.activeCategories) {
                const answer = player.answers[cat];
                if (!answer) continue;

                if (player.verifiedResults && player.verifiedResults[cat]) continue;

                // Check if already in history (e.g., from previous voting)
                const existingHistoryEntry = currentHistory.find(entry =>
                    entry.playerName === player.name &&
                    entry.category === cat &&
                    normalizeAnswer(entry.answer) === normalizeAnswer(answer)
                );

                if (existingHistoryEntry) {
                    debugLog(`Skipping auto-approve for ${player.name} - ${cat}: ${answer} (already in history)`);
                    // Mark as verified using the existing history entry's result
                    // This prevents it from being voted on again
                    if (!player.verifiedResults) player.verifiedResults = {};
                    player.verifiedResults[cat] = {
                        isValid: existingHistoryEntry.isValid,
                        answer: answer,
                        points: 0
                    };
                    hasUpdatedPlayers = true;
                    continue;
                }

                const isKnown = await checkLibrary(cat, answer);
                if (isKnown) {
                    await markAnswerVerified(pIndex, cat, answer, true, true);
                    didAutoApprove = true;
                }
            }
        }

        // Save updated players if we marked any as verified from history
        if (hasUpdatedPlayers) {
            debugLog('Updating players with verified results from history');
            await updateDoc(roomRef, {
                players: data.players
            });
        }

        if (didAutoApprove) {
            debugLog('Auto-approve complete, refreshing data for voting phase');
        }
    }

    // Now process categories one at a time for batch voting
    // Always get fresh data to ensure we have latest verifiedResults
    const freshSnap = await getDoc(roomRef);
    const freshData = freshSnap.data();

    // Start from the next category after the last processed one
    // lastProcessedCategoryIndex is set by processCategoryResults after each vote
    // It's reset to -1 at the start of each new round
    const lastProcessed = freshData.lastProcessedCategoryIndex;
    const startIndex = (lastProcessed !== undefined && lastProcessed >= 0)
        ? lastProcessed + 1
        : 0;

    debugLog(`Processing categories starting from index ${startIndex} (lastProcessed: ${lastProcessed})`);

    for (let catIndex = startIndex; catIndex < state.game.activeCategories.length; catIndex++) {
        const cat = state.game.activeCategories[catIndex];

        // Collect all unverified answers for this category
        const answersToVote = [];
        for (let pIndex = 0; pIndex < freshData.players.length; pIndex++) {
            const player = freshData.players[pIndex];
            const answer = player.answers[cat];
            if (!answer) continue; // Skip empty answers

            if (player.verifiedResults && player.verifiedResults[cat]) continue; // Already verified

            answersToVote.push({
                playerIndex: pIndex,
                playerName: player.name,
                playerUid: player.uid,
                answer: answer
            });
        }

        // If there are answers to vote on for this category, set voting state
        if (answersToVote.length > 0) {
            debugLog(`Setting up voting for category ${cat} (index ${catIndex}) with ${answersToVote.length} answers`);
            await updateDoc(roomRef, {
                votingState: {
                    category: cat,
                    categoryIndex: catIndex,
                    answers: answersToVote,
                    votes: {}, // votes[voterUid][targetUid] = true/false
                    allPlayersVoted: {} // allPlayersVoted[uid] = true when done
                },
                currentVotingCategory: cat
            });
            return; // Stop here, wait for votes
        }
    }

    // All categories processed - calculate final scores
    // Wait a moment to ensure all Firebase writes are propagated
    debugLog('All categories processed, waiting before calculating final scores...');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Transaction-based score calculation prevents race conditions
    debugLog('Starting score calculation...');
    // Import calculateFinalScores dynamically to avoid circular dependency
    const { calculateFinalScores } = await import('./scoring.js');
    calculateFinalScores();
}

/**
 * Sync a single vote to Firebase in real-time
 * @param {string} voteKey - Unique key for the vote (playerUid_index)
 * @param {boolean} voteValue - true for approve, false for reject
 */
export async function syncVoteToFirebase(voteKey, voteValue) {
    if (!state.room.roomId || !state.user.currentUser) return;

    try {
        const roomRef = doc(db, "rooms", state.room.roomId);
        const key = `votingState.votes.${state.user.currentUser.uid}.${voteKey}`;
        await updateDoc(roomRef, { [key]: voteValue });
    } catch (e) {
        console.error("Error syncing vote:", e);
    }
}

/**
 * Submit all votes for current category
 * Auto-approves unanswered votes
 * Host checks if all players voted after submission
 */
export async function submitCategoryVotes() {
    if (!state.room.roomData || !state.room.roomData.votingState) return;
    if (state.voting.isSubmittingVotes) {
        debugLog('Already submitting votes, skipping...');
        return;
    }

    state.voting.isSubmittingVotes = true;
    // Don't stop timer yet - let it keep running until next category loads

    try {
        // Auto-approve any unanswered votes
        const votingState = state.room.roomData.votingState;
        const answers = votingState.answers || [];

        answers.forEach((answerData, index) => {
            const voteKey = `${answerData.playerUid}_${index}`;
            if (state.voting.currentCategoryVotes[voteKey] === undefined) {
                state.voting.currentCategoryVotes[voteKey] = true; // Auto-approve
            }
        });

        // Submit all votes to Firebase
        const roomRef = doc(db, "rooms", state.room.roomId);
        const updates = {};
        updates[`votingState.allPlayersVoted.${state.user.currentUser.uid}`] = state.voting.currentCategoryVotes;

        await updateDoc(roomRef, updates);

        // Host checks if all players voted
        if (state.room.isHost) {
            setTimeout(() => checkAllPlayersVoted(), 500);
        }
    } catch (e) {
        console.error("Error submitting votes:", e);
        showToast(t('errorGeneric') + ': ' + e.message, 'error', 6000);
    } finally {
        // Reset flag after 2 seconds
        setTimeout(() => {
            state.voting.isSubmittingVotes = false;
        }, 2000);
    }
}

/**
 * Check if all players have voted (host only)
 * Triggers processCategoryResults when all votes are in
 */
export async function checkAllPlayersVoted() {
    if (!state.room.isHost) return;

    // Read fresh from Firebase to ensure we have the latest votes
    const roomRef = doc(db, "rooms", state.room.roomId);
    const freshSnap = await getDoc(roomRef);
    const freshData = freshSnap.data();

    if (!freshData.votingState) {
        debugLog('checkAllPlayersVoted: No voting state, skipping');
        return;
    }

    const votingState = freshData.votingState;
    const allPlayersVoted = votingState.allPlayersVoted || {};
    const playerCount = freshData.players.length;
    const votedCount = Object.keys(allPlayersVoted).length;

    debugLog(`Voting progress: ${votedCount}/${playerCount} players voted`);

    if (votedCount >= playerCount && !state.voting.isProcessingCategory) {
        // Everyone voted - process results
        debugLog('All players voted, processing category results...');
        const { processCategoryResults } = await import('./voting-results.js');
        await processCategoryResults(votingState);
    }
}
