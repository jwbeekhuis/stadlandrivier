# Taken voor Sonnet - Stad Land Rivier Verbeteringen

Dit document bevat alle verbeteringstaken voor het Stad Land Rivier spel, georganiseerd per categorie en prioriteit. Elke taak is een zelfstandige opdracht die door Sonnet uitgevoerd kan worden.

---

## 🔴 PRIORITEIT 1: Kritieke Bugs & Code Quality

### Taak 1.1: Verwijder Duplicate Functies
**Beschrijving:** Er zijn functies die dubbel gedefinieerd zijn in `script.js`. Dit veroorzaakt onverwacht gedrag.
**Actie:**
- Zoek en verwijder duplicate definities van functies
- Check specifiek: `updateActiveCategories`, `endRound`, `processNextCategory`
- Behoud alleen de meest complete/correcte versie
**Bestanden:** `script.js`

### Taak 1.2: Fix Niet-bestaande Functie Aanroep
**Beschrijving:** Er wordt ergens `processNextVoteItem()` aangeroepen, maar deze functie bestaat niet.
**Actie:**
- Zoek alle aanroepen naar `processNextVoteItem()`
- Vervang door de correcte functienaam of verwijder de aanroep
**Bestanden:** `script.js`

### Taak 1.3: Fix Memory Leaks - Interval Cleanup
**Beschrijving:** Intervals (`heartbeatInterval`, `timerInterval`, `voteTimerInterval`) worden niet altijd correct opgeruimd.
**Actie:**
- Audit alle `setInterval` aanroepen
- Zorg dat elk interval een corresponderende `clearInterval` heeft
- Voeg cleanup toe bij: room verlaten, room verwijderd, pagina refresh
- Implementeer een centrale cleanup functie `cleanupAllIntervals()`
**Bestanden:** `script.js`

### Taak 1.4: Fix Race Conditions in Voting
**Beschrijving:** De voting system gebruikt flags (`isProcessingCategory`, `isCalculatingScores`) die niet atomic zijn.
**Actie:**
- Identificeer alle race condition gevoelige code in het voting systeem
- Implementeer een proper locking mechanisme of gebruik Promise-based queuing
- Test scenario: meerdere spelers stemmen tegelijk op laatste antwoord
**Bestanden:** `script.js`

### Taak 1.5: Verwijder Debug Console.log Statements
**Beschrijving:** Er zijn 40+ `console.log` statements voor debugging die in productie niet thuishoren.
**Actie:**
- Zoek alle `console.log`, `console.warn`, `console.error` statements
- Verplaats naar een `DEBUG` flag controlled logging systeem
- Behoud alleen error logging voor echte fouten
- Implementeer: `if (DEBUG) console.log(...)` of een `debugLog()` helper
**Bestanden:** `script.js`

---

## 🟠 PRIORITEIT 2: Ontbrekende Vertalingen

### Taak 2.1: Voeg Ontbrekende Translation Keys Toe
**Beschrijving:** Diverse UI teksten missen vertalingen in `translations.js`.
**Actie:** Voeg de volgende keys toe aan zowel NL als EN:
```javascript
confirmDeleteRoom: "Weet je zeker dat je deze kamer wilt verwijderen?"
roomDeletedSuccess: "Kamer succesvol verwijderd"
defaultRoomName: "Naamloze kamer"
authError: "Authenticatie fout"
enterNameFirst: "Voer eerst een naam in"
invalidCode: "Ongeldige kamercode"
roomNotFound: "Kamer niet gevonden"
errorGeneric: "Er is iets misgegaan"
networkError: "Netwerkfout - controleer je internetverbinding"
votingError: "Fout bij stemmen"
```
**Bestanden:** `translations.js`

### Taak 2.2: Fix Hardcoded Nederlandse Tutorial Tekst
**Beschrijving:** De tutorial inhoud in `index.html` is hardcoded in het Nederlands.
**Actie:**
- Verplaats alle tutorial teksten naar `translations.js`
- Gebruik `data-i18n` attributen of dynamische updates via `updateTutorialContent()`
- Zorg dat tutorial volledig vertaald is in NL en EN
**Bestanden:** `index.html`, `translations.js`, `script.js`

