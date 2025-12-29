// Basic rendering functions for categories and game log

import { getElements } from '../utils/dom.js';
import { state } from '../state/core.js';
import { t } from '../i18n/translations.js';
import { escapeHtml } from '../utils/string.js';
import { debugLog } from '../utils/string.js';

/**
 * Render the categories input fields
 */
export function renderCategories() {
    const { categoriesContainer } = getElements();
    categoriesContainer.innerHTML = '';

    state.game.activeCategories.forEach(cat => {
        const safeId = cat.replace(/[&\s]/g, '-').toLowerCase();
        const translationKey = 'categories.' + cat;
        const translatedCat = t(translationKey);
        const div = document.createElement('div');
        div.className = 'category-input-group';
        div.innerHTML = `
            <label for="input-${safeId}">${translatedCat}</label>
            <input type="text" id="input-${safeId}" placeholder="${translatedCat}..." disabled autocomplete="off">
        `;
        categoriesContainer.appendChild(div);
    });
}

/**
 * Update category input placeholders with current letter
 */
export function updateInputPlaceholders() {
    state.game.activeCategories.forEach(cat => {
        const safeId = cat.replace(/[&\s]/g, '-').toLowerCase();
        const translatedCat = t('categories.' + cat);
        const input = document.getElementById(`input-${safeId}`);
        if (input) {
            input.placeholder = `${translatedCat} ${t('with')} ${state.game.currentLetter}`;
        }
    });
}

/**
 * Render the game history log
 * @param {Object} data - Room data containing gameHistory and players
 */
export function renderGameLog(data) {
    const logBox = document.getElementById('game-history-log');
    const logEntries = document.getElementById('log-entries');
    const history = data.gameHistory || [];

    debugLog('renderGameLog called', { historyLength: history.length, logBox, logEntries });

    if (history.length === 0) {
        logBox.classList.add('hidden');
        debugLog('No history, hiding log');
        return;
    }

    debugLog('Rendering game log with', history.length, 'entries');
    logBox.classList.remove('hidden');
    logEntries.innerHTML = history.map(entry => {
        const escapedPlayerName = escapeHtml(entry.playerName);
        const escapedAnswer = escapeHtml(entry.answer);
        const votes = entry.votes || {};
        const yes = Object.values(votes).filter(v => v === true).length;
        const no = Object.values(votes).filter(v => v === false).length;

        // Sort voter names alphabetically for consistent display
        const voterNames = Object.entries(votes)
            .map(([uid, v]) => {
                const p = data.players.find(pl => pl.uid === uid);
                const name = p ? p.name : 'Unknown';
                return { name, vote: v };
            })
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(({ name, vote }) => `${name} (${vote ? '✅' : '❌'})`)
            .join(', ');

        return `
            <div class="log-entry ${entry.isAuto ? 'auto' : 'manual'}">
                <div class="log-main">
                    <div>
                        <span class="log-player">${escapedPlayerName}</span>
                        <span class="log-cat">${t('at')} ${t('categories.' + entry.category)}</span>
                        <span class="log-word">"${escapedAnswer}"</span>
                    </div>
                    <div class="log-status">
                        ${entry.isValid ? '✅' : '❌'}
                        <small>${entry.isAuto ? t('autoApproved') : ''}</small>
                        ${entry.points !== undefined ? `<div class="log-points"><strong>+${entry.points} ${t('points').toLowerCase()}</strong> <span class="log-reason">${entry.pointsReason || ''}</span></div>` : ''}
                    </div>
                </div>
                ${!entry.isAuto ? `
                    <div class="log-details">
                        <span class="vote-tally">${t('waitingForVotes').replace('Wachten op stemmen...', 'Stemmen').replace('Waiting for votes...', 'Votes')}: <strong>${yes}✅ / ${no}❌</strong></span>
                        <span class="voters-string" style="font-size: 0.75rem; opacity: 0.5;">${voterNames}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}
