// Voting timer management

import { state } from '../state/core.js';
import { getElements } from '../utils/dom.js';
import { debugLog } from '../utils/string.js';

/**
 * Start the voting timer (30 seconds)
 * Shows "More Time" button at 5 seconds remaining
 * @param {Function} submitCategoryVotes - Function to call when timer expires
 */
export function startVoteTimer(submitCategoryVotes) {
    debugLog('Starting vote timer');
    stopVoteTimer();

    const { voteTimer, voteTimeLeftDisplay, voteProgressBar, moreTimeBtn } = getElements();

    state.voting.voteTimeLeft = 30; // 30 seconds for batch voting
    state.voting.voteMaxTime = 30; // Track max time for percentage calculation
    voteTimer.classList.remove('hidden');
    moreTimeBtn.classList.add('hidden');

    updateVoteTimerDisplay();

    state.internals.voteTimerInterval = setInterval(() => {
        state.voting.voteTimeLeft--;
        updateVoteTimerDisplay();

        if (state.voting.voteTimeLeft === 0) {
            debugLog("Vote timeout - auto-submitting with current votes");
            clearInterval(state.internals.voteTimerInterval);
            state.internals.voteTimerInterval = null;
            // Auto-submit with current votes (unanswered = auto-approve)
            submitCategoryVotes();
        } else if (state.voting.voteTimeLeft <= 5 && moreTimeBtn.classList.contains('hidden')) {
            // Show "More Time" button in last 5 seconds
            moreTimeBtn.classList.remove('hidden');
        }
    }, 1000);
}

/**
 * Stop the voting timer and hide timer UI
 */
export function stopVoteTimer() {
    const { voteTimer } = getElements();

    if (state.internals.voteTimerInterval) {
        clearInterval(state.internals.voteTimerInterval);
        state.internals.voteTimerInterval = null;
    }
    voteTimer.classList.add('hidden');
}

/**
 * Update the voting timer display with progress bar and color changes
 */
export function updateVoteTimerDisplay() {
    const { voteTimeLeftDisplay, voteProgressBar } = getElements();

    voteTimeLeftDisplay.textContent = state.voting.voteTimeLeft;

    // Update progress bar width
    const percentage = (state.voting.voteTimeLeft / state.voting.voteMaxTime) * 100;
    voteProgressBar.style.width = percentage + '%';

    // Change progress bar color when time is running out
    if (state.voting.voteTimeLeft <= 5) {
        voteProgressBar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
        voteProgressBar.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.5)';
    } else {
        voteProgressBar.style.background = 'linear-gradient(90deg, var(--accent-color), var(--secondary-color))';
        voteProgressBar.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.5)';
    }
}

/**
 * Add 10 seconds to the voting timer
 * Called when user clicks "More Time" button
 */
export function requestMoreVoteTime() {
    const { moreTimeBtn } = getElements();

    state.voting.voteTimeLeft += 10;
    state.voting.voteMaxTime += 10; // Also increase max time so percentage stays accurate
    moreTimeBtn.classList.add('hidden');
    updateVoteTimerDisplay(); // Update display immediately
    debugLog("Added 10 seconds to vote timer");
}
