# Code Quality Fixes voor script.js

Dit document bevat gedetailleerde instructies voor het oplossen van code quality issues in `script.js`. Voer deze fixes uit VOORDAT je begint met de modularisatie uit `REFACTOR-PLAN.md`.

---

## Prioriteit 1: Kritieke Bugs

### 1.1 Verwijder dubbele functiedefinities
**Probleem:** Drie functies zijn twee keer gedefinieerd, wat kan leiden tot onvoorspelbaar gedrag.

**Locaties:**
- `generateRoomCode`: regel 1982-1984 (eerste) en regel 2247-2249 (duplicaat)
- `getRandomCategories`: regel 1986-1988 (eerste, 5 items) en regel 2251-2253 (duplicaat, 6 items)
- `getRandomLetter`: regel 1990-1993 (eerste) en regel 2255-2258 (duplicaat)

**Actie:**
1. Verwijder de TWEEDE set definities (regels 2247-2258)
2. Pas de EERSTE `getRandomCategories` aan om 6 categorieën te retourneren (niet 5):

```javascript
// regel 1986-1988, verander:
function getRandomCategories() {
    return [...allCategories].sort(() => 0.5 - Math.random()).slice(0, 6);
}
```

---

### 1.2 Verwijder aanroep naar niet-bestaande functie
**Probleem:** `processNextVoteItem()` wordt aangeroepen maar bestaat niet.

**Locatie:** Regel 1911

**Actie:** Verwijder de hele regel:
```javascript
// VERWIJDER deze regel:
if (isHost && !isAuto) processNextVoteItem();
```

---

### 1.3 Verwijder niet-gedeclareerde variabele
**Probleem:** `roomCodeInput` wordt gebruikt maar is niet gedeclareerd.

**Locatie:** Regel 565

**Actie:** De hele `joinRoom` functie (regels 563-628) is niet meer in gebruik (vervangen door `quickJoinRoom`). Verwijder de complete functie.

---

## Prioriteit 2: Security Fixes

### 2.1 Voeg XSS-bescherming toe
**Probleem:** User input wordt direct in innerHTML geplaatst zonder escaping.

**Actie 1:** Voeg een `escapeHtml` utility functie toe na regel 1915 (na de `// --- Utilities ---` comment):

```javascript
// --- Utilities ---
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
```

**Actie 2:** Pas de volgende locaties aan om `escapeHtml()` te gebruiken:

**Regel 783-788 (renderPlayersList):**
```javascript
function renderPlayersList(players) {
    playersList.innerHTML = players.map(p => {
        const isMe = p.uid === currentUser.uid;
        const canKick = isHost && !isMe && players.length > 1;
        const escapedName = escapeHtml(p.name);

        return `
            <span class="player-tag ${isMe ? 'me' : ''}">
                ${escapedName} (${p.score} ${t('points').toLowerCase()})
                ${canKick ? `<button class="kick-player-btn" onclick="kickPlayer('${p.uid}')" title="${t('confirmKick').replace('{name}', '')}"><i class="fa-solid fa-xmark"></i></button>` : ''}
            </span>
        `;
    }).join('');
}
```

**Regel 362-384 (renderRoomsList):**
Escape `roomName`, `hostName`:
```javascript
const escapedRoomName = escapeHtml(roomName);
const escapedHostName = escapeHtml(hostName);
// Gebruik ${escapedRoomName} en ${escapedHostName} in de template
```

**Regel 1576-1582 (showVotingUI):**
Escape `answerData.answer` en `answerData.playerName`:
```javascript
const escapedAnswer = escapeHtml(answerData.answer);
const escapedPlayerName = escapeHtml(answerData.playerName);
// Gebruik ${escapedPlayerName} en ${escapedAnswer} in de template
```

**Regel 2206-2214 (renderGameLog):**
Escape `entry.playerName` en `entry.answer`:
```javascript
const escapedPlayerName = escapeHtml(entry.playerName);
const escapedAnswer = escapeHtml(entry.answer);
// Gebruik ${escapedPlayerName} en ${escapedAnswer} in de template
```

---

## Prioriteit 3: Internationalisatie

