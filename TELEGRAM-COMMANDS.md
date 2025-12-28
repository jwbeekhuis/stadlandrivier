# Claude Dev Pipeline - Telegram Commands

## Overzicht

Je kunt je Stad Land Rivier game aansturen via Telegram. Stuur berichten naar je bot om taken te starten, goed te keuren of af te breken.

## Commands

### Nieuwe taak starten

Stuur gewoon een beschrijving van wat je wilt. Alles wat niet een van de onderstaande keywords is, wordt als nieuwe taak behandeld.

**Voorbeelden:**
```
Voeg een donkere modus toe aan de game
Fix de bug waarbij de score niet goed wordt berekend
Maak de buttons groter op mobiel
Voeg een comment toe bovenaan index.html met tekst "Test"
Refactor de gameLogic.js om leesbaarder te zijn
```

**Let op:** Er kan maar één taak tegelijk actief zijn. Als er al een taak loopt, krijg je een melding.

---

### Status opvragen

Vraag de huidige status van de pipeline op.

**Command:**
```
status
```

**Response:** Toont de huidige status (idle/developing/awaiting_review), actieve branch, taak en preview URL.

---

### Preview goedkeuren (live zetten)

Nadat je een preview URL hebt ontvangen en getest, kun je de wijziging live zetten.

**Commands (één van):**
```
ok
ja
approved
goedgekeurd
deploy
live
```

**Wat gebeurt er:**
1. Feature branch wordt gemerged naar main
2. Code wordt gedeployed naar productie
3. Feature branch wordt verwijderd
4. Je krijgt bevestiging in Telegram

---

### Feedback geven (aanpassingen vragen)

Als de preview niet goed is, kun je feedback geven. Claude past de code dan aan.

**Format:**
```
nee <jouw feedback>
```

**Voorbeelden:**
```
nee de button moet blauw zijn, niet rood
nee het font is te klein op mobiel
nee voeg ook een hover effect toe
feedback de animatie is te langzaam
```

**Wat gebeurt er:**
1. Claude ontvangt je originele taak + jouw feedback
2. Maakt aanpassingen in dezelfde branch
3. Deployt nieuwe preview
4. Je krijgt nieuwe preview URL

---

### Taak annuleren

Stop de huidige taak en reset de pipeline.

**Commands (één van):**
```
cancel
stop
annuleer
reset
```

**Wat gebeurt er:**
1. State wordt gereset naar idle
2. Feature branch blijft bestaan in GitHub (handmatig verwijderen indien gewenst)
3. Je kunt een nieuwe taak starten

---

## Flow diagram

```
[Jij stuurt taak]
      │
      ▼
[Claude schrijft code]
      │
      ▼
[Preview URL in Telegram]
      │
      ├── "ok" ──────► [Merge + Live deploy] ──► [Bevestiging]
      │
      ├── "nee ..." ──► [Claude past aan] ──► [Nieuwe preview]
      │
      └── "cancel" ──► [Reset] ──► [Klaar voor nieuwe taak]
```

---

## Tips

1. **Wees specifiek** in je taak beschrijving. Hoe duidelijker, hoe beter het resultaat.

2. **Test de preview** grondig voordat je "ok" stuurt. Eenmaal live is lastiger terug te draaien.

3. **Gebruik feedback** iteratief. Je kunt meerdere keren "nee ..." sturen tot het goed is.

4. **Check de status** als je niet zeker weet of er iets loopt.

5. **Kleine taken** werken beter dan grote. "Voeg een button toe" is beter dan "Redesign de hele UI".

---

## Technische details

- **Branch naming:** `feature-{timestamp}`
- **Preview URL format:** `https://stadlandrivier--{branch}-{hash}.web.app`
- **Live URL:** `https://stadlandrivier.web.app`
- **Model:** Claude Sonnet 4
- **Timeout:** Preview channels verlopen na 7 dagen

---

## Troubleshooting

### "Ik ben nog bezig"
Er loopt al een taak. Wacht tot die klaar is of stuur `cancel`.

### "Dat kan nu niet"
Je probeert goed te keuren of feedback te geven terwijl er geen preview klaar staat.

### Geen reactie van bot
Check of n8n draait en of de workflow actief is.

### Preview URL werkt niet
De Firebase deploy kan gefaald zijn. Check GitHub Actions voor details.
