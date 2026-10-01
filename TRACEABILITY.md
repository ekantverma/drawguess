# Requirement traceability

Maps every requirement in the assignment PDF (plus the extra scope agreed afterwards) to its implementation and the evidence
that it works. **A feature is only marked verified if a test or a real multi-browser run exercised it.**

| Mark | Meaning |
|---|---|
| ✅ | **Verified** - covered by an automated test and/or observed in real browser sessions |
| 🟡 | **Implemented, partly verified** - works, but some path/variant was not exercised (stated) |
| ⬜ | **Implemented, unverified** - code exists but could not be run in the build environment (stated) |
| ❌ | **Not implemented** |

Evidence key: **U** = server engine unit tests (`apps/server/tests/game.test.ts`, 36), **S** = Socket.IO integration tests
(`sockets.test.ts`, 8, real `socket.io-client`), **W** = web unit tests (`apps/web/tests`, 13), **SH** = shared tests (7),
**E1/E2/E3** = Playwright browser suites in `e2e/` (`gameplay` 67 checks, `moderation_and_resilience` 20, `tools_and_settings` 8).
"Phase" = delivery order: P1 shared contracts -> P2 game engine -> P3 sockets/REST -> P4 frontend -> P5 canvas/real-time -> P6 verification/docs.

## 1. Core requirements (PDF "Core Requirements")

| # | Requirement | Frontend | Backend | Phase | Evidence | |
|---|---|---|---|---|---|---|
| 1 | Multiplayer rooms, public & private | `create-room`, `join`, `RoomGate`, `Lobby` | `RoomRegistry`, `Room`, `create_room`/`join_room`, `GET /api/rooms/*` | P2-P4 | U, S, E1, E3 | ✅ |
| 2 | Turn-based drawing, one drawer per round | `GameBoard`, `Overlays` | `Game`, `RoundManager` | P2 | U (rotation, 2 draws each), E1 (4 turns, alternating drawer) | ✅ |
| 3 | Real-time drawing via WebSockets | `DrawingCanvas`, `CanvasController`, `socketBinder` | `DrawHandler`, `Game.draw*` | P5 | S, E1 (pixels appear on other client), E3 | ✅ |
| 4 | Word system: drawer picks, others see blanks | `WordPicker`, `WordDisplay` | `WordService`, `Game.chooseWord` | P2, P4 | U, S, E1, W | ✅ |
| 5 | Scoring, leaderboard, winner | `PlayerList`, `GameOver` | `ScoreManager`, `pickWinner` | P2 | U (formula, once-only, ties), E1 | ✅ |
| 6 | WebSockets for drawing, guesses, chat, state | `lib/socket.ts`, `socketBinder` | `SocketGateway` + 5 handler classes | P3 | S, E1-E3 | ✅ |

## 2. Room & lobby

| Requirement | Frontend | Backend | Evidence | |
|---|---|---|---|---|
| Create room with settings | `create-room` + `SettingsForm` (RHF+Zod) | `createRoomSchema`, `create_room` | S (invalid rejected), E1, E2 | ✅ |
| Join via code | `join` page (live validation) | `join_room`, `GET /api/rooms/:code` | S, E1 (bad code, good code) | ✅ |
| Join via invite link | `RoomGate` identity form for `/room/CODE` | same | E1/E2 use `/join?code=`; direct `/room/CODE` form seen in E2 (not-found path) | 🟡 direct-link happy path not browser-tested separately |
| Lobby: players, ready-up, host starts | `Lobby`, `PlayerList` | `Room.setReady/startGame` | U, S, E2 (ready shown to host) | ✅ |
| Only host starts; needs ≥2 players | Start button disabled | `Room.startGame` | U, S, E1 (disabled with 1 player) | ✅ |
| Private room (invite only) | default; not listed | `publicRooms()` filters | S, E3 | ✅ |
| Public rooms (browse open rooms) | "Public rooms" list on `/join` | `GET /api/rooms/public` | S, E3 | ✅ - browse + click-to-fill. No one-click "random match" button |
| Room full / not found / game in progress | messages on `/join` & `RoomGate` | `ROOM_FULL`, `ROOM_NOT_FOUND`, auto-spectator | S, E1 (in progress), E2 (not found) | ✅ |

