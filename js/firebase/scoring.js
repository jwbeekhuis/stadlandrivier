// Score calculation with Firebase transactions

import { db, doc, runTransaction } from '../../firebase-config.js';
import { state } from '../state/core.js';
import { normalizeAnswer, debugLog, areWordsFuzzyMatching } from '../utils/fuzzy.js';
import { t } from '../i18n/translations.js';
import { ROOM_STATUS } from '../constants.js';

/**
 * Calculate final scores for all players
 * CRITICAL: Uses Firebase transaction to prevent race conditions
 * COMPLEX FUNCTION - Extracted AS-IS per plan (130+ lines with transaction)
 *
 * Scoring system:
 * - Unique answer (nobody else has it): 20 points
 * - Valid answer but not unique: 10 points
 * - Duplicate answer (fuzzy match): 5 points
 * - Invalid answer: 0 points
 */
export async function calculateFinalScores() {
    // Local flag to prevent multiple calls from same client
    if (state.voting.isCalculatingScores) {
        debugLog("Already calculating scores locally, skipping duplicate call");
        return;
    }

    state.voting.isCalculatingScores = true;
    debugLog("Starting Score Calculation with transaction...");

    const roomRef = doc(db, "rooms", state.room.roomId);

    try {
        // Use transaction to atomically check and set scoresCalculated
        // This prevents multiple clients from calculating scores simultaneously
        await runTransaction(db, async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists()) {
                throw new Error("Room does not exist");
            }

            const roomData = roomDoc.data();

            // Atomic check: if already calculated, abort transaction
            if (roomData.scoresCalculated) {
                debugLog("Scores already calculated (checked in transaction), aborting");
                return; // Transaction will complete without writing
            }

            debugLog("This client won the transaction lock, calculating scores...");

            const players = roomData.players;

            // Calculate round scores (don't reset total scores)
            const roundScores = {};
            players.forEach(p => {
                roundScores[p.uid] = 0;
            });

            // Use categories from roomData, not local activeCategories which may be stale
            const categories = roomData.categories || [];
            for (const cat of categories) {
                debugLog(`Scoring Category: ${cat}`);
                const validAnswers = [];

                // 1. Collect Valid Answers
                players.forEach(p => {
                    if (p.verifiedResults && p.verifiedResults[cat]) {
                        const res = p.verifiedResults[cat];
                        debugLog(`Player ${p.name} - ${cat}: ${res.answer} (Valid: ${res.isValid})`);
                        if (res.isValid) {
                            validAnswers.push({
                                uid: p.uid,
                                answer: normalizeAnswer(res.answer)
                            });
                        }
                    } else {
                        debugLog(`Player ${p.name} - ${cat}: No verified result`);
                    }
                });

                // 2. Assign Points
                players.forEach(p => {
                    const res = p.verifiedResults ? p.verifiedResults[cat] : null;
                    if (res && res.isValid) {
                        const myAns = normalizeAnswer(res.answer);

                        // Fuzzy duplicate check
                        const othersWithSame = validAnswers.filter(a => a.uid !== p.uid && areWordsFuzzyMatching(a.answer, myAns));
                        const othersWithAny = validAnswers.filter(a => a.uid !== p.uid);

                        if (othersWithSame.length > 0) {
                            res.points = 5; // Shared (or close enough!)
                            debugLog(` -> Match found for '${myAns}' with '${othersWithSame[0].answer}'`);
                        } else if (othersWithAny.length === 0) {
                            res.points = 20;
                        } else {
                            res.points = 10;
                        }
                        debugLog(`-> ${p.name} gets ${res.points} pts for '${res.answer}'`);
                        roundScores[p.uid] += res.points;
                    }
                });
            }

            // Add round scores to existing total scores (accumulate across rounds)
            players.forEach(p => {
                const currentScore = p.score || 0;
                const roundScore = roundScores[p.uid];
                p.score = currentScore + roundScore;
            });

            debugLog("Round Scores:", players.map(p => `${p.name}: +${roundScores[p.uid]}`));
            debugLog("Total Scores:", players.map(p => `${p.name}: ${p.score}`));

            // Update history with points information
            const history = roomData.gameHistory || [];
            history.forEach(entry => {
                const player = players.find(p => p.name === entry.playerName);
                if (player && player.verifiedResults && player.verifiedResults[entry.category]) {
                    const result = player.verifiedResults[entry.category];
                    entry.points = result.points || 0;

                    // Add reasoning
                    if (result.points === 20) entry.pointsReason = t('uniqueAnswer');
                    else if (result.points === 10) entry.pointsReason = t('onlyInCategory');
                    else if (result.points === 5) entry.pointsReason = t('sharedAnswer');
                    else entry.pointsReason = t('notApproved');
                }
            });

            // Atomic write: update all data including scoresCalculated flag
            transaction.update(roomRef, {
                players: players,
                status: ROOM_STATUS.FINISHED,
                votingState: null,
                gameHistory: history,
                scoresCalculated: true,
                lastActivity: Date.now()
            });

            debugLog("Score calculation complete (transaction committed)");
        });
    } catch (error) {
        console.error("Error in score calculation transaction:", error);
    } finally {
        // Always reset local flag
        state.voting.isCalculatingScores = false;
    }
}
