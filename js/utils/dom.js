// DOM element registry for caching static elements

let DOM = null;

/**
 * Initialize the DOM registry by caching all static element references
 * @returns {Object} - Object containing all cached DOM elements
 */
export function initDOM() {
    if (DOM !== null) return DOM;

    DOM = {
        // Screens
        lobbyScreen: document.getElementById('lobby-screen'),
        controlsPanel: document.getElementById('game-controls'),
        gameBoard: document.getElementById('game-board'),
        resultsBoard: document.getElementById('results-board'),
        votingScreen: document.getElementById('voting-screen'),

        // Lobby Inputs
        playerNameInput: document.getElementById('player-name'),
        roomNameInput: document.getElementById('room-name-input'),
        createRoomBtn: document.getElementById('create-room-btn'),
        gameDurationSlider: document.getElementById('game-duration-slider'),
        durationValueDisplay: document.getElementById('duration-value'),

        // Game Elements
        roomCodeDisplay: document.getElementById('room-code-display'),
        playerCountDisplay: document.getElementById('player-count'),
        rollBtn: document.getElementById('roll-btn'),
        stopBtn: document.getElementById('stop-btn'),
        deleteRoomGameBtn: document.getElementById('delete-room-game-btn'),
        resetGameBtn: document.getElementById('reset-game-btn'),
        leaveRoomBtn: document.getElementById('leave-room-btn'),
        letterDisplay: document.getElementById('current-letter'),
        categoriesContainer: document.getElementById('categories-container'),
        nextRoundBtn: document.getElementById('next-round-btn'),
        shuffleBtn: document.getElementById('shuffle-btn'),
        themeToggleBtn: document.getElementById('theme-toggle'),
        languageToggleBtn: document.getElementById('language-toggle'),
        playersList: document.getElementById('players-list'),

        // Game Actions Menu
        gameActionsMenu: document.getElementById('game-actions-menu'),
        gameActionsToggle: document.getElementById('game-actions-toggle'),
        gameActionsDropdown: document.getElementById('game-actions-dropdown'),
        leaveRoomAction: document.getElementById('leave-room-action'),
        deleteRoomAction: document.getElementById('delete-room-action'),
        resetGameAction: document.getElementById('reset-game-action'),

        // Voting Elements
        votingCategoryTitle: document.getElementById('voting-category-title'),
        votingItemsContainer: document.getElementById('voting-items-container'),
        votedCountDisplay: document.getElementById('voted-count'),
        totalVotesCountDisplay: document.getElementById('total-votes-count'),
        voteTimer: document.getElementById('vote-timer'),
        voteTimeLeftDisplay: document.getElementById('vote-time-left'),
        voteProgressBar: document.getElementById('vote-progress-bar'),
        moreTimeBtn: document.getElementById('more-time-btn'),

        // UI Containers
        toastContainer: document.getElementById('toast-container'),
        modalOverlay: document.getElementById('modal-overlay'),

        // Modal sub-elements (queried from modalOverlay)
        get modalContainer() {
            return this.modalOverlay?.querySelector('.modal-container');
        },
        get modalIconWrapper() {
            return this.modalOverlay?.querySelector('.modal-icon-wrapper');
        },
        get modalIcon() {
            return this.modalOverlay?.querySelector('.modal-icon');
        },
        get modalTitle() {
            return this.modalOverlay?.querySelector('.modal-title');
        },
        get modalMessage() {
            return this.modalOverlay?.querySelector('.modal-message');
        },
        get modalCancelBtn() {
            return this.modalOverlay?.querySelector('.modal-cancel');
        },
        get modalConfirmBtn() {
            return this.modalOverlay?.querySelector('.modal-confirm');
        },

        // Additional elements that are queried dynamically
        get stickyTimerBar() {
            return document.getElementById('sticky-timer-bar');
        },
        get stickyTimerProgress() {
            return document.getElementById('sticky-timer-progress');
        },
        get stickyTimerText() {
            return document.getElementById('sticky-timer-text');
        },
        get stickyTimerLetter() {
            return document.getElementById('sticky-timer-letter');
        },
        get waitingForHostLobby() {
            return document.getElementById('waiting-for-host-lobby');
        },
        get waitingForHost() {
            return document.getElementById('waiting-for-host');
        },
        get gameHistoryLog() {
            return document.getElementById('game-history-log');
        },
        get logEntries() {
            return document.getElementById('log-entries');
        },
        get resultsList() {
            return document.getElementById('results-list');
        },
        get activeRoomsList() {
            return document.getElementById('active-rooms-list');
        }
    };

    return DOM;
}

/**
 * Get the DOM elements registry
 * @returns {Object} - Object containing all cached DOM elements
 * @throws {Error} - If DOM is not initialized
 */
export function getElements() {
    if (DOM === null) {
        throw new Error('DOM not initialized. Call initDOM() first.');
    }
    return DOM;
}
