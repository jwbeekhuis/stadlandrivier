import { db, collection, doc, setDoc, onSnapshot, updateDoc, getDoc, getDocs, writeBatch, arrayUnion, query, where, orderBy, limit, runTransaction, signInAnonymously, auth, UserService } from './firebase-config.js?v=122';
import { translations } from './translations.js?v=105';

// PERFORMANCE OPTIMALISATIE: Lazy load confetti library
let confettiLoaded = false;
let confettiLoadPromise = null;

async function loadConfetti() {
    if (confettiLoaded && window.confetti) {
        return window.confetti;
    }

    if (confettiLoadPromise) {
        return confettiLoadPromise;
    }

    confettiLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
        script.onload = () => {
            confettiLoaded = true;
            resolve(window.confetti);
        };
        script.onerror = () => reject(new Error('Failed to load confetti library'));
        document.head.appendChild(script);
    });

    return confettiLoadPromise;
}

// PERFORMANCE OPTIMALISATIE: Inline SVG iconen i.p.v. Font Awesome CDN
// Dit scheelt ~70KB en verbetert laadtijd aanzienlijk
const icons = {
    language: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a1.001 1.001 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a1.001 1.001 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 000-1.41l-1.06-1.06zm1.06-10.96a1.001 1.001 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a1.001 1.001 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>',
    xmark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>'
};

// Helper function om icon HTML te genereren
function icon(name) {
    return icons[name] || '';
}

