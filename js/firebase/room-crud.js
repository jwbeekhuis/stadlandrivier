// Room CRUD operations

import { db, doc, setDoc, updateDoc, UserService } from '../../firebase-config.js';
import { state } from '../state/core.js';
import { setRoomId } from '../state/actions.js';
import { getElements } from '../utils/dom.js';
import { generateRoomCode, getRandomCategories } from '../utils/random.js';
import { showToast } from '../ui/toast.js';
import { showModal } from '../ui/modal.js';
import { t } from '../i18n/translations.js';
import { ROOM_STATUS } from '../constants.js';
import { debugLog } from '../utils/string.js';

/**
 * Create a new room
 * Note: This function will be called from event handlers and needs access to:
 * - enterGameUI (from game logic - Level 5-6)
 * - subscribeToRoom (from room-subscription - Level 5)
 * - startHeartbeat (from heartbeat - Level 4)
 * - stopActiveRoomsListener (from room-discovery - Level 5)
 * These will be passed as dependencies to avoid circular imports
 */
export async function createRoom(enterGameUI, subscribeToRoom, startHeartbeat, stopActiveRoomsListener) {
    const { playerNameInput, roomNameInput, gameDurationSlider } = getElements();
    const currentUser = state.user.currentUser;

    const name = playerNameInput.value.trim();
    if (!name) {
        showToast(t('enterName'), 'warning', 4000);
        playerNameInput.focus();
        return;
    }

    // Save name to localStorage as fallback
    localStorage.setItem('playerName', name);
    // Save name to Firestore user profile
    if (currentUser) {
        await UserService.saveProfile(currentUser.uid, { name: name });
    }

    const roomName = roomNameInput.value.trim() || `${name}${t('defaultRoomName')}`;
    const selectedDuration = parseInt(gameDurationSlider.value) || 30;
    const code = generateRoomCode();
    setRoomId(code);
    state.room.isHost = true;

    const roomRef = doc(db, "rooms", code);
    await setDoc(roomRef, {
        roomId: code,
        roomName: roomName,
        hostId: currentUser.uid,
        creatorUid: currentUser.uid,  // Track original creator for dormant room access
        creatorName: name,             // Track creator name for display
        status: ROOM_STATUS.LOBBY,
        currentLetter: '?',
        categories: getRandomCategories(),
        timerEnd: null,
        gameDuration: selectedDuration,
        players: [{ uid: currentUser.uid, name: name, score: 0, answers: {}, isVerified: false, lastSeen: Date.now() }],
        votingState: null,
        createdAt: Date.now(),
        lastActivity: Date.now()      // Track last activity for cleanup
    });

    // Update state
    state.game.gameDuration = selectedDuration;

    enterGameUI(code, stopActiveRoomsListener);
    subscribeToRoom(code);
    startHeartbeat();
}

/**
 * Delete a room (mark as DELETED)
 * @param {string} code - Room code to delete
 */
export async function deleteRoom(code) {
    const confirmed = await showModal(
        t('deleteRoom'),
        t('confirmDeleteRoom'),
        { type: 'danger', confirmText: t('delete'), confirmDanger: true, t }
    );

    if (!confirmed) return;

    try {
        const roomRef = doc(db, "rooms", code);
        await updateDoc(roomRef, {
            status: ROOM_STATUS.DELETED
        });
        showToast(t('roomDeletedSuccess'), 'success', 3000);
    } catch (e) {
        console.error("Error deleting room:", e);
        showToast(t('errorGeneric') + ': ' + e.message, 'error', 6000);
    }
}

/**
 * Reset room to lobby state (keep scores, reset answers)
 */
export async function resetRoomToLobby() {
    const roomId = state.room.roomId;
    const roomData = state.room.roomData;

    // Reset timer and letter
    state.game.timeLeft = state.game.gameDuration;
    state.game.currentLetter = '?';
    document.getElementById('current-letter').textContent = '?';

    // Reset voting state variables
    state.voting.currentCategoryVotes = {};
    state.voting.currentVotingCategory = null;
    state.voting.isRenderingVotes = false;
    state.voting.isSubmittingVotes = false;
    state.voting.isProcessingCategory = false;
    state.voting.isCalculatingScores = false;

    // Keep scores, only reset answers and verifiedResults
    const resetPlayers = roomData.players.map(p => ({
        ...p,
        answers: {},
        verifiedResults: {}
    }));

    // Generate new random categories
    const newCategories = getRandomCategories();

    await updateDoc(doc(db, "rooms", roomId), {
        status: ROOM_STATUS.LOBBY,
        categories: newCategories,
        gameHistory: [],
        votingState: null,
        scoresCalculated: false,
        lastProcessedCategoryIndex: -1,
        players: resetPlayers,
        lastActivity: Date.now()
    });
}