### Taak 2.3: Implementeer Pluralisatie
**Beschrijving:** Teksten zoals "1 seconden" zijn grammaticaal incorrect (moet "1 seconde" zijn).
**Actie:**
- Identificeer alle plaatsen waar getallen met woorden gecombineerd worden
- Implementeer een `pluralize(count, singular, plural)` helper
- Pas toe op: seconden, punten, spelers, rondes
**Bestanden:** `script.js`, `translations.js`

---

## 🟡 PRIORITEIT 3: Accessibility (A11y)

### Taak 3.1: Voeg ARIA Labels toe aan Vote Buttons
**Beschrijving:** Vote knoppen hebben geen toegankelijke labels voor screen readers.
**Actie:**
- Voeg `aria-label` toe aan alle vote buttons met context (antwoord + speler)
- Voeg `aria-pressed` toe om geselecteerde state aan te geven
- Voorbeeld: `aria-label="Keur goed: Amsterdam door Jan"`
**Bestanden:** `script.js` (in `renderBatchVotingUI` functie)

### Taak 3.2: Implementeer ARIA Live Regions
**Beschrijving:** Dynamische content (toasts, timer, spelerslijst) wordt niet aangekondigd aan screen readers.
**Actie:**
- Voeg `aria-live="polite"` toe aan toast container
- Voeg `role="timer"` en `aria-live="assertive"` toe aan timer
- Voeg `aria-live="polite"` toe aan spelerslijst container
**Bestanden:** `index.html`, `script.js`

### Taak 3.3: Fix Keyboard Navigation
**Beschrijving:** Niet alle interactieve elementen zijn bereikbaar met keyboard.
**Actie:**
- Voeg `tabindex="0"` toe aan custom buttons die geen `<button>` zijn
- Zorg dat Enter en Space werken op alle klikbare elementen
- Test volledige game flow met alleen keyboard
**Bestanden:** `index.html`, `script.js`, `style.css`

### Taak 3.4: Voeg Skip Link toe
**Beschrijving:** Keyboard gebruikers moeten de header kunnen overslaan.
**Actie:**
- Voeg een "Skip to main content" link toe bovenaan de pagina
- Style deze link zodat hij alleen zichtbaar is bij focus
**Bestanden:** `index.html`, `style.css`

### Taak 3.5: Implementeer prefers-reduced-motion
**Beschrijving:** Gebruikers met motion sensitivity kunnen last hebben van animaties.
**Actie:**
- Voeg `@media (prefers-reduced-motion: reduce)` toe
- Disable of verminder: blob animations, confetti, pulse effects, transitions
**Bestanden:** `style.css`

### Taak 3.6: Fix Color Contrast Issues
**Beschrijving:** Sommige tekst heeft onvoldoende contrast (vooral in light mode).
**Actie:**
- Audit alle tekst kleuren met WCAG contrast checker
- Fix kleuren die onder 4.5:1 ratio vallen (AA standaard)
- Let op: lichte tekst op gradient backgrounds
**Bestanden:** `style.css`

### Taak 3.7: Vergroot Touch Targets
**Beschrijving:** Sommige knoppen zijn kleiner dan 44x44px (WCAG 2.1 AA vereiste).
**Actie:**
- Identificeer alle buttons en interactieve elementen
- Zorg dat minimum size 44x44px is (of grotere click area met padding)
**Bestanden:** `style.css`

---

## 🟢 PRIORITEIT 4: Performance Optimalisaties

### Taak 4.1: Debounce Firebase Writes
**Beschrijving:** Heartbeat en andere Firebase writes gebeuren te vaak.
**Actie:**
- Implementeer een `debounce()` utility functie
- Pas toe op: heartbeat updates, antwoord saves tijdens typen
- Overweeg: heartbeat interval van 5s naar 10s verhogen
**Bestanden:** `script.js`

