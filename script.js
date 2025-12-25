import { db, collection, doc, setDoc, onSnapshot, updateDoc, getDoc, getDocs, writeBatch, arrayUnion, query, where, orderBy, limit, signInAnonymously, auth } from './firebase-config.js?v=3';
import { translations } from './translations.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- Language Management ---
    let currentLanguage = localStorage.getItem('language') || 'nl';

    function t(key) {
        const keys = key.split('.');
        let value = translations[currentLanguage];
        for (const k of keys) {
            value = value?.[k];
        }
        return value || key;
    }

    function setLanguage(lang) {
        currentLanguage = lang;
        localStorage.setItem('language', lang);
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
        const roomLabel = document.querySelector('.room-info span');
        if (roomLabel && roomLabel.textContent.includes('Kamer:')) {
            const roomCode = document.getElementById('room-code-display').textContent;
            roomLabel.innerHTML = `${t('room')} <strong id="room-code-display">${roomCode}</strong>`;
        }

        const deleteRoomBtn = document.getElementById('delete-room-game-btn');
        if (deleteRoomBtn) {
            deleteRoomBtn.innerHTML = `<i class="fa-solid fa-trash"></i> ${t('deleteRoom')}`;
            deleteRoomBtn.title = t('deleteRoom');
        }

        const rollBtn = document.getElementById('roll-btn');
        if (rollBtn) rollBtn.textContent = t('rollLetter');

        const stopBtn = document.getElementById('stop-btn');
        if (stopBtn) stopBtn.textContent = t('stopRound');

        const shuffleBtn = document.getElementById('shuffle-btn');
        if (shuffleBtn) {
            shuffleBtn.innerHTML = `<i class="fa-solid fa-shuffle"></i> ${t('mixCategories')}`;
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
    let gameDuration = 30; // Default: 30 seconds, can be changed by room creator
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
    const letterDisplay = document.getElementById('current-letter');
    const timerDisplay = document.getElementById('timer-display');
    const timerCircle = document.querySelector('.progress-ring__circle');
    const categoriesContainer = document.getElementById('categories-container');
    const nextRoundBtn = document.getElementById('next-round-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const languageToggleBtn = document.getElementById('language-toggle');
    const playersList = document.getElementById('players-list');

    // Voting Elements
    const votingPlayerName = document.getElementById('voting-player-name');
    const votingCategory = document.getElementById('voting-category');
    const votingAnswerDisplay = document.getElementById('voting-answer-display');
    const voteYesBtn = document.getElementById('vote-yes-btn');
    const voteNoBtn = document.getElementById('vote-no-btn');
    const votingStatusText = document.getElementById('voting-status-text');
    const votingActions = document.getElementById('voting-actions');
    const voteCounts = document.querySelector('.vote-counts');
    const yesCountDisplay = document.getElementById('yes-count');
    const noCountDisplay = document.getElementById('no-count');
    const votingResultOverlay = document.getElementById('voting-result-overlay');
    const votingVerdictIcon = document.getElementById('voting-verdict-icon');
    const votingVerdictText = document.getElementById('voting-verdict-text');
    const voteTimer = document.getElementById('vote-timer');
    const voteTimeLeftDisplay = document.getElementById('vote-time-left');
    const voteProgressBar = document.getElementById('vote-progress-bar');
    const moreTimeBtn = document.getElementById('more-time-btn');


    // Circle Config
    let circumference = 0;
    if (timerCircle) {
        const radius = timerCircle.r.baseVal.value;
        circumference = radius * 2 * Math.PI;
        timerCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        timerCircle.style.strokeDashoffset = 0;
    }

    // --- Initialization ---
    async function init() {
        try {
            const userCred = await signInAnonymously(auth);
            currentUser = userCred.user;
            console.log("Logged in as", currentUser.uid);

            // Load saved name from localStorage
            const savedName = localStorage.getItem('playerName');
            if (savedName) {
                playerNameInput.value = savedName;
            }
        } catch (e) {
            console.error("Auth error:", e);
            alert("Er ging iets mis met inloggen. Controleer je internetverbinding en Firebase config.");
        }

        createRoomBtn.addEventListener('click', createRoom);
        rollBtn.addEventListener('click', handleRollClick);
        stopBtn.addEventListener('click', handleStopClick);
        if (deleteRoomGameBtn) deleteRoomGameBtn.addEventListener('click', handleDeleteRoomClick);

        if (shuffleBtn) shuffleBtn.addEventListener('click', handleShuffleClick);
        if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
        if (languageToggleBtn) languageToggleBtn.addEventListener('click', () => {
            setLanguage(currentLanguage === 'nl' ? 'en' : 'nl');
        });
        if (nextRoundBtn) nextRoundBtn.addEventListener('click', handleNextRound);

        // Initialize translations
        updateAllTranslations();

        voteYesBtn.addEventListener('click', () => castVote(true));
        voteNoBtn.addEventListener('click', () => castVote(false));
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
            where("status", "in", ["lobby", "playing"]),
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
                        ${isMyRoom ? `<button class="delete-room-btn" onclick="deleteRoom('${room.id}')" title="${t('deleteRoom')}"><i class="fa-solid fa-trash"></i></button>` : ''}
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

    window.quickJoinRoom = async function (code) {
        const name = playerNameInput.value.trim();
        if (!name) return alert(t('enterName'));

        // Save name to localStorage
        localStorage.setItem('playerName', name);

        roomId = code;
        isHost = false;

        const roomRef = doc(db, "rooms", code);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) {
            return alert(t('roomNotExist'));
        }

        const roomData = roomSnap.data();
        const existingPlayer = roomData.players.find(p => p.uid === currentUser.uid);

        if (existingPlayer) {
            // Player already exists, update their info
            const updatedPlayers = roomData.players.map(p =>
                p.uid === currentUser.uid
                    ? { ...p, name: name, lastSeen: Date.now() }
                    : p
            );
            await updateDoc(roomRef, { players: updatedPlayers });
        } else {
            // New player, add them
            await updateDoc(roomRef, {
                players: arrayUnion({ uid: currentUser.uid, name: name, score: 0, answers: {}, isVerified: false, lastSeen: Date.now() })
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

        // Save name to localStorage
        localStorage.setItem('playerName', name);

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
            status: 'lobby',
            currentLetter: '?',
            categories: getRandomCategories(),
            timerEnd: null,
            gameDuration: selectedDuration,
            players: [{ uid: currentUser.uid, name: name, score: 0, answers: {}, isVerified: false, lastSeen: Date.now() }],
            votingState: null,
            createdAt: Date.now()
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

        // Save name to localStorage
        localStorage.setItem('playerName', name);

        roomId = code;
        isHost = false;

        const roomRef = doc(db, "rooms", code);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) {
            return alert("Kamer niet gevonden!");
        }

        const roomData = roomSnap.data();
        const existingPlayer = roomData.players.find(p => p.uid === currentUser.uid);

        if (existingPlayer) {
            // Player already exists, update their info
            const updatedPlayers = roomData.players.map(p =>
                p.uid === currentUser.uid
                    ? { ...p, name: name, lastSeen: Date.now() }
                    : p
            );
            await updateDoc(roomRef, { players: updatedPlayers });
        } else {
            // New player, add them
            await updateDoc(roomRef, {
                players: arrayUnion({ uid: currentUser.uid, name: name, score: 0, answers: {}, isVerified: false, lastSeen: Date.now() })
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

        if (JSON.stringify(activeCategories) !== JSON.stringify(data.categories)) {
            activeCategories = data.categories;
            renderCategories();
        }

        if (data.currentLetter !== currentLetter) {
            currentLetter = data.currentLetter;
            letterDisplay.textContent = currentLetter;
            updateInputPlaceholders();
        }

        if (data.status === 'playing' && !isGameActive) {
            startGameLocal();
        } else if (data.status === 'voting') {
            isGameActive = false;
            stopGameLocal();
            showVotingUI(data.votingState);
        } else if (data.status === 'finished') {
            isGameActive = false;
            stopGameLocal();

            // Check if scores have been calculated (at least one player should have verifiedResults with points)
            const scoresCalculated = data.players.some(p => {
                if (!p.verifiedResults) return false;
                return Object.values(p.verifiedResults).some(r => r.points !== undefined && r.points > 0);
            });

            // Only show results if scores are calculated, otherwise wait for next update
            if (scoresCalculated || data.players.every(p => !p.verifiedResults || Object.keys(p.verifiedResults).length === 0)) {
                showResults(data);
            } else {
                console.log("Waiting for score calculation to complete...");
            }
        } else if (data.status === 'lobby') {
            resetBoard();
        }

        const wasHost = isHost;
        const shouldBeHost = currentUser.uid === data.players[0]?.uid;

        if (shouldBeHost) {
            isHost = true;
            rollBtn.disabled = data.status === 'playing';
            stopBtn.classList.remove('hidden');
            if (shuffleBtn) shuffleBtn.classList.remove('hidden');
            if (deleteRoomGameBtn) deleteRoomGameBtn.classList.remove('hidden');

            // Notify if just became host
            if (!wasHost && roomData) {
                console.log("You are now the host!");
                // Show subtle notification
                setTimeout(() => {
                    if (confirm(t('nowHost'))) {
                        // User acknowledged
                    }
                }, 500);
            }
        } else {
            isHost = false;
            rollBtn.classList.add('hidden');
            stopBtn.classList.add('hidden');
            if (shuffleBtn) shuffleBtn.classList.add('hidden');
            if (deleteRoomGameBtn) deleteRoomGameBtn.classList.add('hidden');
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
        listenToActiveRooms();
    }

    // --- Actions ---
    async function handleRollClick() {
        if (!isHost) return;
        const newLetter = getRandomLetter();
        await updateDoc(doc(db, "rooms", roomId), {
            status: 'playing',
            currentLetter: newLetter,
            timerEnd: Date.now() + (gameDuration * 1000),
            players: roomData.players.map(p => ({ ...p, answers: {}, verifiedResults: {} }))
        });
    }

    async function handleStopClick() {
        if (!isHost) return;
        initiateVotingPhase();
    }

    async function handleShuffleClick() {
        if (!isHost) return;
        const newCats = getRandomCategories();
        await updateDoc(doc(db, "rooms", roomId), { categories: newCats });
    }

    async function handleNextRound() {
        if (!isHost) return;
        await updateDoc(doc(db, "rooms", roomId), {
            status: 'lobby',
            gameHistory: []
        });
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
            const roomRef = doc(db, "rooms", roomId);
            await updateDoc(roomRef, {
                status: 'deleted'
            });

            // Unsubscribe and return to lobby
            if (roomUnsubscribe) roomUnsubscribe();
            stopHeartbeat();

            // Reset local state
            const deletedRoomId = roomId;
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

    // --- Heartbeat & Activity Tracking ---
    function startHeartbeat() {
        stopHeartbeat(); // Clear any existing interval

        // Update immediately
        updatePlayerHeartbeat();

        // Then update every 10 seconds
        heartbeatInterval = setInterval(() => {
            updatePlayerHeartbeat();
            if (isHost) {
                cleanupInactivePlayers();
            }
        }, 10000);
    }

    function stopHeartbeat() {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    }

    async function updatePlayerHeartbeat() {
        if (!roomId || !currentUser) return;

        try {
            const roomRef = doc(db, "rooms", roomId);
            const roomSnap = await getDoc(roomRef);

            if (!roomSnap.exists()) return;

            const players = roomSnap.data().players;
            const updatedPlayers = players.map(p =>
                p.uid === currentUser.uid
                    ? { ...p, lastSeen: Date.now() }
                    : p
            );

            await updateDoc(roomRef, { players: updatedPlayers });
        } catch (e) {
            console.error("Heartbeat error:", e);
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
            const inactiveThreshold = 30000; // 30 seconds

            const activePlayers = players.filter(p => {
                // Keep players who have been seen recently
                return (now - (p.lastSeen || 0)) < inactiveThreshold;
            });

            // Only update if players were removed
            if (activePlayers.length < players.length) {
                const removedCount = players.length - activePlayers.length;
                console.log(`Removing ${removedCount} inactive player(s)`);

                // Check if the first player (host) was removed
                const oldHostUid = players[0]?.uid;
                const newHostUid = activePlayers[0]?.uid;

                if (activePlayers.length > 0) {
                    await updateDoc(roomRef, { players: activePlayers });

                    // Log host change if it happened
                    if (oldHostUid !== newHostUid) {
                        console.log(`Host changed from ${players[0]?.name} to ${activePlayers[0]?.name}`);

                        // Update hostId in room data for consistency
                        await updateDoc(roomRef, { hostId: newHostUid });
                    }
                } else {
                    // No players left, delete the room
                    console.log("No active players left, deleting room");
                    await updateDoc(roomRef, { status: 'deleted' });
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

        enableInputs();
        startTimerLocal();
    }

    function stopGameLocal() {
        clearInterval(timerInterval);
        disableInputs();
        saveMyAnswers();
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
            votingState: null
        });
        setTimeout(processNextVoteItem, 2000);
    }

    async function processNextVoteItem() {
        if (!isHost) return;

        const roomRef = doc(db, "rooms", roomId);
        const snap = await getDoc(roomRef);
        const data = snap.data();

        for (let pIndex = 0; pIndex < data.players.length; pIndex++) {
            const player = data.players[pIndex];
            for (const cat of activeCategories) {
                const answer = player.answers[cat];
                if (!answer) continue;

                if (player.verifiedResults && player.verifiedResults[cat]) continue;

                const isKnown = await checkLibrary(cat, answer);
                if (isKnown) {
                    await markAnswerVerified(pIndex, cat, answer, true, true);
                    processNextVoteItem();
                    return;
                }

                await updateDoc(roomRef, {
                    votingState: {
                        targetPlayerIndex: pIndex,
                        targetPlayerName: player.name,
                        targetUid: player.uid,
                        category: cat,
                        answer: answer,
                        votes: {},
                        autoApproved: false,
                        verdict: null
                    }
                });
                return;
            }
        }
        // Get fresh data for final score calculation
        const freshSnap = await getDoc(roomRef);
        calculateFinalScores(freshSnap.data());
    }

    function showVotingUI(state) {
        if (!state) {
            votingScreen.classList.remove('hidden');
            gameBoard.classList.add('hidden');
            votingStatusText.textContent = t('loading');
            votingActions.classList.add('hidden');
            voteCounts.classList.add('hidden');
            votingResultOverlay.classList.add('hidden');
            return;
        }

        votingScreen.classList.remove('hidden');
        gameBoard.classList.add('hidden');
        resultsBoard.classList.add('hidden');
        categoriesContainer.classList.add('hidden');

        votingPlayerName.textContent = state.targetPlayerName;
        votingCategory.textContent = t('categories.' + state.category);
        votingAnswerDisplay.textContent = state.answer;

        // Show Live Stats
        const yesVotes = [];
        const noVotes = [];

        const voteEntries = Object.entries(state.votes || {});
        voteEntries.forEach(([uid, vote]) => {
            // Find player name (optimize with map if needed, but array small enough)
            const p = roomData.players.find(pl => pl.uid === uid);
            const name = p ? p.name : 'Unknown';
            if (vote === true) yesVotes.push(name);
            else noVotes.push(name);
        });

        yesCountDisplay.textContent = yesVotes.length;
        noCountDisplay.textContent = noVotes.length;

        // Render Names with icons
        document.getElementById('yes-voters').innerHTML = yesVotes.map(n => `<span class="voter-name"><i class="fa-solid fa-user"></i> ${n}</span>`).join('');
        document.getElementById('no-voters').innerHTML = noVotes.map(n => `<span class="voter-name"><i class="fa-solid fa-user"></i> ${n}</span>`).join('');

        voteCounts.classList.remove('hidden');

        // Show Result Overlay if verdict exists
        if (state.verdict) {
            votingResultOverlay.classList.remove('hidden');
            votingActions.classList.add('hidden'); // Hide buttons
            stopVoteTimer(); // Stop timer when verdict is shown

            if (state.verdict === 'approved') {
                votingVerdictIcon.innerHTML = '<i class="fa-solid fa-check" style="color: #4ade80;"></i>';
                votingVerdictText.textContent = t('approved');
                votingVerdictText.style.color = "#4ade80";
            } else {
                votingVerdictIcon.innerHTML = '<i class="fa-solid fa-xmark" style="color: #f87171;"></i>';
                votingVerdictText.textContent = t('rejected');
                votingVerdictText.style.color = "#f87171";
            }

            // Update status text when verdict is shown
            votingStatusText.textContent = t('verdictDecided');

            // Verdict shown, don't show voting UI anymore
            return;
        } else {
            votingResultOverlay.classList.add('hidden');
        }

        // Everyone can vote, including on their own answers
        votingActions.classList.remove('hidden');

        // Show which vote is currently selected
        const currentVote = state.votes?.[currentUser.uid];
        const isMyAnswer = currentUser.uid === state.targetUid;

        if (currentVote === true) {
            voteYesBtn.classList.add('selected');
            voteNoBtn.classList.remove('selected');
            votingStatusText.textContent = isMyAnswer
                ? t('youVotedYesOwn')
                : t('youVotedYes');
        } else if (currentVote === false) {
            voteNoBtn.classList.add('selected');
            voteYesBtn.classList.remove('selected');
            votingStatusText.textContent = isMyAnswer
                ? t('youVotedNoOwn')
                : t('youVotedNo');
        } else {
            voteYesBtn.classList.remove('selected');
            voteNoBtn.classList.remove('selected');
            votingStatusText.textContent = isMyAnswer
                ? t('isOwnAnswerCorrect')
                : t('isAnswerCorrect');
        }

        // Start vote timer if not already running
        if (!voteTimerInterval) {
            startVoteTimer();
        }

        if (isHost) {
            checkVotingComplete(state);
        }
    }

    function startVoteTimer() {
        stopVoteTimer();
        voteTimeLeft = 15;
        voteMaxTime = 15; // Track max time for percentage calculation
        voteTimer.classList.remove('hidden');
        moreTimeBtn.classList.add('hidden');

        updateVoteTimerDisplay();

        voteTimerInterval = setInterval(() => {
            voteTimeLeft--;
            updateVoteTimerDisplay();

            if (voteTimeLeft === 0) {
                // Auto-approve if no vote
                stopVoteTimer();
                castVote(true); // Auto-approve
                console.log("Vote timeout - auto-approved");
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

    async function castVote(isValid) {
        if (!roomData.votingState) return;
        // Optimization: Don't allow vote if verdict already set
        if (roomData.votingState.verdict) return;

        // Allow changing vote - don't stop timer
        // Timer will continue running until timeout

        const roomRef = doc(db, "rooms", roomId);
        const key = `votingState.votes.${currentUser.uid}`;
        await updateDoc(roomRef, { [key]: isValid });
    }

    async function checkVotingComplete(state) {
        // Prevent re-checking if already decided
        if (state.verdict) return;

        const potentialVoters = roomData.players.length; // Everyone can vote now
        const currentVotes = Object.keys(state.votes || {}).length;

        if (potentialVoters <= 0 || currentVotes >= potentialVoters) {
            // Everyone has voted - stop timer immediately
            stopVoteTimer();

            // Tally
            const yesVotes = Object.values(state.votes || {}).filter(v => v === true).length;
            const noVotes = Object.values(state.votes || {}).filter(v => v === false).length;
            const isApproved = yesVotes >= noVotes;
            const verdict = isApproved ? 'approved' : 'rejected';

            // 1. Show Verdict (Update DB so everyone sees it)
            const roomRef = doc(db, "rooms", roomId);
            await updateDoc(roomRef, { "votingState.verdict": verdict });

            // 2. Wait 3 seconds to show verdict, THEN finalize
            setTimeout(() => {
                if (isHost) {
                    markAnswerVerified(state.targetPlayerIndex, state.category, state.answer, isApproved, false);
                }
            }, 3000);
        }
    }

    async function markAnswerVerified(pIdx, cat, answer, isValid, isAuto) {
        const roomRef = doc(db, "rooms", roomId);

        const freshSnap = await getDoc(roomRef);
        const players = freshSnap.data().players;
        const history = freshSnap.data().gameHistory || [];

        if (!players[pIdx].verifiedResults) players[pIdx].verifiedResults = {};
        players[pIdx].verifiedResults[cat] = { isValid: isValid, answer: answer, points: 0 };

        // Track history for infographic
        history.push({
            playerName: players[pIdx].name,
            category: cat,
            answer: answer,
            isValid: isValid,
            isAuto: isAuto,
            votes: isAuto ? null : (freshSnap.data().votingState?.votes || {})
        });

        if (isValid && !isAuto) addToLibrary(cat, answer);

        await updateDoc(roomRef, {
            players: players,
            votingState: null,
            "votingState.verdict": null,
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

        const dist = levenshteinDistance(w1, w2);
        const len = Math.max(w1.length, w2.length);

        // Rules:
        // Length > 4: Allow 2 typos
        // Length <= 4: Allow 1 typo
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

        // Add round scores to total scores
        players.forEach(p => {
            p.score += roundScores[p.uid];
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
            gameHistory: history
        });
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
            const voterNames = Object.entries(votes).map(([uid, v]) => {
                const p = data.players.find(pl => pl.uid === uid);
                return `${p ? p.name : 'Unknown'} (${v ? '✅' : '❌'})`;
            }).join(', ');

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
        timerCircle.style.strokeDashoffset = 0;
        updateTimerDisplay();
        renderCategories();
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

    function toggleTheme() {
        document.body.classList.toggle('light-mode');
        const icon = themeToggleBtn.querySelector('i');
        if (document.body.classList.contains('light-mode')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }

    function renderCategories() {
        categoriesContainer.innerHTML = '';
        activeCategories.forEach(cat => {
            const safeId = cat.replace(/[&\s]/g, '-').toLowerCase();
            const translatedCat = t('categories.' + cat);
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
        timerDisplay.textContent = Math.max(0, timeLeft);
        if (timerCircle) {
            const offset = circumference - (timeLeft / gameDuration) * circumference;
            timerCircle.style.strokeDashoffset = offset;
            timerCircle.style.stroke = timeLeft <= 10 ? 'var(--danger-color)' : 'var(--accent-color)';
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
