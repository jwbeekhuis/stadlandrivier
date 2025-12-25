import { db, collection, doc, setDoc, onSnapshot, updateDoc, getDoc, getDocs, writeBatch, arrayUnion, query, where, orderBy, limit, signInAnonymously, auth } from './firebase-config.js?v=3';

document.addEventListener('DOMContentLoaded', () => {
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
    const gameDuration = 30; // Updated: 30 seconds
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
    const joinRoomBtn = document.getElementById('join-room-btn');
    const roomCodeInput = document.getElementById('room-code-input');

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
        } catch (e) {
            console.error("Auth error:", e);
            alert("Er ging iets mis met inloggen. Controleer je internetverbinding en Firebase config.");
        }

        createRoomBtn.addEventListener('click', createRoom);
        joinRoomBtn.addEventListener('click', joinRoom);
        rollBtn.addEventListener('click', handleRollClick);
        stopBtn.addEventListener('click', handleStopClick);
        if (deleteRoomGameBtn) deleteRoomGameBtn.addEventListener('click', handleDeleteRoomClick);

        if (shuffleBtn) shuffleBtn.addEventListener('click', handleShuffleClick);
        if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
        if (nextRoundBtn) nextRoundBtn.addEventListener('click', handleNextRound);

        voteYesBtn.addEventListener('click', () => castVote(true));
        voteNoBtn.addEventListener('click', () => castVote(false));

        setupSecretFeatures();
        subscribeToActiveRooms();
    }

    // Secret admin features
    let titleClickCount = 0;
    let titleClickTimer = null;

    function setupSecretFeatures() {
        const title = document.querySelector('header h1');
        if (!title) return;

        title.style.cursor = 'pointer';
        title.addEventListener('click', async () => {
            titleClickCount++;

            if (titleClickTimer) clearTimeout(titleClickTimer);
            titleClickTimer = setTimeout(() => { titleClickCount = 0; }, 2000);

            if (titleClickCount === 1) {
                const confirmed = confirm("⚠️ SECRET MENU ⚠️\n\nWil je de hele woordenbibliotheek wissen (flushen)?\nDit kan niet ongedaan worden gemaakt!");
                if (confirmed) {
                    await flushLibrary();
                }
                titleClickCount = 0;
            }
        });
    }

    async function flushLibrary() {
        const password = prompt("Voer wachtwoord in (of typ 'flush' als je zeker bent):");
        if (password !== 'flush') return alert("Geannuleerd.");

        alert("Bezig met flushen... dit kan even duren.");
        try {
            const snap = await getDocs(collection(db, "library"));
            const batchSize = 400;
            let batch = writeBatch(db);
            let count = 0;

            for (const docSnap of snap.docs) {
                batch.delete(docSnap.ref);
                count++;
                if (count >= batchSize) {
                    await batch.commit();
                    batch = writeBatch(db);
                    count = 0;
                }
            }
            if (count > 0) await batch.commit();

            alert("📚 Bibliotheek is volledig gewist!");
        } catch (e) {
            console.error(e);
            alert("Fout bij wissen: " + e.message);
        }
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
            list.innerHTML = '<p class="no-rooms">Geen actieve kamers gevonden. Maak er een!</p>';
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
                        ${isMyRoom ? `<button class="delete-room-btn" onclick="deleteRoom('${room.id}')" title="Verwijder kamer"><i class="fa-solid fa-trash"></i></button>` : ''}
                    </div>
                    <div class="room-name">${roomName}</div>
                    <div class="room-info">
                        <span class="room-host">Host: ${hostName}</span>
                        <span class="room-players">👤 ${playerCount}</span>
                    </div>
                    <button class="join-room-quick-btn" onclick="quickJoinRoom('${room.id}')">
                        Meedoen
                    </button>
                </div>
            `;
        }).join('');
    }

    window.quickJoinRoom = async function (code) {
        const name = playerNameInput.value.trim();
        if (!name) return alert("Vul eerst je naam in!");

        roomId = code;
        isHost = false;

        const roomRef = doc(db, "rooms", code);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) {
            return alert("Kamer niet meer beschikbaar!");
        }

        await updateDoc(roomRef, {
            players: arrayUnion({ uid: currentUser.uid, name: name, score: 0, answers: {}, isVerified: false })
        });

        enterGameUI(code);
        subscribeToRoom(code);
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

    // --- Multiplayer / Lobby Logic ---

    async function createRoom() {
        const name = playerNameInput.value.trim();
        if (!name) return alert("Vul eerst je naam in!");

        const roomName = roomNameInput.value.trim() || `${name}'s Kamer`;
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
            players: [{ uid: currentUser.uid, name: name, score: 0, answers: {}, isVerified: false }],
            votingState: null,
            createdAt: Date.now()
        });

        enterGameUI(code);
        subscribeToRoom(code);
    }

    async function joinRoom() {
        const name = playerNameInput.value.trim();
        const code = roomCodeInput.value.trim().toUpperCase();
        if (!name) return alert("Vul eerst je naam in!");
        if (code.length !== 4) return alert("Ongeldige code");

        roomId = code;
        isHost = false;

        const roomRef = doc(db, "rooms", code);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) {
            return alert("Kamer niet gevonden!");
        }

        await updateDoc(roomRef, {
            players: arrayUnion({ uid: currentUser.uid, name: name, score: 0, answers: {}, isVerified: false })
        });

        enterGameUI(code);
        subscribeToRoom(code);
    }

    function subscribeToRoom(code) {
        if (roomUnsubscribe) roomUnsubscribe();

        roomUnsubscribe = onSnapshot(doc(db, "rooms", code), (doc) => {
            if (!doc.exists()) return;
            const data = doc.data();
            roomData = data;
            updateGameState(data);
        });
    }

    // --- Game State Sync ---

    function updateGameState(data) {
        roomCodeDisplay.textContent = data.roomId;
        playerCountDisplay.textContent = `👤 ${data.players.length}`;
        renderPlayersList(data.players);

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
            showResults(data);
        } else if (data.status === 'lobby') {
            resetBoard();
        }

        if (currentUser.uid === data.players[0]?.uid) {
            isHost = true;
            rollBtn.disabled = data.status === 'playing';
            stopBtn.classList.remove('hidden');
            if (shuffleBtn) shuffleBtn.classList.remove('hidden');
            if (deleteRoomGameBtn) deleteRoomGameBtn.classList.remove('hidden');
        } else {
            isHost = false;
            rollBtn.classList.add('hidden');
            stopBtn.classList.add('hidden');
            if (shuffleBtn) shuffleBtn.classList.add('hidden');
            if (deleteRoomGameBtn) deleteRoomGameBtn.classList.add('hidden');
        }
    }

    function renderPlayersList(players) {
        playersList.innerHTML = players.map(p =>
            `<span class="player-tag ${p.uid === currentUser.uid ? 'me' : ''}">
                ${p.name} (${p.score} pts)
            </span>`
        ).join('');
    }

    function enterGameUI(code) {
        lobbyScreen.classList.add('hidden');
        controlsPanel.classList.remove('hidden');
        gameBoard.classList.remove('hidden');
        roomCodeDisplay.textContent = code;
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
        if (!isHost) return;

        if (!confirm("Weet je zeker dat je deze kamer definitief wilt verwijderen?\n\nAlle spelers worden verwijderd en de kamer wordt gesloten.")) {
            return;
        }

        try {
            const roomRef = doc(db, "rooms", roomId);
            await updateDoc(roomRef, {
                status: 'deleted'
            });

            // Unsubscribe and return to lobby
            if (roomUnsubscribe) roomUnsubscribe();

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

            alert("Kamer is verwijderd!");
        } catch (e) {
            console.error("Error deleting room:", e);
            alert("Fout bij verwijderen: " + e.message);
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
        calculateFinalScores(data);
    }

    function showVotingUI(state) {
        if (!state) {
            votingScreen.classList.remove('hidden');
            gameBoard.classList.add('hidden');
            votingStatusText.textContent = "Laden...";
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
        votingCategory.textContent = state.category;
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

            if (state.verdict === 'approved') {
                votingVerdictIcon.innerHTML = '<i class="fa-solid fa-check" style="color: #4ade80;"></i>';
                votingVerdictText.textContent = "GOEDGEKEURD!";
                votingVerdictText.style.color = "#4ade80";
            } else {
                votingVerdictIcon.innerHTML = '<i class="fa-solid fa-xmark" style="color: #f87171;"></i>';
                votingVerdictText.textContent = "AFGEKEURD!";
                votingVerdictText.style.color = "#f87171";
            }
            // Don't return - let voter names continue to display below
        } else {
            votingResultOverlay.classList.add('hidden');
        }

        if (currentUser.uid === state.targetUid) {
            votingActions.classList.add('hidden');
            votingStatusText.textContent = "Je medespelers stemmen op jouw antwoord...";
        } else {
            // Check if I already voted
            if (state.votes && state.votes[currentUser.uid] !== undefined) {
                votingActions.classList.add('hidden');
                votingStatusText.textContent = "Je hebt gestemd. Wachten op de rest...";
            } else {
                votingActions.classList.remove('hidden');
                votingStatusText.textContent = "Is dit antwoord goed of fout?";
            }
        }

        if (isHost) {
            checkVotingComplete(state);
        }
    }

    async function castVote(isValid) {
        if (!roomData.votingState) return;
        // Optimization: Don't allow vote if verdict already set
        if (roomData.votingState.verdict) return;

        const roomRef = doc(db, "rooms", roomId);
        const key = `votingState.votes.${currentUser.uid}`;
        await updateDoc(roomRef, { [key]: isValid });
    }

    async function checkVotingComplete(state) {
        // Prevent re-checking if already decided
        if (state.verdict) return;

        const potentialVoters = roomData.players.length - 1; // Exclude target
        const currentVotes = Object.keys(state.votes || {}).length;

        if (potentialVoters <= 0 || currentVotes >= potentialVoters) {
            // Tally
            const yesVotes = Object.values(state.votes || {}).filter(v => v === true).length;
            const noVotes = Object.values(state.votes || {}).filter(v => v === false).length;
            const isApproved = yesVotes >= noVotes;
            const verdict = isApproved ? 'approved' : 'rejected';

            // 1. Show Verdict (Update DB so everyone sees it)
            const roomRef = doc(db, "rooms", roomId);
            await updateDoc(roomRef, { "votingState.verdict": verdict });

            // 2. Wait 5 seconds (3s verdict + 2s to see voters), THEN finalize
            setTimeout(() => {
                markAnswerVerified(state.targetPlayerIndex, state.category, state.answer, isApproved, false);
            }, 5000);
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

        // Reset scores
        players.forEach(p => p.score = 0);

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
                    p.score += res.points;
                }
            });
        }

        console.log("Final Scores:", players.map(p => `${p.name}: ${p.score}`));

        // Update history with points information
        const history = data.gameHistory || [];
        history.forEach(entry => {
            const player = players.find(p => p.name === entry.playerName);
            if (player && player.verifiedResults && player.verifiedResults[entry.category]) {
                const result = player.verifiedResults[entry.category];
                entry.points = result.points || 0;

                // Add reasoning
                if (result.points === 20) entry.pointsReason = "Uniek antwoord";
                else if (result.points === 10) entry.pointsReason = "Enige in categorie";
                else if (result.points === 5) entry.pointsReason = "Gedeeld antwoord";
                else entry.pointsReason = "Niet goedgekeurd";
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
                            <span class="log-cat">bij ${entry.category}</span>
                            <span class="log-word">"${entry.answer}"</span>
                        </div>
                        <div class="log-status">
                            ${entry.isValid ? '✅' : '❌'} 
                            <small>${entry.isAuto ? '(Auto-Doc)' : '(Manual)'}</small>
                            ${entry.points !== undefined ? `<div class="log-points"><strong>+${entry.points} pts</strong> <span class="log-reason">${entry.pointsReason || ''}</span></div>` : ''}
                        </div>
                    </div>
                    ${!entry.isAuto ? `
                        <div class="log-details">
                            <span class="vote-tally">Stemmen: <strong>${yes}✅ / ${no}❌</strong></span>
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
            const div = document.createElement('div');
            div.className = 'category-input-group';
            div.innerHTML = `
                <label for="input-${safeId}">${cat}</label>
                <input type="text" id="input-${safeId}" placeholder="${cat}..." disabled autocomplete="off">
            `;
            categoriesContainer.appendChild(div);
        });
    }

    function updateInputPlaceholders() {
        activeCategories.forEach(cat => {
            const safeId = cat.replace(/[&\s]/g, '-').toLowerCase();
            const input = document.getElementById(`input-${safeId}`);
            if (input) input.placeholder = `${cat} met ${currentLetter}`;
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
