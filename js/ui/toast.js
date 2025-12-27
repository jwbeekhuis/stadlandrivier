// Toast notification system

import { getElements } from '../utils/dom.js';

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - Type: 'success', 'info', 'warning', 'error'
 * @param {number} duration - Duration in milliseconds (default: 5000)
 * @param {Object} action - Optional action: { text: string, callback: function, primary: boolean }
 * @returns {HTMLElement} - The toast element
 */
export function showToast(message, type = 'info', duration = 5000, action = null) {
    const { toastContainer } = getElements();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Icon based on type
    const icons = {
        success: '✓',
        info: 'ℹ',
        warning: '⚠',
        error: '✕'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <div class="toast-content">
            <p class="toast-message">${message}</p>
            ${action ? `
                <div class="toast-actions">
                    <button class="toast-action-btn ${action.primary ? 'primary' : ''}" data-action="true">
                        ${action.text}
                    </button>
                </div>
            ` : ''}
        </div>
        <button class="toast-close" aria-label="Close">×</button>
        ${duration > 0 ? '<div class="toast-progress"></div>' : ''}
    `;

    // Add to container
    toastContainer.appendChild(toast);

    // Close button handler
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    // Action button handler
    if (action) {
        const actionBtn = toast.querySelector('[data-action="true"]');
        actionBtn.addEventListener('click', () => {
            action.callback();
            removeToast(toast);
        });
    }

    // Progress bar animation
    if (duration > 0) {
        const progressBar = toast.querySelector('.toast-progress');
        if (progressBar) {
            // Trigger animation
            setTimeout(() => {
                progressBar.style.transition = `width ${duration}ms linear`;
                progressBar.style.width = '0%';
            }, 10);
        }

        // Auto-remove after duration
        setTimeout(() => removeToast(toast), duration);
    }

    // Trigger haptic feedback on mobile
    if ('vibrate' in navigator) {
        const vibrationPatterns = {
            success: [10, 30, 10],
            error: [20, 50, 20],
            warning: [10, 20, 10],
            info: [10]
        };
        navigator.vibrate(vibrationPatterns[type] || [10]);
    }

    return toast;
}

/**
 * Remove a toast notification
 * @param {HTMLElement} toast - The toast element to remove
 */
export function removeToast(toast) {
    if (!toast || !toast.parentElement) return;

    toast.classList.add('toast-removing');
    setTimeout(() => {
        if (toast.parentElement) {
            toast.parentElement.removeChild(toast);
        }
    }, 300);
}
