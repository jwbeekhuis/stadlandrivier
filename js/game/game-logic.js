// Game action handlers (roll, stop, shuffle, save answers)

import { db, doc, updateDoc, getDoc } from '../../firebase-config.js';
import { state } from '../state/core.js';
import { getElements } from '../utils/dom.js';
import { getRandomLetter, getRandomCategories } from '../utils/random.js';
import { showToast } from '../ui/toast.js';
import { t } from '../i18n/translations.js';
import { ROOM_STATUS } from '../constants.js';

/**
 * Handle roll letter button click (host only)
 * Starts the game with a random letter
 */
export async function handleRollClick() {
    if (!state.room.isHost) return;

    const { letterDisplay } = getElements();
    const roomId = state.room.roomId;
    const roomData = state.room.roomData;

    try {
        const newLetter = getRandomLetter();

        // Update local state immediately to prevent showing '?'
        state.game.currentLetter = newLetter;
        letterDisplay.textContent = state.game.currentLetter;

        await updateDoc(doc(db, "rooms", roomId), {
            status: ROOM_STATUS.PLAYING,
            currentLetter: newLetter,
            timerEnd: Date.now() + (state.game.gameDuration * 1000),
            scoresCalculated: false,  // Reset for new round
            lastProcessedCategoryIndex: -1,  // Reset category index for new round
            // Keep existing scores, only reset answers and verifiedResults
            players: roomData.players.map(p => ({ ...p, answers: {}, verifiedResults: {} })),
            lastActivity: Date.now()
        });
    } catch (e) {
        console.error("Error starting game:", e);
        showToast(t('errorGeneric') + ': ' + e.message, 'error', 6000);
    }
}

/**
 * Handle stop button click (host only)
 * Initiates the voting phase
 * @param {Function} initiateVotingPhase - Function to initiate voting
 */
export async function handleStopClick(initiateVotingPhase) {
    if (!state.room.isHost) return;
    initiateVotingPhase();
}

/**
 * Handle shuffle categories button click (host only)
 * Generates new random categories
 */
export async function handleShuffleClick() {
    if (!state.room.isHost) return;

    const roomId = state.room.roomId;

    try {
        const newCats = getRandomCategories();
        await updateDoc(doc(db, "rooms", roomId), {
            categories: newCats,
            lastActivity: Date.now()
        });
    } catch (e) {
        console.error("Error shuffling categories:", e);
        showToast(t('errorGeneric') + ': ' + e.message, 'error', 6000);
    }
}

/**
 * Save the current player's answers to Firebase
 */
export async function saveMyAnswers() {
    const myAnswers = {};
    const currentUser = state.user.currentUser;
    const roomId = state.room.roomId;

    state.game.activeCategories.forEach(cat => {
        const safeId = cat.replace(/[&\s]/g, '-').toLowerCase();
        const input = document.getElementById(`input-${safeId}`);
        if (input) {
            const val = input.value.trim();
            if (val) myAnswers[cat] = val;
        }
    });

    const roomRef = doc(db, "rooms", roomId);
    const freshSnap = await getDoc(roomRef);
    if (!freshSnap.exists()) return;

    const freshPlayers = freshSnap.data().players;
    const myIdx = freshPlayers.findIndex(p => p.uid === currentUser.uid);
    if (myIdx !== -1) {
        freshPlayers[myIdx].answers = myAnswers;
        await updateDoc(roomRef, { players: freshPlayers });
    }
}
