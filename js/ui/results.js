// Results screen UI and game history infographic

import { state } from '../state/core.js';
import { getElements } from '../utils/dom.js';
import { escapeHtml, debugLog } from '../utils/string.js';
import { t } from '../i18n/translations.js';
import { loadConfetti } from './confetti.js';

/**
 * Calculate ranks for players based on their scores
 * Players with equal scores get the same rank, and the next rank skips accordingly
 * Example: scores [15, 15, 10, 5] -> ranks [1, 1, 3, 4]
 *
 * @param {Array} sortedPlayers - Array of players sorted by score (highest first)
 * @returns {Array<number>} - Array of rank numbers corresponding to each player
 */
export function calculateRanks(sortedPlayers) {
    const ranks = [];
    let currentRank = 1;

    for (let i = 0; i < sortedPlayers.length; i++) {
        if (i > 0 && sortedPlayers[i].score < sortedPlayers[i - 1].score) {
            // Score changed, update rank to current position + 1
            currentRank = i + 1;
        }
        ranks.push(currentRank);
    }

    return ranks;
}

/**
 * Render game history infographic with all voting results
 * Shows player answers, votes, points, and approval status
 * @param {Object} data - Room data with gameHistory
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

/**
 * Show results screen with player rankings and confetti for winners
 * @param {Object} data - Room data with players and scores
 */
export function showResults(data) {
    const {
        gameBoard,
        votingScreen,
        resultsBoard
    } = getElements();

    gameBoard.classList.add('hidden');
    votingScreen.classList.add('hidden');
    resultsBoard.classList.remove('hidden');

    const sortedPlayers = [...data.players].sort((a, b) => b.score - a.score);
    const ranks = calculateRanks(sortedPlayers);

    // Winner Confetti! (For all players with the highest score)
    // PERFORMANCE: Lazy load confetti library alleen wanneer nodig
    if (sortedPlayers.length > 0) {
        const topScore = sortedPlayers[0].score;
        const isWinner = topScore > 0 && sortedPlayers.some(p => p.score === topScore && p.uid === state.user.currentUser.uid);

        if (isWinner) {
            loadConfetti().then(confetti => {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#22c55e', '#38bdf8', '#ffffff']
                });
            }).catch(err => {
                console.warn('Confetti could not be loaded:', err);
            });
        }
    }

    const list = document.getElementById('results-list');
    list.innerHTML = sortedPlayers.map((p, i) => {
        const rank = ranks[i];
        let rankIcon = '';
        if (rank === 1) rankIcon = '<span class="rank-1">🥇</span>';
        if (rank === 2) rankIcon = '<span class="rank-2">🥈</span>';
        if (rank === 3) rankIcon = '<span class="rank-3">🥉</span>';

        return `
            <tr>
                <td class="text-center">${rankIcon || rank}</td>
                <td><strong>${p.name}</strong></td>
                <td class="text-right text-accent">${p.score}</td>
            </tr>
        `;
    }).join('');

    // Show next round button only for host
    const nextRoundBtn = document.getElementById('next-round-btn');
    const waitingForHostMsg = document.getElementById('waiting-for-host');
    if (state.room.isHost) {
        nextRoundBtn.classList.remove('hidden');
        waitingForHostMsg.classList.add('hidden');
    } else {
        nextRoundBtn.classList.add('hidden');
        waitingForHostMsg.classList.remove('hidden');
    }

    // Render game history infographic
    renderGameLog(data);
}
