// Scoring helper functions (extracted for testing)

import { normalizeAnswer } from './string.js';
import { areWordsFuzzyMatching } from './fuzzy.js';

/**
 * Calculate points for a player's answer in a category
 * @param {string} playerAnswer - The player's answer
 * @param {Array<{uid: string, answer: string}>} allValidAnswers - All valid answers in this category
 * @param {string} playerUid - The player's UID
 * @returns {number} - Points (0, 5, 10, or 20)
 */
export function calculateAnswerPoints(playerAnswer, allValidAnswers, playerUid) {
    const myAnswer = normalizeAnswer(playerAnswer);

    // Filter out this player's answer from the list
    const othersAnswers = allValidAnswers.filter(a => a.uid !== playerUid);

    // Check if anyone else has the same (or fuzzy matching) answer
    const othersWithSame = othersAnswers.filter(a =>
        areWordsFuzzyMatching(a.answer, myAnswer)
    );

    if (othersWithSame.length > 0) {
        // Someone else has the same answer (fuzzy match)
        return 5;
    } else if (othersAnswers.length === 0) {
        // Only this player has any answer in this category
        return 20;
    } else {
        // Unique answer, but others have different answers
        return 10;
    }
}

/**
 * Calculate points for invalid/rejected answers
 * @returns {number} - Always 0
 */
export function calculateInvalidAnswerPoints() {
    return 0;
}
