import { db, collection, doc, setDoc, onSnapshot, updateDoc, getDoc, arrayUnion, signInAnonymously, auth } from './firebase-config.js';

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
    const controlsPanel = document.getElementById('controls-panel');
    const gameBoard = document.getElementById('game-board');
    const resultsBoard = document.getElementById('results-board');
    const votingScreen = document.getElementById('voting-screen');

    // Lobby Inputs
    const playerNameInput = document.getElementById('player-name');
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const roomCodeInput = document.getElementById('room-code-input');

    // Game Elements
    const roomCodeDisplay = document.getElementById('room-code-display');
    const playerCountDisplay = document.getElementById('player-count-display');
    const rollBtn = document.getElementById('roll-btn');
    const stopBtn = document.getElementById('stop-btn');
    const letterDisplay = document.getElementById('letter-display');
    const timerDisplay = document.getElementById('timer-display');
    const timerCircle = document.getElementById('timer-circle');
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
    const radius = timerCircle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    timerCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    timerCircle.style.strokeDashoffset = 0;

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

        if (shuffleBtn) shuffleBtn.addEventListener('click', handleShuffleClick);
        if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
        if (nextRoundBtn) nextRoundBtn.addEventListener('click', handleNextRound);

        voteYesBtn.addEventListener('click', () => castVote(true));
        voteNoBtn.addEventListener('click', () => castVote(false));
        setupSecretFeatures();
    }

    // --- Multiplayer / Lobby Logic ---

    async function createRoom() {
        const name = playerNameInput.value.trim();
        if (!name) return alert("Vul eerst je naam in!");

        const code = generateRoomCode();
        roomId = code;
        isHost = true;

        const roomRef = doc(db, "rooms", code);
        await setDoc(roomRef, {
            roomId: code,
            hostId: currentUser.uid,
            status: 'lobby',
            currentLetter: '?',
            categories: getRandomCategories(),
            timerEnd: null,
            players: [{ uid: currentUser.uid, name: name, score: 0, answers: {}, isVerified: false }],
            votingState: null
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

        if (currentUser.uid === data.hostId) {
            isHost = true;

            // Actions visibility
            if (data.status === 'lobby') {
                rollBtn.classList.remove('hidden');
                rollBtn.disabled = false;
                stopBtn.classList.add('hidden');
                if (shuffleBtn) shuffleBtn.classList.remove('hidden');
            } else if (data.status === 'playing') {
                rollBtn.classList.add('hidden');
                stopBtn.classList.remove('hidden');
                if (shuffleBtn) shuffleBtn.classList.add('hidden');
            } else {
                rollBtn.classList.add('hidden');
                stopBtn.classList.add('hidden');
                if (shuffleBtn) shuffleBtn.classList.add('hidden');
            }
        } else {
            isHost = false;
            rollBtn.classList.add('hidden');
            stopBtn.classList.add('hidden');
            if (shuffleBtn) shuffleBtn.classList.add('hidden');
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
        await updateDoc(doc(db, "rooms", roomId), { status: 'lobby' });
    }

    // --- Local Logic ---
    function startGameLocal() {
        isGameActive = true;
        gameBoard.classList.remove('hidden');
        resultsBoard.classList.add('hidden');
        votingScreen.classList.add('hidden');
        categoriesContainer.classList.remove('hidden');
        // Clear history UI
        document.getElementById('game-history-log').classList.add('hidden');

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
        const freshSnap = await getGet(roomRef);
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

        // Render Names
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
            return;
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

            // 2. Wait 3 seconds, THEN finalize
            setTimeout(() => {
                markAnswerVerified(state.targetPlayerIndex, state.category, state.answer, isApproved, false);
            }, 3000);
        }
    }

    async function markAnswerVerified(pIdx, cat, answer, isValid, isAuto) {
        const roomRef = doc(db, "rooms", roomId);

        // Need to read fresh again to ensure no overwrite race conditions (using transaction better, but simple get/set ok for this scale)
        const freshSnap = await getDoc(roomRef);
        const players = freshSnap.data().players;

        if (!players[pIdx].verifiedResults) players[pIdx].verifiedResults = {};
        players[pIdx].verifiedResults[cat] = { isValid: isValid, answer: answer, points: 0 };

        if (isValid && !isAuto) addToLibrary(cat, answer);

        await updateDoc(roomRef, { players: players, votingState: null, "votingState.verdict": null });

        // Host continues loop
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
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                }
            }
        }
        return matrix[b.length][a.length];
    }

    function areWordsFuzzyMatching(word1, word2) {
        const w1 = normalizeAnswer(word1);
        const w2 = normalizeAnswer(word2);
        if (w1 === w2) return true;
        const dist = levenshteinDistance(w1, w2);
        const len = Math.max(w1.length, w2.length);
        if (len > 4) return dist <= 2;
        else return dist <= 1;
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

    async function checkLibrary(category, word) {
        const cleanWord = normalizeAnswer(word);
        const docId = `${category}_${cleanWord}`.replace(/\s/g, '_');
        const docRef = doc(db, "library", docId);
        const snap = await getDoc(docRef);
        return snap.exists();
    }

    async function addToLibrary(category, word) {
        const cleanWord = normalizeAnswer(word);
        const docId = `${category}_${cleanWord}`.replace(/\s/g, '_');
        await setDoc(doc(db, "library", docId), {
            category: category,
            word: word,
            cleanWord: cleanWord,
            approvedAt: Date.now()
        }, { merge: true });
    }

    async function calculateFinalScores(data) {
        console.log("Starting Score Calculation...");
        const players = data.players;
        players.forEach(p => p.score = 0);

        for (const cat of activeCategories) {
            const validAnswers = [];
            players.forEach(p => {
                if (p.verifiedResults && p.verifiedResults[cat]) {
                    const res = p.verifiedResults[cat];
                    if (res.isValid) {
                        validAnswers.push({ uid: p.uid, answer: normalizeAnswer(res.answer) });
                    }
                }
            });

            players.forEach(p => {
                const res = p.verifiedResults ? p.verifiedResults[cat] : null;
                if (res && res.isValid) {
                    const myAns = normalizeAnswer(res.answer);
                    const othersWithSame = validAnswers.filter(a => a.uid !== p.uid && areWordsFuzzyMatching(a.answer, myAns));
                    const othersWithAny = validAnswers.filter(a => a.uid !== p.uid);

                    if (othersWithSame.length > 0) {
                        res.points = 5;
                    } else if (othersWithAny.length === 0) {
                        res.points = 20;
                    } else {
                        res.points = 10;
                    }
                    p.score += res.points;
                }
            });
        }

        await updateDoc(doc(db, "rooms", roomId), {
            players: players,
            status: 'finished',
            votingState: null
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
                particleCount: 200,
                spread: 100,
                origin: { y: 0.6 },
                colors: ['#22c55e', '#38bdf8', '#ffffff', '#fbbf24']
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
    }

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
    const offset = circumference - (timeLeft / gameDuration) * circumference;
    timerCircle.style.strokeDashoffset = offset;
    timerCircle.style.stroke = timeLeft <= 10 ? 'var(--danger-color)' : 'var(--accent-color)';
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
