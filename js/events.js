// Event listener bindings for all UI interactions

import { getElements } from './utils/dom.js';
import { state } from './state/core.js';
import { setLanguage } from './i18n/translations.js';
import { toggleTheme } from './ui/theme.js';
import { createRoom } from './firebase/room-crud.js';
import { handleRollClick, handleStopClick, handleShuffleClick } from './game/game-logic.js';
import { handleNextRound, handleResetGameClick, handleDeleteRoomClick, handleLeaveRoomClick } from './game/round-flow.js';
import { requestMoreVoteTime } from './game/voting-timer.js';
import { pluralize } from './utils/string.js';
import { t } from './i18n/translations.js';

/**
 * Bind all event listeners for UI interactions
 * Called once during initialization
 *
 * Dependencies passed as parameters to avoid circular imports:
 * - enterGameUI, returnToLobby (from screens.js)
 * - subscribeToRoom (from room-subscription.js)
 * - startHeartbeat (from heartbeat.js)
 * - resetRoomToLobby (from room-crud.js)
 * - initiateVotingPhase (from voting-operations.js)
 */
export function bindEventListeners(
    enterGameUI,
    subscribeToRoom,
    startHeartbeat,
    resetRoomToLobby,
    initiateVotingPhase
) {
    const {
        createRoomBtn,
        rollBtn,
        stopBtn,
        deleteRoomGameBtn,
        resetGameBtn,
        leaveRoomBtn,
        shuffleBtn,
        themeToggleBtn,
        languageToggleBtn,
        nextRoundBtn,
        moreTimeBtn,
        gameDurationSlider,
        durationValueDisplay
    } = getElements();

    // Room creation
    createRoomBtn.addEventListener('click', () => {
        createRoom(enterGameUI, subscribeToRoom, startHeartbeat);
    });

    // Game controls
    rollBtn.addEventListener('click', handleRollClick);
    stopBtn.addEventListener('click', () => {
        handleStopClick(initiateVotingPhase);
    });

    // Room management
    if (deleteRoomGameBtn) {
        deleteRoomGameBtn.addEventListener('click', handleDeleteRoomClick);
    }
    if (resetGameBtn) {
        resetGameBtn.addEventListener('click', () => {
            handleResetGameClick(resetRoomToLobby);
        });
    }
    if (leaveRoomBtn) {
        leaveRoomBtn.addEventListener('click', handleLeaveRoomClick);
    }

    // Category shuffle
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', handleShuffleClick);
    }

    // Theme toggle
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Language toggle
    if (languageToggleBtn) {
        languageToggleBtn.addEventListener('click', () => {
            setLanguage(state.user.currentLanguage === 'nl' ? 'en' : 'nl');
        });
    }

    // Next round
    if (nextRoundBtn) {
        nextRoundBtn.addEventListener('click', () => {
            handleNextRound(resetRoomToLobby);
        });
    }

    // Voting more time button
    if (moreTimeBtn) {
        moreTimeBtn.addEventListener('click', requestMoreVoteTime);
    }

    // Duration slider
    if (gameDurationSlider) {
        gameDurationSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            durationValueDisplay.textContent = value;
            // Update plural/singular form
            const secondsLabel = durationValueDisplay.nextElementSibling;
            if (secondsLabel) {
                secondsLabel.textContent = pluralize(value, t('second'), t('seconds'));
            }
        });
    }
}
