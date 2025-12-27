// Lazy-loading confetti library for celebrations

import { state } from '../state/core.js';

/**
 * PERFORMANCE OPTIMALISATIE: Lazy load confetti library
 * Loads canvas-confetti from CDN only when needed
 * Uses promise caching to prevent duplicate loads
 *
 * @returns {Promise} - Promise that resolves to the confetti library
 */
export async function loadConfetti() {
    if (state.internals.confettiLoaded && window.confetti) {
        return window.confetti;
    }

    if (state.internals.confettiLoadPromise) {
        return state.internals.confettiLoadPromise;
    }

    state.internals.confettiLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
        script.onload = () => {
            state.internals.confettiLoaded = true;
            resolve(window.confetti);
        };
        script.onerror = () => reject(new Error('Failed to load confetti library'));
        document.head.appendChild(script);
    });

    return state.internals.confettiLoadPromise;
}
