// Player list rendering with performance optimizations

import { getElements } from '../utils/dom.js';
import { state } from '../state/core.js';
import { escapeHtml, pluralize, icon } from '../utils/string.js';
import { t } from '../i18n/translations.js';
import { CONSTANTS } from '../constants.js';

/**
 * Render the players list with performance optimizations
 * PERFORMANCE OPTIMALISATIES:
 * - Hash-based change detection (skip render if no changes)
 * - Debouncing (wait before rendering to batch updates)
 * - Diff-based rendering (only update changed elements)
 * - DOM caching (reuse existing elements)
 *
 * @param {Array} players - Array of player objects
 */
export function renderPlayersList(players) {
    const { playersList } = getElements();

    // PERFORMANCE: Genereer een hash van de relevante player data om onnodige re-renders te voorkomen
    const playerHash = players.map(p => `${p.uid}:${p.name}:${p.score}`).join('|');

    // Skip update als data niet is veranderd (voorkomt onnodige DOM updates)
    if (playerHash === state.ui.lastPlayerListHash) {
        return;
    }

    // PERFORMANCE: Debounce - wacht even voordat we daadwerkelijk renderen
    // Dit voorkomt meerdere re-renders bij snel opeenvolgende updates
    if (state.internals.playerListDebounceTimer) {
        clearTimeout(state.internals.playerListDebounceTimer);
    }

    state.internals.playerListDebounceTimer = setTimeout(() => {
        state.ui.lastPlayerListHash = playerHash;

        // PERFORMANCE OPTIMALISATIE: Diff-based rendering
        // In plaats van volledige innerHTML replacement, updaten we alleen wat nodig is
        const currentPlayerUIDs = new Set(players.map(p => p.uid));
        const existingPlayerUIDs = new Set(state.ui.playerDOMCache.keys());

        // Verwijder spelers die niet meer in de lijst zitten
        for (const uid of existingPlayerUIDs) {
            if (!currentPlayerUIDs.has(uid)) {
                const element = state.ui.playerDOMCache.get(uid);
                if (element && element.parentNode) {
                    element.remove();
                }
                state.ui.playerDOMCache.delete(uid);
            }
        }

        // Update of creëer speler elementen
        players.forEach((p, index) => {
            const isMe = p.uid === state.user.currentUser.uid;
            const canKick = state.room.isHost && !isMe && players.length > 1;
            const escapedName = escapeHtml(p.name);
            const pointsText = pluralize(p.score, t('point'), t('points')).toLowerCase();

            let playerElement = state.ui.playerDOMCache.get(p.uid);

            if (!playerElement) {
                // Nieuw element maken
                playerElement = document.createElement('span');
                playerElement.className = `player-tag ${isMe ? 'me' : ''}`;
                playerElement.dataset.uid = p.uid;
                state.ui.playerDOMCache.set(p.uid, playerElement);
                playersList.appendChild(playerElement);
            } else {
                // Update className (kan veranderen als isMe of host status verandert)
                playerElement.className = `player-tag ${isMe ? 'me' : ''}`;
            }

            // Update innerHTML alleen als content is veranderd
            const newContent = `${escapedName} (${p.score} ${pointsText})${canKick ? `<button class="kick-player-btn" onclick="kickPlayer('${p.uid}')" title="${t('confirmKick').replace('{name}', '')}">${icon('xmark')}</button>` : ''}`;
            if (playerElement.innerHTML !== newContent) {
                playerElement.innerHTML = newContent;
            }

            // Zorg voor juiste volgorde (indien nodig)
            const currentPosition = Array.from(playersList.children).indexOf(playerElement);
            if (currentPosition !== index) {
                if (index >= playersList.children.length) {
                    playersList.appendChild(playerElement);
                } else {
                    playersList.insertBefore(playerElement, playersList.children[index]);
                }
            }
        });
    }, CONSTANTS.PLAYER_LIST_DEBOUNCE_MS);
}
