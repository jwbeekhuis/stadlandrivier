// Word library operations for approved answers

import { db, doc, getDoc, setDoc } from '../../firebase-config.js';
import { state } from '../state/core.js';
import { normalizeAnswer } from '../utils/string.js';

/**
 * Check if a word exists in the approved library
 * @param {string} category - Category name
 * @param {string} word - Word to check
 * @returns {Promise<boolean>} - True if word exists in library
 */
export async function checkLibrary(category, word) {
    const cleanWord = normalizeAnswer(word);
    const letter = state.game.currentLetter;
    const roomId = state.room.roomId;
    const docId = `${roomId}_${category}_${letter}_${cleanWord}`.replace(/\s/g, '_');
    const docRef = doc(db, "library", docId);
    const snap = await getDoc(docRef);
    return snap.exists();
}

/**
 * Add a word to the approved library
 * @param {string} category - Category name
 * @param {string} word - Word to add
 */
export async function addToLibrary(category, word) {
    const cleanWord = normalizeAnswer(word);
    const letter = state.game.currentLetter;
    const roomId = state.room.roomId;
    const docId = `${roomId}_${category}_${letter}_${cleanWord}`.replace(/\s/g, '_');
    await setDoc(doc(db, "library", docId), {
        roomId: roomId,
        category: category,
        letter: letter,
        word: word,
        cleanWord: cleanWord,
        approvedAt: Date.now()
    }, { merge: true });
}
