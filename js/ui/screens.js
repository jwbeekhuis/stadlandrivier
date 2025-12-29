// Screen management and transitions

import { getElements } from '../utils/dom.js';
import { state } from '../state/core.js';
import { resetRoomState, cleanupAll } from '../state/actions.js';
import { showToast } from './toast.js';
import { renderCategories } from './render.js';
import { updateTimerDisplay } from './timer.js';
import { subscribeToActiveRooms } from '../firebase/room-discovery.js';

/**
 * Enter the game UI (hide lobby, show game controls and board)
 * @param {string} code - Room code to display
 * @param {Function} stopActiveRoomsListener - Function to stop active rooms listener
 */
export function enterGameUI(code, stopActiveRoomsListener) {
    const { lobbyScreen, controlsPanel, gameBoard, roomCodeDisplay, rollBtn, stopBtn, shuffleBtn, deleteRoomGameBtn, resetGameBtn } = getElements();

    // BELANGRIJK: Stop de active rooms listener bij het betreden van een kamer
    // Dit voorkomt onnodige Firebase reads terwijl je in een game zit
    stopActiveRoomsListener();

    lobbyScreen.classList.add('hidden');
    controlsPanel.classList.remove('hidden');
    gameBoard.classList.remove('hidden');
    roomCodeDisplay.textContent = code;

    // Only hide host buttons for non-host players
    // Host will see buttons immediately
    if (!state.room.isHost) {
        rollBtn.classList.add('hidden');
        stopBtn.classList.add('hidden');
        if (shuffleBtn) shuffleBtn.classList.add('hidden');
        if (deleteRoomGameBtn) deleteRoomGameBtn.classList.add('hidden');
        if (resetGameBtn) resetGameBtn.classList.add('hidden');

        // Ook de menu items verbergen voor niet-host
        const { deleteRoomAction, resetGameAction } = getElements();
        if (deleteRoomAction) deleteRoomAction.classList.add('hidden');
        if (resetGameAction) resetGameAction.classList.add('hidden');

        const waitingForHostLobbyMsg = document.getElementById('waiting-for-host-lobby');
        if (waitingForHostLobbyMsg) waitingForHostLobbyMsg.classList.remove('hidden');
    }
}

/**
 * Return to lobby (clean up game state and show lobby screen)
 * @param {string} message - Optional message to show as toast
 */
export function returnToLobby(message) {
    const { lobbyScreen, controlsPanel, gameBoard, votingScreen, resultsBoard, playersList } = getElements();

    // Clean up all intervals to prevent memory leaks
    cleanupAll();

    // Unsubscribe from room
    if (state.internals.roomUnsubscribe) {
        state.internals.roomUnsubscribe();
        state.internals.roomUnsubscribe = null;
    }

    // Reset state (includes clearing playerDOMCache)
    resetRoomState();

    // Clear player list DOM
    if (playersList) {
        playersList.innerHTML = '';
    }

    // Hide all game screens
    controlsPanel.classList.add('hidden');
    gameBoard.classList.add('hidden');
    votingScreen.classList.add('hidden');
    resultsBoard.classList.add('hidden');

    // Show lobby screen
    lobbyScreen.classList.remove('hidden');

    // Show message if provided
    if (message) {
        showToast(message, 'info', 5000);
    }

    // Refresh room list
    subscribeToActiveRooms();
}

/**
 * Reset the game board to initial state (lobby)
 * Just resets UI - doesn't call enterGameUI (that's handled by game flow)
 */
export function resetBoard() {
    const { resultsBoard, votingScreen, letterDisplay, categoriesContainer, gameBoard } = getElements();

    resultsBoard.classList.add('hidden');
    votingScreen.classList.add('hidden');
    gameBoard.classList.remove('hidden');
    categoriesContainer.classList.remove('hidden');

    letterDisplay.textContent = '?';
    updateTimerDisplay();
    renderCategories();

    // Hide sticky timer when returning to lobby
    const stickyTimerBar = document.getElementById('sticky-timer-bar');
    if (stickyTimerBar) stickyTimerBar.classList.remove('active');
}
