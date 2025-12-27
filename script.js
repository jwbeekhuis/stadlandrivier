import { db, collection, doc, setDoc, onSnapshot, updateDoc, getDoc, getDocs, writeBatch, arrayUnion, query, where, orderBy, limit, signInAnonymously, auth, UserService } from './firebase-config.js?v=105';
import { translations } from './translations.js?v=105';

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
            console.error(`Translation missing for key: "${key}"`, {
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
    let roomData = null; // Store full room data
    let heartbeatInterval = null;
    let voteTimerInterval = null;
    let voteTimeLeft = 0;
    let voteMaxTime = 15;
    let resultsShown = false; // Track if results have been shown for current round

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

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => removeToast(toast), duration);
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

    // --- Initialization ---
    async function init() {
        try {
            const userCred = await signInAnonymously(auth);
            currentUser = userCred.user;
            console.log("Logged in as", currentUser.uid);

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
            alert("Er ging iets mis met inloggen. Controleer je internetverbinding en Firebase config.");
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
                durationValueDisplay.textContent = e.target.value;
            });
        }

        subscribeToActiveRooms();
    }

    // --- Room Discovery ---
    function subscribeToActiveRooms() {
        const roomsQuery = query(
            collection(db, "rooms"),
            where("status", "in", ["lobby", "playing", "voting", "finished"]),  // Excludes only dormant and deleted rooms
            orderBy("createdAt", "desc"),
            limit(10)
        );

        onSnapshot(roomsQuery, (snapshot) => {
            const rooms = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                rooms.push({ id: doc.id, ...data });
            });
            renderRoomsList(rooms);
        });
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
            const roomName = room.roomName || `${hostName}'s Kamer`;
            const isMyRoom = room.players?.some(p => p.uid === currentUser?.uid);

            return `
                <div class="room-card" data-room-id="${room.id}">
                    <div class="room-header">
                        <div class="room-code">${room.id}</div>
                        ${isMyRoom ? `<button class="delete-room-btn" onclick="deleteRoom('${room.id}')" title="${t('deleteRoom')}">🗑️</button>` : ''}
                    </div>
                    <div class="room-name">${roomName}</div>
                    <div class="room-info">
                        <span class="room-host">${t('host')} ${hostName}</span>
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
        console.log(`Reopening dormant room by creator ${roomData.creatorName}`);

        // Reactivate the room with the creator as the first player (host)
        await updateDoc(roomRef, {
            status: 'lobby',
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
        if (!name) return alert(t('enterName'));

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
            return alert(t('roomNotExist'));
        }

        const roomData = roomSnap.data();

        // Handle dormant room reactivation
        if (roomData.status === 'dormant') {
            // Only the original creator can reopen a dormant room
            if (roomData.creatorUid === currentUser.uid) {
                await reopenDormantRoom(roomRef, roomData, name, currentUser.uid);
                isHost = true;  // Creator becomes host when reopening
                enterGameUI(code);
                subscribeToRoom(code);
                startHeartbeat();
                return;
            } else {
                return alert(t('roomNotExist'));  // Non-creators see it as non-existent
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
        if (!confirm("Weet je zeker dat je deze kamer wilt verwijderen?")) {
            return;
        }

        try {
            const roomRef = doc(db, "rooms", code);
            await updateDoc(roomRef, {
                status: 'deleted'
            });
            alert("Kamer verwijderd!");
        } catch (e) {
            console.error("Error deleting room:", e);
            alert("Fout bij verwijderen: " + e.message);
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

            if (!confirm(t('confirmKick').replace('{name}', playerToKick.name))) {
                return;
            }

            const updatedPlayers = players.filter(p => p.uid !== playerUid);
            await updateDoc(roomRef, { players: updatedPlayers });

            console.log(`${playerToKick.name} is uit de kamer verwijderd`);
        } catch (e) {
            console.error("Error kicking player:", e);
            alert("Fout bij verwijderen speler: " + e.message);
        }
    };

    // --- Multiplayer / Lobby Logic ---

    async function createRoom() {
        const name = playerNameInput.value.trim();
        if (!name) return alert(t('enterName'));

        // Save name to localStorage as fallback
        localStorage.setItem('playerName', name);
        // Save name to Firestore user profile
        if (currentUser) {
            await UserService.saveProfile(currentUser.uid, { name: name });
        }

        const roomName = roomNameInput.value.trim() || `${name}'s Kamer`;
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
            status: 'lobby',
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

    async function joinRoom() {
        const name = playerNameInput.value.trim();
        const code = roomCodeInput.value.trim().toUpperCase();
        if (!name) return alert("Vul eerst je naam in!");
        if (code.length !== 4) return alert("Ongeldige code");

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
            return alert("Kamer niet gevonden!");
        }

        const roomData = roomSnap.data();

        // Handle dormant room reactivation
        if (roomData.status === 'dormant') {
            // Only the original creator can reopen a dormant room
            if (roomData.creatorUid === currentUser.uid) {
                await reopenDormantRoom(roomRef, roomData, name, currentUser.uid);
                isHost = true;  // Creator becomes host when reopening
                enterGameUI(code);
                subscribeToRoom(code);
                startHeartbeat();
                return;
            } else {
                return alert("Kamer niet gevonden!");  // Non-creators see it as non-existent
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
            if (data.status === 'deleted') {
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

        if (data.status === 'playing' && !isGameActive) {
            resultsShown = false; // Reset flag when new game starts
            startGameLocal();
        } else if (data.status === 'voting') {
            isGameActive = false;
            stopGameLocal();
            // Always call showVotingUI to update vote stats in real-time
            showVotingUI(data.votingState);
        } else if (data.status === 'finished') {
            isGameActive = false;
            stopGameLocal();
            // Only show results once when transitioning to finished state
            if (!resultsShown) {
                resultsShown = true;
                showResults(data);
            }
        } else if (data.status === 'lobby') {
            resetBoard();
        }

        const wasHost = isHost;
        const shouldBeHost = currentUser.uid === data.players[0]?.uid;
        const waitingForHostLobbyMsg = document.getElementById('waiting-for-host-lobby');

        if (shouldBeHost) {
            isHost = true;

            // Enable/disable roll button based on status
            // Only enable in lobby state
            if (data.status === 'lobby') {
                rollBtn.disabled = false;
                rollBtn.classList.remove('hidden');
            } else if (data.status === 'playing') {
                rollBtn.disabled = true;
                rollBtn.classList.remove('hidden');
            } else {
                // voting, finished states
                rollBtn.classList.add('hidden');
            }

            if (waitingForHostLobbyMsg) waitingForHostLobbyMsg.classList.add('hidden');

            // Stop button only visible during 'playing' state
            if (data.status === 'playing') {
                stopBtn.classList.remove('hidden');
            } else {
                stopBtn.classList.add('hidden');
            }

            if (shuffleBtn) shuffleBtn.classList.remove('hidden');
            if (deleteRoomGameBtn) deleteRoomGameBtn.classList.remove('hidden');
            if (resetGameBtn) resetGameBtn.classList.remove('hidden');

            // Notify if just became host
            if (!wasHost && roomData) {
                console.log("You are now the host!");
                // Show toast notification instead of alert
                setTimeout(() => {
                    showToast(t('nowHost'), 'info', 5000);
                }, 500);
            }

            // Auto-detect stuck states when host rejoins
            // If host is in voting/finished state and rejoining, offer to reset
            if (!wasHost && shouldBeHost && (data.status === 'voting' || data.status === 'finished')) {
                console.log('Detected host rejoin in problematic state:', data.status);
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
                if (data.status === 'lobby') {
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
        playersList.innerHTML = players.map(p => {
            const isMe = p.uid === currentUser.uid;
            const canKick = isHost && !isMe && players.length > 1;

            return `
                <span class="player-tag ${isMe ? 'me' : ''}">
                    ${p.name} (${p.score} ${t('points').toLowerCase()})
                    ${canKick ? `<button class="kick-player-btn" onclick="kickPlayer('${p.uid}')" title="${t('confirmKick').replace('{name}', '')}"><i class="fa-solid fa-xmark"></i></button>` : ''}
                </span>
            `;
        }).join('');
    }

    function enterGameUI(code) {
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
        // Stop heartbeat
        stopHeartbeat();

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
            alert(message);
        }

        // Refresh room list
        subscribeToActiveRooms();
    }

    // --- Actions ---
    async function handleRollClick() {
        if (!isHost) return;
        const newLetter = getRandomLetter();

        // Update local state immediately to prevent showing '?'
        currentLetter = newLetter;
        letterDisplay.textContent = currentLetter;

        await updateDoc(doc(db, "rooms", roomId), {
            status: 'playing',
            currentLetter: newLetter,
            timerEnd: Date.now() + (gameDuration * 1000),
            scoresCalculated: false,  // Reset for new round
            lastProcessedCategoryIndex: -1,  // Reset category index for new round
            // Keep existing scores, only reset answers and verifiedResults
            players: roomData.players.map(p => ({ ...p, answers: {}, verifiedResults: {} })),
            lastActivity: Date.now()
        });
    }

    async function handleStopClick() {
        if (!isHost) return;
        initiateVotingPhase();
    }

    async function handleShuffleClick() {
        if (!isHost) return;
        const newCats = getRandomCategories();
        await updateDoc(doc(db, "rooms", roomId), {
            categories: newCats,
            lastActivity: Date.now()
        });
    }

    async function handleNextRound() {
        if (!isHost) return;

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
            // Keep score intact - accumulate across rounds
            answers: {},
            verifiedResults: {}
        }));

        // Generate new random categories for the next round
        const newCategories = getRandomCategories();

        await updateDoc(doc(db, "rooms", roomId), {
            status: 'lobby',
            categories: newCategories,
            gameHistory: [],
            votingState: null,  // Reset voting state in database
            scoresCalculated: false,  // Reset scores calculated flag for new round
            lastProcessedCategoryIndex: -1,  // Reset category index for new round
            players: resetPlayers,
            lastActivity: Date.now()
        });
    }

    async function handleResetGameClick() {
        if (!isHost) {
            showToast(t('onlyHostCanReset'), 'warning', 5000);
            return;
        }

        if (!confirm(t('confirmReset'))) {
            return;
        }

        console.log('Resetting game to lobby state');

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
            // Keep score intact - accumulate across rounds
            answers: {},
            verifiedResults: {}
        }));

        // Generate new random categories for the reset
        const newCategories = getRandomCategories();

        await updateDoc(doc(db, "rooms", roomId), {
            status: 'lobby',
            categories: newCategories,
            gameHistory: [],
            votingState: null,
            scoresCalculated: false,
            lastProcessedCategoryIndex: -1,
            players: resetPlayers,
            lastActivity: Date.now()
        });

        console.log('Game reset to lobby successfully');
    }

    async function handleDeleteRoomClick() {
        console.log("Delete room clicked", { isHost, roomId });

        if (!isHost) {
            alert(t('confirmDelete'));
            return;
        }

        if (!roomId) {
            alert(t('roomNotExist'));
            return;
        }

        if (!confirm(t('confirmDelete'))) {
            return;
        }

        try {
            // Unsubscribe first to prevent the listener from firing for the host
            if (roomUnsubscribe) roomUnsubscribe();
            stopHeartbeat();

            const deletedRoomId = roomId;
            const roomRef = doc(db, "rooms", deletedRoomId);

            // Now update the room status (other players will get the alert via their listeners)
            await updateDoc(roomRef, {
                status: 'deleted'
            });

            // Reset local state
            roomId = null;
            isHost = false;
            roomData = null;

            // Return to lobby
            controlsPanel.classList.add('hidden');
            gameBoard.classList.add('hidden');
            resultsBoard.classList.add('hidden');
            votingScreen.classList.add('hidden');
            lobbyScreen.classList.remove('hidden');

            console.log(`Room ${deletedRoomId} deleted!`);
            alert(t('roomDeleted'));
        } catch (e) {
            console.error("Error deleting room:", e);
            alert("Error: " + e.message);
        }
    }

    async function handleLeaveRoomClick() {
        if (!roomId) return;

        try {
            // Stop heartbeat first so we don't get marked inactive
            stopHeartbeat();

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
            alert("Error: " + e.message);
        }
    }

    // --- Heartbeat & Activity Tracking ---
    function startHeartbeat() {
        stopHeartbeat(); // Clear any existing interval

        // Update immediately
        updatePlayerHeartbeat();

        // Then update every 5 seconds (increased frequency to prevent false positives)
        heartbeatInterval = setInterval(() => {
            updatePlayerHeartbeat();
            if (isHost) {
                cleanupInactivePlayers();
            }
        }, 5000);
    }

    function stopHeartbeat() {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    }

    async function updatePlayerHeartbeat(retryCount = 0) {
        if (!roomId || !currentUser) return;

        try {
            const roomRef = doc(db, "rooms", roomId);
            const roomSnap = await getDoc(roomRef);

            if (!roomSnap.exists()) {
                console.log("Room no longer exists, stopping heartbeat");
                stopHeartbeat();
                return;
            }

            const players = roomSnap.data().players;
            const playerExists = players.find(p => p.uid === currentUser.uid);

            if (!playerExists) {
                console.log("Player no longer in room, stopping heartbeat");
                stopHeartbeat();
                return;
            }

            const updatedPlayers = players.map(p =>
                p.uid === currentUser.uid
                    ? { ...p, lastSeen: Date.now() }
                    : p
            );

            await updateDoc(roomRef, { players: updatedPlayers });
            console.log("Heartbeat updated successfully");
        } catch (e) {
            console.error("Heartbeat error:", e);

            // Retry up to 3 times with exponential backoff
            if (retryCount < 3) {
                const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Max 5s delay
                console.log(`Retrying heartbeat in ${retryDelay}ms (attempt ${retryCount + 1}/3)`);
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
            const isVoting = data.status === 'voting';
            const inactiveThreshold = isVoting ? 180000 : 120000; // 3min during voting, 2min otherwise

            const activePlayers = players.filter(p => {
                const timeSinceLastSeen = now - (p.lastSeen || 0);
                const isActive = timeSinceLastSeen < inactiveThreshold;

                // Log inactivity status for debugging
                if (!isActive) {
                    console.log(`Player ${p.name} (${p.uid}) inactive for ${Math.round(timeSinceLastSeen / 1000)}s (threshold: ${inactiveThreshold/1000}s)`);
                }

                return isActive;
            });

            // Only update if players were removed
            if (activePlayers.length < players.length) {
                const removedCount = players.length - activePlayers.length;
                const removedPlayers = players.filter(p => !activePlayers.find(ap => ap.uid === p.uid));
                console.log(`Removing ${removedCount} inactive player(s):`, removedPlayers.map(p => p.name).join(', '));

                // Check if the first player (host) was removed
                const oldHostUid = players[0]?.uid;
                const newHostUid = activePlayers[0]?.uid;

                if (activePlayers.length > 0) {
                    await updateDoc(roomRef, {
                        players: activePlayers,
                        lastActivity: Date.now()
                    });

                    // Log host change if it happened
                    if (oldHostUid !== newHostUid) {
                        console.log(`Host changed from ${players[0]?.name} to ${activePlayers[0]?.name}`);

                        // Update hostId in room data for consistency
                        await updateDoc(roomRef, { hostId: newHostUid });
                    }
                } else {
                    // No players left, set room to dormant to preserve word library
                    console.log("No active players left, setting room to dormant (preserving library)");
                    await updateDoc(roomRef, {
                        status: 'dormant',
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
                if (isHost && roomData.status === 'playing') {
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
        await updateDoc(doc(db, "rooms", roomId), {
            status: 'voting',
            votingState: null,
            lastActivity: Date.now()
        });
        setTimeout(processNextCategory, 2000);
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
            console.log('First processNextCategory call - auto-approving library answers');
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
                        console.log(`Skipping auto-approve for ${player.name} - ${cat}: ${answer} (already in history)`);
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
                console.log('Updating players with verified results from history');
                await updateDoc(roomRef, {
                    players: data.players
                });
            }

            if (didAutoApprove) {
                console.log('Auto-approve complete, refreshing data for voting phase');
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

        console.log(`Processing categories starting from index ${startIndex} (lastProcessed: ${lastProcessed})`);

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
                console.log(`Setting up voting for category ${cat} (index ${catIndex}) with ${answersToVote.length} answers`);
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
        console.log('All categories processed, calculating final scores');
        const finalSnap = await getDoc(roomRef);
        calculateFinalScores(finalSnap.data());
    }

    // Update only vote stats without re-rendering entire UI
    function updateVoteStats(state) {
        if (!state || !state.answers) {
            console.log('updateVoteStats: no state or answers');
            return;
        }

        console.log('updateVoteStats: Updating vote stats for', state.answers.length, 'answers');

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

            console.log(`Vote stats for ${answerData.answer}: ${yesCount}✅ ${noCount}❌`);

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
                    console.log(`Updated vote stats for item ${index}`);
                } else {
                    console.log(`No vote-stats div found for item ${index}`);
                }
            } else {
                console.log(`No voting item found at index ${index}`);
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
            console.log(`Switching to new category: ${state.category}`);
            currentCategoryVotes = {}; // Clear votes from previous category
            currentVotingCategory = state.category;
            isRenderingVotes = false; // Allow fresh render
            isSubmittingVotes = false; // Reset submission flag for new category
        }

        // If already showing this category, just update vote stats instead of full re-render
        if (currentVotingCategory === state.category && isRenderingVotes) {
            console.log('Already rendering this category, updating vote stats only');
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
            const itemDiv = document.createElement('div');
            itemDiv.className = 'voting-item';
            itemDiv.innerHTML = `
                <div class="voting-item-header">
                    <span class="voting-player-name">${answerData.playerName}</span>
                    ${isMyAnswer ? '<span class="own-answer-badge">' + t('yourAnswer') + '</span>' : ''}
                    ${isDuplicate ? '<span class="duplicate-badge">' + t('duplicate') + ' ' + duplicates[0].playerName + '</span>' : ''}
                </div>
                <div class="voting-answer-text">${answerData.answer}</div>
                <div class="voting-item-actions">
                    <button class="vote-btn vote-no ${myVote === false ? 'selected' : ''}" data-vote-key="${voteKey}" data-vote="false">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    <button class="vote-btn vote-yes ${myVote === true ? 'selected' : ''}" data-vote-key="${voteKey}" data-vote="true">
                        <i class="fa-solid fa-check"></i>
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

                // Update button states
                const container = e.currentTarget.closest('.voting-item');
                container.querySelectorAll('.vote-btn').forEach(b => b.classList.remove('selected'));
                e.currentTarget.classList.add('selected');

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
            console.log('All votes cast, auto-submitting...');
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
            console.log('Already submitting votes, skipping...');
            return;
        }

        isSubmittingVotes = true;
        // Don't stop timer yet - let it keep running until next category loads

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

        // Reset flag after 2 seconds
        setTimeout(() => {
            isSubmittingVotes = false;
        }, 2000);
    }

    // Check if all players voted (for non-host players, to know when voting is complete)
    function checkIfAllPlayersVoted(state) {
        if (!state || !roomData) return;

        const allPlayersVoted = state.allPlayersVoted || {};
        const playerCount = roomData.players.length;
        const votedCount = Object.keys(allPlayersVoted).length;

        console.log(`Voting progress: ${votedCount}/${playerCount} players voted`);

        // If all players voted and we're the host, process results
        // Only trigger if not already processing
        if (isHost && votedCount >= playerCount && !isProcessingCategory) {
            console.log('All players voted, processing category results...');
            processCategoryResults(state);
        }
    }

    async function checkAllPlayersVoted() {
        if (!isHost || !roomData.votingState) return;

        const state = roomData.votingState;
        const allPlayersVoted = state.allPlayersVoted || {};
        const playerCount = roomData.players.length;
        const votedCount = Object.keys(allPlayersVoted).length;

        console.log(`Voting progress: ${votedCount}/${playerCount} players voted`);

        if (votedCount >= playerCount && !isProcessingCategory) {
            // Everyone voted - process results
            console.log('All players voted, processing category results...');
            await processCategoryResults(state);
        }
    }

    async function processCategoryResults(state) {
        if (!isHost) return;
        if (isProcessingCategory) {
            console.log('Already processing category, skipping duplicate call');
            return;
        }

        isProcessingCategory = true;
        console.log('Processing category results for:', state.category);

        const roomRef = doc(db, "rooms", roomId);
        const freshSnap = await getDoc(roomRef);
        const freshData = freshSnap.data();
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
                console.log(`Adding voted history entry for ${answerData.playerName} - ${state.category}: ${answerData.answer}`);
                history.push({
                    playerName: answerData.playerName,
                    category: state.category,
                    answer: answerData.answer,
                    isValid: isApproved,
                    isAuto: false,
                    votes: votesForAnswer
                });
            } else {
                console.log(`Skipping duplicate history entry for ${answerData.playerName} - ${state.category}: ${answerData.answer}`);
            }

            // Add to library if approved
            if (isApproved) {
                addToLibrary(state.category, answerData.answer);
            }
        }

        // Update database and move to next category
        // Store the categoryIndex before clearing votingState
        await updateDoc(roomRef, {
            players: players,
            votingState: null,
            gameHistory: history,
            lastProcessedCategoryIndex: state.categoryIndex
        });

        // Reset flag before moving to next category
        isProcessingCategory = false;

        // Continue to next category
        setTimeout(() => processNextCategory(), 1000);
    }

    function startVoteTimer() {
        console.log('Starting vote timer');
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
                console.log("Vote timeout - auto-submitting with current votes");
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
        console.log("Added 10 seconds to vote timer");
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
            console.log(`Adding auto-approve history entry for ${players[pIdx].name} - ${cat}: ${answer}`);
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

        if (isHost && !isAuto) processNextVoteItem();
    }

    // --- Library & Scoring ---
    // --- Utilities ---
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
        return [...allCategories].sort(() => 0.5 - Math.random()).slice(0, 5);
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

    async function calculateFinalScores(data) {
        // Check if scores were already calculated for this round
        if (data.scoresCalculated) {
            console.log("Scores already calculated for this round, skipping");
            return;
        }

        if (isCalculatingScores) {
            console.log("Already calculating scores, skipping duplicate call");
            return;
        }

        isCalculatingScores = true;
        console.log("Starting Score Calculation...");
        const players = data.players;

        // Calculate round scores (don't reset total scores)
        const roundScores = {};
        players.forEach(p => {
            roundScores[p.uid] = 0;
        });

        for (const cat of activeCategories) {
            console.log(`Scoring Category: ${cat}`);
            const validAnswers = [];

            // 1. Collect Valid Answers
            players.forEach(p => {
                if (p.verifiedResults && p.verifiedResults[cat]) {
                    const res = p.verifiedResults[cat];
                    console.log(`Player ${p.name} - ${cat}: ${res.answer} (Valid: ${res.isValid})`);
                    if (res.isValid) {
                        // Store both normalized and distinct original for display if needed? 
                        // No logic only cares about normalized matches
                        validAnswers.push({
                            uid: p.uid,
                            answer: normalizeAnswer(res.answer)
                        });
                    }
                } else {
                    console.log(`Player ${p.name} - ${cat}: No verified result`);
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
                        console.log(` -> Match found for '${myAns}' with '${othersWithSame[0].answer}'`);
                    } else if (othersWithAny.length === 0) {
                        res.points = 20;
                    } else {
                        res.points = 10;
                    }
                    console.log(`-> ${p.name} gets ${res.points} pts for '${res.answer}'`);
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

        console.log("Round Scores:", players.map(p => `${p.name}: +${roundScores[p.uid]}`));
        console.log("Total Scores:", players.map(p => `${p.name}: ${p.score}`));

        // Update history with points information
        const history = data.gameHistory || [];
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

        await updateDoc(doc(db, "rooms", roomId), {
            players: players,
            status: 'finished',
            votingState: null,
            gameHistory: history,
            scoresCalculated: true,  // Mark that scores have been calculated for this round
            lastActivity: Date.now()
        });

        // Reset flag after database update completes
        isCalculatingScores = false;
        console.log("Score calculation complete");
    }

    function showResults(data) {
        gameBoard.classList.add('hidden');
        votingScreen.classList.add('hidden');
        resultsBoard.classList.remove('hidden');

        const sortedPlayers = [...data.players].sort((a, b) => b.score - a.score);

        // Winner Confetti! (Only for the winner)
        if (sortedPlayers.length > 0 && sortedPlayers[0].score > 0 && sortedPlayers[0].uid === currentUser.uid) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#22c55e', '#38bdf8', '#ffffff']
            });
        }

        const list = document.getElementById('results-list');
        list.innerHTML = sortedPlayers.map((p, i) => {
            let rankIcon = '';
            if (i === 0) rankIcon = '<span class="rank-1">🥇</span>';
            if (i === 1) rankIcon = '<span class="rank-2">🥈</span>';
            if (i === 2) rankIcon = '<span class="rank-3">🥉</span>';

            return `
                <tr>
                    <td class="text-center">${rankIcon || (i + 1)}</td>
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

        console.log('renderGameLog called', { historyLength: history.length, logBox, logEntries });

        if (history.length === 0) {
            logBox.classList.add('hidden');
            console.log('No history, hiding log');
            return;
        }

        console.log('Rendering game log with', history.length, 'entries');
        logBox.classList.remove('hidden');
        logEntries.innerHTML = history.map(entry => {
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
                            <span class="log-player">${entry.playerName}</span>
                            <span class="log-cat">${t('at')} ${t('categories.' + entry.category)}</span>
                            <span class="log-word">"${entry.answer}"</span>
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

    function generateRoomCode() {
        return Math.random().toString(36).substring(2, 6).toUpperCase();
    }

    function getRandomCategories() {
        return [...allCategories].sort(() => 0.5 - Math.random()).slice(0, 6);
    }

    function getRandomLetter() {
        const alphabet = "ABCDEFGHIJKLMNOPRSTUVWZ";
        return alphabet[Math.floor(Math.random() * alphabet.length)];
    }

    function applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-mode');
            const icon = themeToggleBtn?.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            }
        } else {
            document.body.classList.remove('light-mode');
            const icon = themeToggleBtn?.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        }
    }

    function toggleTheme() {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        const theme = isLight ? 'light' : 'dark';

        // Update icon
        const icon = themeToggleBtn.querySelector('i');
        if (isLight) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
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