## 3. Game flow

| Requirement | Evidence | |
|---|---|---|
| Word selection 1-of-N (1-5), auto-pick on timeout | U, E1 (3 choices), E2 (2 choices) | ✅ |
| Drawing + sync | S, E1, E3 | ✅ |
| Guessing (first correct earns most) | U (order multiplier), S, E1 | ✅ |
| Hints (letters revealed over time, never all) | U, E2 (letter revealed mid-turn in browser) | ✅ |
| Round end on timer or all guessed; next drawer | U, S, E1 (all guessed), E2 (time up) | ✅ |
| Game end with winner + leaderboard | U, S, E1; tie / no-winner rule: U | ✅ |

## 4. Drawing tools

| Requirement | Evidence | |
|---|---|---|
| Brush with color | E1/E3 draw; stroke color transported & stored (S) | 🟡 palette click-to-change not clicked in a browser test |
| Brush size | E3 selects size 22 | ✅ |
| Eraser | E3 (pixels removed on other client) | ✅ |
| Undo last stroke | U, E1 (other client's drawing shrinks) | ✅ |
| Clear canvas (drawer only) | U + S (non-drawer rejected), E3 (empties both clients) | ✅ |
| Non-drawer cannot draw | S, E1 (mouse input on guesser canvas changes nothing) | ✅ |
| Resize / alignment across screens | normalised 0-1 coords, scaled stage | 🟡 two desktop widths + one 390 px viewport; not compared pixel-for-pixel |
| Touch drawing | pointer events (`touch-action: none`) | 🟡 not tested on a real touch device |

## 5. Chat & guessing

| Requirement | Evidence | |
|---|---|---|
| Guess input checked on server | U, S, E1 | ✅ |
| General chat | S (sanitised, rate limited), E1 | ✅ |
| "X guessed the word!" notification | U, S, E1 | ✅ |
| Hint display | W, E2 | ✅ |
| Word never leaks (state, events, DOM, chat) | U (scan of all events), S, E1 (DOM scan every turn) | ✅ |
| Drawer cannot leak the word in chat | U | ✅ |
| Spam rate limiting | S (`RATE_LIMITED`) | ✅ |

## 6. Room settings (host-configurable)

| Setting | Evidence | |
|---|---|---|
| Max players 2-20 | SH (range), U (limit enforced), S | ✅ |
| Rounds 2-10 | SH, E1/E2 | ✅ |
| Draw time 15-240 s | SH, E2 (15 s timer expiry) | ✅ |
| Word choices 1-5 | E1 (3), E2 (2) | ✅ |
| Hints 0-5 / disabled | U, E2 | ✅ |
| Word mode: Normal | E1 | ✅ |
| Word mode: Hidden | U, E3 | ✅ |
| Word mode: Combination | U (every choice is two words) | 🟡 not run in a browser |
| Language | U (es + all four languages), E3 (Spanish choices in browser) | 🟡 fr/de verified at engine level only |
| Categories filter | U | 🟡 UI chips not clicked in a browser |
| Custom words + custom-only | SH (validation), U, E2 (only custom words offered) | ✅ |
| Edit settings in lobby | E2 | ✅ |

## 7. Nice-to-have & bonus

| Item | Frontend / Backend | Evidence | |
|---|---|---|---|
| Word categories | `CATEGORIES`, `WordBankFile` | U | 🟡 see above |
| Eraser | `Toolbar` | E3 | ✅ |
| Host kick | `PlayerList` menu / `Moderation.kick` | U, S | ✅ |
| Host ban | same, `banned` sets | U, S, E1 (banned player blocked from rejoining) | ✅ |
| Votekick | `PlayerList` banner / `Moderation.voteKick` | U, E2 (majority removes player; host not offered) | ✅ |
| Report player | report dialog / `Moderation.report` | U, S (host-only delivery), E1 | ✅ (report row in MongoDB: ⬜) |
| Multiple word languages | `LANGUAGES`, `data/words/*` | see Language row | 🟡 |
| Custom word list | `SettingsForm` | E2 | ✅ |
| Avatars (picker; lobby, list, leaderboard) | `Avatar`, `AvatarPicker` | W (renders/clamps), visual review of screenshots | ✅ |
| Spectator mode | `Room.join` role, `GameBoard` | U, S, E1 (watches live drawing, cannot guess/draw, promoted after game) | ✅ |
| Replay of a finished round | `ReplayDialog`, `ReplayPlayer` | W (timeline + isolated controller), E1 (round end and results screen) | ✅ |
| OOP server structure | Room, Player, Game, RoundManager, ScoreManager, WordService, TimerService, ChatService, Moderation, handler classes | - (architecture) | ✅ |
| Game history + final results | `GameOver`, `/history` | S (REST), E1 (history page) | ✅ in memory; ⬜ persisted to MongoDB |

## 8. Platform, security & reliability

| Item | Evidence | |
|---|---|---|
| Reconnect after reload / network drop, seat restored, no duplicate | S, E1 (reload), E2 (offline -> auto-reconnect) | ✅ |
| Snapshot of drawing + chat on (re)join | S, E1 (spectator mid-turn) | ✅ |
| Host migration | U, E2 (host leaves, next player gets host controls) | ✅ |
| Timer safety (stale callbacks, double end, double start) | U | ✅ |
| Early end when <2 players | U, E2 | ✅ |
| Empty-room cleanup, timers cleared | U | ✅ |
| Graceful shutdown (SIGTERM) | observed in server log | ✅ |
| Input validation (HTTP + sockets, Zod) | SH, S | ✅ |
| Helmet headers | observed in response headers | ✅ |
| CORS allow-list | works from the allowed origin in all browser runs | 🟡 rejection of a disallowed origin not tested |
| REST rate limiting | configured (`express-rate-limit`) | ⬜ not exercised |
| Responsive layout, dark mode | screenshots reviewed (desktop, 390 px mobile, dark) | 🟡 visual review only, no automated visual tests |
| Accessibility basics (labels, roles, live regions) | used throughout; locators in e2e rely on them | 🟡 no audit tool run |
| Production builds | `npm run build` succeeds; built bundles run in e2e | ✅ |

## 9. MongoDB-dependent features (could NOT be run: no MongoDB reachable from the build sandbox)

Code is written and type-checked; an opt-in integration suite exists (`apps/server/tests/db.test.ts`, 4 tests, **skipped** without
`MONGODB_TEST_URI`). **Run it once on your machine** before relying on these.

| Feature | Status |
|---|---|
| Seed script (`npm run seed`) and loading words from MongoDB | ⬜ |
| Persisted game history (`GameHistory`) | ⬜ (in-memory fallback ✅) |
| Registration / login (bcrypt + JWT cookie), `/account` page | ⬜ |
| Player statistics (`PlayerStatistics`) | ⬜ |
| Persisted reports (`Report`) | ⬜ |

## 10. Not done / out of scope

| Item | Status |
|---|---|
| Deployment to any host (you are handling this) | ❌ by request. Only documented in README |
| Docker / compose files | ❌ not provided |
| One-click random matchmaking | ❌ (browse + join public rooms instead) |
| Horizontal scaling (Redis adapter) | ❌ documented limitation |
| Persisting replays / drawings to MongoDB | ❌ by design (memory only) |
| Languages beyond en/es/fr/de | ❌ (adding one = one word file + one line in `LANGUAGES`) |
