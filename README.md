# DrawGuess - multiplayer drawing & guessing game

A real-time, skribbl.io-style game. One player draws a secret word, everyone else races to guess it in chat.
Built as a monorepo: **Next.js** (App Router) frontend, **Express + Socket.IO** backend, **MongoDB/Mongoose** persistence,
and a **shared** TypeScript package that holds the Socket.IO event contract and Zod schemas used by both sides.

> **Live URL:** _not deployed yet_ - add yours here after you deploy (see [Deployment](#deployment-notes-for-later)).

---------------------------------------------------------------------------------------------------

## Features

Rooms (public/private, code + invite link), lobby with ready-up and host controls, configurable settings (players 2-20,
rounds 2-10, draw time 15-240 s, 1-5 word choices, 0-5 hints, word mode Normal/Hidden/Combination, language, categories,
custom words), turn-based drawing on a Konva canvas (brush, 12 colors, 4 sizes, eraser, undo, clear), real-time stroke sync,
server-side word matching and scoring, timed hints, chat with guessers-only/spectator channels, leaderboard + winner,
game history, **moderation** (host kick/ban, vote-kick, reports), **spectator mode**, **round replay**, **avatars**
(generated SVG, no assets), **4 languages** (en/es/fr/de), reconnection with host migration, dark mode, responsive UI.
See [`TRACEABILITY.md`](./TRACEABILITY.md) for what is verified vs. unverified.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 3, shadcn-style components on Radix, Lucide, Zustand, React Hook Form + Zod, TanStack Query |
| Canvas | Konva + react-konva |
| Backend | Node.js 20+, Express, Socket.IO, TypeScript, Zod, Helmet, CORS, express-rate-limit |
| Database | MongoDB + Mongoose (optional for local play - see below) |
| Auth (optional) | JWT in an HTTP-only cookie, bcryptjs |
| Tests | Vitest (unit + socket integration), React Testing Library, Playwright (browser e2e) |

## Folder structure

```
drawguess/
├── apps/
│   ├── web/                      Next.js app
│   │   ├── app/                  routes: / /create-room /join /room/[id] /game/[id] /history /account
│   │   ├── components/           ui/ (primitives), game/ (board, canvas, chat, overlays), lobby/
│   │   ├── hooks/ lib/ stores/   session hook, socket client, canvas controller, replay, Zustand stores
│   │   └── tests/                Vitest + RTL
│   └── server/
│       ├── src/game/             DOMAIN (no Express/Socket.IO imports): Room, Player, Game, RoundManager,
│       │                         ScoreManager, WordService, TimerService, ChatService, Moderation, RoomRegistry
│       ├── src/sockets/          TRANSPORT: SocketGateway + RoomHandler/GameHandler/DrawHandler/ChatHandler/ModerationHandler
│       ├── src/routes/ services/ REST API, Mongo access (words, history, stats, reports, auth)
│       ├── src/models/           Mongoose: Word, User, GameHistory, PlayerStatistics, Report
│       ├── src/data/words/       word banks per language (en, es, fr, de)
│       ├── src/scripts/seed.ts   seeds MongoDB with the word banks
│       └── tests/                game engine, socket integration, MongoDB (opt-in)
├── packages/shared/              event types, Zod schemas, constants (single source of truth)
├── e2e/                          Playwright browser suites + runner
├── TRACEABILITY.md               requirement -> implementation -> verification
└── README.md
```

---------------------------------------------------------------------------------------------------

## Run it locally

**Prerequisites:** Node.js >= 20 and npm. MongoDB is **optional** (see below).

```bash
# 1. install (from the repo root; npm workspaces installs all three packages)
npm install

# 2. environment files
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example    apps/web/.env.local

# 3. start both apps (server on :4000, web on :3000)
npm run dev
```

Open <http://localhost:3000>. To play with yourself, open a second **tab** (each tab gets its own player identity,
because the reconnect token lives in `sessionStorage`) or a private window.

### Do I need MongoDB?

No. Without `MONGODB_URI` the server logs `database: disabled (in-memory only)` and everything gameplay-related works:
rooms, games, scoring, replays, moderation, and a 50-game in-memory history. Games, rooms and history are lost on restart.

MongoDB adds: persistent game history, player accounts + statistics, persisted reports, and loading words from the database.

```bash
# local MongoDB, e.g. via Docker
docker run -d --name drawguess-mongo -p 27017:27017 mongo:7

# apps/server/.env
MONGODB_URI=mongodb://127.0.0.1:27017/drawguess

npm run seed        # inserts the en/es/fr/de word banks (idempotent)
npm run dev
```

On boot the server prints `words: mongodb` when it loaded words from the database, otherwise `words: static` (bundled files).

### Environment variables

`apps/server/.env`

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `4000` | |
| `CLIENT_ORIGIN` | `http://localhost:3000` | Comma-separated allowed browser origins (CORS + Socket.IO) |
| `MONGODB_URI` | _(unset)_ | Optional locally |
| `JWT_SECRET` | dev fallback | **Required (>= 32 chars) when `NODE_ENV=production`**; the server refuses to start without it |
| `COOKIE_DOMAIN` | _(unset)_ | Optional |

`apps/web/.env.local`: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL` (both `http://localhost:4000` locally).
Never put secrets in `NEXT_PUBLIC_*` variables - they ship to the browser.

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | server + web with hot reload |
| `npm run build` | production builds (server bundle with tsup, Next build) |
| `npm run typecheck` | `tsc --noEmit` for shared, server, web |
| `npm run lint` | ESLint |
| `npm test` | all unit/integration tests (shared, server, web) |
| `npm run seed` | seed MongoDB words |
| `bash e2e/run.sh` | browser e2e (needs a prior `npm run build` and Playwright, see below) |

### Tests

```bash
npm test                                   # shared + server (engine, sockets) + web
MONGODB_TEST_URI=mongodb://127.0.0.1:27017/drawguess_test \
  npm test -w @drawguess/server            # also runs the MongoDB suite (DROPS that database at the end)

# browser end-to-end (real Chromium, 3-4 independent sessions per suite)
npm run build
pip install playwright && playwright install chromium
bash e2e/run.sh                            # or: bash e2e/run.sh gameplay
```

---------------------------------------------------------------------------------------------------

## How it works

### Architecture

```
 Browser (Next.js + Konva)                       Server (Express + Socket.IO)
 ┌────────────────────────┐   REST (TanStack)   ┌──────────────────────────────────────┐
 │ pages / components     │ ───────────────────▶│ routes/  (lookup, public rooms, auth,│
 │ Zustand stores         │                     │          history)                    │
 │ CanvasController(Konva)│   Socket.IO         │ sockets/ (validate with Zod, authorise│
 │ socketBinder           │ ◀──────────────────▶│          then delegate)              │
 └────────────────────────┘  typed event contract│ game/    (pure domain: Room, Game, …)│
              ▲                (packages/shared) │ services/ ─▶ MongoDB (words, history,│
              └──────────────────────────────────┤           stats, reports, users)    │
                                                 └──────────────────────────────────────┘
```

Active rooms and games live **in memory** (fast, simple, no per-stroke DB writes). MongoDB stores finished-game history, stats,
reports, users and words. The `game/` layer never imports Socket.IO or Express: it talks to a small `Transport` interface, which
is why the whole engine is unit-tested with a fake transport and fake timers.

### Drawing synchronisation

1. **Capture.** `DrawingCanvas` listens to pointer events on the Konva `Stage`. Each point is normalised to 0-1 of a virtual
   800x600 stage, so drawings line up on any screen size (the stage is simply scaled).
2. **Local first.** The drawer's stroke is added to a `CanvasController` immediately, which mutates a Konva `Line` node and calls
   `layer.batchDraw()`. No React state changes per point, no waiting for the network.
3. **Batch & send.** Points are buffered in a ref and flushed every ~40 ms as one `draw_move`. A stroke is `draw_start` ->
   `draw_move`* -> `draw_end`. Stroke data (id, color, width, tool, points), never images.
4. **Server validates.** `DrawHandler` validates the payload with Zod, and `Game.assertDrawer` checks *phase === DRAWING and
   sender === current drawer*. Anything else is rejected. Valid data is appended to the turn's stroke list (capped) and broadcast
   to everyone else in the Socket.IO room.
5. **Render.** Other clients feed `draw_data` into their `CanvasController`.
6. **Undo / clear.** Server pops the last stroke (or empties the list) and broadcasts `draw_undo` / `canvas_clear`.
7. **Late join / reconnect.** The server sends `canvas_snapshot` (all strokes) so the newcomer sees the current drawing.
8. **Eraser** is a stroke with `globalCompositeOperation: destination-out` on a transparent layer above a white background layer,
   so undo stays a simple stack pop.
9. **Replay.** When a turn ends the server stores its strokes (with timing). `request_replay` returns them; the client plays them
   back on a *separate* Konva stage + controller, so the live game is untouched.

### Game lifecycle (server state machine)

```
LOBBY ──start_game (host, ≥2 players)──▶ WORD_SELECTION ──word chosen / 15 s auto-pick──▶ DRAWING
DRAWING ──all guessers correct OR timer ends OR drawer gone──▶ ROUND_END ──6 s──▶ WORD_SELECTION (next drawer)
ROUND_END ──last turn──▶ GAME_OVER ──host: play_again──▶ LOBBY
```

* A **round** = every player draws once; total turns = rounds x players (order shuffled at start).
* Every timer callback captures the `turnId` it was created for and does nothing if the turn has moved on, so late timers cannot
  double-end a turn. `startGame` is guarded by phase, so it cannot run twice. Each player is scored at most once per turn.
* Players who join mid-game become **spectators** and are promoted to players when the room returns to the lobby
  (unless they explicitly chose "Just watch").
* If fewer than 2 players remain, the game ends early (`not_enough_players`).

### Guess matching

Both the guess and the word are normalised (`trim`, lowercase, strip accents via NFKD, hyphens -> space, drop punctuation,
collapse whitespace) and compared with **exact equality**. There are no partial/substring matches, so "cat" never matches
"catalog". A guess within edit-distance 1 of a word of 5+ letters gets a private "very close!" nudge but no points.
A correct guess is **never echoed as chat text**. A guesser typing the word in the chat box is treated as a guess, and the drawer
cannot type the word in chat.

### Scoring (all server-side, constants in `packages/shared/src/constants.ts`)

```
guesser points  = round( (100 + 400 × timeLeft/drawTime) × orderMultiplier )
orderMultiplier = max(0.5, 1 − 0.1 × (n − 1))          n = 1 for the first correct guesser
drawer points   = round( 50 + 100 / G )                per correct guess, G = number of guessers
```

First correct guess is worth the most, faster is worth more, and the drawer is rewarded for clear drawings.
The winner is the single rank-1 player with points; equal top scores are shown as a tie.

### Hints

`hints = k` reveals `k` letters at evenly spaced times (`drawTime × i/(k+1)`). It never reveals the last hidden letter.
Hidden mode shows no blanks and disables hints. Combination mode joins two words.

### Socket.IO events (typed in `packages/shared/src/events.ts`)

| Direction | Events |
|---|---|
| Client -> server | `create_room` `join_room` `leave_room` `player_ready` `update_settings` `start_game` `play_again` `word_chosen` `draw_start` `draw_move` `draw_end` `draw_undo` `canvas_clear` `guess` `chat` `kick_player` `votekick` `report_player` `request_replay` |
| Server -> client | `lobby_updated` `game_state` `player_joined` `player_left` `round_start` `word_options` `word_chosen` `timer_update` `hint_update` `score_update` `round_end` `game_over` `draw_data` `draw_undo` `canvas_clear` `canvas_snapshot` `guess_result` `correct_guess` `chat_message` `chat_history` `system_message` `votekick_update` `reports_update` `kicked` `room_error` |

Notes: `room_created` / `room_joined` from the spec are delivered as the **acknowledgement** of `create_room` / `join_room`.
The drawer's own strokes are not echoed back (drawn locally for zero latency). The server sends every player a **personalised**
`game_state`, and only the current drawer's copy contains the word / word options.

### Reconnection

On join the server returns a secret `playerToken` (kept in `sessionStorage`). After a network drop or page reload the client
re-joins with the token and the server re-binds the new socket to the same player, restoring score, role and the drawing.
A disconnected player's seat is held for 30 s, then removed (host role migrates to the earliest-joined remaining player).
A disconnected drawer gets 10 s before their turn is ended. Empty rooms are deleted after 5 minutes.

### Security

Zod validation on every HTTP body and every socket payload; the server never trusts client-supplied player IDs, scores, drawer
identity, phase, timer or guess correctness; host-only and drawer-only actions are enforced server-side; the secret word is
sent only to the drawer (and only publicly after the round ends); chat text is stripped of control characters and `<>` and
length-capped, and React escapes output (no `dangerouslySetInnerHTML` on user data); per-socket token-bucket rate limits
(chat, drawing, room actions) plus `express-rate-limit` on the API; Helmet; CORS allow-list; bcrypt-hashed passwords;
HTTP-only JWT cookie; production refuses to boot without a strong `JWT_SECRET`; graceful shutdown on SIGTERM/SIGINT.

---------------------------------------------------------------------------------------------------

## Known limitations

* **Single server instance.** Room state is in process memory. Scaling out needs the Socket.IO Redis adapter plus externalised
  room state. A **server restart drops all active rooms** (clients get "Room not found").
* Accounts use an HTTP-only cookie. If the web app and API live on different *sites* in production, browsers that block
  third-party cookies may not send it (accounts are optional; guest play is unaffected). Putting both under one parent
  domain avoids this.
* Stroke history is kept in memory per turn (capped at 400 strokes / 6000 points each); undone and cleared strokes are not in replays.
* Replay keeps every turn of the current game only; it is not persisted to MongoDB.
* Stats are recorded only for logged-in players who are still in the room when the game ends.
* Votekick needs at least 3 connected players; with 2, use the host kick.
* No automated test covers touch input on real mobile devices. See `TRACEABILITY.md` for the full verified/unverified list.

## Deployment notes (for later)

Not deployed by this project. Suggested setup, all documentation only:

* **Database:** MongoDB Atlas -> connection string into `MONGODB_URI`; run `npm run seed` once against it.
* **Backend (Render/Railway/any Node host with WebSocket support):** build `npm ci && npm run build -w @drawguess/server`,
  start `npm run start -w @drawguess/server` (`node apps/server/dist/index.js`). Set `NODE_ENV=production`, `PORT` (if the host
  doesn't), `CLIENT_ORIGIN=https://<your-frontend>`, `MONGODB_URI`, `JWT_SECRET`. Health check: `GET /health`. Keep to **one instance**.
* **Frontend (Vercel):** project root `apps/web`; build with the monorepo install. Set `NEXT_PUBLIC_API_URL` and
  `NEXT_PUBLIC_SOCKET_URL` to the backend's public URL. Vercel does **not** run the Socket.IO server; it must live on the backend host.
* Put the final URLs in the **Live URL** line at the top of this file.
