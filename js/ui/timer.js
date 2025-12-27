// Timer display utilities

import { state } from '../state/core.js';

/**
 * Update the main game timer display (sticky timer bar)
 */
export function updateTimerDisplay() {
    // Update sticky timer bar only (circular timer removed)
    const stickyTimerText = document.getElementById('sticky-timer-text');
    const stickyTimerProgress = document.getElementById('sticky-timer-progress');
    const stickyTimerLetter = document.getElementById('sticky-timer-letter');

    if (stickyTimerText && stickyTimerProgress) {
        stickyTimerText.textContent = Math.max(0, state.game.timeLeft);
        const percentage = (state.game.timeLeft / state.game.gameDuration) * 100;
        stickyTimerProgress.style.width = percentage + '%';

        // Update letter display
        if (stickyTimerLetter) {
            stickyTimerLetter.textContent = state.game.currentLetter;
        }

        // Change color when time is running out
        if (state.game.timeLeft <= 10) {
            stickyTimerProgress.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
            stickyTimerProgress.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.5)';
        } else {
            stickyTimerProgress.style.background = 'linear-gradient(90deg, var(--accent-color), var(--secondary-color))';
            stickyTimerProgress.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.5)';
        }
    }
}

/**
 * Update the voting timer display
 */
export function updateVoteTimerDisplay() {
    const voteTimeLeftDisplay = document.getElementById('vote-time-left');
    const voteProgressBar = document.getElementById('vote-progress-bar');

    if (!voteTimeLeftDisplay || !voteProgressBar) return;

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