### 3.1 Vervang hardcoded Nederlandse teksten
**Probleem:** Sommige teksten gebruiken niet het `t()` vertaalsysteem.

**Actie 1:** Voeg de volgende keys toe aan `translations.js` in BEIDE talen:

```javascript
// Nederlands (nl):
confirmDeleteRoom: "Weet je zeker dat je deze kamer wilt verwijderen?",
roomDeletedSuccess: "Kamer verwijderd!",
defaultRoomName: "'s Kamer",
authError: "Er ging iets mis met inloggen. Controleer je internetverbinding.",
enterNameFirst: "Vul eerst je naam in!",
invalidCode: "Ongeldige code",
roomNotFound: "Kamer niet gevonden!",
errorGeneric: "Er ging iets mis",

// Engels (en):
confirmDeleteRoom: "Are you sure you want to delete this room?",
roomDeletedSuccess: "Room deleted!",
defaultRoomName: "'s Room",
authError: "Something went wrong with login. Check your internet connection.",
enterNameFirst: "Enter your name first!",
invalidCode: "Invalid code",
roomNotFound: "Room not found!",
errorGeneric: "Something went wrong",
```

**Actie 2:** Vervang de hardcoded teksten in script.js:

| Regel | Oud | Nieuw |
|-------|-----|-------|
| 302 | `"Er ging iets mis met inloggen..."` | `t('authError')` |
| 365 | `` `${hostName}'s Kamer` `` | `` `${hostName}${t('defaultRoomName')}` `` |
| 477 | `"Weet je zeker dat je deze kamer wilt verwijderen?"` | `t('confirmDeleteRoom')` |
| 486 | `"Kamer verwijderd!"` | `t('roomDeletedSuccess')` |
| 534 | `` `${name}'s Kamer` `` | `` `${name}${t('defaultRoomName')}` `` |
| 566 | `"Vul eerst je naam in!"` | `t('enterNameFirst')` |
| 567 | `"Ongeldige code"` | `t('invalidCode')` |
| 598 | `"Kamer niet gevonden!"` | `t('roomNotFound')` |

---

## Prioriteit 4: Code Cleanup

### 4.1 Verwijder ongebruikte joinRoom functie
**Locatie:** Regels 563-628

**Actie:** Verwijder de hele `joinRoom` functie. Deze is vervangen door `quickJoinRoom`.

---

### 4.2 Voeg constanten toe voor magic numbers
**Actie:** Voeg na regel 191 (na `allCategories`) de volgende constanten toe:

```javascript
// --- Constants ---
const CONSTANTS = {
    HEARTBEAT_INTERVAL_MS: 5000,
    INACTIVE_THRESHOLD_MS: 120000,      // 2 minuten
    VOTING_INACTIVE_THRESHOLD_MS: 180000, // 3 minuten
    VOTE_TIMER_DURATION_S: 30,
    MORE_TIME_SECONDS: 10,
    MAX_HEARTBEAT_RETRIES: 3,
    ROOM_CODE_LENGTH: 4
};

const ROOM_STATUS = {
    LOBBY: 'lobby',
    PLAYING: 'playing',
    VOTING: 'voting',
    FINISHED: 'finished',
    DORMANT: 'dormant',
    DELETED: 'deleted'
};
```

**Actie:** Vervang de magic numbers en strings door deze constanten. Belangrijkste locaties:

| Regel | Oud | Nieuw |
|-------|-----|-------|
| 339 | `["lobby", "playing", "voting", "finished"]` | `[ROOM_STATUS.LOBBY, ROOM_STATUS.PLAYING, ROOM_STATUS.VOTING, ROOM_STATUS.FINISHED]` |
| 1069 | `5000` | `CONSTANTS.HEARTBEAT_INTERVAL_MS` |
| 1145-1146 | `180000` / `120000` | `CONSTANTS.VOTING_INACTIVE_THRESHOLD_MS` / `CONSTANTS.INACTIVE_THRESHOLD_MS` |
| 1819 | `30` | `CONSTANTS.VOTE_TIMER_DURATION_S` |
| 1869 | `10` (twee keer) | `CONSTANTS.MORE_TIME_SECONDS` |

