# Refactor Plan: Incrementele Modernisering StadLandRivier

## Overzicht

**Doel:** `script.js` (2.300+ regels) opsplitsen in ES6 modules ZONDER build tools.

**Huidige staat:** Monolithische vanilla JavaScript applicatie
**Gewenste staat:** Modulaire structuur met gescheiden verantwoordelijkheden

---

## Nieuwe Mappenstructuur

```
StadLandRivier/
├── index.html                  # Aanpassen: script.js → js/main.js
├── style.css                   # Blijft ongewijzigd
├── firebase-config.js          # Blijft ongewijzigd
├── translations.js             # Blijft ongewijzigd
└── js/
    ├── main.js                 # Entry point
    ├── config.js               # allCategories, constanten
    ├── state.js                # Centrale state store
    ├── events.js               # Event listener bindings
    ├── modules/
    │   ├── i18n.js             # Taal & vertalingen
    │   ├── theme.js            # Dark/light mode
    │   ├── auth.js             # Firebase authenticatie
    │   ├── room.js             # Room CRUD (create/join/leave/delete)
    │   ├── room-discovery.js   # Active rooms subscription
    │   ├── game.js             # Game flow (roll/stop/timer)
    │   ├── voting.js           # Voting systeem
    │   ├── scoring.js          # Score berekening & resultaten
    │   ├── heartbeat.js        # Activity tracking & cleanup
    │   ├── library.js          # Word library (auto-approve)
    │   └── ui.js               # DOM updates & rendering
    └── utils/
        ├── dom.js              # DOM element registry
        ├── fuzzy.js            # String matching (Levenshtein)
        └── helpers.js          # generateRoomCode, getRandomCategories, etc.
```

---

## Kritieke Architectuurregels

### 1. Geen Circulaire Imports
- `state.js` importeert NIETS uit eigen modules
- Modules importeren uit state.js, niet uit elkaar (waar mogelijk)
- Als module A en B elkaar nodig hebben → via state of events

### 2. Window Functions
De volgende functies worden vanuit HTML aangeroepen en moeten op window staan:
```javascript
// In main.js expliciet koppelen:
window.quickJoinRoom = quickJoinRoom;
window.deleteRoom = deleteRoom;
window.kickPlayer = kickPlayer;
```

### 3. DOM Registry Pattern
```javascript
// utils/dom.js
let elements = null;

export function initDOM() {
    elements = {
        // Screens
        lobbyScreen: document.getElementById('lobby-screen'),
        controlsPanel: document.getElementById('game-controls'),
        gameBoard: document.getElementById('game-board'),
        resultsBoard: document.getElementById('results-board'),
        votingScreen: document.getElementById('voting-screen'),

        // Lobby
        playerNameInput: document.getElementById('player-name'),
        roomNameInput: document.getElementById('room-name-input'),
        createRoomBtn: document.getElementById('create-room-btn'),
        gameDurationSlider: document.getElementById('game-duration-slider'),
        durationValueDisplay: document.getElementById('duration-value'),

        // Game Controls
        roomCodeDisplay: document.getElementById('room-code-display'),
        playerCountDisplay: document.getElementById('player-count'),
        rollBtn: document.getElementById('roll-btn'),
        stopBtn: document.getElementById('stop-btn'),
        deleteRoomGameBtn: document.getElementById('delete-room-game-btn'),
        resetGameBtn: document.getElementById('reset-game-btn'),
        leaveRoomBtn: document.getElementById('leave-room-btn'),
        letterDisplay: document.getElementById('current-letter'),
        shuffleBtn: document.getElementById('shuffle-btn'),
        nextRoundBtn: document.getElementById('next-round-btn'),

        // Game Board
        categoriesContainer: document.getElementById('categories-container'),
        playersList: document.getElementById('players-list'),

        // Voting
        votingCategoryTitle: document.getElementById('voting-category-title'),
        votingItemsContainer: document.getElementById('voting-items-container'),
        votedCountDisplay: document.getElementById('voted-count'),
        totalVotesCountDisplay: document.getElementById('total-votes-count'),
        voteTimer: document.getElementById('vote-timer'),
        voteTimeLeftDisplay: document.getElementById('vote-time-left'),
        voteProgressBar: document.getElementById('vote-progress-bar'),
        moreTimeBtn: document.getElementById('more-time-btn'),

        // Header
        themeToggleBtn: document.getElementById('theme-toggle'),
        languageToggleBtn: document.getElementById('language-toggle'),

        // Timer
        stickyTimerBar: document.getElementById('sticky-timer-bar'),
        stickyTimerText: document.getElementById('sticky-timer-text'),
        stickyTimerProgress: document.getElementById('sticky-timer-progress'),
        stickyTimerLetter: document.getElementById('sticky-timer-letter')
    };
    return elements;
}

export function getElements() {
    if (!elements) {
        throw new Error('DOM not initialized. Call initDOM() first.');
    }
    return elements;
}
```

