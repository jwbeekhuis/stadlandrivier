// Translation and internationalization system

import { translations } from '../../translations.js';
import { state } from '../state/core.js';
import { setCurrentLanguage } from '../state/actions.js';
import { UserService } from '../../firebase-config.js';
import { debugLog } from '../utils/string.js';

/**
 * Get translation for a key
 * @param {string} key - Translation key (can be nested with dots, e.g., 'categories.Stad')
 * @returns {string} - Translated string or the key if not found
 */
export function t(key) {
    const keys = key.split('.');
    let value = translations[state.user.currentLanguage];
    for (const k of keys) {
        value = value?.[k];
    }
    if (!value && key.startsWith('categories.')) {
        debugLog(`Translation missing for key: "${key}"`, {
            currentLanguage: state.user.currentLanguage,
            availableCategories: Object.keys(translations[state.user.currentLanguage]?.categories || {})
        });
    }
    return value || key;
}

/**
 * Set the current language
 * @param {string} lang - Language code ('nl' or 'en')
 */
export function setLanguage(lang) {
    setCurrentLanguage(lang);

    // Save to Firestore if user is logged in
    if (state.user.currentUser) {
        UserService.savePreference(state.user.currentUser.uid, 'language', lang);
    }

    updateAllTranslations();
    updateDynamicContent();
}

/**
 * Get the current language
 * @returns {string} - Current language code
 */
export function getCurrentLanguage() {
    return state.user.currentLanguage;
}

/**
 * Update all translations in the DOM
 */
export function updateAllTranslations() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = t(key);

        if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
            el.placeholder = translation;
        } else if (el.tagName === 'INPUT' && el.type !== 'range') {
            el.value = translation;
        } else if (el.tagName === 'BUTTON') {
            el.textContent = translation;
        } else {
            el.textContent = translation;
        }
    });

    // Update elements with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });

    // Update title separately to preserve HTML
    const titleEl = document.querySelector('[data-i18n="title"]');
    if (titleEl) {
        const parts = t('title').split(' ');
        titleEl.innerHTML = `${parts[0]} <span class="highlight">${parts[1]}</span> ${parts[2]} <small style="font-size: 0.4em; opacity: 0.6; font-weight: 300; display: block; margin-top: -5px;" data-i18n="by">${t('by')}</small>`;
    }

    // Update tutorial content
    updateTutorialContent();

    // Update game controls
    updateGameControlsContent();

    // Update voting content
    updateVotingContent();

    // Update results content
    updateResultsContent();
}

/**
 * Update tutorial section content
 */
export function updateTutorialContent() {
    const tutorialContent = document.querySelector('.tutorial-content');
    if (!tutorialContent) return;

    tutorialContent.innerHTML = `
        <h3>${t('tutorialRoomTitle')}</h3>
        <p>${t('tutorialActiveRooms')}</p>
        <p>${t('tutorialNewRoom')}</p>
        <p>${t('tutorialHost')}</p>
        <p>${t('tutorialKicked')}</p>
        <p>${t('tutorialReconnect')}</p>

        <h3>${t('tutorialLibraryTitle')}</h3>
        <p>${t('tutorialLibrary')}</p>
        <p><strong>${t('tutorialDormant')}</strong></p>

        <h3>${t('tutorialRulesTitle')}</h3>
        <p>${t('tutorialRules')}</p>

        <h3>${t('tutorialPointsTitle')}</h3>
        <ul>
            <li>${t('tutorialPoints20')}</li>
            <li>${t('tutorialPoints10')}</li>
            <li>${t('tutorialPoints5')}</li>
        </ul>

        <h3>${t('tutorialRecognitionTitle')}</h3>
        <p>${t('tutorialRecognition')}</p>

        <h3>${t('tutorialVotingTitle')}</h3>
        <p>${t('tutorialVotingIntro')}</p>
        <ul>
            <li>${t('tutorialVoting1')}</li>
            <li>${t('tutorialVoting2')}</li>
            <li>${t('tutorialVoting3')}</li>
            <li>${t('tutorialVoting4')}</li>
            <li>${t('tutorialVoting5')}</li>
            <li>${t('tutorialVoting6')}</li>
            <li>${t('tutorialVoting7')}</li>
            <li>${t('tutorialVoting8')}</li>
            <li>${t('tutorialVoting9')}</li>
            <li>${t('tutorialVoting10')}</li>
        </ul>

        <h3>${t('tutorialLogTitle')}</h3>
        <p>${t('tutorialLog')}</p>
    `;
}

/**
 * Update game controls content
 */
export function updateGameControlsContent() {
    // Update game controls text that's not in data-i18n
    const roomCodeDisplay = document.getElementById('room-code-display');
    if (roomCodeDisplay) {
        const roomCode = roomCodeDisplay.textContent;
        const roomLabel = document.querySelector('.room-info span');
        if (roomLabel && roomCode !== '---') {
            roomLabel.innerHTML = `<span data-i18n="room">${t('room')}</span> <strong id="room-code-display">${roomCode}</strong>`;
        }
    }

    const deleteRoomBtn = document.getElementById('delete-room-game-btn');
    if (deleteRoomBtn) {
        deleteRoomBtn.textContent = t('deleteRoom');
        deleteRoomBtn.title = t('deleteRoom');
    }

    const rollBtn = document.getElementById('roll-btn');
    if (rollBtn) rollBtn.textContent = t('rollLetter');

    const stopBtn = document.getElementById('stop-btn');
    if (stopBtn) stopBtn.textContent = t('stopRound');

    const shuffleBtn = document.getElementById('shuffle-btn');
    if (shuffleBtn) {
        shuffleBtn.textContent = t('mixCategories');
        shuffleBtn.title = t('mixCategories');
    }
}

/**
 * Update voting screen content
 */
export function updateVotingContent() {
    const moreTimeBtn = document.getElementById('more-time-btn');
    if (moreTimeBtn) moreTimeBtn.textContent = t('moreTime');

    const votingHeader = document.querySelector('#voting-screen h2');
    if (votingHeader) votingHeader.textContent = t('checkAnswer');
}

/**
 * Update results screen content
 */
export function updateResultsContent() {
    const resultsHeader = document.querySelector('#results-board h2');
    if (resultsHeader) resultsHeader.textContent = t('results');

    const nextRoundBtn = document.getElementById('next-round-btn');
    if (nextRoundBtn) nextRoundBtn.textContent = t('nextRound');

    const logTitle = document.querySelector('.log-title');
    if (logTitle) logTitle.textContent = t('roundLog');
}

/**
 * Update dynamic content (categories, placeholders)
 * This function is called when language changes
 */
export function updateDynamicContent() {
    // This will be implemented later - it needs renderCategories and updateInputPlaceholders
    // from the rendering modules (Fase 3)
    // For now, this is a placeholder
}