En vervang alle string literals `'lobby'`, `'playing'`, `'voting'`, `'finished'`, `'dormant'`, `'deleted'` door de corresponderende `ROOM_STATUS.*` constante.

---

### 4.3 Voeg error handling toe aan async functies
**Probleem:** Veel async functies missen try/catch.

**Actie:** Wrap de volgende functies in try/catch:

**handleRollClick (regel 847-865):**
```javascript
async function handleRollClick() {
    if (!isHost) return;
    try {
        const newLetter = getRandomLetter();
        currentLetter = newLetter;
        letterDisplay.textContent = currentLetter;

        await updateDoc(doc(db, "rooms", roomId), {
            status: ROOM_STATUS.PLAYING,
            currentLetter: newLetter,
            timerEnd: Date.now() + (gameDuration * 1000),
            scoresCalculated: false,
            lastProcessedCategoryIndex: -1,
            players: roomData.players.map(p => ({ ...p, answers: {}, verifiedResults: {} })),
            lastActivity: Date.now()
        });
    } catch (e) {
        console.error("Error starting game:", e);
        alert(t('errorGeneric') + ': ' + e.message);
    }
}
```

**Voeg ook try/catch toe aan:**
- `handleStopClick` (regel 867-870)
- `handleShuffleClick` (regel 872-879)
- `initiateVotingPhase` (regel 1261-1268)
- `submitCategoryVotes` (regel 1653-1690)

---

### 4.4 Reduceer code duplicatie in reset functies
**Probleem:** `handleNextRound` en `handleResetGameClick` hebben bijna identieke code.

**Actie:** Maak een gedeelde helper functie en refactor beide functies:

```javascript
// Voeg toe na regel 880 (voor handleNextRound)
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
        alert(t('errorGeneric') + ': ' + e.message);
    }
}

async function handleResetGameClick() {
    if (!isHost) {
        alert(t('onlyHostCanReset'));
        return;
    }
    if (!confirm(t('confirmReset'))) {
        return;
    }
    try {
        console.log('Resetting game to lobby state');
        await resetRoomToLobby();
        console.log('Game reset to lobby successfully');
    } catch (e) {
        console.error("Error resetting game:", e);
        alert(t('errorGeneric') + ': ' + e.message);
    }
}
```

---

### 4.5 Verwijder of conditioneer console.log statements
**Probleem:** Meer dan 40 debug console.log statements vervuilen de console.

**Actie:** Voeg een debug wrapper toe na de constanten (rond regel 200):

```javascript
const DEBUG = false; // Zet op true voor development

function debugLog(...args) {
    if (DEBUG) console.log('[DEBUG]', ...args);
}
```

**Actie:** Vervang alle `console.log(...)` calls door `debugLog(...)`, BEHALVE de `console.error(...)` calls (die moeten blijven voor error tracking).

Voorbeeld locaties om te vervangen:
- Regel 269: `console.log("Logged in as", currentUser.uid);`
- Regel 389: `console.log(\`Reopening dormant room...\`);`
- Regel 514: `console.log(\`${playerToKick.name} is uit de kamer verwijderd\`);`
- Etc.

---

## Verificatie Checklist

Na het uitvoeren van alle fixes, controleer:

- [ ] Geen console errors bij pagina laden
- [ ] Geen dubbele functie warnings
- [ ] Room aanmaken werkt nog
- [ ] Room joinen werkt nog
- [ ] Spel starten werkt nog
- [ ] Stemmen werkt nog
- [ ] Resultaten worden getoond
- [ ] Taal wisselen werkt nog
- [ ] Alle teksten zijn correct vertaald
- [ ] XSS test: voer `<script>alert('xss')</script>` in als spelernaam - mag NIET uitvoeren

---

## Git Workflow

```bash
# Maak een branch voor de fixes
git checkout -b fix/code-quality-issues

# Na elke prioriteit, commit
git add script.js translations.js
git commit -m "fix: [beschrijving van de fix]"

# Na alle fixes
git push origin fix/code-quality-issues
```
