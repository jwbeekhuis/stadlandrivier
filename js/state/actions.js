// State actions and mutations

import { state } from './core.js';

/**
 * Get the entire state object
 * @returns {Object} - The global state
 */
export function getState() {
    return state;
}

/**
 * Update state with partial updates
 * @param {Object} updates - Partial state updates
 */
export function updateState(updates) {
    Object.assign(state, updates);
}

/**
 * Get the current user
 * @returns {Object|null} - Current user object
 */
export function getCurrentUser() {
    return state.user.currentUser;
}

/**
 * Set the current user
 * @param {Object} user - User object
 */
export function setCurrentUser(user) {
    state.user.currentUser = user;
}

/**
 * Get the current language
 * @returns {string} - Current language code ('nl' or 'en')
 */
export function getCurrentLanguage() {
    return state.user.currentLanguage;
}

/**
 * Set the current language
 * @param {string} lang - Language code ('nl' or 'en')
 */
export function setCurrentLanguage(lang) {
    state.user.currentLanguage = lang;
    localStorage.setItem('language', lang);
}

/**
 * Set room data and update derived state (e.g., isHost)
 * @param {Object} data - Room data from Firebase
 */
export function setRoomData(data) {
    state.room.roomData = data;
    if (data && state.user.currentUser) {
        state.room.isHost = data.players?.[0]?.uid === state.user.currentUser.uid;
    }
}

/**
 * Set room ID
 * @param {string} roomId - Room code/ID
 */
export function setRoomId(roomId) {
    state.room.roomId = roomId;
}

/**
 * Clear all timers and intervals
 */
export function clearTimers() {
    if (state.internals.timerInterval) {
        clearInterval(state.internals.timerInterval);
        state.internals.timerInterval = null;
    }
    if (state.internals.voteTimerInterval) {
        clearInterval(state.internals.voteTimerInterval);
        state.internals.voteTimerInterval = null;
    }
    if (state.internals.heartbeatInterval) {
        clearInterval(state.internals.heartbeatInterval);
        state.internals.heartbeatInterval = null;
    }
    if (state.internals.playerListDebounceTimer) {
        clearTimeout(state.internals.playerListDebounceTimer);
        state.internals.playerListDebounceTimer = null;
    }
}

/**
 * Clear all Firebase listeners
 */
export function clearListeners() {
    if (state.internals.roomUnsubscribe) {
        state.internals.roomUnsubscribe();
        state.internals.roomUnsubscribe = null;
    }
    if (state.internals.activeRoomsUnsubscribe) {
        state.internals.activeRoomsUnsubscribe();
        state.internals.activeRoomsUnsubscribe = null;
    }
}

/**
 * Clear all timers and listeners
 */
export function cleanupAll() {
    clearTimers();
    clearListeners();
}

/**
 * Reset game state to initial values
 */
export function resetGameState() {
    state.game.isGameActive = false;
    state.game.currentLetter = '?';
    state.game.activeCategories = [];
    state.game.timeLeft = state.game.gameDuration;
    state.voting.currentCategoryVotes = {};
    state.voting.currentVotingCategory = null;
    state.voting.isRenderingVotes = false;
    state.voting.isSubmittingVotes = false;
    state.voting.isProcessingCategory = false;
    state.voting.isCalculatingScores = false;
    state.ui.resultsShown = false;
}

/**
 * Reset room state (when leaving room)
 */
export function resetRoomState() {
    state.room.roomId = null;
    state.room.roomData = null;
    state.room.isHost = false;
    resetGameState();
    clearTimers();
    clearListeners();
}