### 4. Centrale State Store
```javascript
// state.js - ALLEEN data, geen imports van eigen modules
export const state = {
    // Room
    roomId: null,
    roomData: null,
    isHost: false,
    roomUnsubscribe: null,

    // User
    currentUser: null,
    currentLanguage: 'nl',

    // Game
    isGameActive: false,
    currentLetter: '?',
    activeCategories: [],
    gameDuration: 60,
    timeLeft: 60,
    timerInterval: null,

    // Voting
    currentCategoryVotes: {},
    currentVotingCategory: null,
    isRenderingVotes: false,
    isSubmittingVotes: false,
    isProcessingCategory: false,
    isCalculatingScores: false,
    voteTimerInterval: null,
    voteTimeLeft: 0,
    voteMaxTime: 15,

    // Heartbeat
    heartbeatInterval: null,

    // UI
    resultsShown: false
};

export const getState = () => state;

export const updateState = (updates) => {
    Object.assign(state, updates);
};

// Specifieke setters voor complexe logic
export const setRoomData = (data) => {
    state.roomData = data;
    if (data && state.currentUser) {
        state.isHost = data.players?.[0]?.uid === state.currentUser.uid;
    }
};

export const setCurrentUser = (user) => {
    state.currentUser = user;
};

export const clearTimers = () => {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
    if (state.voteTimerInterval) {
        clearInterval(state.voteTimerInterval);
        state.voteTimerInterval = null;
    }
    if (state.heartbeatInterval) {
        clearInterval(state.heartbeatInterval);
        state.heartbeatInterval = null;
    }
};
```

### 5. Firebase Listeners in State
```javascript
// Unsubscribe refs altijd opslaan
updateState({ roomUnsubscribe: onSnapshot(...) });

// Bij cleanup:
if (state.roomUnsubscribe) {
    state.roomUnsubscribe();
    updateState({ roomUnsubscribe: null });
}
```

---

## Implementatie Volgorde

### Fase 1: Basis Infrastructuur
1. `js/state.js` - Centrale state store
2. `js/utils/dom.js` - DOM registry
3. `js/utils/helpers.js` - Utility functies
4. `js/utils/fuzzy.js` - String matching
5. `js/config.js` - Constanten (allCategories)

### Fase 2: Standalone Modules
6. `js/modules/i18n.js` - Vertalingen
7. `js/modules/theme.js` - Thema switching

### Fase 3: Firebase Modules
8. `js/modules/auth.js` - Authenticatie
9. `js/modules/heartbeat.js` - Activity tracking
10. `js/modules/library.js` - Word library

### Fase 4: Room Management
11. `js/modules/room-discovery.js` - Room listing
12. `js/modules/room.js` - Room CRUD

### Fase 5: Game Logic
13. `js/modules/ui.js` - DOM rendering
14. `js/modules/game.js` - Game flow

### Fase 6: Voting & Scoring
15. `js/modules/voting.js` - Voting systeem
16. `js/modules/scoring.js` - Score berekening