document.addEventListener('DOMContentLoaded', () => {
    // --- Language Management ---
    let currentLanguage = localStorage.getItem('language') || 'nl';

    function t(key) {
        const keys = key.split('.');
        let value = translations[currentLanguage];
        for (const k of keys) {
            value = value?.[k];
        }
        if (!value && key.startsWith('categories.')) {
            debugLog(`Translation missing for key: "${key}"`, {
                currentLanguage,
                availableCategories: Object.keys(translations[currentLanguage]?.categories || {})
            });
        }
        return value || key;
    }

    function setLanguage(lang) {
        currentLanguage = lang;
        // Save to localStorage as fallback
        localStorage.setItem('language', lang);
        // Save to Firestore if user is logged in
        if (currentUser) {
            UserService.savePreference(currentUser.uid, 'language', lang);
        }
        updateAllTranslations();
        updateDynamicContent();
    }

    function updateAllTranslations() {
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

    function updateTutorialContent() {
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

    function updateGameControlsContent() {
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

    function updateVotingContent() {
        const moreTimeBtn = document.getElementById('more-time-btn');
        if (moreTimeBtn) moreTimeBtn.textContent = t('moreTime');

        const votingHeader = document.querySelector('#voting-screen h2');
        if (votingHeader) votingHeader.textContent = t('checkAnswer');
    }

    function updateResultsContent() {
        const resultsHeader = document.querySelector('#results-board h2');
        if (resultsHeader) resultsHeader.textContent = t('results');

        const nextRoundBtn = document.getElementById('next-round-btn');
        if (nextRoundBtn) nextRoundBtn.textContent = t('nextRound');

        const logTitle = document.querySelector('.log-title');
        if (logTitle) logTitle.textContent = t('roundLog');
    }

    function updateDynamicContent() {
        // Update categories if they exist
        if (activeCategories && activeCategories.length > 0) {
            renderCategories();
            updateInputPlaceholders();
        }
    }
    // --- Configuration ---
    const allCategories = [
        'Stad', 'Land', 'Rivier', 'Dier', 'Plant', 'Jongensnaam',
        'Meisjesnaam', 'Beroep', 'Eten & Drinken', 'Beroemdheid',
        'Merk', 'Film of Serie', 'Sport', 'Kledingstuk', 'Lichaamsdeel',
        'Kleur', 'Automerk', 'Voorwerp in Huis', 'Muziekinstrument',
        'Liedje', 'Vakantie-item', 'Schoolvak', 'Hoofdstad',
        'Smoesje', 'Hobby'
    ];

    // --- Constants ---
    const CONSTANTS = {
        HEARTBEAT_INTERVAL_MS: 30000,       // 30 seconden (was 5s - Firebase optimalisatie)
        INACTIVE_THRESHOLD_MS: 120000,      // 2 minuten
        VOTING_INACTIVE_THRESHOLD_MS: 180000, // 3 minuten
        VOTE_TIMER_DURATION_S: 30,
        MORE_TIME_SECONDS: 10,
        MAX_HEARTBEAT_RETRIES: 3,
        ROOM_CODE_LENGTH: 4,
        PLAYER_LIST_DEBOUNCE_MS: 1000       // Debounce voor player list updates
    };

    const ROOM_STATUS = {
        LOBBY: 'lobby',
        PLAYING: 'playing',
        VOTING: 'voting',
        FINISHED: 'finished',
        DORMANT: 'dormant',
        DELETED: 'deleted'
    };

    const DEBUG = false; // Zet op true voor development

    function debugLog(...args) {
        if (DEBUG) console.log('[DEBUG]', ...args);
    }

    /**
     * Pluralization helper for grammatically correct text
     * @param {number} count - The number to check
     * @param {string} singular - Singular form (e.g., "seconde", "second")
     * @param {string} plural - Plural form (e.g., "seconden", "seconds")
     * @returns {string} - Grammatically correct form
     */
    function pluralize(count, singular, plural) {
        return count === 1 ? singular : plural;
    }

    // State
    let activeCategories = [];
    let gameDuration = 60; // Default: 60 seconds, can be changed by room creator
    let timerInterval;
    let timeLeft = gameDuration;
    let isGameActive = false;
    let currentLetter = '?';

    // Multiplayer State
    let currentUser = null;
    let roomId = null;
    let isHost = false;
    let roomUnsubscribe = null;
    let activeRoomsUnsubscribe = null; // Firebase listener voor active rooms (FIX: memory leak)
    let roomData = null; // Store full room data
    let heartbeatInterval = null;
    let voteTimerInterval = null;
    let voteTimeLeft = 0;
    let voteMaxTime = 15;
    let resultsShown = false; // Track if results have been shown for current round
    let lastPlayerListHash = ''; // Voor debounce - alleen updaten bij echte changes
    let playerListDebounceTimer = null; // Debounce timer voor player list
    let playerDOMCache = new Map(); // Cache voor player DOM elementen (performance optimalisatie)

    // --- DOM Elements ---
    // Screens
    const lobbyScreen = document.getElementById('lobby-screen');
    const controlsPanel = document.getElementById('game-controls');
    const gameBoard = document.getElementById('game-board');
    const resultsBoard = document.getElementById('results-board');
    const votingScreen = document.getElementById('voting-screen');

    // Lobby Inputs
    const playerNameInput = document.getElementById('player-name');
    const roomNameInput = document.getElementById('room-name-input');
    const createRoomBtn = document.getElementById('create-room-btn');
    const gameDurationSlider = document.getElementById('game-duration-slider');
    const durationValueDisplay = document.getElementById('duration-value');

    // Game Elements
    const roomCodeDisplay = document.getElementById('room-code-display');
    const playerCountDisplay = document.getElementById('player-count');
    const rollBtn = document.getElementById('roll-btn');
    const stopBtn = document.getElementById('stop-btn');
    const deleteRoomGameBtn = document.getElementById('delete-room-game-btn');
    const resetGameBtn = document.getElementById('reset-game-btn');
    const leaveRoomBtn = document.getElementById('leave-room-btn');
    const letterDisplay = document.getElementById('current-letter');
    const categoriesContainer = document.getElementById('categories-container');
    const nextRoundBtn = document.getElementById('next-round-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const languageToggleBtn = document.getElementById('language-toggle');
    const playersList = document.getElementById('players-list');

    // Voting Elements (NEW BATCH VOTING)
    const votingCategoryTitle = document.getElementById('voting-category-title');
    const votingItemsContainer = document.getElementById('voting-items-container');
    const votedCountDisplay = document.getElementById('voted-count');
    const totalVotesCountDisplay = document.getElementById('total-votes-count');
    const voteTimer = document.getElementById('vote-timer');
    const voteTimeLeftDisplay = document.getElementById('vote-time-left');
    const voteProgressBar = document.getElementById('vote-progress-bar');
    const moreTimeBtn = document.getElementById('more-time-btn');

    let currentCategoryVotes = {}; // Store votes for current category
    let currentVotingCategory = null; // Track which category we're voting on
    let isRenderingVotes = false; // Prevent re-rendering while voting
    let isSubmittingVotes = false; // Prevent double submission
    let isProcessingCategory = false; // Prevent processing category results multiple times
    let isCalculatingScores = false; // Prevent calculating final scores multiple times


    // Circular timer removed - using sticky timer bar only

    // --- Toast Notification System ---
    const toastContainer = document.getElementById('toast-container');

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - Type: 'success', 'info', 'warning', 'error'
     * @param {number} duration - Duration in milliseconds (default: 5000)
     * @param {Object} action - Optional action: { text: string, callback: function, primary: boolean }
     */
    function showToast(message, type = 'info', duration = 5000, action = null) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // Icon based on type
        const icons = {
            success: '✓',
            info: 'ℹ',
            warning: '⚠',
            error: '✕'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <div class="toast-content">
                <p class="toast-message">${message}</p>
                ${action ? `
                    <div class="toast-actions">
                        <button class="toast-action-btn ${action.primary ? 'primary' : ''}" data-action="true">
                            ${action.text}
                        </button>
                    </div>
                ` : ''}
            </div>
            <button class="toast-close" aria-label="Close">×</button>
            ${duration > 0 ? '<div class="toast-progress"></div>' : ''}
        `;

        // Add to container
        toastContainer.appendChild(toast);

        // Close button handler
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => removeToast(toast));

        // Action button handler
        if (action) {
            const actionBtn = toast.querySelector('[data-action="true"]');
            actionBtn.addEventListener('click', () => {
                action.callback();
                removeToast(toast);
            });
        }

        // Progress bar animation
        if (duration > 0) {
            const progressBar = toast.querySelector('.toast-progress');
            if (progressBar) {
                // Trigger animation
                setTimeout(() => {
                    progressBar.style.transition = `width ${duration}ms linear`;
                    progressBar.style.width = '0%';
                }, 10);
            }

            // Auto-remove after duration
            setTimeout(() => removeToast(toast), duration);
        }

        // Trigger haptic feedback on mobile
        if ('vibrate' in navigator) {
            const vibrationPatterns = {
                success: [10, 30, 10],
                error: [20, 50, 20],
                warning: [10, 20, 10],
                info: [10]
            };
            navigator.vibrate(vibrationPatterns[type] || [10]);
        }

        return toast;
    }

    function removeToast(toast) {
        if (!toast || !toast.parentElement) return;

        toast.classList.add('toast-removing');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 300);
    }

    // --- Modal System ---
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContainer = modalOverlay?.querySelector('.modal-container');
    const modalIconWrapper = modalOverlay?.querySelector('.modal-icon-wrapper');
    const modalIcon = modalOverlay?.querySelector('.modal-icon');
    const modalTitle = modalOverlay?.querySelector('.modal-title');
    const modalMessage = modalOverlay?.querySelector('.modal-message');
    const modalCancelBtn = modalOverlay?.querySelector('.modal-cancel');
    const modalConfirmBtn = modalOverlay?.querySelector('.modal-confirm');

    let currentModalResolve = null;

    /**
     * Show a modal dialog
     * @param {string} title - Modal title
     * @param {string} message - Modal message
     * @param {Object} options - Modal options
     * @param {string} options.type - Type: 'warning', 'danger', 'info' (default: 'warning')
     * @param {string} options.confirmText - Confirm button text (default: t('confirm'))
     * @param {string} options.cancelText - Cancel button text (default: t('cancel'))
     * @param {boolean} options.confirmDanger - Make confirm button red (default: false)
     * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
     */
    function showModal(title, message, options = {}) {
        return new Promise((resolve) => {
            if (!modalOverlay) {
                console.error('Modal overlay not found');
                resolve(false);
                return;
            }

            const type = options.type || 'warning';
            const confirmText = options.confirmText || t('confirm');
            const cancelText = options.cancelText || t('cancel');
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

            // Store resolve function
            currentModalResolve = resolve;

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

    function closeModal(confirmed = false) {
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
            if (currentModalResolve) {
                currentModalResolve(confirmed);
                currentModalResolve = null;
            }
        }, 250);
    }

    // Modal event listeners
    if (modalOverlay) {
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
    }

    // --- Initialization ---
    async function init() {
        try {
            const userCred = await signInAnonymously(auth);
            currentUser = userCred.user;
            debugLog("Logged in as", currentUser.uid);

            // Load user data from Firestore (preferences + profile)
            const userData = await UserService.loadUserData(currentUser.uid);

            // Load language preference (Firestore → localStorage fallback)
            if (userData?.preferences?.language) {
                currentLanguage = userData.preferences.language;
            } else {
                currentLanguage = localStorage.getItem('language') || 'nl';
            }

            // Load theme preference (Firestore → localStorage fallback → default dark)
            if (userData?.preferences?.theme) {
                applyTheme(userData.preferences.theme);
            } else {
                const savedTheme = localStorage.getItem('theme');
                if (savedTheme) {
                    applyTheme(savedTheme);
                }
            }

            // Load player name (Firestore → localStorage fallback)
            if (userData?.profile?.name) {
                playerNameInput.value = userData.profile.name;
            } else {
                const savedName = localStorage.getItem('playerName');
                if (savedName) {
                    playerNameInput.value = savedName;
                }
            }
        } catch (e) {
            console.error("Auth error:", e);
            showToast(t('authError'), 'error', 6000);
        }

        createRoomBtn.addEventListener('click', createRoom);
        rollBtn.addEventListener('click', handleRollClick);
        stopBtn.addEventListener('click', handleStopClick);
        if (deleteRoomGameBtn) deleteRoomGameBtn.addEventListener('click', handleDeleteRoomClick);
        if (resetGameBtn) resetGameBtn.addEventListener('click', handleResetGameClick);
        if (leaveRoomBtn) leaveRoomBtn.addEventListener('click', handleLeaveRoomClick);

        if (shuffleBtn) shuffleBtn.addEventListener('click', handleShuffleClick);
        if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
        if (languageToggleBtn) languageToggleBtn.addEventListener('click', () => {
            setLanguage(currentLanguage === 'nl' ? 'en' : 'nl');
        });
        if (nextRoundBtn) nextRoundBtn.addEventListener('click', handleNextRound);

        // Initialize translations
        updateAllTranslations();

        // Voting event listeners removed - now using inline buttons in vote cards
        if (moreTimeBtn) moreTimeBtn.addEventListener('click', requestMoreVoteTime);

        // Duration slider
        if (gameDurationSlider) {
            gameDurationSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                durationValueDisplay.textContent = value;
                // Update plural/singular form
                const secondsLabel = durationValueDisplay.nextElementSibling;
                if (secondsLabel) {
                    secondsLabel.textContent = pluralize(value, t('second'), t('seconds'));
                }
            });
        }

        // Cleanup intervals on page unload/refresh
        window.addEventListener('beforeunload', () => {
            cleanupAllIntervals();
            if (activeRoomsUnsubscribe) activeRoomsUnsubscribe();
            if (roomUnsubscribe) roomUnsubscribe();
        });

        subscribeToActiveRooms();
    }

    // --- Room Discovery ---
    function subscribeToActiveRooms() {
        // BELANGRIJK: Stop bestaande listener eerst om memory leaks te voorkomen
        if (activeRoomsUnsubscribe) {
            activeRoomsUnsubscribe();
            activeRoomsUnsubscribe = null;
        }

        const roomsQuery = query(
            collection(db, "rooms"),
            where("status", "in", [ROOM_STATUS.LOBBY, ROOM_STATUS.PLAYING, ROOM_STATUS.VOTING, ROOM_STATUS.FINISHED]),
            orderBy("createdAt", "desc"),
            limit(10)
        );

        // Sla de unsubscribe functie op zodat we hem later kunnen aanroepen
        activeRoomsUnsubscribe = onSnapshot(roomsQuery, (snapshot) => {
            const rooms = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                rooms.push({ id: doc.id, ...data });
            });
            renderRoomsList(rooms);
        });
    }

    function stopActiveRoomsListener() {
        if (activeRoomsUnsubscribe) {
            activeRoomsUnsubscribe();
            activeRoomsUnsubscribe = null;
        }
    }

    function renderRoomsList(rooms) {
        const list = document.getElementById("active-rooms-list");

        if (rooms.length === 0) {
            list.innerHTML = `<p class="no-rooms">${t('noRooms')}</p>`;
            return;
        }

        list.innerHTML = rooms.map(room => {
            const playerCount = room.players?.length || 0;
            const hostName = room.players?.[0]?.name || "Unknown";
            const roomName = room.roomName || `${hostName}${t('defaultRoomName')}`;
            const isMyRoom = room.players?.some(p => p.uid === currentUser?.uid);
            const escapedRoomName = escapeHtml(roomName);
            const escapedHostName = escapeHtml(hostName);

            return `
                <div class="room-card" data-room-id="${room.id}">
                    <div class="room-header">
                        <div class="room-code">${room.id}</div>
                        ${isMyRoom ? `<button class="delete-room-btn" onclick="deleteRoom('${room.id}')" title="${t('deleteRoom')}">🗑️</button>` : ''}
                    </div>
                    <div class="room-name">${escapedRoomName}</div>
                    <div class="room-info">
                        <span class="room-host">${t('host')} ${escapedHostName}</span>
                        <span class="room-players">👤 ${playerCount}</span>
                    </div>
                    <button class="join-room-quick-btn" onclick="quickJoinRoom('${room.id}')">
                        ${t('joinRoom')}
                    </button>
                </div>
            `;
        }).join('');
    }

    // --- Dormant Room Reactivation ---
    async function reopenDormantRoom(roomRef, roomData, playerName, playerUid) {
        debugLog(`Reopening dormant room by creator ${roomData.creatorName}`);

        // Reactivate the room with the creator as the first player (host)
        await updateDoc(roomRef, {
            status: ROOM_STATUS.LOBBY,
            hostId: playerUid,
            players: [{
                uid: playerUid,
                name: playerName,
                score: 0,
                answers: {},
                isVerified: false,
                lastSeen: Date.now()
            }],
            currentLetter: '?',  // Reset game state
            votingState: null,
            lastActivity: Date.now()
        });

        return true;
    }

    window.quickJoinRoom = async function (code) {
        const name = playerNameInput.value.trim();
        if (!name) {
            showToast(t('enterName'), 'warning', 4000);
            playerNameInput.focus();
            return;
        }

        // Save name to localStorage as fallback
        localStorage.setItem('playerName', name);
        // Save name to Firestore user profile
        if (currentUser) {
            await UserService.saveProfile(currentUser.uid, { name: name });
        }

        roomId = code;

        const roomRef = doc(db, "rooms", code);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) {
            showToast(t('roomNotExist'), 'info', 4000);
            return;
        }

        const roomData = roomSnap.data();

        // Handle dormant room reactivation
        if (roomData.status === ROOM_STATUS.DORMANT) {
            // Only the original creator can reopen a dormant room
            if (roomData.creatorUid === currentUser.uid) {
                await reopenDormantRoom(roomRef, roomData, name, currentUser.uid);
                isHost = true;  // Creator becomes host when reopening
                enterGameUI(code);
                subscribeToRoom(code);
                startHeartbeat();
                return;
            } else {
                showToast(t('roomNotExist'), 'info', 4000);
                return;
            }
        }

        // Normal join flow for active rooms
        isHost = false;
        const existingPlayer = roomData.players.find(p => p.uid === currentUser.uid);

        if (existingPlayer) {
            // Player already exists, update their info
            const updatedPlayers = roomData.players.map(p =>
                p.uid === currentUser.uid
                    ? { ...p, name: name, lastSeen: Date.now() }
                    : p
            );
            await updateDoc(roomRef, {
                players: updatedPlayers,
                lastActivity: Date.now()
            });
        } else {
            // New player, add them
            await updateDoc(roomRef, {
                players: arrayUnion({ uid: currentUser.uid, name: name, score: 0, answers: {}, isVerified: false, lastSeen: Date.now() }),
                lastActivity: Date.now()
            });
        }

        enterGameUI(code);
        subscribeToRoom(code);
        startHeartbeat();
    };

    window.deleteRoom = async function (code) {
        const confirmed = await showModal(
            t('deleteRoom'),
            t('confirmDeleteRoom'),
            { type: 'danger', confirmText: t('delete'), confirmDanger: true }
        );

        if (!confirmed) return;

        try {
            const roomRef = doc(db, "rooms", code);
            await updateDoc(roomRef, {
                status: ROOM_STATUS.DELETED
            });
            showToast(t('roomDeletedSuccess'), 'success', 3000);
        } catch (e) {
            console.error("Error deleting room:", e);
            showToast(t('errorGeneric') + ': ' + e.message, 'error', 6000);
        }
    };

    window.kickPlayer = async function (playerUid) {
        if (!isHost) return;

        try {
            const roomRef = doc(db, "rooms", roomId);
            const roomSnap = await getDoc(roomRef);

            if (!roomSnap.exists()) return;

            const players = roomSnap.data().players;
            const playerToKick = players.find(p => p.uid === playerUid);

            if (!playerToKick) return;

            const confirmed = await showModal(
                t('kick') + ' ' + playerToKick.name + '?',
                t('confirmKick').replace('{name}', playerToKick.name),
                { type: 'warning', confirmText: t('kick'), confirmDanger: true }
            );

            if (!confirmed) return;

            const updatedPlayers = players.filter(p => p.uid !== playerUid);
            await updateDoc(roomRef, { players: updatedPlayers });

            debugLog(`${playerToKick.name} is uit de kamer verwijderd`);
            showToast(playerToKick.name + ' is verwijderd', 'info', 3000);
        } catch (e) {
            console.error("Error kicking player:", e);
            showToast(t('errorGeneric') + ': ' + e.message, 'error', 6000);
        }
    };

    // --- Multiplayer / Lobby Logic ---

    async function createRoom() {
        const name = playerNameInput.value.trim();
        if (!name) {
            showToast(t('enterName'), 'warning', 4000);
            playerNameInput.focus();
            return;
        }

        // Save name to localStorage as fallback
        localStorage.setItem('playerName', name);
        // Save name to Firestore user profile
        if (currentUser) {
            await UserService.saveProfile(currentUser.uid, { name: name });
        }

        const roomName = roomNameInput.value.trim() || `${name}${t('defaultRoomName')}`;
        const selectedDuration = parseInt(gameDurationSlider.value) || 30;
        const code = generateRoomCode();
        roomId = code;
        isHost = true;

        const roomRef = doc(db, "rooms", code);
        await setDoc(roomRef, {
            roomId: code,
            roomName: roomName,
            hostId: currentUser.uid,
            creatorUid: currentUser.uid,  // Track original creator for dormant room access
            creatorName: name,             // Track creator name for display
            status: ROOM_STATUS.LOBBY,
            currentLetter: '?',
            categories: getRandomCategories(),
            timerEnd: null,
            gameDuration: selectedDuration,
            players: [{ uid: currentUser.uid, name: name, score: 0, answers: {}, isVerified: false, lastSeen: Date.now() }],
            votingState: null,
            createdAt: Date.now(),
            lastActivity: Date.now()      // Track last activity for cleanup
        });

        enterGameUI(code);
        subscribeToRoom(code);
        startHeartbeat();
    }

    function subscribeToRoom(code) {
        if (roomUnsubscribe) roomUnsubscribe();

        roomUnsubscribe = onSnapshot(doc(db, "rooms", code), (doc) => {
            if (!doc.exists()) {
                // Room doesn't exist anymore
                returnToLobby(t('roomNotExist'));
                return;
            }

            const data = doc.data();

            // Check if room is deleted
            if (data.status === ROOM_STATUS.DELETED) {
                returnToLobby(t('roomDeleted'));
                return;
            }

            // Check if current player is still in the room
            const stillInRoom = data.players.some(p => p.uid === currentUser.uid);
            if (!stillInRoom) {
                returnToLobby(t('kickedFromRoom'));
                return;
            }

            roomData = data;
            updateGameState(data);
        });
    }

    // --- Game State Sync ---

    function updateGameState(data) {
        roomCodeDisplay.textContent = data.roomId;
        playerCountDisplay.textContent = `👤 ${data.players.length}`;
        renderPlayersList(data.players);

        // Update gameDuration from room data
        if (data.gameDuration) {
            gameDuration = data.gameDuration;
        }

        // Always update categories to ensure non-host players see changes
        // This fixes the issue where categories don't update after shuffle or new round
        if (JSON.stringify(activeCategories) !== JSON.stringify(data.categories)) {
            activeCategories = data.categories;
            renderCategories();
            updateInputPlaceholders();
        }

        if (data.currentLetter !== currentLetter) {
            currentLetter = data.currentLetter;
            letterDisplay.textContent = currentLetter;
            updateInputPlaceholders();
        }

        if (data.status === ROOM_STATUS.PLAYING && !isGameActive) {
            resultsShown = false; // Reset flag when new game starts
            startGameLocal();
        } else if (data.status === 'voting') {
            isGameActive = false;
            stopGameLocal();
            // Always call showVotingUI to update vote stats in real-time
            showVotingUI(data.votingState);
        } else if (data.status === ROOM_STATUS.FINISHED) {
            isGameActive = false;
            stopGameLocal();
            // Only show results once when transitioning to finished state
            if (!resultsShown) {
                resultsShown = true;
                showResults(data);
            }
        } else if (data.status === ROOM_STATUS.LOBBY) {
            resetBoard();
        }

        const wasHost = isHost;
        const shouldBeHost = currentUser.uid === data.players[0]?.uid;
        const waitingForHostLobbyMsg = document.getElementById('waiting-for-host-lobby');

        if (shouldBeHost) {
            isHost = true;

            // Enable/disable roll button based on status
            // Only enable in lobby state
            if (data.status === ROOM_STATUS.LOBBY) {
                rollBtn.disabled = false;
                rollBtn.classList.remove('hidden');
            } else if (data.status === ROOM_STATUS.PLAYING) {
                rollBtn.disabled = true;
                rollBtn.classList.remove('hidden');
            } else {
                // voting, finished states
                rollBtn.classList.add('hidden');
            }

            if (waitingForHostLobbyMsg) waitingForHostLobbyMsg.classList.add('hidden');

            // Stop button only visible during 'playing' state
            if (data.status === ROOM_STATUS.PLAYING) {
                stopBtn.classList.remove('hidden');
            } else {
                stopBtn.classList.add('hidden');
            }

            if (shuffleBtn) shuffleBtn.classList.remove('hidden');
            if (deleteRoomGameBtn) deleteRoomGameBtn.classList.remove('hidden');
            if (resetGameBtn) resetGameBtn.classList.remove('hidden');

            // Notify if just became host
            if (!wasHost && roomData) {
                debugLog("You are now the host!");
                // Show toast notification instead of alert
                setTimeout(() => {
                    showToast(t('nowHost'), 'info', 5000);
                }, 500);
            }

            // Auto-detect stuck states when host rejoins
            // If host is in voting/finished state and rejoining, offer to reset
            if (!wasHost && shouldBeHost && (data.status === 'voting' || data.status === ROOM_STATUS.FINISHED)) {
                debugLog('Detected host rejoin in problematic state:', data.status);
                setTimeout(() => {
                    showToast(
                        t('hostRejoinStuckState'),
                        'warning',
                        8000,
                        {
                            text: t('resetToLobby'),
                            callback: () => handleResetGameClick(),
                            primary: true
                        }
                    );
                }, 1000);
            }
        } else {
            isHost = false;
            rollBtn.classList.add('hidden');
            // Only show waiting message in lobby state
            if (waitingForHostLobbyMsg) {
                if (data.status === ROOM_STATUS.LOBBY) {
                    waitingForHostLobbyMsg.classList.remove('hidden');
                } else {
                    waitingForHostLobbyMsg.classList.add('hidden');
                }
            }
            stopBtn.classList.add('hidden');
            if (shuffleBtn) shuffleBtn.classList.add('hidden');
            if (deleteRoomGameBtn) deleteRoomGameBtn.classList.add('hidden');
            if (resetGameBtn) resetGameBtn.classList.add('hidden');
        }
    }

    function renderPlayersList(players) {
        // Genereer een hash van de relevante player data om onnodige re-renders te voorkomen
        const playerHash = players.map(p => `${p.uid}:${p.name}:${p.score}`).join('|');

        // Skip update als data niet is veranderd (voorkomt onnodige DOM updates)
        if (playerHash === lastPlayerListHash) {
            return;
        }

        // Debounce: wacht even voordat we daadwerkelijk renderen
        // Dit voorkomt meerdere re-renders bij snel opeenvolgende updates
        if (playerListDebounceTimer) {
            clearTimeout(playerListDebounceTimer);
        }

        playerListDebounceTimer = setTimeout(() => {
            lastPlayerListHash = playerHash;

            // PERFORMANCE OPTIMALISATIE: Diff-based rendering
            // In plaats van volledige innerHTML replacement, updaten we alleen wat nodig is
            const currentPlayerUIDs = new Set(players.map(p => p.uid));
            const existingPlayerUIDs = new Set(playerDOMCache.keys());

            // Verwijder spelers die niet meer in de lijst zitten
            for (const uid of existingPlayerUIDs) {
                if (!currentPlayerUIDs.has(uid)) {
                    const element = playerDOMCache.get(uid);
                    if (element && element.parentNode) {
                        element.remove();
                    }
                    playerDOMCache.delete(uid);
                }
            }

            // Update of creëer speler elementen
            players.forEach((p, index) => {
                const isMe = p.uid === currentUser.uid;
                const canKick = isHost && !isMe && players.length > 1;
                const escapedName = escapeHtml(p.name);
                const pointsText = pluralize(p.score, t('point'), t('points')).toLowerCase();

                let playerElement = playerDOMCache.get(p.uid);

                if (!playerElement) {
                    // Nieuw element maken
                    playerElement = document.createElement('span');
                    playerElement.className = `player-tag ${isMe ? 'me' : ''}`;
                    playerElement.dataset.uid = p.uid;
                    playerDOMCache.set(p.uid, playerElement);
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

    function enterGameUI(code) {
        // BELANGRIJK: Stop de active rooms listener bij het betreden van een kamer
        // Dit voorkomt onnodige Firebase reads terwijl je in een game zit
        stopActiveRoomsListener();

        lobbyScreen.classList.add('hidden');
        controlsPanel.classList.remove('hidden');
        gameBoard.classList.remove('hidden');
        roomCodeDisplay.textContent = code;

        // Only hide host buttons for non-host players
        // Host will see buttons immediately
        if (!isHost) {
            rollBtn.classList.add('hidden');
            stopBtn.classList.add('hidden');
            if (shuffleBtn) shuffleBtn.classList.add('hidden');
            if (deleteRoomGameBtn) deleteRoomGameBtn.classList.add('hidden');
            if (resetGameBtn) resetGameBtn.classList.add('hidden');

            const waitingForHostLobbyMsg = document.getElementById('waiting-for-host-lobby');
            if (waitingForHostLobbyMsg) waitingForHostLobbyMsg.classList.remove('hidden');
        }
    }

    function returnToLobby(message) {
        // Clean up all intervals to prevent memory leaks
        cleanupAllIntervals();

        // Unsubscribe from room
        if (roomUnsubscribe) {
            roomUnsubscribe();
            roomUnsubscribe = null;
        }

        // Reset local state
        roomId = null;
        isHost = false;
        roomData = null;
        isGameActive = false;

        // Hide all game screens
        controlsPanel.classList.add('hidden');
        gameBoard.classList.add('hidden');
        votingScreen.classList.add('hidden');
        resultsBoard.classList.add('hidden');

        // Show lobby screen
        lobbyScreen.classList.remove('hidden');

        // Show message if provided
        if (message) {
            showToast(message, 'info', 5000);
        }

        // Refresh room list
        subscribeToActiveRooms();
    }

    // --- Actions ---
    async function handleRollClick() {
        if (!isHost) return;
        try {
            const newLetter = getRandomLetter();

            // Update local state immediately to prevent showing '?'
            currentLetter = newLetter;
            letterDisplay.textContent = currentLetter;

            await updateDoc(doc(db, "rooms", roomId), {
                status: ROOM_STATUS.PLAYING,
                currentLetter: newLetter,
                timerEnd: Date.now() + (gameDuration * 1000),
                scoresCalculated: false,  // Reset for new round
                lastProcessedCategoryIndex: -1,  // Reset category index for new round
                // Keep existing scores, only reset answers and verifiedResults
                players: roomData.players.map(p => ({ ...p, answers: {}, verifiedResults: {} })),
                lastActivity: Date.now()
            });
        } catch (e) {
            console.error("Error starting game:", e);
            showToast(t('errorGeneric') + ': ' + e.message, 'error', 6000);
        }
    }

    async function handleStopClick() {
        if (!isHost) return;
        initiateVotingPhase();
    }

    async function handleShuffleClick() {
        if (!isHost) return;
        try {
            const newCats = getRandomCategories();
            await updateDoc(doc(db, "rooms", roomId), {
                categories: newCats,
                lastActivity: Date.now()
            });
        } catch (e) {
            console.error("Error shuffling categories:", e);
            showToast(t('errorGeneric') + ': ' + e.message, 'error', 6000);
        }
    }

    async function resetRoomToLobby() {
        // Reset timer and letter
        timeLeft = gameDuration;
        currentLetter = '?';
        document.getElementById('current-letter').textContent = '?';

        // Reset voting state variables
        currentCategoryVotes = {};
        currentVotingCategory = null;
        isRenderingVotes = false;
        isSubmittingVotes = false;
        isProcessingCategory = false;
        isCalculatingScores = false;

        // Keep scores, only reset answers and verifiedResults
        const resetPlayers = roomData.players.map(p => ({
            ...p,
            answers: {},
            verifiedResults: {}
        }));

        // Generate new random categories
        const newCategories = getRandomCategories();

        await updateDoc(doc(db, "rooms", roomId), {
            status: ROOM_STATUS.LOBBY,
            categories: newCategories,
            gameHistory: [],
            votingState: null,
            scoresCalculated: false,
            lastProcessedCategoryIndex: -1,
            players: resetPlayers,
            lastActivity: Date.now()
        });
    }

    async function handleNextRound() {
        if (!isHost) return;
        try {
            await resetRoomToLobby();
        } catch (e) {
            console.error("Error starting next round:", e);
            showToast(t('errorGeneric') + ': ' + e.message, 'error', 6000);
        }
    }

    async function handleResetGameClick() {
        if (!isHost) {
            showToast(t('onlyHostCanReset'), 'warning', 5000);
            return;
        }

        const confirmed = await showModal(
            t('resetToLobby'),
            t('confirmReset'),
            { type: 'warning', confirmText: t('confirm'), confirmDanger: true }
        );

        if (!confirmed) return;

        try {
            debugLog('Resetting game to lobby state');
            await resetRoomToLobby();
            debugLog('Game reset to lobby successfully');
            showToast(t('resetToLobby') + ' ✓', 'success', 3000);
        } catch (e) {
            console.error("Error resetting game:", e);
            showToast(t('errorGeneric') + ': ' + e.message, 'error', 6000);
        }
    }

    async function handleDeleteRoomClick() {
        debugLog("Delete room clicked", { isHost, roomId });

        if (!isHost) {
            showToast(t('onlyHostCanReset'), 'warning', 5000);
            return;
        }

        if (!roomId) {
            showToast(t('roomNotExist'), 'info', 4000);
            return;
        }

        const confirmed = await showModal(
            t('deleteRoom'),
            t('confirmDelete'),
            { type: 'danger', confirmText: t('delete'), confirmDanger: true }
        );

        if (!confirmed) return;

        try {
            // Unsubscribe first to prevent the listener from firing for the host
            if (roomUnsubscribe) roomUnsubscribe();
            cleanupAllIntervals(); // Clean up all intervals to prevent memory leaks

            const deletedRoomId = roomId;
            const roomRef = doc(db, "rooms", deletedRoomId);

            // Now update the room status (other players will get the toast via their listeners)
            await updateDoc(roomRef, {
                status: ROOM_STATUS.DELETED
            });

            // Reset local state
            roomId = null;
            isHost = false;
            roomData = null;
            playerDOMCache.clear(); // Clear player DOM cache (performance)

            // Return to lobby
            controlsPanel.classList.add('hidden');
            gameBoard.classList.add('hidden');
            resultsBoard.classList.add('hidden');
            votingScreen.classList.add('hidden');
            lobbyScreen.classList.remove('hidden');

            debugLog(`Room ${deletedRoomId} deleted!`);
            showToast(t('roomDeleted'), 'success', 3000);
        } catch (e) {
            console.error("Error deleting room:", e);
            showToast(t('errorGeneric') + ': ' + e.message, 'error', 6000);
        }
    }

    async function handleLeaveRoomClick() {
        if (!roomId) return;

        try {
            // Clean up all intervals to prevent memory leaks
            cleanupAllIntervals();

            // Remove player from room
            const updatedPlayers = roomData.players.filter(p => p.uid !== currentUser.uid);
            await updateDoc(doc(db, "rooms", roomId), {
                players: updatedPlayers,
                lastActivity: Date.now()
            });

            // Unsubscribe and return to lobby
            if (roomUnsubscribe) {
                roomUnsubscribe();
                roomUnsubscribe = null;
            }

            // Reset local state
            roomId = null;
            isHost = false;
            roomData = null;
            isGameActive = false;
            playerDOMCache.clear(); // Clear player DOM cache (performance)

            // Return to lobby
            controlsPanel.classList.add('hidden');
            gameBoard.classList.add('hidden');
            resultsBoard.classList.add('hidden');
            votingScreen.classList.add('hidden');
            lobbyScreen.classList.remove('hidden');

            // Refresh room list
            subscribeToActiveRooms();
        } catch (e) {
            console.error("Error leaving room:", e);
            showToast(t('errorGeneric') + ': ' + e.message, 'error', 6000);
        }
    }

    // --- Heartbeat & Activity Tracking ---
    function startHeartbeat() {
        stopHeartbeat(); // Clear any existing interval

        // Update immediately
        updatePlayerHeartbeat();

        // Update elke HEARTBEAT_INTERVAL_MS (30s) - geoptimaliseerd voor Firebase kosten
        // Host doet ook cleanup, maar minder frequent dan voorheen
        heartbeatInterval = setInterval(() => {
            updatePlayerHeartbeat();
            if (isHost) {
                cleanupInactivePlayers();
            }
        }, CONSTANTS.HEARTBEAT_INTERVAL_MS);
    }

    function stopHeartbeat() {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    }

    /**
     * Central cleanup function for all intervals
     * Prevents memory leaks by ensuring all intervals are cleared
     */
    function cleanupAllIntervals() {
        debugLog('Cleaning up all intervals');

        // Stop heartbeat interval
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }

        // Stop game timer interval
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        // Stop vote timer interval
        if (voteTimerInterval) {
            clearInterval(voteTimerInterval);
            voteTimerInterval = null;
        }
    }

    async function updatePlayerHeartbeat(retryCount = 0) {
        if (!roomId || !currentUser) return;

        try {
            const roomRef = doc(db, "rooms", roomId);
            const roomSnap = await getDoc(roomRef);

            if (!roomSnap.exists()) {
                debugLog("Room no longer exists, stopping heartbeat");
                stopHeartbeat();
                return;
            }

            const players = roomSnap.data().players;
            const playerExists = players.find(p => p.uid === currentUser.uid);

            if (!playerExists) {
                debugLog("Player no longer in room, stopping heartbeat");
                stopHeartbeat();
                return;
            }

            const updatedPlayers = players.map(p =>
                p.uid === currentUser.uid
                    ? { ...p, lastSeen: Date.now() }
                    : p
            );

            await updateDoc(roomRef, { players: updatedPlayers });
            debugLog("Heartbeat updated successfully");
        } catch (e) {
            console.error("Heartbeat error:", e);

            // Retry up to 3 times with exponential backoff
            if (retryCount < 3) {
                const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Max 5s delay
                debugLog(`Retrying heartbeat in ${retryDelay}ms (attempt ${retryCount + 1}/3)`);
                setTimeout(() => updatePlayerHeartbeat(retryCount + 1), retryDelay);
            } else {
                console.error("Heartbeat failed after 3 retries, but keeping connection alive");
                // Don't stop heartbeat - next interval will try again
            }
        }
    }

    async function cleanupInactivePlayers() {
        if (!roomId || !isHost) return;

        try {
            const roomRef = doc(db, "rooms", roomId);
            const roomSnap = await getDoc(roomRef);

            if (!roomSnap.exists()) return;

            const data = roomSnap.data();
            const players = data.players;
            const now = Date.now();

            // Increased threshold to 2 minutes to be more forgiving
            // Also add grace period during voting (3 minutes)
            const isVoting = data.status === ROOM_STATUS.VOTING;
            const inactiveThreshold = isVoting ? CONSTANTS.VOTING_INACTIVE_THRESHOLD_MS : CONSTANTS.INACTIVE_THRESHOLD_MS; // 3min during voting, 2min otherwise

            const activePlayers = players.filter(p => {
                const timeSinceLastSeen = now - (p.lastSeen || 0);
                const isActive = timeSinceLastSeen < inactiveThreshold;

                // Log inactivity status for debugging
                if (!isActive) {
                    debugLog(`Player ${p.name} (${p.uid}) inactive for ${Math.round(timeSinceLastSeen / 1000)}s (threshold: ${inactiveThreshold/1000}s)`);
                }

                return isActive;
            });

            // Only update if players were removed
            if (activePlayers.length < players.length) {
                const removedCount = players.length - activePlayers.length;
                const removedPlayers = players.filter(p => !activePlayers.find(ap => ap.uid === p.uid));
                debugLog(`Removing ${removedCount} inactive player(s):`, removedPlayers.map(p => p.name).join(', '));

                // Check if the first player (host) was removed
                const oldHostUid = players[0]?.uid;
                const newHostUid = activePlayers[0]?.uid;

                if (activePlayers.length > 0) {
                    // PERFORMANCE: Combine multiple updates into single write
                    const updateData = {
                        players: activePlayers,
                        lastActivity: Date.now()
                    };

                    // Log host change if it happened
                    if (oldHostUid !== newHostUid) {
                        debugLog(`Host changed from ${players[0]?.name} to ${activePlayers[0]?.name}`);
                        updateData.hostId = newHostUid;
                    }

                    await updateDoc(roomRef, updateData);
                } else {
                    // No players left, set room to dormant to preserve word library
                    debugLog("No active players left, setting room to dormant (preserving library)");
                    await updateDoc(roomRef, {
                        status: ROOM_STATUS.DORMANT,
                        players: [],
                        lastActivity: Date.now()
                    });
                }
            }
        } catch (e) {
            console.error("Cleanup error:", e);
        }
    }

    // --- Local Logic ---
    function startGameLocal() {
        isGameActive = true;
        gameBoard.classList.remove('hidden');
        resultsBoard.classList.add('hidden');
        votingScreen.classList.add('hidden');
        categoriesContainer.classList.remove('hidden');

        // Show sticky timer
        const stickyTimerBar = document.getElementById('sticky-timer-bar');
        if (stickyTimerBar) stickyTimerBar.classList.add('active');

        enableInputs();
        startTimerLocal();
    }

    function stopGameLocal() {
        clearInterval(timerInterval);
        disableInputs();
        saveMyAnswers();

        // Hide sticky timer
        const stickyTimerBar = document.getElementById('sticky-timer-bar');
        if (stickyTimerBar) stickyTimerBar.classList.remove('active');
    }

    function startTimerLocal() {
        timeLeft = gameDuration;
        updateTimerDisplay();
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                if (isHost && roomData.status === ROOM_STATUS.PLAYING) {
                    initiateVotingPhase();
                }
            }
        }, 1000);
    }

    async function saveMyAnswers() {
        const myAnswers = {};
        activeCategories.forEach(cat => {
            const safeId = cat.replace(/[&\s]/g, '-').toLowerCase();
            const val = document.getElementById(`input-${safeId}`).value.trim();
            if (val) myAnswers[cat] = val;
        });

        const roomRef = doc(db, "rooms", roomId);
        const freshSnap = await getDoc(roomRef);
        if (!freshSnap.exists()) return;

        const freshPlayers = freshSnap.data().players;
        const myIdx = freshPlayers.findIndex(p => p.uid === currentUser.uid);
        if (myIdx !== -1) {
            freshPlayers[myIdx].answers = myAnswers;
            await updateDoc(roomRef, { players: freshPlayers });
        }
    }

    // --- Voting System ---

    async function initiateVotingPhase() {
        try {
            await updateDoc(doc(db, "rooms", roomId), {
                status: ROOM_STATUS.VOTING,
                votingState: null,
                lastActivity: Date.now()
            });
            setTimeout(processNextCategory, 2000);
        } catch (e) {
            console.error("Error initiating voting phase:", e);
            showToast(t('errorGeneric') + ': ' + e.message, 'error', 6000);
        }
    }

    // NEW BATCH VOTING SYSTEM - Process entire category at once
    async function processNextCategory() {
        if (!isHost) return;

        const roomRef = doc(db, "rooms", roomId);
        const snap = await getDoc(roomRef);
        const data = snap.data();

        // Auto-approve library answers for ALL players first (only once at the start)
        // Check if this is the first call by seeing if any player has verifiedResults
        const isFirstCall = !data.players.some(p => p.verifiedResults && Object.keys(p.verifiedResults).length > 0);

        // Track if we did auto-approvals
        let didAutoApprove = false;

        if (isFirstCall) {
            debugLog('First processNextCategory call - auto-approving library answers');
            const currentHistory = data.gameHistory || [];
            let hasUpdatedPlayers = false;

            for (let pIndex = 0; pIndex < data.players.length; pIndex++) {
                const player = data.players[pIndex];
                for (const cat of activeCategories) {
                    const answer = player.answers[cat];
                    if (!answer) continue;

                    if (player.verifiedResults && player.verifiedResults[cat]) continue;

                    // Check if already in history (e.g., from previous voting)
                    const existingHistoryEntry = currentHistory.find(entry =>
                        entry.playerName === player.name &&
                        entry.category === cat &&
                        normalizeAnswer(entry.answer) === normalizeAnswer(answer)
                    );

                    if (existingHistoryEntry) {
                        debugLog(`Skipping auto-approve for ${player.name} - ${cat}: ${answer} (already in history)`);
                        // Mark as verified using the existing history entry's result
                        // This prevents it from being voted on again
                        if (!player.verifiedResults) player.verifiedResults = {};
                        player.verifiedResults[cat] = {
                            isValid: existingHistoryEntry.isValid,
                            answer: answer,
                            points: 0
                        };
                        hasUpdatedPlayers = true;
                        continue;
                    }

                    const isKnown = await checkLibrary(cat, answer);
                    if (isKnown) {
                        await markAnswerVerified(pIndex, cat, answer, true, true);
                        didAutoApprove = true;
                    }
                }
            }

            // Save updated players if we marked any as verified from history
            if (hasUpdatedPlayers) {
                debugLog('Updating players with verified results from history');
                await updateDoc(roomRef, {
                    players: data.players
                });
            }

            if (didAutoApprove) {
                debugLog('Auto-approve complete, refreshing data for voting phase');
            }
        }

        // Now process categories one at a time for batch voting
        // Always get fresh data to ensure we have latest verifiedResults
        const freshSnap = await getDoc(roomRef);
        const freshData = freshSnap.data();

        // Start from the next category after the last processed one
        // lastProcessedCategoryIndex is set by processCategoryResults after each vote
        // It's reset to -1 at the start of each new round
        const lastProcessed = freshData.lastProcessedCategoryIndex;
        const startIndex = (lastProcessed !== undefined && lastProcessed >= 0)
            ? lastProcessed + 1
            : 0;

        debugLog(`Processing categories starting from index ${startIndex} (lastProcessed: ${lastProcessed})`);

        for (let catIndex = startIndex; catIndex < activeCategories.length; catIndex++) {
            const cat = activeCategories[catIndex];

            // Collect all unverified answers for this category
            const answersToVote = [];
            for (let pIndex = 0; pIndex < freshData.players.length; pIndex++) {
                const player = freshData.players[pIndex];
                const answer = player.answers[cat];
                if (!answer) continue; // Skip empty answers

                if (player.verifiedResults && player.verifiedResults[cat]) continue; // Already verified

                answersToVote.push({
                    playerIndex: pIndex,
                    playerName: player.name,
                    playerUid: player.uid,
                    answer: answer
                });
            }

            // If there are answers to vote on for this category, set voting state
            if (answersToVote.length > 0) {
                debugLog(`Setting up voting for category ${cat} (index ${catIndex}) with ${answersToVote.length} answers`);
                await updateDoc(roomRef, {
                    votingState: {
                        category: cat,
                        categoryIndex: catIndex,
                        answers: answersToVote,
                        votes: {}, // votes[voterUid][targetUid] = true/false
                        allPlayersVoted: {} // allPlayersVoted[uid] = true when done
                    },
                    currentVotingCategory: cat
                });
                return; // Stop here, wait for votes
            }
        }

        // All categories processed - calculate final scores
        // Wait a moment to ensure all Firebase writes are propagated
        debugLog('All categories processed, waiting before calculating final scores...');
        await new Promise(resolve => setTimeout(resolve, 500));

        // Transaction-based score calculation prevents race conditions
        debugLog('Starting score calculation...');
        calculateFinalScores();
    }

    // Update only vote stats without re-rendering entire UI
    function updateVoteStats(state) {
        if (!state || !state.answers) {
            debugLog('updateVoteStats: no state or answers');
            return;
        }

        debugLog('updateVoteStats: Updating vote stats for', state.answers.length, 'answers');

        const answers = state.answers || [];
        const sortedAnswers = answers.sort((a, b) => a.playerIndex - b.playerIndex);

        sortedAnswers.forEach((answerData, index) => {
            const voteKey = `${answerData.playerUid}_${index}`;

            // Calculate vote stats for this answer (from both live votes and submitted votes)
            const votesForThisAnswer = {};

            // First get live votes from state.votes
            Object.entries(state.votes || {}).forEach(([voterUid, voterVotes]) => {
                if (voterVotes[voteKey] !== undefined) {
                    votesForThisAnswer[voterUid] = voterVotes[voteKey];
                }
            });

            // Then get submitted votes from state.allPlayersVoted (these are finalized)
            Object.entries(state.allPlayersVoted || {}).forEach(([voterUid, voterVotes]) => {
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
                    const p = roomData.players.find(pl => pl.uid === uid);
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
        checkIfAllPlayersVoted(state);
    }

    // NEW BATCH VOTING UI - Show all answers for category at once
    function showVotingUI(state) {
        if (!state) {
            votingScreen.classList.remove('hidden');
            gameBoard.classList.add('hidden');
            votingItemsContainer.innerHTML = '<p style="text-align: center; opacity: 0.7;">' + t('loading') + '</p>';
            isRenderingVotes = false;
            return;
        }

        // Reset votes when switching to a new category
        if (currentVotingCategory !== state.category) {
            debugLog(`Switching to new category: ${state.category}`);
            currentCategoryVotes = {}; // Clear votes from previous category
            currentVotingCategory = state.category;
            isRenderingVotes = false; // Allow fresh render
            isSubmittingVotes = false; // Reset submission flag for new category
        }

        // If already showing this category, just update vote stats instead of full re-render
        if (currentVotingCategory === state.category && isRenderingVotes) {
            debugLog('Already rendering this category, updating vote stats only');
            updateVoteStats(state);
            return;
        }

        isRenderingVotes = true;

        votingScreen.classList.remove('hidden');
        gameBoard.classList.add('hidden');
        resultsBoard.classList.add('hidden');
        // Keep categories visible during voting so players can see what they're voting on
        categoriesContainer.classList.remove('hidden');

        // Set category title - only if category is defined
        if (state.category) {
            const translationKey = 'categories.' + state.category;
            const translatedCategory = t(translationKey);
            votingCategoryTitle.textContent = translatedCategory;
        } else {
            votingCategoryTitle.textContent = '...';
        }

        // Clear and render all answer cards
        votingItemsContainer.innerHTML = '';

        const answers = state.answers || [];
        // Sort by playerIndex to maintain stable order (prevents jumping)
        const sortedAnswers = answers.sort((a, b) => a.playerIndex - b.playerIndex);

        sortedAnswers.forEach((answerData, index) => {
            const isMyAnswer = answerData.playerUid === currentUser.uid;
            const voteKey = `${answerData.playerUid}_${index}`;

            // Check if we already voted on this answer (only from finalized votes, not previousVotes)
            let myVote = state.allPlayersVoted?.[currentUser.uid]?.[voteKey];
            if (myVote !== undefined) {
                currentCategoryVotes[voteKey] = myVote;
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
            Object.entries(state.votes || {}).forEach(([voterUid, voterVotes]) => {
                if (voterVotes[voteKey] !== undefined) {
                    votesForThisAnswer[voterUid] = voterVotes[voteKey];
                }
            });

            // Then get submitted votes from state.allPlayersVoted (these are finalized)
            Object.entries(state.allPlayersVoted || {}).forEach(([voterUid, voterVotes]) => {
                if (voterVotes[voteKey] !== undefined) {
                    votesForThisAnswer[voterUid] = voterVotes[voteKey];
                }
            });

            const yesCount = Object.values(votesForThisAnswer).filter(v => v === true).length;
            const noCount = Object.values(votesForThisAnswer).filter(v => v === false).length;

            // Create voter names list - sort by player name for stable order
            const voterNamesList = Object.entries(votesForThisAnswer)
                .map(([uid, vote]) => {
                    const p = roomData.players.find(pl => pl.uid === uid);
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
            const rejectLabel = currentLanguage === 'nl'
                ? `Keur af: ${answerData.answer} door ${answerData.playerName}`
                : `Reject: ${answerData.answer} by ${answerData.playerName}`;
            const approveLabel = currentLanguage === 'nl'
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
                currentCategoryVotes[voteKey] = voteValue;

                // Update button states and ARIA attributes
                const container = e.currentTarget.closest('.voting-item');
                container.querySelectorAll('.vote-btn').forEach(b => {
                    b.classList.remove('selected');
                    b.setAttribute('aria-pressed', 'false');
                });
                e.currentTarget.classList.add('selected');
                e.currentTarget.setAttribute('aria-pressed', 'true');

                // Update progress
                updateVotingProgress(answers.length);

                // Sync to Firebase
                syncVoteToFirebase(voteKey, voteValue);
            });
        });

        // Update vote counter
        totalVotesCountDisplay.textContent = answers.length;
        updateVotingProgress(answers.length);

        // Always restart timer for new category render
        startVoteTimer();
    }

    function updateVotingProgress(totalCount) {
        const votedCount = Object.keys(currentCategoryVotes).length;
        votedCountDisplay.textContent = votedCount;

        // Auto-submit when all votes are cast
        if (votedCount >= totalCount) {
            debugLog('All votes cast, auto-submitting...');
            submitCategoryVotes();
        }
    }

    async function syncVoteToFirebase(voteKey, voteValue) {
        if (!roomId || !currentUser) return;

        try {
            const roomRef = doc(db, "rooms", roomId);
            const key = `votingState.votes.${currentUser.uid}.${voteKey}`;
            await updateDoc(roomRef, { [key]: voteValue });
        } catch (e) {
            console.error("Error syncing vote:", e);
        }
    }

    async function submitCategoryVotes() {
        if (!roomData || !roomData.votingState) return;
        if (isSubmittingVotes) {
            debugLog('Already submitting votes, skipping...');
            return;
        }

        isSubmittingVotes = true;
        // Don't stop timer yet - let it keep running until next category loads

        try {
            // Auto-approve any unanswered votes
            const state = roomData.votingState;
            const answers = state.answers || [];

            answers.forEach((answerData, index) => {
                const voteKey = `${answerData.playerUid}_${index}`;
                if (currentCategoryVotes[voteKey] === undefined) {
                    currentCategoryVotes[voteKey] = true; // Auto-approve
                }
            });

            // Submit all votes to Firebase
            const roomRef = doc(db, "rooms", roomId);
            const updates = {};
            updates[`votingState.allPlayersVoted.${currentUser.uid}`] = currentCategoryVotes;

            await updateDoc(roomRef, updates);

            // Host checks if all players voted
            if (isHost) {
                setTimeout(() => checkAllPlayersVoted(), 500);
            }
        } catch (e) {
            console.error("Error submitting votes:", e);
            showToast(t('errorGeneric') + ': ' + e.message, 'error', 6000);
        } finally {
            // Reset flag after 2 seconds
            setTimeout(() => {
                isSubmittingVotes = false;
            }, 2000);
        }
    }

    // Check if all players voted (for non-host players, to know when voting is complete)
    function checkIfAllPlayersVoted(state) {
        if (!state || !roomData) return;

        const allPlayersVoted = state.allPlayersVoted || {};
        const playerCount = roomData.players.length;
        const votedCount = Object.keys(allPlayersVoted).length;

        debugLog(`Voting progress: ${votedCount}/${playerCount} players voted`);

        // If all players voted and we're the host, process results
        // Only trigger if not already processing
        if (isHost && votedCount >= playerCount && !isProcessingCategory) {
            debugLog('All players voted, processing category results...');
            processCategoryResults(state);
        }
    }

    async function checkAllPlayersVoted() {
        if (!isHost) return;

        // Read fresh from Firebase to ensure we have the latest votes
        const roomRef = doc(db, "rooms", roomId);
        const freshSnap = await getDoc(roomRef);
        const freshData = freshSnap.data();

        if (!freshData.votingState) {
            debugLog('checkAllPlayersVoted: No voting state, skipping');
            return;
        }

        const state = freshData.votingState;
        const allPlayersVoted = state.allPlayersVoted || {};
        const playerCount = freshData.players.length;
        const votedCount = Object.keys(allPlayersVoted).length;

        debugLog(`Voting progress: ${votedCount}/${playerCount} players voted`);

        if (votedCount >= playerCount && !isProcessingCategory) {
            // Everyone voted - process results
            debugLog('All players voted, processing category results...');
            await processCategoryResults(state);
        }
    }

    async function processCategoryResults(stateParam) {
        if (!isHost) return;

        // Local guard to prevent multiple calls from same client
        if (isProcessingCategory) {
            debugLog('Already processing category locally, skipping duplicate call');
            return;
        }

        isProcessingCategory = true;

        // PERFORMANCE: Collect approved answers for batch library write (outside transaction)
        let approvedAnswers = [];

        try {
            const roomRef = doc(db, "rooms", roomId);

            // Use transaction to atomically check and process category results
            // This prevents race conditions when multiple clients try to process simultaneously
            await runTransaction(db, async (transaction) => {
                const roomDoc = await transaction.get(roomRef);
                if (!roomDoc.exists()) {
                    throw new Error("Room does not exist");
                }

                const freshData = roomDoc.data();
                const state = freshData.votingState;

                if (!state) {
                    debugLog('No voting state found in Firebase, aborting transaction');
                    return; // Transaction completes without writing
                }

                // Check if this category was already processed
                const lastProcessedIndex = freshData.lastProcessedCategoryIndex ?? -1;
                if (state.categoryIndex <= lastProcessedIndex) {
                    debugLog(`Category ${state.categoryIndex} already processed (lastProcessed: ${lastProcessedIndex}), aborting`);
                    return; // Transaction completes without writing
                }

                debugLog(`Transaction won, processing category results for: ${state.category}, index: ${state.categoryIndex}`);

                const players = freshData.players;
                const history = freshData.gameHistory || [];
                const answers = state.answers || [];

                // Tally votes for each answer
                for (let i = 0; i < answers.length; i++) {
                    const answerData = answers[i];
                    const voteKey = `${answerData.playerUid}_${i}`;

                    // Collect all votes for this answer
                    const votesForAnswer = {};
                    Object.entries(state.allPlayersVoted || {}).forEach(([voterUid, voterVotes]) => {
                        if (voterVotes[voteKey] !== undefined) {
                            votesForAnswer[voterUid] = voterVotes[voteKey];
                        }
                    });

                    // Calculate verdict (majority wins, ties approve)
                    const yesVotes = Object.values(votesForAnswer).filter(v => v === true).length;
                    const noVotes = Object.values(votesForAnswer).filter(v => v === false).length;
                    const isApproved = yesVotes >= noVotes;

                    // Mark answer as verified
                    if (!players[answerData.playerIndex].verifiedResults) {
                        players[answerData.playerIndex].verifiedResults = {};
                    }
                    players[answerData.playerIndex].verifiedResults[state.category] = {
                        isValid: isApproved,
                        answer: answerData.answer,
                        points: 0
                    };

                    // Add to history (only if not already in history from auto-approval)
                    const alreadyInHistory = history.some(entry =>
                        entry.playerName === answerData.playerName &&
                        entry.category === state.category &&
                        normalizeAnswer(entry.answer) === normalizeAnswer(answerData.answer)
                    );

                    if (!alreadyInHistory) {
                        debugLog(`Adding voted history entry for ${answerData.playerName} - ${state.category}: ${answerData.answer}`);
                        history.push({
                            playerName: answerData.playerName,
                            category: state.category,
                            answer: answerData.answer,
                            isValid: isApproved,
                            isAuto: false,
                            votes: votesForAnswer
                        });
                    } else {
                        debugLog(`Skipping duplicate history entry for ${answerData.playerName} - ${state.category}: ${answerData.answer}`);
                    }

                    // Collect approved answers for batch write (outside transaction for performance)
                    if (isApproved) {
                        approvedAnswers.push({ category: state.category, answer: answerData.answer });
                    }
                }

                // Update database atomically within transaction
                // Store the categoryIndex before clearing votingState
                const updateData = {
                    players: players,
                    votingState: null,
                    gameHistory: history
                };
                // Only set lastProcessedCategoryIndex if it's a valid number
                if (typeof state.categoryIndex === 'number') {
                    updateData.lastProcessedCategoryIndex = state.categoryIndex;
                }
                transaction.update(roomRef, updateData);
            });

            // PERFORMANCE: Batch write approved answers to library (outside transaction)
            if (approvedAnswers.length > 0) {
                debugLog(`Batch writing ${approvedAnswers.length} approved answers to library`);
                const batch = writeBatch(db);

                approvedAnswers.forEach(({ category, answer }) => {
                    const cleanWord = normalizeAnswer(answer);
                    const letter = currentLetter;
                    const docId = `${roomId}_${category}_${letter}_${cleanWord}`.replace(/\s/g, '_');
                    const libraryDocRef = doc(db, "library", docId);

                    batch.set(libraryDocRef, {
                        roomId: roomId,
                        category: category,
                        letter: letter,
                        word: answer,
                        cleanWord: cleanWord,
                        approvedAt: Date.now()
                    }, { merge: true });
                });

                await batch.commit();
                debugLog(`Batch write complete for ${approvedAnswers.length} library entries`);
            }

            // Continue to next category after transaction completes
            setTimeout(() => processNextCategory(), 1000);
        } catch (error) {
            console.error('Error processing category results:', error);
        } finally {
            // Always reset flag
            isProcessingCategory = false;
        }
    }

    function startVoteTimer() {
        debugLog('Starting vote timer');
        stopVoteTimer();
        voteTimeLeft = 30; // 30 seconds for batch voting
        voteMaxTime = 30; // Track max time for percentage calculation
        voteTimer.classList.remove('hidden');
        moreTimeBtn.classList.add('hidden');

        updateVoteTimerDisplay();

        voteTimerInterval = setInterval(() => {
            voteTimeLeft--;
            updateVoteTimerDisplay();

            if (voteTimeLeft === 0) {
                debugLog("Vote timeout - auto-submitting with current votes");
                clearInterval(voteTimerInterval);
                voteTimerInterval = null;
                // Auto-submit with current votes (unanswered = auto-approve)
                submitCategoryVotes();
            } else if (voteTimeLeft <= 5 && moreTimeBtn.classList.contains('hidden')) {
                // Show "More Time" button in last 5 seconds
                moreTimeBtn.classList.remove('hidden');
            }
        }, 1000);
    }

    function stopVoteTimer() {
        if (voteTimerInterval) {
            clearInterval(voteTimerInterval);
            voteTimerInterval = null;
        }
        voteTimer.classList.add('hidden');
    }

    function updateVoteTimerDisplay() {
        voteTimeLeftDisplay.textContent = voteTimeLeft;

        // Update progress bar width
        const percentage = (voteTimeLeft / voteMaxTime) * 100;
        voteProgressBar.style.width = percentage + '%';

        // Change progress bar color when time is running out
        if (voteTimeLeft <= 5) {
            voteProgressBar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
            voteProgressBar.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.5)';
        } else {
            voteProgressBar.style.background = 'linear-gradient(90deg, var(--accent-color), var(--secondary-color))';
            voteProgressBar.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.5)';
        }
    }

    function requestMoreVoteTime() {
        voteTimeLeft += 10;
        voteMaxTime += 10; // Also increase max time so percentage stays accurate
        moreTimeBtn.classList.add('hidden');
        updateVoteTimerDisplay(); // Update display immediately
        debugLog("Added 10 seconds to vote timer");
    }

    // OLD VOTING FUNCTIONS - Removed for batch voting system
    // castVote() and checkVotingComplete() replaced by new system

    async function markAnswerVerified(pIdx, cat, answer, isValid, isAuto) {
        const roomRef = doc(db, "rooms", roomId);

        const freshSnap = await getDoc(roomRef);
        const players = freshSnap.data().players;
        const history = freshSnap.data().gameHistory || [];

        if (!players[pIdx].verifiedResults) players[pIdx].verifiedResults = {};
        players[pIdx].verifiedResults[cat] = { isValid: isValid, answer: answer, points: 0 };

        // Track history for infographic - only add for auto-approved items
        // Normal voted items will get their entry in processCategoryResults
        if (isAuto) {
            debugLog(`Adding auto-approve history entry for ${players[pIdx].name} - ${cat}: ${answer}`);
            history.push({
                playerName: players[pIdx].name,
                category: cat,
                answer: answer,
                isValid: isValid,
                isAuto: true,
                votes: null
            });
        }

        if (isValid) addToLibrary(cat, answer);

        await updateDoc(roomRef, {
            players: players,
            votingState: null,
            gameHistory: history
        });
    }

    // --- Library & Scoring ---
    // --- Utilities ---
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function normalizeAnswer(str) {
        if (!str) return "";
        return str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/[^a-z0-9]/g, "");      // Keep only simple alphanumerics
    }

    function levenshteinDistance(a, b) {
        // Create matrix
        const matrix = [];

        // Increment along the first column of each row
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        // Increment each column in the first row
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        // Fill in the rest of the matrix
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        Math.min(
                            matrix[i][j - 1] + 1, // insertion
                            matrix[i - 1][j] + 1  // deletion
                        )
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    function areWordsFuzzyMatching(word1, word2) {
        const w1 = normalizeAnswer(word1);
        const w2 = normalizeAnswer(word2);

        if (w1 === w2) return true; // Direct match

        // Don't fuzzy match very short answers (≤ 2 chars) - they must be exact
        // This prevents "1" matching with "3", "a" matching with "b", etc.
        const len = Math.max(w1.length, w2.length);
        if (len <= 2) return false;

        const dist = levenshteinDistance(w1, w2);

        // Rules:
        // Length > 4: Allow 2 typos (for "Amsterdam" vs "Amsterdm")
        // Length 3-4: Allow 1 typo (for "Den" vs "Dan")
        if (len > 4) {
            return dist <= 2;
        } else {
            return dist <= 1;
        }
    }

    function generateRoomCode() {
        return Math.random().toString(36).substring(2, 6).toUpperCase();
    }

    function getRandomCategories() {
        return [...allCategories].sort(() => 0.5 - Math.random()).slice(0, 6);
    }

    function getRandomLetter() {
        const letters = "ABCDEFGHIJKLMNOPRSTUVWZ";
        return letters[Math.floor(Math.random() * letters.length)];
    }

    // --- Library & Scoring ---

    async function checkLibrary(category, word) {
        const cleanWord = normalizeAnswer(word);
        const letter = currentLetter;
        const docId = `${roomId}_${category}_${letter}_${cleanWord}`.replace(/\s/g, '_');
        const docRef = doc(db, "library", docId);
        const snap = await getDoc(docRef);
        return snap.exists();
    }

    async function addToLibrary(category, word) {
        const cleanWord = normalizeAnswer(word);
        const letter = currentLetter;
        const docId = `${roomId}_${category}_${letter}_${cleanWord}`.replace(/\s/g, '_');
        await setDoc(doc(db, "library", docId), {
            roomId: roomId,
            category: category,
            letter: letter,
            word: word,
            cleanWord: cleanWord,
            approvedAt: Date.now()
        }, { merge: true });
    }

    async function calculateFinalScores() {
        // Local flag to prevent multiple calls from same client
        if (isCalculatingScores) {
            debugLog("Already calculating scores locally, skipping duplicate call");
            return;
        }

        isCalculatingScores = true;
        debugLog("Starting Score Calculation with transaction...");

        const roomRef = doc(db, "rooms", roomId);

        try {
            // Use transaction to atomically check and set scoresCalculated
            // This prevents multiple clients from calculating scores simultaneously
            await runTransaction(db, async (transaction) => {
                const roomDoc = await transaction.get(roomRef);
                if (!roomDoc.exists()) {
                    throw new Error("Room does not exist");
                }

                const roomData = roomDoc.data();

                // Atomic check: if already calculated, abort transaction
                if (roomData.scoresCalculated) {
                    debugLog("Scores already calculated (checked in transaction), aborting");
                    return; // Transaction will complete without writing
                }

                debugLog("This client won the transaction lock, calculating scores...");

                const players = roomData.players;

                // Calculate round scores (don't reset total scores)
                const roundScores = {};
                players.forEach(p => {
                    roundScores[p.uid] = 0;
                });

                // Use categories from roomData, not local activeCategories which may be stale
                const categories = roomData.categories || [];
                for (const cat of categories) {
                    debugLog(`Scoring Category: ${cat}`);
                    const validAnswers = [];

                    // 1. Collect Valid Answers
                    players.forEach(p => {
                        if (p.verifiedResults && p.verifiedResults[cat]) {
                            const res = p.verifiedResults[cat];
                            debugLog(`Player ${p.name} - ${cat}: ${res.answer} (Valid: ${res.isValid})`);
                            if (res.isValid) {
                                validAnswers.push({
                                    uid: p.uid,
                                    answer: normalizeAnswer(res.answer)
                                });
                            }
                        } else {
                            debugLog(`Player ${p.name} - ${cat}: No verified result`);
                        }
                    });

                    // 2. Assign Points
                    players.forEach(p => {
                        const res = p.verifiedResults ? p.verifiedResults[cat] : null;
                        if (res && res.isValid) {
                            const myAns = normalizeAnswer(res.answer);

                            // Fuzzy duplicate check
                            const othersWithSame = validAnswers.filter(a => a.uid !== p.uid && areWordsFuzzyMatching(a.answer, myAns));
                            const othersWithAny = validAnswers.filter(a => a.uid !== p.uid);

                            if (othersWithSame.length > 0) {
                                res.points = 5; // Shared (or close enough!)
                                debugLog(` -> Match found for '${myAns}' with '${othersWithSame[0].answer}'`);
                            } else if (othersWithAny.length === 0) {
                                res.points = 20;
                            } else {
                                res.points = 10;
                            }
                            debugLog(`-> ${p.name} gets ${res.points} pts for '${res.answer}'`);
                            roundScores[p.uid] += res.points;
                        }
                    });
                }

                // Add round scores to existing total scores (accumulate across rounds)
                players.forEach(p => {
                    const currentScore = p.score || 0;
                    const roundScore = roundScores[p.uid];
                    p.score = currentScore + roundScore;
                });

                debugLog("Round Scores:", players.map(p => `${p.name}: +${roundScores[p.uid]}`));
                debugLog("Total Scores:", players.map(p => `${p.name}: ${p.score}`));

                // Update history with points information
                const history = roomData.gameHistory || [];
                history.forEach(entry => {
                    const player = players.find(p => p.name === entry.playerName);
                    if (player && player.verifiedResults && player.verifiedResults[entry.category]) {
                        const result = player.verifiedResults[entry.category];
                        entry.points = result.points || 0;

                        // Add reasoning
                        if (result.points === 20) entry.pointsReason = t('uniqueAnswer');
                        else if (result.points === 10) entry.pointsReason = t('onlyInCategory');
                        else if (result.points === 5) entry.pointsReason = t('sharedAnswer');
                        else entry.pointsReason = t('notApproved');
                    }
                });

                // Atomic write: update all data including scoresCalculated flag
                transaction.update(roomRef, {
                    players: players,
                    status: ROOM_STATUS.FINISHED,
                    votingState: null,
                    gameHistory: history,
                    scoresCalculated: true,
                    lastActivity: Date.now()
                });

                debugLog("Score calculation complete (transaction committed)");
            });
        } catch (error) {
            console.error("Error in score calculation transaction:", error);
        } finally {
            // Always reset local flag
            isCalculatingScores = false;
        }
    }

    /**
     * Calculate ranks for players based on their scores.
     * Players with equal scores get the same rank, and the next rank skips accordingly.
     * Example: scores [15, 15, 10, 5] -> ranks [1, 1, 3, 4]
     *
     * @param {Array} sortedPlayers - Array of players sorted by score (highest first)
     * @returns {Array<number>} - Array of rank numbers corresponding to each player
     */
    function calculateRanks(sortedPlayers) {
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

    function showResults(data) {
        gameBoard.classList.add('hidden');
        votingScreen.classList.add('hidden');
        resultsBoard.classList.remove('hidden');

        const sortedPlayers = [...data.players].sort((a, b) => b.score - a.score);
        const ranks = calculateRanks(sortedPlayers);

        // Winner Confetti! (For all players with the highest score)
        // PERFORMANCE: Lazy load confetti library alleen wanneer nodig
        if (sortedPlayers.length > 0) {
            const topScore = sortedPlayers[0].score;
            const isWinner = topScore > 0 && sortedPlayers.some(p => p.score === topScore && p.uid === currentUser.uid);

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
        if (isHost) {
            nextRoundBtn.classList.remove('hidden');
            waitingForHostMsg.classList.add('hidden');
        } else {
            nextRoundBtn.classList.add('hidden');
            waitingForHostMsg.classList.remove('hidden');
        }

        // Render game history infographic
        renderGameLog(data);
    }

    function renderGameLog(data) {
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

    function resetBoard() {
        resultsBoard.classList.add('hidden');
        votingScreen.classList.add('hidden');
        enterGameUI(roomId);
        letterDisplay.textContent = '?';
        updateTimerDisplay();
        renderCategories();
        categoriesContainer.classList.remove('hidden');

        // Hide sticky timer when returning to lobby
        const stickyTimerBar = document.getElementById('sticky-timer-bar');
        if (stickyTimerBar) stickyTimerBar.classList.remove('active');
    }

    // --- Utilities ---

    function applyTheme(theme) {
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

    function toggleTheme() {
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
        if (currentUser) {
            UserService.savePreference(currentUser.uid, 'theme', theme);
        }
    }

    function renderCategories() {
        categoriesContainer.innerHTML = '';
        activeCategories.forEach(cat => {
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

    function updateInputPlaceholders() {
        activeCategories.forEach(cat => {
            const safeId = cat.replace(/[&\s]/g, '-').toLowerCase();
            const translatedCat = t('categories.' + cat);
            const input = document.getElementById(`input-${safeId}`);
            if (input) input.placeholder = `${translatedCat} ${currentLanguage === 'nl' ? 'met' : 'with'} ${currentLetter}`;
        });
    }

    function updateTimerDisplay() {
        // Update sticky timer bar only (circular timer removed)
        const stickyTimerText = document.getElementById('sticky-timer-text');
        const stickyTimerProgress = document.getElementById('sticky-timer-progress');
        const stickyTimerLetter = document.getElementById('sticky-timer-letter');
        if (stickyTimerText && stickyTimerProgress) {
            stickyTimerText.textContent = Math.max(0, timeLeft);
            const percentage = (timeLeft / gameDuration) * 100;
            stickyTimerProgress.style.width = percentage + '%';

            // Update letter display
            if (stickyTimerLetter) {
                stickyTimerLetter.textContent = currentLetter;
            }

            // Change color when time is running out
            if (timeLeft <= 10) {
                stickyTimerProgress.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
                stickyTimerProgress.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.5)';
            } else {
                stickyTimerProgress.style.background = 'linear-gradient(90deg, var(--accent-color), var(--secondary-color))';
                stickyTimerProgress.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.5)';
            }
        }
    }

    function enableInputs() {
        const inputs = document.querySelectorAll('.category-input-group input');
        inputs.forEach(input => {
            input.disabled = false;
            input.value = '';
        });
        if (inputs.length > 0) inputs[0].focus();
    }

    function disableInputs() {
        const inputs = document.querySelectorAll('.category-input-group input');
        inputs.forEach(input => input.disabled = true);
    }

    // Start
    init();
});
