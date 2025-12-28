// Round flow management - next round, reset, delete, leave

import { db, doc, updateDoc } from '../../firebase-config.js';
import { state } from '../state/core.js';
import { clearTimers, cleanupAll } from '../state/actions.js';
import { getElements } from '../utils/dom.js';
import { showToast } from '../ui/toast.js';
import { showModal } from '../ui/modal.js';
import { t } from '../i18n/translations.js';
import { ROOM_STATUS } from '../constants.js';
import { debugLog } from '../utils/string.js';

/**
 * Start next round (host only)
 * Resets room to lobby state while keeping scores
 * @param {Function} resetRoomToLobby - Function to reset room state
 */
export async function handleNextRound(resetRoomToLobby) {
    if (!state.room.isHost) return;
    try {
        await resetRoomToLobby();

        // Scroll naar de draai letter sectie na het resetten
        // Kleine delay om ervoor te zorgen dat de UI update compleet is
        setTimeout(() => {
            const letterContainer = document.querySelector('.letter-display-container');
            if (letterContainer) {
                letterContainer.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }, 100);
    } catch (e) {
        console.error("Error starting next round:", e);
        showToast(t('errorGeneric') + ': ' + e.message, 'error', 6000);
    }
}

/**
 * Reset game to lobby with confirmation (host only)
 * @param {Function} resetRoomToLobby - Function to reset room state
 */
export async function handleResetGameClick(resetRoomToLobby) {
    if (!state.room.isHost) {
        showToast(t('onlyHostCanReset'), 'warning', 5000);
        return;
    }

    const confirmed = await showModal(
        t('resetToLobby'),
        t('confirmReset'),
        { type: 'warning', confirmText: t('confirm'), confirmDanger: true, t }
    );

    if (!confirmed) return;

    try {
        debugLog('Resetting game to lobby state');
        await resetRoomToLobby();
        debugLog('Game reset to lobby successfully');
        showToast(t('resetToLobby') + ' ✓', 'success', 3000);
    } catch (e) {
        console.error("Error resetting game:", e);
        showToast(t('errorGeneric') + ': ' + e.message, 'error', 6000);
    }
}

/**
 * Delete room permanently (host only)
 * Requires confirmation, cleans up listeners, returns to lobby
 */
export async function handleDeleteRoomClick() {
    debugLog("Delete room clicked", { isHost: state.room.isHost, roomId: state.room.roomId });

    if (!state.room.isHost) {
        showToast(t('onlyHostCanReset'), 'warning', 5000);
        return;
    }

    if (!state.room.roomId) {
        showToast(t('roomNotExist'), 'info', 4000);
        return;
    }

    const confirmed = await showModal(
        t('deleteRoom'),
        t('confirmDelete'),
        { type: 'danger', confirmText: t('delete'), confirmDanger: true, t }
    );

    if (!confirmed) return;

    try {
        const {
            controlsPanel,
            gameBoard,
            resultsBoard,
            votingScreen,
            lobbyScreen
        } = getElements();

        // Unsubscribe first to prevent the listener from firing for the host
        if (state.internals.roomUnsubscribe) {
            state.internals.roomUnsubscribe();
            state.internals.roomUnsubscribe = null;
        }
        cleanupAll(); // Clean up all intervals to prevent memory leaks

        const deletedRoomId = state.room.roomId;
        const roomRef = doc(db, "rooms", deletedRoomId);

        // Now update the room status (other players will get the toast via their listeners)
        await updateDoc(roomRef, {
            status: ROOM_STATUS.DELETED
        });

        // Reset local state
        state.room.roomId = null;
        state.room.isHost = false;
        state.room.roomData = null;
        state.ui.playerDOMCache.clear(); // Clear player DOM cache (performance)

        // Return to lobby
        controlsPanel.classList.add('hidden');
        gameBoard.classList.add('hidden');
        resultsBoard.classList.add('hidden');
        votingScreen.classList.add('hidden');
        lobbyScreen.classList.remove('hidden');

        debugLog(`Room ${deletedRoomId} deleted!`);
        showToast(t('roomDeleted'), 'success', 3000);
    } catch (e) {
        console.error("Error deleting room:", e);
        showToast(t('errorGeneric') + ': ' + e.message, 'error', 6000);
    }
}

/**
 * Leave current room (non-host players)
 * Removes player from Firebase, cleans up state, returns to lobby
 */
export async function handleLeaveRoomClick() {
    if (!state.room.roomId) return;

    try {
        const {
            controlsPanel,
            gameBoard,
            resultsBoard,
            votingScreen,
            lobbyScreen
        } = getElements();

        // Clean up all intervals to prevent memory leaks
        cleanupAll();

        // Remove player from room
        const updatedPlayers = state.room.roomData.players.filter(p => p.uid !== state.user.currentUser.uid);
        await updateDoc(doc(db, "rooms", state.room.roomId), {
            players: updatedPlayers,
            lastActivity: Date.now()
        });

        // Unsubscribe and return to lobby
        if (state.internals.roomUnsubscribe) {
            state.internals.roomUnsubscribe();
            state.internals.roomUnsubscribe = null;
        }

        // Reset local state
        state.room.roomId = null;
        state.room.isHost = false;
        state.room.roomData = null;
        state.game.isGameActive = false;
        state.ui.playerDOMCache.clear(); // Clear player DOM cache (performance)

        // Return to lobby
        controlsPanel.classList.add('hidden');
        gameBoard.classList.add('hidden');
        resultsBoard.classList.add('hidden');
        votingScreen.classList.add('hidden');
        lobbyScreen.classList.remove('hidden');

        showToast(t('youLeftRoom'), 'info', 3000);
    } catch (e) {
        console.error("Error leaving room:", e);
        showToast(t('errorGeneric') + ': ' + e.message, 'error', 6000);
    }
}
