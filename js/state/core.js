// Centralized state management - Data only, no logic

/**
 * Global application state
 * This object contains all state variables used throughout the application
 * State logic and mutations should be handled in state/actions.js
 */
export const state = {
    // User state
    user: {
        currentUser: null,
        currentLanguage: localStorage.getItem('language') || 'nl'
    },

    // Room/Multiplayer state
    room: {
        roomId: null,
        roomData: null,
        isHost: false
    },

    // Game state
    game: {
        isGameActive: false,
        currentLetter: '?',
        activeCategories: [],
        gameDuration: 60,
        timeLeft: 60
    },

    // Voting state
    voting: {
        voteTimeLeft: 0,
        voteMaxTime: 15,
        currentCategoryVotes: {},
        currentVotingCategory: null,
        isRenderingVotes: false,
        isSubmittingVotes: false,
        isProcessingCategory: false,
        isCalculatingScores: false
    },

    // UI state
    ui: {
        resultsShown: false,
        playerDOMCache: new Map(), // Cache voor player DOM elementen (performance optimalisatie)
        lastPlayerListHash: ''     // Voor debounce - alleen updaten bij echte changes
    },

    // Internal state (timers, listeners, etc.)
    internals: {
        timerInterval: null,
        voteTimerInterval: null,
        heartbeatInterval: null,
        playerListDebounceTimer: null,
        roomUnsubscribe: null,
        activeRoomsUnsubscribe: null,
        confettiLoaded: false,
        confettiLoadPromise: null,
        currentModalResolve: null
    }
};
