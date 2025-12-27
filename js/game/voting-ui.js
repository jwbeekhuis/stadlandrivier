// Voting UI rendering and interaction

import { state } from '../state/core.js';
import { getElements } from '../utils/dom.js';
import { escapeHtml, debugLog } from '../utils/string.js';
import { normalizeAnswer, areWordsFuzzyMatching } from '../utils/fuzzy.js';
import { icon } from '../utils/string.js';
import { t } from '../i18n/translations.js';

/**
 * Update vote statistics for all answers in current category
 * Updates vote counts and voter names without re-rendering entire UI
 * @param {Object} votingState - Current voting state from Firebase
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

    // Check if all players voted (for non-host players to auto-advance)
    checkIfAllPlayersVoted(votingState);
}

/**
 * Update voting progress counter
 * Auto-submits when all votes are cast
 * @param {number} totalCount - Total number of answers to vote on
 * @param {Function} submitCategoryVotes - Function to call when all votes are cast
 */
export function updateVotingProgress(totalCount, submitCategoryVotes) {
    const { votedCountDisplay } = getElements();

    const votedCount = Object.keys(state.voting.currentCategoryVotes).length;
    votedCountDisplay.textContent = votedCount;

    // Auto-submit when all votes are cast
    if (votedCount >= totalCount) {
        debugLog('All votes cast, auto-submitting...');
        submitCategoryVotes();
    }
}

/**
 * Check if all players have voted on current category
 * Host triggers processing when all votes are in
 * @param {Object} votingState - Current voting state
 */
export function checkIfAllPlayersVoted(votingState) {
    if (!votingState || !state.room.roomData) return;

    const allPlayersVoted = votingState.allPlayersVoted || {};
    const playerCount = state.room.roomData.players.length;
    const votedCount = Object.keys(allPlayersVoted).length;

    debugLog(`Voting progress: ${votedCount}/${playerCount} players voted`);

    // If all players voted and we're the host, process results
    // Only trigger if not already processing
    if (state.room.isHost && votedCount >= playerCount && !state.voting.isProcessingCategory) {
        debugLog('All players voted, processing category results...');
        // Import and call processCategoryResults dynamically to avoid circular dependency
        import('../firebase/voting-results.js').then(({ processCategoryResults }) => {
            processCategoryResults(votingState);
        });
    }
}

/**
 * Show voting UI with all answers for current category
 * COMPLEX FUNCTION - Extracted AS-IS per plan
 * @param {Object} votingState - Current voting state from Firebase
 * @param {Function} syncVoteToFirebase - Function to sync votes to Firebase
 * @param {Function} startVoteTimer - Function to start the voting timer
 */
