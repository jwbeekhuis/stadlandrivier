// Voting results processing - CRITICAL: Transaction-based score updates

import { db, doc, getDoc, updateDoc, runTransaction, writeBatch } from '../../firebase-config.js';
import { state } from '../state/core.js';
import { normalizeAnswer, debugLog } from '../utils/string.js';

/**
 * Process category voting results and update player scores
 * CRITICAL: Uses Firebase transaction to prevent race conditions
 * COMPLEX FUNCTION - Extracted AS-IS per plan (120+ lines)
 * @param {Object} stateParam - Voting state for the category
 */
export async function processCategoryResults(stateParam) {
    if (!state.room.isHost) return;

    // Local guard to prevent multiple calls from same client
    if (state.voting.isProcessingCategory) {
        debugLog('Already processing category locally, skipping duplicate call');
        return;
    }

    state.voting.isProcessingCategory = true;

    // PERFORMANCE: Collect approved answers for batch library write (outside transaction)
    let approvedAnswers = [];

    try {
        const roomRef = doc(db, "rooms", state.room.roomId);

        // Use transaction to atomically check and process category results
        // This prevents race conditions when multiple clients try to process simultaneously
        await runTransaction(db, async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists()) {
                throw new Error("Room does not exist");
            }

            const freshData = roomDoc.data();
            const votingState = freshData.votingState;

            if (!votingState) {
                debugLog('No voting state found in Firebase, aborting transaction');
                return; // Transaction completes without writing
            }

            // Check if this category was already processed
            const lastProcessedIndex = freshData.lastProcessedCategoryIndex ?? -1;
            if (votingState.categoryIndex <= lastProcessedIndex) {
                debugLog(`Category ${votingState.categoryIndex} already processed (lastProcessed: ${lastProcessedIndex}), aborting`);
                return; // Transaction completes without writing
            }

            debugLog(`Transaction won, processing category results for: ${votingState.category}, index: ${votingState.categoryIndex}`);

            const players = freshData.players;
            const history = freshData.gameHistory || [];
            const answers = votingState.answers || [];

            // Tally votes for each answer
            for (let i = 0; i < answers.length; i++) {
                const answerData = answers[i];
                const voteKey = `${answerData.playerUid}_${i}`;

                // Collect all votes for this answer
                const votesForAnswer = {};
                Object.entries(votingState.allPlayersVoted || {}).forEach(([voterUid, voterVotes]) => {
                    if (voterVotes[voteKey] !== undefined) {
                        votesForAnswer[voterUid] = voterVotes[voteKey];
                    }
                });

                // Calculate verdict (majority wins, ties approve)
                const yesVotes = Object.values(votesForAnswer).filter(v => v === true).length;
                const noVotes = Object.values(votesForAnswer).filter(v => v === false).length;
                const isApproved = yesVotes >= noVotes;

                // Mark answer as verified
                if (!players[answerData.playerIndex].verifiedResults) {
                    players[answerData.playerIndex].verifiedResults = {};
                }
                players[answerData.playerIndex].verifiedResults[votingState.category] = {
                    isValid: isApproved,
                    answer: answerData.answer,
                    points: 0
                };

                // Add to history (only if not already in history from auto-approval)
                const alreadyInHistory = history.some(entry =>
                    entry.playerName === answerData.playerName &&
                    entry.category === votingState.category &&
                    normalizeAnswer(entry.answer) === normalizeAnswer(answerData.answer)
                );

                if (!alreadyInHistory) {
                    debugLog(`Adding voted history entry for ${answerData.playerName} - ${votingState.category}: ${answerData.answer}`);
                    history.push({
                        playerName: answerData.playerName,
                        category: votingState.category,
                        answer: answerData.answer,
                        isValid: isApproved,
                        isAuto: false,
                        votes: votesForAnswer
                    });
                } else {
                    debugLog(`Skipping duplicate history entry for ${answerData.playerName} - ${votingState.category}: ${answerData.answer}`);
                }

                // Collect approved answers for batch write (outside transaction for performance)
                if (isApproved) {
                    approvedAnswers.push({ category: votingState.category, answer: answerData.answer });
                }
            }

            // Update database atomically within transaction
            // Store the categoryIndex before clearing votingState
            const updateData = {
                players: players,
                votingState: null,
                gameHistory: history
            };
            // Only set lastProcessedCategoryIndex if it's a valid number
            if (typeof votingState.categoryIndex === 'number') {
                updateData.lastProcessedCategoryIndex = votingState.categoryIndex;
            }
            transaction.update(roomRef, updateData);
        });

        // PERFORMANCE: Batch write approved answers to library (outside transaction)
        if (approvedAnswers.length > 0) {
            debugLog(`Batch writing ${approvedAnswers.length} approved answers to library`);
            const batch = writeBatch(db);

            approvedAnswers.forEach(({ category, answer }) => {
                const cleanWord = normalizeAnswer(answer);
                const letter = state.game.currentLetter;
                const docId = `${state.room.roomId}_${category}_${letter}_${cleanWord}`.replace(/\s/g, '_');
                const libraryDocRef = doc(db, "library", docId);

                batch.set(libraryDocRef, {
                    roomId: state.room.roomId,
                    category: category,
                    letter: letter,
                    word: answer,
                    cleanWord: cleanWord,
                    approvedAt: Date.now()
                }, { merge: true });
            });

            await batch.commit();
            debugLog(`Batch write complete for ${approvedAnswers.length} library entries`);
        }

        // Continue to next category after transaction completes
        const { processNextCategory } = await import('./voting-operations.js');
        setTimeout(() => processNextCategory(), 1000);
    } catch (error) {
        console.error('Error processing category results:', error);
    } finally {
        // Always reset flag
        state.voting.isProcessingCategory = false;
    }
}

/**
 * Mark a specific answer as verified (used for auto-approvals)
 * @param {number} pIdx - Player index in players array
 * @param {string} cat - Category name
 * @param {string} answer - Player's answer
 * @param {boolean} isValid - Whether answer is valid
 * @param {boolean} isAuto - Whether this is auto-approved (from library)
 */
export async function markAnswerVerified(pIdx, cat, answer, isValid, isAuto) {
    const roomRef = doc(db, "rooms", state.room.roomId);

    const freshSnap = await getDoc(roomRef);
    const players = freshSnap.data().players;
    const history = freshSnap.data().gameHistory || [];

    if (!players[pIdx].verifiedResults) players[pIdx].verifiedResults = {};
    players[pIdx].verifiedResults[cat] = { isValid: isValid, answer: answer, points: 0 };

    // Track history for infographic - only add for auto-approved items
    // Normal voted items will get their entry in processCategoryResults
    if (isAuto) {
        debugLog(`Adding auto-approve history entry for ${players[pIdx].name} - ${cat}: ${answer}`);
        history.push({
            playerName: players[pIdx].name,
            category: cat,
            answer: answer,
            isValid: isValid,
            isAuto: true
            // votes field omitted for auto-approved items (Firebase rejects null values)
        });
    }

    // Add to library if valid
    if (isValid) {
        const { addToLibrary } = await import('./library.js');
        addToLibrary(cat, answer);
    }

    await updateDoc(roomRef, {
        players: players,
        votingState: null,
        gameHistory: history
    });
}
