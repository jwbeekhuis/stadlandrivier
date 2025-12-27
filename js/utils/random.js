// Random generation utilities

import { allCategories } from '../constants.js';

/**
 * Generate a random room code (4 uppercase alphanumeric characters)
 * @returns {string} - Random room code
 */
export function generateRoomCode() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

/**
 * Get random categories for the game
 * @param {number} count - Number of categories to return (default: 6)
 * @returns {Array<string>} - Array of random categories
 */
export function getRandomCategories(count = 6) {
    return [...allCategories].sort(() => 0.5 - Math.random()).slice(0, count);
}

/**
 * Get a random letter for the game (excluding E, N, Q, X, Y)
 * @returns {string} - Random letter
 */
export function getRandomLetter() {
    const letters = "ABCDEFGHIJKLMNOPRSTUVWZ";
    return letters[Math.floor(Math.random() * letters.length)];
}