### Taak 4.2: Optimaliseer Player List Rendering
**Beschrijving:** De spelerslijst wordt volledig opnieuw gerenderd bij elke heartbeat.
**Actie:**
- Implementeer een diff-based update: alleen gewijzigde spelers updaten
- Cache player DOM elementen en update alleen tekst/classes
- Voorkom volledige innerHTML replacement
**Bestanden:** `script.js`

### Taak 4.3: Lazy Load Confetti Library
**Beschrijving:** Confetti library wordt altijd geladen, ook als er geen winnaar is.
**Actie:**
- Laad confetti script dynamisch alleen wanneer nodig
- Implementeer: `await import('canvas-confetti')` pattern
**Bestanden:** `index.html`, `script.js`

### Taak 4.4: Optimaliseer Font Awesome
**Beschrijving:** Volledige Font Awesome library wordt geladen terwijl maar ~10 iconen gebruikt worden.
**Actie:**
- Identificeer alle gebruikte Font Awesome iconen
- Switch naar specifieke icon imports of gebruik een icon subset
- Alternatief: vervang door inline SVGs
**Bestanden:** `index.html`

### Taak 4.5: Implementeer Firebase WriteBatch
**Beschrijving:** Meerdere Firebase writes kunnen gebundeld worden voor betere performance.
**Actie:**
- Identificeer plaatsen waar meerdere docs tegelijk geupdate worden
- Gebruik `writeBatch()` voor atomic multi-document updates
- Specifiek: score berekening, voting results opslaan
**Bestanden:** `script.js`

---

## 🔵 PRIORITEIT 5: Code Organisatie & Modularisatie

### Taak 5.1: Extract State Management naar Aparte Module
**Beschrijving:** Alle game state zit nu in globale variabelen verspreid door script.js.
**Actie:**
- Maak nieuw bestand: `js/state.js`
- Verplaats alle state variabelen naar centrale store
- Implementeer `getState()` en `updateState()` functies
- Export state en functies voor gebruik in andere modules
**Bestanden:** Nieuw: `js/state.js`, Update: `script.js`

### Taak 5.2: Extract Utility Functions
**Beschrijving:** Utility functies (escapeHtml, fuzzy matching, etc.) kunnen herbruikbaar gemaakt worden.
**Actie:**
- Maak nieuw bestand: `js/utils.js`
- Verplaats: `escapeHtml()`, `areWordsFuzzyMatching()`, `levenshteinDistance()`, `generateRoomCode()`, `shuffleArray()`
**Bestanden:** Nieuw: `js/utils.js`, Update: `script.js`

### Taak 5.3: Extract Firebase Operations
**Beschrijving:** Firebase operaties zijn verspreid door de hele codebase.
**Actie:**
- Maak nieuw bestand: `js/firebase-operations.js`
- Groepeer: room CRUD, player updates, voting operations, word library
- Maak duidelijke API: `createRoom()`, `joinRoom()`, `submitVote()`, etc.
**Bestanden:** Nieuw: `js/firebase-operations.js`, Update: `script.js`

### Taak 5.4: Extract UI Rendering Functions
**Beschrijving:** UI rendering is verweven met business logic.
**Actie:**
- Maak nieuw bestand: `js/ui.js`
- Verplaats alle `render*` functies
- Verplaats DOM manipulation en innerHTML updates
**Bestanden:** Nieuw: `js/ui.js`, Update: `script.js`

### Taak 5.5: Implementeer DOM Registry Pattern
**Beschrijving:** DOM elementen worden steeds opnieuw gequeuried met getElementById.
**Actie:**
- Maak een `DOM` object met alle element references
- Cache elementen bij page load
- Gebruik: `DOM.playerList` ipv `getElementById('player-list')`
**Bestanden:** `script.js` of nieuw: `js/dom.js`

---

## 🟣 PRIORITEIT 6: Error Handling & Robustness

### Taak 6.1: Voeg Global Error Handler toe
**Beschrijving:** Onafgevangen errors kunnen de hele app crashen.
**Actie:**
- Voeg `window.onerror` en `window.onunhandledrejection` handlers toe
- Log errors naar console met context
- Toon user-friendly toast bij onverwachte fouten
**Bestanden:** `script.js`

