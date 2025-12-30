// Dictionary utility for Dutch word verification

import { normalizeAnswer } from './string.js';

// Module state
let dutchWords = null;
let isLoading = false;
let loadError = null;

const CACHE_KEY = 'dutch-dictionary-v1';
const DB_NAME = 'StadLandRivierDB';
const STORE_NAME = 'cache';

/**
 * Open IndexedDB connection
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

/**
 * Get value from IndexedDB cache
 * @param {string} key - Cache key
 * @returns {Promise<any>}
 */
async function getFromCache(key) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    } catch (e) {
        console.warn('IndexedDB cache read failed:', e);
        return null;
    }
}

/**
 * Save value to IndexedDB cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 */
async function saveToCache(key, value) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(value, key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (e) {
        console.warn('IndexedDB cache write failed:', e);
    }
}

/**
 * Load the Dutch dictionary
 * Tries to load from IndexedDB cache first, then fetches from server
 * Non-blocking - call at game start
 * @returns {Promise<void>}
 */
export async function loadDictionary() {
    // Early return if already loaded or loading
    if (dutchWords !== null || isLoading) {
        return;
    }

    isLoading = true;
    loadError = null;

    try {
        // Try to load from IndexedDB cache first
        const cached = await getFromCache(CACHE_KEY);

        if (cached && Array.isArray(cached)) {
            dutchWords = new Set(cached);
            console.log(`Dictionary loaded from cache: ${dutchWords.size} words`);
            isLoading = false;
            return;
        }

        // Fetch from server
        console.log('Fetching dictionary from server...');
        const response = await fetch('/data/dutch-words.json');

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const words = await response.json();

        if (!Array.isArray(words)) {
            throw new Error('Invalid dictionary format');
        }

        // Save to IndexedDB for next time
        await saveToCache(CACHE_KEY, words);

        // Create Set for fast lookup
        dutchWords = new Set(words);
        console.log(`Dictionary loaded from server: ${dutchWords.size} words`);

    } catch (e) {
        console.error('Failed to load dictionary:', e);
        loadError = e;
        // Don't set dutchWords - keep it null to indicate not loaded
    } finally {
        isLoading = false;
    }
}

/**
 * Check if a word is in the Dutch dictionary
 * @param {string} word - The word to check
 * @returns {boolean|null} - true if found, false if not found, null if dictionary not loaded
 */
export function isInDictionary(word) {
    if (dutchWords === null) {
        return null;
    }

    const normalized = normalizeAnswer(word);

    if (!normalized) {
        return false;
    }

    return dutchWords.has(normalized);
}

/**
 * Check if the dictionary is loaded
 * @returns {boolean}
 */
export function isDictionaryLoaded() {
    return dutchWords !== null;
}

/**
 * Check if the dictionary is currently loading
 * @returns {boolean}
 */
export function isDictionaryLoading() {
    return isLoading;
}

/**
 * Get the load error if any
 * @returns {Error|null}
 */
export function getDictionaryError() {
    return loadError;
}