export function showVotingUI(votingState, syncVoteToFirebase, startVoteTimer) {
    const {
        votingScreen,
        gameBoard,
        resultsBoard,
        categoriesContainer,
        votingCategoryTitle,
        votingItemsContainer,
        totalVotesCountDisplay
    } = getElements();

    if (!votingState) {
        votingScreen.classList.remove('hidden');
        gameBoard.classList.add('hidden');
        votingItemsContainer.innerHTML = '<p style="text-align: center; opacity: 0.7;">' + t('loading') + '</p>';
        state.voting.isRenderingVotes = false;
        return;
    }

    // Reset votes when switching to a new category
    if (state.voting.currentVotingCategory !== votingState.category) {
        debugLog(`Switching to new category: ${votingState.category}`);
        state.voting.currentCategoryVotes = {}; // Clear votes from previous category
        state.voting.currentVotingCategory = votingState.category;
        state.voting.isRenderingVotes = false; // Allow fresh render
        state.voting.isSubmittingVotes = false; // Reset submission flag for new category
    }

    // If already showing this category, just update vote stats instead of full re-render
    if (state.voting.currentVotingCategory === votingState.category && state.voting.isRenderingVotes) {
        debugLog('Already rendering this category, updating vote stats only');
        updateVoteStats(votingState);
        return;
    }

    state.voting.isRenderingVotes = true;

    votingScreen.classList.remove('hidden');
    gameBoard.classList.add('hidden');
    resultsBoard.classList.add('hidden');
    // Keep categories visible during voting so players can see what they're voting on
    categoriesContainer.classList.remove('hidden');

    // Set category title - only if category is defined
    if (votingState.category) {
        const translationKey = 'categories.' + votingState.category;
        const translatedCategory = t(translationKey);
        votingCategoryTitle.textContent = translatedCategory;
    } else {
        votingCategoryTitle.textContent = '...';
    }

    // Clear and render all answer cards
    votingItemsContainer.innerHTML = '';

    const answers = votingState.answers || [];
    // Sort by playerIndex to maintain stable order (prevents jumping)
    const sortedAnswers = answers.sort((a, b) => a.playerIndex - b.playerIndex);

    sortedAnswers.forEach((answerData, index) => {
        const isMyAnswer = answerData.playerUid === state.user.currentUser.uid;
        const voteKey = `${answerData.playerUid}_${index}`;

        // Check if we already voted on this answer (only from finalized votes, not previousVotes)
        let myVote = votingState.allPlayersVoted?.[state.user.currentUser.uid]?.[voteKey];
        if (myVote !== undefined) {
            state.voting.currentCategoryVotes[voteKey] = myVote;
        }

        // Check for duplicates (fuzzy matching)
        const normalizedAnswer = normalizeAnswer(answerData.answer);
        const duplicates = sortedAnswers.filter((other, otherIndex) =>
            otherIndex < index && areWordsFuzzyMatching(normalizeAnswer(other.answer), normalizedAnswer)
        );
        const isDuplicate = duplicates.length > 0;

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

        // Create answer card
        const escapedAnswer = escapeHtml(answerData.answer);
        const escapedPlayerName = escapeHtml(answerData.playerName);
        const escapedDuplicateName = isDuplicate ? escapeHtml(duplicates[0].playerName) : '';

        const itemDiv = document.createElement('div');
        itemDiv.className = 'voting-item';

        // Create ARIA labels for accessibility
        const rejectLabel = state.user.currentLanguage === 'nl'
            ? `Keur af: ${answerData.answer} door ${answerData.playerName}`
            : `Reject: ${answerData.answer} by ${answerData.playerName}`;
        const approveLabel = state.user.currentLanguage === 'nl'
            ? `Keur goed: ${answerData.answer} door ${answerData.playerName}`
            : `Approve: ${answerData.answer} by ${answerData.playerName}`;

        itemDiv.innerHTML = `
            <div class="voting-item-header">
                <span class="voting-player-name">${escapedPlayerName}</span>
                ${isMyAnswer ? '<span class="own-answer-badge">' + t('yourAnswer') + '</span>' : ''}
                ${isDuplicate ? '<span class="duplicate-badge">' + t('duplicate') + ' ' + escapedDuplicateName + '</span>' : ''}
            </div>
            <div class="voting-answer-text">${escapedAnswer}</div>
            <div class="voting-item-actions">
                <button class="vote-btn vote-no ${myVote === false ? 'selected' : ''}"
                        data-vote-key="${voteKey}"
                        data-vote="false"
                        aria-label="${escapeHtml(rejectLabel)}"
                        aria-pressed="${myVote === false ? 'true' : 'false'}">
                    ${icon('xmark')}
                </button>
                <button class="vote-btn vote-yes ${myVote === true ? 'selected' : ''}"
                        data-vote-key="${voteKey}"
                        data-vote="true"
                        aria-label="${escapeHtml(approveLabel)}"
                        aria-pressed="${myVote === true ? 'true' : 'false'}">
                    ${icon('check')}
                </button>
            </div>
            <div class="vote-stats">
                <span class="vote-count">${yesCount}✅ ${noCount}❌</span>
                ${voterNamesList ? '<div class="voter-names">' + voterNamesList + '</div>' : ''}
            </div>
        `;

        votingItemsContainer.appendChild(itemDiv);
    });

    // Add click listeners to all vote buttons
    document.querySelectorAll('.vote-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const voteKey = e.currentTarget.getAttribute('data-vote-key');
            const voteValue = e.currentTarget.getAttribute('data-vote') === 'true';

            // Store vote locally
            state.voting.currentCategoryVotes[voteKey] = voteValue;

            // Update button states and ARIA attributes
            const container = e.currentTarget.closest('.voting-item');
            container.querySelectorAll('.vote-btn').forEach(b => {
                b.classList.remove('selected');
                b.setAttribute('aria-pressed', 'false');
            });
            e.currentTarget.classList.add('selected');
            e.currentTarget.setAttribute('aria-pressed', 'true');

            // Update progress
            // Import submitCategoryVotes dynamically to avoid circular dependency
            import('../firebase/voting-operations.js').then(({ submitCategoryVotes }) => {
                updateVotingProgress(answers.length, submitCategoryVotes);
            });

            // Sync to Firebase
            syncVoteToFirebase(voteKey, voteValue);
        });
    });

    // Update vote counter
    totalVotesCountDisplay.textContent = answers.length;

    // Import submitCategoryVotes for progress update
    import('../firebase/voting-operations.js').then(({ submitCategoryVotes }) => {
        updateVotingProgress(answers.length, submitCategoryVotes);
    });

    // Always restart timer for new category render
    startVoteTimer();
}