### Taak 6.2: Implementeer Offline Detection
**Beschrijving:** Geen feedback wanneer gebruiker offline gaat.
**Actie:**
- Luister naar `online`/`offline` events
- Toon banner of toast wanneer verbinding verloren gaat
- Queue Firebase writes voor later wanneer offline
**Bestanden:** `script.js`

### Taak 6.3: Verbeter Error Messages met Specifieke Codes
**Beschrijving:** Alle fouten tonen `errorGeneric` wat debugging lastig maakt.
**Actie:**
- Definieer error codes enum/object
- Maak specifieke error messages per situatie
- Log error codes voor debugging
**Bestanden:** `script.js`, `translations.js`

### Taak 6.4: Voeg Try-Catch toe aan Onbeveiligde Async Functies
**Beschrijving:** Niet alle async functies hebben error handling.
**Actie:**
- Identificeer alle async functies zonder try-catch
- Voeg appropriate error handling toe
- Zorg voor user feedback bij fouten
**Bestanden:** `script.js`

---

## ⚪ PRIORITEIT 7: UX Verbeteringen

### Taak 7.1: Voeg Loading States toe
**Beschrijving:** Geen feedback tijdens async operaties (room joinen, etc.).
**Actie:**
- Toon spinner of "Laden..." bij: room creation, joining, vote submission
- Disable buttons tijdens operaties om double-clicks te voorkomen
**Bestanden:** `script.js`, `style.css`

### Taak 7.2: Fix Mobile Keyboard Overlap
**Beschrijving:** Virtual keyboard kan input velden bedekken op mobile.
**Actie:**
- Detecteer wanneer keyboard open is
- Scroll input element into view
- Overweeg `visualViewport` API
**Bestanden:** `script.js`, `style.css`

### Taak 7.3: Voeg Confirmation voor Browser Back Button toe
**Beschrijving:** Per ongeluk teruggaan verliest game state.
**Actie:**
- Implementeer `beforeunload` event met warning
- Overweeg history.pushState voor game states
**Bestanden:** `script.js`

### Taak 7.4: Verbeter Empty States
**Beschrijving:** Lege lijsten (geen spelers, geen actieve kamers) hebben geen informatieve tekst.
**Actie:**
- Voeg vriendelijke empty state messages toe
- Voorbeeld: "Nog geen spelers in de kamer. Deel de code om vrienden uit te nodigen!"
**Bestanden:** `script.js`, `translations.js`

### Taak 7.5: Voeg Sound Effects toe (Optioneel)
**Beschrijving:** Geen audio feedback voor acties.
**Actie:**
- Voeg subtiele geluidseffecten toe voor: timer bijna op, ronde start, stemmen, winnaar
- Zorg voor mute toggle
- Respecteer user preferences
**Bestanden:** `script.js`, `index.html`

---

## 🧪 PRIORITEIT 8: Testing Infrastructure

### Taak 8.1: Setup Vitest Test Framework
**Beschrijving:** Er zijn geen tests in het project.
**Actie:**
- Installeer Vitest (of Jest) en configureer
- Maak test directory structuur
- Voeg npm scripts toe: `npm test`, `npm run test:watch`
**Bestanden:** `package.json` (nieuw of update), `vitest.config.js`

### Taak 8.2: Schrijf Unit Tests voor Utility Functions
**Beschrijving:** Utility functies zijn goed testbaar maar niet getest.
**Actie:**
- Test `escapeHtml()` met XSS payloads
- Test `areWordsFuzzyMatching()` met edge cases
- Test `levenshteinDistance()` met bekende cases
- Test `generateRoomCode()` uniqueness
**Bestanden:** Nieuw: `tests/utils.test.js`

### Taak 8.3: Schrijf Unit Tests voor Scoring Logic
**Beschrijving:** Scoring is kritieke functionaliteit die getest moet worden.
**Actie:**
- Test 20 punten voor uniek antwoord
- Test 10 punten voor uniek in categorie met anderen
- Test 5 punten voor gedeeld antwoord (fuzzy match)
- Test 0 punten voor rejected
**Bestanden:** Nieuw: `tests/scoring.test.js`

