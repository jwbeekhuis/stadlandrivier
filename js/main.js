// Main entry point for the application

import { auth, signInAnonymously, UserService } from '../firebase-config.js';
import { state } from './state/core.js';
import { cleanupAll } from './state/actions.js';
import { initDOM, getElements } from './utils/dom.js';
import { debugLog } from './utils/string.js';
import { t, setLanguage, updateAllTranslations } from './i18n/translations.js';
import { applyTheme } from './ui/theme.js';
import { showToast } from './ui/toast.js';
import { bindEventListeners } from './events.js';
import { enterGameUI, returnToLobby } from './ui/screens.js';
import { subscribeToRoom } from './firebase/room-subscription.js';
import { subscribeToActiveRooms, stopActiveRoomsListener } from './firebase/room-discovery.js';
import { startHeartbeat } from './firebase/heartbeat.js';
import { resetRoomToLobby } from './firebase/room-crud.js';
import { initiateVotingPhase } from './firebase/voting-operations.js';
import { quickJoinRoom, reopenDormantRoom } from './firebase/room-discovery.js';
import { deleteRoom } from './firebase/room-crud.js';
import { kickPlayer } from './firebase/player-management.js';
import { createUpdateGameState } from './game/game-state-manager.js';
import { startGameLocal, stopGameLocal } from './game/timer-logic.js';
import { showVotingUI } from './game/voting-ui.js';
import { showResults } from './ui/results.js';
import { resetBoard } from './ui/screens.js';
import { handleResetGameClick } from './game/round-flow.js';
import { saveMyAnswers } from './game/game-logic.js';
import { syncVoteToFirebase } from './firebase/voting-operations.js';
import { startVoteTimer } from './game/voting-timer.js';

/**
 * Initialize authentication and load user data
 */
async function initAuth() {
    try {
        const userCred = await signInAnonymously(auth);
        state.user.currentUser = userCred.user;
        debugLog("Logged in as", state.user.currentUser.uid);

        const { playerNameInput } = getElements();

        // Load user data from Firestore (preferences + profile)
        const userData = await UserService.loadUserData(state.user.currentUser.uid);

        // Load language preference (Firestore → localStorage fallback)
        if (userData?.preferences?.language) {
            state.user.currentLanguage = userData.preferences.language;
        } else {
            state.user.currentLanguage = localStorage.getItem('language') || 'nl';
        }

        // Load theme preference (Firestore → localStorage fallback → default dark)
        if (userData?.preferences?.theme) {
            applyTheme(userData.preferences.theme);
        } else {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme) {
                applyTheme(savedTheme);
            }
        }

        // Load player name (Firestore → localStorage fallback)
        if (userData?.profile?.name) {
            playerNameInput.value = userData.profile.name;
        } else {
            const savedName = localStorage.getItem('playerName');
            if (savedName) {
                playerNameInput.value = savedName;
            }
        }
    } catch (e) {
        console.error("Auth error:", e);
        showToast(t('authError'), 'error', 6000);
    }
}

/**
 * Main initialization function
 * Called on DOMContentLoaded
 */
async function init() {
    // Initialize DOM registry first
    initDOM();

    // Initialize authentication and load user data
    await initAuth();

    // Create updateGameState function with all dependencies
    const updateGameState = createUpdateGameState(
        () => startGameLocal(() => initiateVotingPhase()),  // startGameLocal with timer callback
        saveMyAnswers => stopGameLocal(saveMyAnswers),      // stopGameLocal
        (votingState) => showVotingUI(votingState, syncVoteToFirebase, () => startVoteTimer(() => {})),  // showVotingUI
        showResults,                                         // showResults
        resetBoard,                                          // resetBoard (no params needed)
        () => handleResetGameClick(resetRoomToLobby),       // handleResetGameClick
        saveMyAnswers                                        // saveMyAnswers
    );

    // Create a wrapper for subscribeToRoom that includes dependencies
    const subscribeToRoomWithDeps = (code) => {
        subscribeToRoom(code, returnToLobby, updateGameState);
    };

    // Bind all event listeners
    bindEventListeners(
        enterGameUI,
        subscribeToRoomWithDeps,
        startHeartbeat,
        stopActiveRoomsListener,
        resetRoomToLobby,
        initiateVotingPhase
    );

    // Initialize translations
    updateAllTranslations();

    // Cleanup intervals on page unload/refresh
    window.addEventListener('beforeunload', () => {
        cleanupAll();
    });

    // Subscribe to active rooms list
    subscribeToActiveRooms();

    // Store for window functions
    return { updateGameState, subscribeToRoomWithDeps };
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const { updateGameState, subscribeToRoomWithDeps } = await init();

    // Expose window functions for HTML onclick handlers
    // These are wrappers that provide dependencies via closure
    window.quickJoinRoom = async (code) => {
        await quickJoinRoom(code, enterGameUI, subscribeToRoomWithDeps, startHeartbeat, stopActiveRoomsListener);
    };

    window.reopenDormantRoom = async (code) => {
        await reopenDormantRoom(code, enterGameUI, subscribeToRoomWithDeps, startHeartbeat, stopActiveRoomsListener);
    };

    window.deleteRoom = async (code) => {
        await deleteRoom(code);
    };

    window.kickPlayer = async (playerUid) => {
        await kickPlayer(playerUid);
    };
});
