# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Game Zone (قيم زون) — real-time multiplayer gaming platform. Players join rooms via 5-char codes and compete in elimination games. Fully Arabic-localized, RTL, mobile-first.

## Commands

```bash
npm install && cd server && npm install && cd ..
npm run dev:all          # Client :3000 + Server :3001 (concurrently)
npm run dev              # Vite client only (:3000)
npm run server           # Express server only (:3001)
npm run build            # Production build → /dist/
```

No tests, no linter configured. Multi-tab testing: add `?p=2` to URL for separate localStorage namespace per tab.

## Tech Stack

- **Frontend:** React 18 + Vite 6, pure inline styles (no UI libraries), Socket.IO client
- **Backend:** Express + Socket.IO on port 3001, in-memory Maps (no DB)
- **Proxy:** Vite proxies `/socket.io` to `:3001` (configured in `vite.config.js`)

## Architecture

### Server-Side Authority
All game logic (scoring, elimination, correct answers) runs exclusively on the server. The client never receives correct answers until reveal phase. This is the core anti-cheat design — never move game logic to the client.

### Screen State Machine (no router library)
`src/App.jsx` manages a single `screen` state variable with values: `loading → identity → landing → lobby → pyramid|arena → dashboard → lobby`. Screen transitions use callback props (`onRoom`, `onGameStart`, `onGameFinish`).

### Socket Event Flow
Events are namespaced by system: `session:*`, `room:*`, `pyramid:*`, `arena:*`. Server routes all events in `server/index.js`. Each game engine (`server/games/*.js`) manages its own `activeGames` Map keyed by room code.

### Timer Sync Pattern
Server sends absolute `timerEnd` timestamp. Client calculates countdown via `(timerEnd - Date.now()) / 1000`. Avoids network latency drift.

### Circular Dependency Workaround
`roomManager` needs `sessionManager.getSession()` for player level display. Solved via lazy injection: `initSessionLookup(getSession)` called at startup in `index.js`.

## Game Engines

### Pyramid (`server/games/pyramid.js`)
Quiz battle royale. Wrong answerers eliminated each round. If all correct, no one eliminated.

- **Rounds:** `Math.ceil(playerCount * 1.5)` (min 5, max 15)
- **Difficulty progression:** easy (30%) → medium (30%) → hard (25%) → extreme (15%) based on round progress
- **Scoring:** `(multiplier × 100) + (timeRemaining × 10) + (streak × 50)`
- **Lifelines** (1 each): skip (auto-correct + bonus), fifty (hide 2 wrong — personalized per player via `hiddenOptions` Map), time (+8s personal timer)
- **Finals (Best of 3):** When 2 players remain, enters finals mode. Round winner = higher points. First to 2 wins = champion. Dynamic question generation from pools if questions run out.
- **Question pools** stored in game state (`pools`, `poolIdx`) for cycling with wraparound

### Arena (`server/games/arena.js`)
8 challenge types, players compete simultaneously, lowest scorer(s) eliminated each round.

- **Rounds:** `Math.ceil(playerCount * 1.2)` (min 5, max 8=challenge count)
- **Elimination:** 1 per round (2 if 10+ players), bottom scorers cut
- **Finals (Best of 3):** Same pattern — 2 players left triggers best-of-3 with dynamically generated challenges
- **Challenge types:** speed_tap, memory, truefalse, reaction, word, color, emoji_spot, number_sort
- **Dynamic generation:** `getFinalsChallenge()` picks unused challenge types first, then any

## Key Data Files

| File | Contents |
|------|----------|
| `server/data/questions.js` | `PQ` (100+ questions per difficulty), `DIFFICULTY_CONFIG`, `calcTotalRounds()`, `getDifficulty()` |
| `server/data/challenges.js` | `ARENA_CHALLENGES` (8 types), `TRUE_FALSE_STATEMENTS` (75), `WORD_PUZZLES` (100), `COLOR_NAMES` (14), `EMOJI_PAIRS` (20) |

Question format: `{ q: "سؤال", o: ["خ1","خ2","خ3","خ4"], a: correctIndex }`

## Styling

All CSS is inline `style={}` objects. Colors from `src/theme.js`: primary `#00E676`, gold `#FFD700`, red `#FF4444`, bg `#060b0a`. Global keyframe animations injected via `<style>` tag in theme. Mobile-first (max-width: 480px), min 44px touch targets.

## Room System

- 5-char codes (excludes ambiguous chars I, O, 0, 1)
- 2-20 players, host auto-transfers on disconnect
- Room states: `lobby` → `playing` → `lobby` (via `finishGame()`)
- Reconnection: `room:rejoin` restores player state mid-game

## XP & Leveling

`sessionManager.addScore()`: XP = score + (won ? 50 : 0), Level = `floor(sqrt(xp/100)) + 1`. Emits `session:xp-update` with `leveledUp` flag for client overlay.
