// Game timer logic

import { state } from '../state/core.js';
import { getElements } from '../utils/dom.js';
import { updateTimerDisplay } from '../ui/timer.js';
import { ROOM_STATUS } from '../constants.js';

/**
 * Enable category input fields
 */
function enableInputs() {
    const inputs = document.querySelectorAll('.category-input-group input');
    inputs.forEach(input => {
        input.disabled = false;
    });
    // Focus first input
    if (inputs.length > 0) inputs[0].focus();
}

/**
 * Disable category input fields
 */
function disableInputs() {
    const inputs = document.querySelectorAll('.category-input-group input');
    inputs.forEach(input => {
        input.disabled = true;
    });
}

/**
 * Start the game locally (show board, enable inputs, start timer)
 * @param {Function} startTimerLocal - Function to start the timer
 */
export function startGameLocal(startTimerLocal) {
    const { gameBoard, resultsBoard, votingScreen, categoriesContainer } = getElements();

    state.game.isGameActive = true;
    gameBoard.classList.remove('hidden');
    resultsBoard.classList.add('hidden');
    votingScreen.classList.add('hidden');
    categoriesContainer.classList.remove('hidden');

    // Show sticky timer
    const stickyTimerBar = document.getElementById('sticky-timer-bar');
    if (stickyTimerBar) stickyTimerBar.classList.add('active');

    enableInputs();
    startTimerLocal();
}

/**
 * Stop the game locally (clear timer, disable inputs, save answers)
 * @param {Function} saveMyAnswers - Function to save player answers
 */
export function stopGameLocal(saveMyAnswers) {
    if (state.internals.timerInterval) {
        clearInterval(state.internals.timerInterval);
        state.internals.timerInterval = null;
    }

    disableInputs();
    saveMyAnswers();

    // Hide sticky timer
    const stickyTimerBar = document.getElementById('sticky-timer-bar');
    if (stickyTimerBar) stickyTimerBar.classList.remove('active');
}

/**
 * Start the local countdown timer
 * @param {Function} initiateVotingPhase - Function to call when timer expires (host only)
 */
export function startTimerLocal(initiateVotingPhase) {
    state.game.timeLeft = state.game.gameDuration;
    updateTimerDisplay();

    if (state.internals.timerInterval) {
        clearInterval(state.internals.timerInterval);
    }

    state.internals.timerInterval = setInterval(() => {
        state.game.timeLeft--;
        updateTimerDisplay();

        if (state.game.timeLeft <= 0) {
            clearInterval(state.internals.timerInterval);
            state.internals.timerInterval = null;

            // Only host initiates voting phase
            if (state.room.isHost && state.room.roomData.status === ROOM_STATUS.PLAYING) {
                initiateVotingPhase();
            }
        }
    }, 1000);
}