### Fase 7: Orchestratie
17. `js/events.js` - Event bindings
18. `js/main.js` - Entry point
19. `index.html` - Script aanpassen

---

## Module Details

### js/config.js
```javascript
export const allCategories = [
    'Stad', 'Land', 'Rivier', 'Dier', 'Plant', 'Jongensnaam',
    'Meisjesnaam', 'Beroep', 'Eten & Drinken', 'Beroemdheid',
    'Merk', 'Film of Serie', 'Sport', 'Kledingstuk', 'Lichaamsdeel',
    'Kleur', 'Automerk', 'Voorwerp in Huis', 'Muziekinstrument',
    'Liedje', 'Vakantie-item', 'Schoolvak', 'Hoofdstad',
    'Smoesje', 'Hobby'
];

export const ALPHABET = "ABCDEFGHIJKLMNOPRSTUVWZ";
export const DEFAULT_GAME_DURATION = 60;
export const VOTE_TIMER_DURATION = 30;
export const HEARTBEAT_INTERVAL = 5000;
export const INACTIVE_THRESHOLD = 120000; // 2 min
export const VOTING_INACTIVE_THRESHOLD = 180000; // 3 min
```

### js/utils/helpers.js
```javascript
import { allCategories, ALPHABET } from '../config.js';

export function generateRoomCode() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export function getRandomCategories(count = 6) {
    return [...allCategories].sort(() => 0.5 - Math.random()).slice(0, count);
}

export function getRandomLetter() {
    return ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
}
```

### js/utils/fuzzy.js
```javascript
export function normalizeAnswer(str) {
    if (!str) return "";
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
}

export function levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

export function areWordsFuzzyMatching(word1, word2) {
    const w1 = normalizeAnswer(word1);
    const w2 = normalizeAnswer(word2);

    if (w1 === w2) return true;

    const len = Math.max(w1.length, w2.length);
    if (len <= 2) return false;

    const dist = levenshteinDistance(w1, w2);

    if (len > 4) {
        return dist <= 2;
    } else {
        return dist <= 1;
    }
}
```

### js/main.js (Entry Point)
```javascript
import { initDOM } from './utils/dom.js';
import { state, updateState, setCurrentUser } from './state.js';
import { initAuth } from './modules/auth.js';
import { bindEventListeners } from './events.js';
import { subscribeToActiveRooms } from './modules/room-discovery.js';
import { updateAllTranslations } from './modules/i18n.js';
import { quickJoinRoom, deleteRoom } from './modules/room.js';
import { kickPlayer } from './modules/room.js';

// Expose to window for HTML onclick handlers
window.quickJoinRoom = quickJoinRoom;
window.deleteRoom = deleteRoom;
window.kickPlayer = kickPlayer;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize DOM registry
    initDOM();

    // 2. Initialize Firebase auth
    await initAuth();

    // 3. Bind event listeners
    bindEventListeners();

    // 4. Apply translations
    updateAllTranslations();

    // 5. Start room discovery
    subscribeToActiveRooms();
});
```

---

## index.html Aanpassing

Verander regel 244 van:
```html
<script type="module" src="script.js?v=107"></script>
```

Naar:
```html
<script type="module" src="js/main.js?v=108"></script>
```

---

## Test Checklist

Na elke fase, test:
- [ ] Pagina laadt zonder console errors
- [ ] Taal wisselen werkt
- [ ] Thema wisselen werkt
- [ ] Room aanmaken werkt
- [ ] Room joinen werkt
- [ ] Letter rollen werkt
- [ ] Antwoorden invullen werkt
- [ ] Voting werkt
- [ ] Scores worden berekend
- [ ] Volgende ronde werkt
- [ ] Room verlaten werkt
- [ ] Room verwijderen werkt

---

## Fallback Plan

Mocht er iets misgaan:
1. `script.js` blijft bewaard (niet verwijderen tot alles werkt)
2. In `index.html` gewoon terugzetten naar `script.js`
3. Git: maak een branch voor de refactor

```bash
git checkout -b refactor/modular-structure
```
