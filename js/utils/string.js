// String utilities

import { icons, DEBUG } from '../constants.js';

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param {string} text - The text to escape
 * @returns {string} - Escaped HTML
 */
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Normalize answer for comparison (lowercase, remove accents, only alphanumerics)
 * @param {string} str - The string to normalize
 * @returns {string} - Normalized string
 */
export function normalizeAnswer(str) {
    if (!str) return "";
    return str
        .toLowerCase()
        .replace(/ß/g, "ss")             // Convert German Eszett to ss
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9]/g, "");      // Keep only simple alphanumerics
}

/**
 * Pluralization helper for grammatically correct text
 * @param {number} count - The number to check
 * @param {string} singular - Singular form (e.g., "seconde", "second")
 * @param {string} plural - Plural form (e.g., "seconden", "seconds")
 * @returns {string} - Grammatically correct form
 */
export function pluralize(count, singular, plural) {
    return count === 1 ? singular : plural;
}

/**
 * Get icon HTML by name
 * @param {string} name - The icon name
 * @returns {string} - SVG HTML for the icon
 */
export function icon(name) {
    return icons[name] || '';
}

/**
 * Debug logging helper
 * @param {...any} args - Arguments to log
 */
export function debugLog(...args) {
    if (DEBUG) console.log('[DEBUG]', ...args);
}
