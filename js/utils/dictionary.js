// Dictionary utility for multi-language word verification

import { normalizeAnswer } from './string.js';

// Dictionary configuration per language (v2 = top 200k frequency words)
const DICTIONARY_CONFIG = {
    nl: { file: '/data/dutch-words.json', cacheKey: 'dict-nl-v2', flag: '🇳🇱' },
    en: { file: '/data/english-words.json', cacheKey: 'dict-en-v2', flag: '🇬🇧' },
    de: { file: '/data/german-words.json', cacheKey: 'dict-de-v2', flag: '🇩🇪' },
    fi: { file: '/data/finnish-words.json', cacheKey: 'dict-fi-v2', flag: '🇫🇮' }
};

// Module state - dictionaries per language
const dictionaries = {
    nl: null,
    en: null,
    de: null,
    fi: null
};

// Loading state per language
const loadingState = {
    nl: false,
    en: false,
    de: false,
    fi: false
};

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
 * Load dictionary for a specific language
 * @param {string} lang - Language code (nl, en, de, fi)
 * @returns {Promise<void>}
 */
async function loadDictionaryForLang(lang) {
    const config = DICTIONARY_CONFIG[lang];
    if (!config) {
        console.warn(`Unknown language: ${lang}`);
        return;
    }

    // Early return if already loaded or loading
    if (dictionaries[lang] !== null || loadingState[lang]) {
        return;
    }

    loadingState[lang] = true;

    try {
        // Try to load from IndexedDB cache first
        const cached = await getFromCache(config.cacheKey);

        if (cached && Array.isArray(cached)) {
            dictionaries[lang] = new Set(cached);
            console.log(`[${lang.toUpperCase()}] Dictionary loaded from cache: ${dictionaries[lang].size} words`);
            return;
        }

        // Fetch from server
        console.log(`[${lang.toUpperCase()}] Fetching dictionary from server...`);
        const response = await fetch(config.file);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const words = await response.json();

        if (!Array.isArray(words)) {
            throw new Error('Invalid dictionary format');
        }

        // Save to IndexedDB for next time
        await saveToCache(config.cacheKey, words);

        // Create Set for fast lookup
        dictionaries[lang] = new Set(words);
        console.log(`[${lang.toUpperCase()}] Dictionary loaded from server: ${dictionaries[lang].size} words`);

    } catch (e) {
        console.error(`[${lang.toUpperCase()}] Failed to load dictionary:`, e);
        // Keep dictionary as null to indicate not loaded
    } finally {
        loadingState[lang] = false;
    }
}

/**
 * Load all dictionaries in parallel
 * Non-blocking - call at game start
 * @returns {Promise<void>}
 */
export async function loadDictionary() {
    const languages = Object.keys(DICTIONARY_CONFIG);
    await Promise.all(languages.map(lang => loadDictionaryForLang(lang)));
}

/**
 * Check if a word is in the Dutch dictionary (backwards compatibility)
 * @param {string} word - The word to check
 * @returns {boolean|null} - true if found, false if not found, null if dictionary not loaded
 */
export function isInDictionary(word) {
    if (dictionaries.nl === null) {
        return null;
    }

    const normalized = normalizeAnswer(word);

    if (!normalized) {
        return false;
    }

    return dictionaries.nl.has(normalized);
}

/**
 * Get array of language codes where the word is found
 * @param {string} word - The word to check
 * @returns {string[]} - Array of language codes, e.g. ['nl', 'en']
 */
export function getMatchingLanguages(word) {
    const normalized = normalizeAnswer(word);

    if (!normalized) {
        return [];
    }

    const matches = [];

    for (const [lang, dict] of Object.entries(dictionaries)) {
        if (dict !== null && dict.has(normalized)) {
            matches.push(lang);
        }
    }

    return matches;
}

/**
 * Get flag emojis for languages where the word is found
 * @param {string} word - The word to check
 * @returns {string} - Space-separated flag emojis, e.g. "🇳🇱 🇬🇧" or empty string
 */
export function getMatchingFlags(word) {
    const matchingLangs = getMatchingLanguages(word);

    if (matchingLangs.length === 0) {
        return '';
    }

    return matchingLangs
        .map(lang => DICTIONARY_CONFIG[lang].flag)
        .join(' ');
}

/**
 * Check if any dictionary is loaded
 * @returns {boolean}
 */
export function isDictionaryLoaded() {
    return Object.values(dictionaries).some(dict => dict !== null);
}

/**
 * Check if any dictionary is currently loading
 * @returns {boolean}
 */
export function isDictionaryLoading() {
    return Object.values(loadingState).some(loading => loading);
}

/**
 * Get loading status per language
 * @returns {Object} - Object with loaded word counts per language
 */
export function getDictionaryStatus() {
    const status = {};
    for (const [lang, dict] of Object.entries(dictionaries)) {
        status[lang] = dict ? dict.size : 0;
    }
    return status;
}
