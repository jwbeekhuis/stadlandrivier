// Voting UI rendering and updates

import { getElements } from '../utils/dom.js';
import { state } from '../state/core.js';
import { debugLog } from '../utils/string.js';

/**
 * Update vote statistics display for all answers
 * @param {Object} votingState - The voting state object from Firebase
 */
export function updateVoteStats(votingState) {
    if (!votingState || !votingState.answers) {
        debugLog('updateVoteStats: no state or answers');
        return;
    }

    debugLog('updateVoteStats: Updating vote stats for', votingState.answers.length, 'answers');

    const answers = votingState.answers || [];
    const sortedAnswers = answers.sort((a, b) => a.playerIndex - b.playerIndex);

    sortedAnswers.forEach((answerData, index) => {
        const voteKey = `${answerData.playerUid}_${index}`;

        // Calculate vote stats for this answer (from both live votes and submitted votes)
        const votesForThisAnswer = {};

        // First get live votes from state.votes
        Object.entries(votingState.votes || {}).forEach(([voterUid, voterVotes]) => {
            if (voterVotes[voteKey] !== undefined) {
                votesForThisAnswer[voterUid] = voterVotes[voteKey];
            }
        });

        // Then get submitted votes from state.allPlayersVoted (these are finalized)
        Object.entries(votingState.allPlayersVoted || {}).forEach(([voterUid, voterVotes]) => {
            if (voterVotes[voteKey] !== undefined) {
                votesForThisAnswer[voterUid] = voterVotes[voteKey];
            }
        });

        const yesCount = Object.values(votesForThisAnswer).filter(v => v === true).length;
        const noCount = Object.values(votesForThisAnswer).filter(v => v === false).length;

        debugLog(`Vote stats for ${answerData.answer}: ${yesCount}✅ ${noCount}❌`);

        // Create voter names list - sort by player name for stable order
        const voterNamesList = Object.entries(votesForThisAnswer)
            .map(([uid, vote]) => {
                const p = state.room.roomData.players.find(pl => pl.uid === uid);
                const name = p ? p.name : 'Unknown';
                return { name, vote };
            })
            .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically by name
            .map(({ name, vote }) => vote ? `${name}✅` : `${name}❌`)
            .join(', ');

        // Find the vote-stats div for this answer and update it
        const votingItems = document.querySelectorAll('.voting-item');
        if (votingItems[index]) {
            const voteStatsDiv = votingItems[index].querySelector('.vote-stats');
            if (voteStatsDiv) {
                voteStatsDiv.innerHTML = `
                    <span class="vote-count">${yesCount}✅ ${noCount}❌</span>
                    ${voterNamesList ? '<div class="voter-names">' + voterNamesList + '</div>' : ''}
                `;
                debugLog(`Updated vote stats for item ${index}`);
            } else {
                debugLog(`No vote-stats div found for item ${index}`);
            }
        } else {
            debugLog(`No voting item found at index ${index}`);
        }
    });

    // Note: checkIfAllPlayersVoted will be called from the voting operations module
}

/**
 * Update voting progress (voted count / total count)
 * @param {number} totalCount - Total number of answers to vote on
 */
export function updateVotingProgress(totalCount) {
    const { votedCountDisplay } = getElements();
    const votedCount = Object.keys(state.voting.currentCategoryVotes).length;
    votedCountDisplay.textContent = votedCount;

    // Note: Auto-submit logic will be handled in the voting operations module
    if (votedCount >= totalCount) {
        debugLog('All votes cast - ready for submission');
    }
}
