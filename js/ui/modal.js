// Modal dialog system

import { getElements } from '../utils/dom.js';
import { icon } from '../utils/string.js';
import { state } from '../state/core.js';

// Flag to track if modal listeners are initialized
let modalListenersInitialized = false;

/**
 * Initialize modal event listeners (called once)
 */
function initModalListeners() {
    if (modalListenersInitialized) return;

    const { modalOverlay, modalCancelBtn, modalConfirmBtn, modalContainer } = getElements();

    // Confirm button
    modalConfirmBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal(true);
    });

    // Cancel button
    modalCancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal(false);
    });

    // Click overlay to cancel (but not the modal itself)
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal(false);
        }
    });

    // Prevent clicks on modal container from closing
    modalContainer.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (!modalOverlay.classList.contains('hidden')) {
            if (e.key === 'Escape') {
                closeModal(false);
            } else if (e.key === 'Enter') {
                closeModal(true);
            }
        }
    });

    modalListenersInitialized = true;
}

/**
 * Show a modal dialog
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {Object} options - Modal options
 * @param {string} options.type - Type: 'warning', 'danger', 'info' (default: 'warning')
 * @param {string} options.confirmText - Confirm button text (default: 'Bevestigen')
 * @param {string} options.cancelText - Cancel button text (default: 'Annuleren')
 * @param {boolean} options.confirmDanger - Make confirm button red (default: false)
 * @param {Function} options.t - Translation function (required for i18n)
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
export function showModal(title, message, options = {}) {
    // Initialize listeners on first use
    initModalListeners();

    return new Promise((resolve) => {
        const { modalOverlay, modalTitle, modalMessage, modalCancelBtn, modalConfirmBtn, modalIcon, modalIconWrapper } = getElements();

        if (!modalOverlay) {
            console.error('Modal overlay not found');
            resolve(false);
            return;
        }

        const type = options.type || 'warning';
        const t = options.t || ((key) => key); // Fallback translation function
        const confirmText = options.confirmText || t('confirm') || 'Bevestigen';
        const cancelText = options.cancelText || t('cancel') || 'Annuleren';
        const confirmDanger = options.confirmDanger || false;

        // Set modal content
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalCancelBtn.textContent = cancelText;
        modalConfirmBtn.textContent = confirmText;

        // Set icon based on type (inline SVG i.p.v. Font Awesome)
        modalIconWrapper.className = 'modal-icon-wrapper ' + type;
        const iconMap = {
            warning: icon('warning'),
            danger: icon('trash'),
            info: icon('info')
        };
        modalIcon.className = 'modal-icon';
        modalIcon.innerHTML = iconMap[type] || iconMap.warning;

        // Set confirm button style
        if (confirmDanger) {
            modalConfirmBtn.classList.add('danger');
        } else {
            modalConfirmBtn.classList.remove('danger');
        }

        // Store resolve function in state
        state.internals.currentModalResolve = resolve;

        // Show modal with animation
        modalOverlay.classList.remove('hidden', 'modal-closing');

        // Trigger haptic feedback on mobile
        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }

        // Focus confirm button for keyboard accessibility
        setTimeout(() => modalConfirmBtn.focus(), 100);
    });
}

/**
 * Close the modal
 * @param {boolean} confirmed - Whether the modal was confirmed or cancelled
 */
export function closeModal(confirmed = false) {
    const { modalOverlay } = getElements();
    const currentModalResolve = state.internals.currentModalResolve;

    if (!modalOverlay || !currentModalResolve) return;

    // Add closing animation
    modalOverlay.classList.add('modal-closing');

    // Trigger haptic feedback on mobile
    if ('vibrate' in navigator) {
        navigator.vibrate(confirmed ? [10, 50, 10] : 5);
    }

    // Wait for animation to complete
    setTimeout(() => {
        modalOverlay.classList.add('hidden');
        modalOverlay.classList.remove('modal-closing');

        // Resolve promise
        if (state.internals.currentModalResolve) {
            state.internals.currentModalResolve(confirmed);
            state.internals.currentModalResolve = null;
        }
    }, 200);
}
