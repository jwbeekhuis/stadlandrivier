// Fuzzy matching utilities

import { normalizeAnswer } from './string.js';

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - Edit distance
 */
export function levenshteinDistance(a, b) {
    // Create matrix
    const matrix = [];

    // Increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1  // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Check if two words match with fuzzy tolerance for typos
 * @param {string} word1 - First word
 * @param {string} word2 - Second word
 * @returns {boolean} - True if words match within tolerance
 */
export function areWordsFuzzyMatching(word1, word2) {
    const w1 = normalizeAnswer(word1);
    const w2 = normalizeAnswer(word2);

    if (w1 === w2) return true; // Direct match

    // Don't fuzzy match very short answers (≤ 2 chars) - they must be exact
    // This prevents "1" matching with "3", "a" matching with "b", etc.
    const len = Math.max(w1.length, w2.length);
    if (len <= 2) return false;

    const dist = levenshteinDistance(w1, w2);

    // Rules:
    // Length > 4: Allow 2 typos (for "Amsterdam" vs "Amsterdm")
    // Length 3-4: Allow 1 typo (for "Den" vs "Dan")
    if (len > 4) {
        return dist <= 2;
    } else {
        return dist <= 1;
    }
}