### Taak 8.4: Schrijf Unit Tests voor Translation System
**Beschrijving:** Translation functie kan breken bij ontbrekende keys.
**Actie:**
- Test `t()` functie met geldige keys
- Test fallback behavior bij ontbrekende keys
- Test nested keys
- Test language switching
**Bestanden:** Nieuw: `tests/translations.test.js`

---

## 🎮 PRIORITEIT 9: Gameplay Verbeteringen

### Taak 9.1: Implementeer Spectator Mode
**Beschrijving:** Spelers kunnen nu alleen meedoen, niet toekijken.
**Actie:**
- Voeg "Toekijken" optie toe bij room join
- Spectators zien spel maar kunnen niet typen/stemmen
- Spectators tellen niet mee bij voting quorum
**Bestanden:** `script.js`, `index.html`, `translations.js`

### Taak 9.2: Voeg Room Password toe (Optioneel)
**Beschrijving:** Kamers zijn nu publiek toegankelijk met code.
**Actie:**
- Voeg optioneel wachtwoord veld toe bij room creation
- Check wachtwoord bij join
- Toon slot icoon bij beveiligde kamers
**Bestanden:** `script.js`, `index.html`, `translations.js`

### Taak 9.3: Custom Categories Support
**Beschrijving:** Spelers kunnen nu geen eigen categorieën toevoegen.
**Actie:**
- Voeg UI toe voor custom category input
- Sla custom categories op per room
- Vertaal of label als "Custom"
**Bestanden:** `script.js`, `index.html`, `translations.js`

### Taak 9.4: Implementeer Achievements/Badges
**Beschrijving:** Geen long-term engagement mechanics.
**Actie:**
- Definieer achievements: "5 rondes gewonnen", "Uniek antwoord", etc.
- Sla achievements op in user profile
- Toon badges in UI
**Bestanden:** `script.js`, `index.html`, `style.css`, `translations.js`

### Taak 9.5: Voeg Game Statistics Dashboard toe
**Beschrijving:** Geen overzicht van spelstatistieken.
**Actie:**
- Track: games gespeeld, totaal punten, win rate
- Toon personal stats in profiel
- Optioneel: room-level leaderboards
**Bestanden:** `script.js`, `index.html`, `style.css`

---

## 📋 SAMENVATTING PRIORITEITEN

| Prioriteit | Categorie | Aantal Taken | Geschatte Effort |
|------------|-----------|--------------|------------------|
| 🔴 1 | Kritieke Bugs | 5 | Klein-Medium |
| 🟠 2 | Vertalingen | 3 | Klein |
| 🟡 3 | Accessibility | 7 | Medium |
| 🟢 4 | Performance | 5 | Medium |
| 🔵 5 | Code Organisatie | 5 | Groot |
| 🟣 6 | Error Handling | 4 | Medium |
| ⚪ 7 | UX Verbeteringen | 5 | Medium |
| 🧪 8 | Testing | 4 | Medium-Groot |
| 🎮 9 | Gameplay | 5 | Groot |

**Totaal: 43 taken**

---

## UITVOERINGS INSTRUCTIES VOOR SONNET

Bij het uitvoeren van deze taken:

1. **Lees eerst** de relevante bestaande code voordat je wijzigingen maakt
2. **Test handmatig** na elke wijziging dat het spel nog werkt
3. **Commit kleine changes** - één taak per commit
4. **Volg bestaande code style** - kijk naar hoe vergelijkbare code geschreven is
5. **Update translations.js** als je nieuwe user-facing tekst toevoegt
6. **Behoud backwards compatibility** - zorg dat bestaande games niet breken
7. **Check de REFACTOR-PLAN.md** voor context over geplande architectuur
8. **Check CODE-QUALITY-FIXES.md** voor bekende issues

Bij vragen over een taak, vraag de gebruiker om verduidelijking voordat je begint.
