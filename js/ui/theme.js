// Theme management system

import { getElements } from '../utils/dom.js';
import { icon } from '../utils/string.js';
import { state } from '../state/core.js';
import { UserService } from '../../firebase-config.js';

/**
 * Apply a theme to the document
 * @param {string} theme - Theme name: 'light' or 'dark'
 */
export function applyTheme(theme) {
    const { themeToggleBtn } = getElements();

    if (theme === 'light') {
        document.body.classList.add('light-mode');
        const iconElement = themeToggleBtn?.querySelector('svg');
        if (iconElement) {
            iconElement.innerHTML = icon('sun').match(/<path[^>]*>/)[0];
        }
    } else {
        document.body.classList.remove('light-mode');
        const iconElement = themeToggleBtn?.querySelector('svg');
        if (iconElement) {
            iconElement.innerHTML = icon('moon').match(/<path[^>]*>/)[0];
        }
    }
}

/**
 * Toggle between light and dark theme
 */
export function toggleTheme() {
    const { themeToggleBtn } = getElements();

    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    const theme = isLight ? 'light' : 'dark';

    // Update icon (inline SVG)
    const iconElement = themeToggleBtn.querySelector('svg');
    if (iconElement) {
        if (isLight) {
            iconElement.innerHTML = icon('sun').match(/<path[^>]*>/)[0];
        } else {
            iconElement.innerHTML = icon('moon').match(/<path[^>]*>/)[0];
        }
    }

    // Save to localStorage as fallback
    localStorage.setItem('theme', theme);

    // Save to Firestore if user is logged in
    if (state.user.currentUser) {
        UserService.savePreference(state.user.currentUser.uid, 'theme', theme);
    }
}
