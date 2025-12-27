// Game state management - orchestrates UI updates based on Firebase room changes

import { state } from '../state/core.js';
import { getElements } from '../utils/dom.js';
import { ROOM_STATUS } from '../constants.js';
import { t } from '../i18n/translations.js';
import { showToast } from '../ui/toast.js';
import { renderCategories } from '../ui/render.js';
import { renderPlayersList } from '../ui/render-players.js';
import { debugLog } from '../utils/string.js';

/**
 * Update game state based on Firebase room data changes
 * This is the main orchestrator that handles all game state transitions
 *
 * Dependencies passed as parameters to avoid circular imports:
 * - startGameLocal (from timer-logic.js)
 * - stopGameLocal (from timer-logic.js)
 * - showVotingUI (from voting-ui.js)
 * - showResults (from results.js)
 * - resetBoard (from screens.js)
 * - handleResetGameClick (from round-flow.js)
 */
export function createUpdateGameState(
    startGameLocal,
    stopGameLocal,
    showVotingUI,
    showResults,
    resetBoard,
    handleResetGameClick,
    saveMyAnswers
) {
    return function updateGameState(data) {
        const {
            roomCodeDisplay,
            playerCountDisplay,
            letterDisplay,
            rollBtn,
            stopBtn,
            shuffleBtn,
            deleteRoomGameBtn,
            resetGameBtn
        } = getElements();

        // Update room info displays
        roomCodeDisplay.textContent = data.roomId;
        playerCountDisplay.textContent = `👤 ${data.players.length}`;
        renderPlayersList(data.players);

        // Update gameDuration from room data
        if (data.gameDuration) {
            state.game.gameDuration = data.gameDuration;
        }

        // Always update categories to ensure non-host players see changes
        // This fixes the issue where categories don't update after shuffle or new round
        if (JSON.stringify(state.game.activeCategories) !== JSON.stringify(data.categories)) {
            state.game.activeCategories = data.categories;
            renderCategories();
            updateInputPlaceholders();
        }

        if (data.currentLetter !== state.game.currentLetter) {
            state.game.currentLetter = data.currentLetter;
            letterDisplay.textContent = state.game.currentLetter;
            updateInputPlaceholders();
        }

        // Handle game status transitions
        if (data.status === ROOM_STATUS.PLAYING && !state.game.isGameActive) {
            state.ui.resultsShown = false; // Reset flag when new game starts
            startGameLocal();
        } else if (data.status === 'voting') {
            state.game.isGameActive = false;
            stopGameLocal(saveMyAnswers);
            // Always call showVotingUI to update vote stats in real-time
            showVotingUI(data.votingState);
        } else if (data.status === ROOM_STATUS.FINISHED) {
            state.game.isGameActive = false;
            stopGameLocal(saveMyAnswers);
            // Only show results once when transitioning to finished state
            if (!state.ui.resultsShown) {
                state.ui.resultsShown = true;
                showResults(data);
            }
        } else if (data.status === ROOM_STATUS.LOBBY) {
            resetBoard();
        }

        const wasHost = state.room.isHost;
        const shouldBeHost = state.user.currentUser.uid === data.players[0]?.uid;
        const waitingForHostLobbyMsg = document.getElementById('waiting-for-host-lobby');

        if (shouldBeHost) {
            state.room.isHost = true;

            // Enable/disable roll button based on status
            // Only enable in lobby state
            if (data.status === ROOM_STATUS.LOBBY) {
                rollBtn.disabled = false;
                rollBtn.classList.remove('hidden');
            } else if (data.status === ROOM_STATUS.PLAYING) {
                rollBtn.disabled = true;
                rollBtn.classList.remove('hidden');
            } else {
                // voting, finished states
                rollBtn.classList.add('hidden');
            }

            if (waitingForHostLobbyMsg) waitingForHostLobbyMsg.classList.add('hidden');

            // Stop button only visible during 'playing' state
            if (data.status === ROOM_STATUS.PLAYING) {
                stopBtn.classList.remove('hidden');
            } else {
                stopBtn.classList.add('hidden');
            }

            if (shuffleBtn) shuffleBtn.classList.remove('hidden');
            if (deleteRoomGameBtn) deleteRoomGameBtn.classList.remove('hidden');
            if (resetGameBtn) resetGameBtn.classList.remove('hidden');

            // Notify if just became host
            if (!wasHost && state.room.roomData) {
                debugLog("You are now the host!");
                // Show toast notification instead of alert
                setTimeout(() => {
                    showToast(t('nowHost'), 'info', 5000);
                }, 500);
            }

            // Auto-detect stuck states when host rejoins
            // If host is in voting/finished state and rejoining, offer to reset
            if (!wasHost && shouldBeHost && (data.status === 'voting' || data.status === ROOM_STATUS.FINISHED)) {
                debugLog('Detected host rejoin in problematic state:', data.status);
                setTimeout(() => {
                    showToast(
                        t('hostRejoinStuckState'),
                        'warning',
                        8000,
                        {
                            text: t('resetToLobby'),
                            callback: () => handleResetGameClick(),
                            primary: true
                        }
                    );
                }, 1000);
            }
        } else {
            state.room.isHost = false;
            rollBtn.classList.add('hidden');
            // Only show waiting message in lobby state
            if (waitingForHostLobbyMsg) {
                if (data.status === ROOM_STATUS.LOBBY) {
                    waitingForHostLobbyMsg.classList.remove('hidden');
                } else {
                    waitingForHostLobbyMsg.classList.add('hidden');
                }
            }
            stopBtn.classList.add('hidden');
            if (shuffleBtn) shuffleBtn.classList.add('hidden');
            if (deleteRoomGameBtn) deleteRoomGameBtn.classList.add('hidden');
            if (resetGameBtn) resetGameBtn.classList.add('hidden');
        }
    };
}

/**
 * Update input placeholders with current letter
 */
function updateInputPlaceholders() {
    state.game.activeCategories.forEach(cat => {
        const safeId = cat.replace(/[&\s]/g, '-').toLowerCase();
        const translatedCat = t('categories.' + cat);
        const input = document.getElementById(`input-${safeId}`);
        if (input) {
            input.placeholder = `${translatedCat} ${state.user.currentLanguage === 'nl' ? 'met' : 'with'} ${state.game.currentLetter}`;
        }
    });
}
