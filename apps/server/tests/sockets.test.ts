import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as connect, type Socket } from 'socket.io-client';
import { defaultSettings, type JoinedData, type RoomState } from '@drawguess/shared';
import { createApp } from '../src/app';

const AVATAR = { color: 1, eyes: 1, mouth: 1, hat: 0 };
const settings = {
  ...defaultSettings,
  categories: [],
  customWords: [],
  roomName: 'Int Room',
  drawTime: 30,
  rounds: 2,
  hints: 1,
};

let server: ReturnType<typeof createApp>;
let url: string;
const sockets: Socket[] = [];

beforeAll(async () => {
  server = createApp({ origins: ['http://localhost:3000'] });
  await new Promise<void>((r) => server.httpServer.listen(0, r));
  url = `http://localhost:${(server.httpServer.address() as AddressInfo).port}`;
});
afterAll(async () => {
  sockets.forEach((s) => s.close());
  await server.shutdown();
  await new Promise((r) => server.httpServer.close(r));
});

class Client {
  socket: Socket;
  events: { event: string; payload: any }[] = [];
  state!: RoomState;
  playerId!: string;
  token!: string;
  constructor() {
    this.socket = connect(url, { transports: ['websocket'], forceNew: true });
    sockets.push(this.socket);
    this.socket.onAny((event, payload) => {
      this.events.push({ event, payload });
      if ((event === 'game_state' || event === 'lobby_updated') && payload) this.state = payload;
    });
  }
  ready() {
    return new Promise<void>((r) =>
      this.socket.connected ? r() : this.socket.once('connect', () => r()),
    );
  }
  emit<T = any>(event: string, payload?: unknown): Promise<any> {
    return new Promise((resolve) => this.socket.emit(event, payload, resolve));
  }
  async create(name: string) {
    await this.ready();
    const res = await this.emit('create_room', { hostName: name, avatar: AVATAR, settings });
    expect(res.ok).toBe(true);
    this.adopt(res.data);
    return res.data.roomCode as string;
  }
  async join(code: string, name: string, extra: object = {}) {
    await this.ready();
    const res = await this.emit('join_room', {
      roomCode: code,
      playerName: name,
      avatar: AVATAR,
      ...extra,
    });
    if (res.ok) this.adopt(res.data);
    return res;
  }
  adopt(d: JoinedData) {
    this.playerId = d.playerId;
    this.token = d.playerToken;
    this.state = d.state;
  }
  of(event: string) {
    return this.events.filter((e) => e.event === event);
  }
  waitFor(
    event: string,
    pred: (p: any) => boolean = () => true,
    from = 0,
    ms = 4000,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const hit = this.events.slice(from).find((e) => e.event === event && pred(e.payload));
      if (hit) return resolve(hit.payload);
      const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
      const h = (payload: any) => {
        if (pred(payload)) {
          clearTimeout(t);
          this.socket.off(event, h);
          resolve(payload);
        }
      };
      this.socket.on(event, h);
    });
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getJson = async (u: string): Promise<any> => (await fetch(u)).json();
const tick = (ms = 80) => new Promise((r) => setTimeout(r, ms));

async function startedGame() {
  const a = new Client();
  const code = await a.create('Alice');
  const b = new Client();
  expect((await b.join(code, 'Bob')).ok).toBe(true);
  await a.waitFor('lobby_updated', (s) => s.players.length === 2);
  const start = await a.emit('start_game', {});
  expect(start.ok).toBe(true);
  await a.waitFor('game_state', (s) => s.phase === 'WORD_SELECTION');
  const drawer = a.state.game!.drawerId === a.playerId ? a : b;
  const guesser = drawer === a ? b : a;
  await drawer.waitFor('game_state', (s) => !!s.game?.wordOptions);
  const word = drawer.state.game!.wordOptions![0];
  expect((await drawer.emit('word_chosen', { word })).ok).toBe(true);
  await guesser.waitFor('game_state', (s) => s.phase === 'DRAWING');
  await drawer.waitFor('game_state', (s) => s.phase === 'DRAWING');
  return { a, b, code, drawer, guesser, word };
}

describe('REST', () => {
  it('health, meta, room lookup & public listing', async () => {
    expect((await getJson(`${url}/health`)).status).toBe('ok');
    const meta = await getJson(`${url}/api/meta`);
    expect(meta.languages.map((l: any) => l.code)).toEqual(['en', 'es', 'fr', 'de']);
    const a = new Client();
    const code = await a.create('Host');
    const look = await getJson(`${url}/api/rooms/${code}`);
    expect(look).toMatchObject({ exists: true, players: 1, phase: 'LOBBY', full: false });
    expect((await getJson(`${url}/api/rooms/ZZZZZZ`)).exists).toBe(false);
    expect((await fetch(`${url}/api/rooms/abc`)).status).toBe(400);
    const pub = new Client();
    await pub.ready();
    await pub.emit('create_room', {
      hostName: 'Pub',
      avatar: AVATAR,
      settings: { ...settings, isPublic: true, roomName: 'Open House' },
    });
    const list = await getJson(`${url}/api/rooms/public`);
    expect(list.rooms.map((r: any) => r.roomName)).toContain('Open House');
    expect(list.rooms.map((r: any) => r.code)).not.toContain(code); // private rooms are not listed
  });
});

describe('lobby over the wire', () => {
  it('validates payloads, handles missing/full/in-progress rooms', async () => {
    const c = new Client();
    await c.ready();
    const bad = await c.emit('create_room', {
      hostName: 'x',
      avatar: AVATAR,
      settings: { ...settings, rounds: 99 },
    });
    expect(bad.ok).toBe(false);
    expect(bad.error.code).toBe('INVALID_INPUT');
    expect((await c.join('QQQQQQ', 'Nobody')).error.code).toBe('ROOM_NOT_FOUND');

    const host = new Client();
    const code = await host.create('Host');
    await host.emit('update_settings', { ...settings, maxPlayers: 2 });
    const p2 = new Client();
    expect((await p2.join(code, 'Two')).ok).toBe(true);
    const p3 = new Client();
    const full = await p3.join(code, 'Three');
    expect(full.error.code).toBe('ROOM_FULL');
    const spec = await p3.join(code, 'Three', { spectate: true });
    expect(spec.ok).toBe(true);
    expect(spec.data.state.you.role).toBe('spectator');

    expect((await p2.emit('start_game', {})).error.code).toBe('NOT_HOST');
    const solo = new Client();
    await solo.create('Solo');
    expect((await solo.emit('start_game', {})).error.code).toBe('NOT_ENOUGH_PLAYERS');
  });
});

describe('full game flow', () => {
  it('create → join → start → draw → guess → score → next turn', async () => {
    const { drawer, guesser, word } = await startedGame();

    // secret isolation: the guesser never received the word before the round ended
    const leaked = guesser.events.filter(
      (e) =>
        JSON.stringify(e.payload ?? '')
          .toLowerCase()
          .includes(`"${word.toLowerCase()}"`) && e.event !== 'round_end',
    );
    expect(leaked.filter((e) => e.event !== 'chat_message')).toEqual([]);
    expect(guesser.state.game!.word).toBeUndefined();
    expect(drawer.state.game!.word).toBe(word);
    expect(guesser.state.game!.hint.length).toBe(word.length);

    // drawing reaches the other player; drawer is not echoed
    drawer.socket.emit('draw_start', {
      id: 's1',
      x: 0.1,
      y: 0.1,
      color: '#ff0000',
      width: 6,
      tool: 'brush',
    });
    drawer.socket.emit('draw_move', { id: 's1', points: [0.2, 0.2, 0.3, 0.3] });
    drawer.socket.emit('draw_end', { id: 's1' });
    const data = await guesser.waitFor('draw_data', (d) => d.op === 'end');
    expect(data.id).toBe('s1');
    const started = guesser.of('draw_data').find((e) => e.payload.op === 'start')!.payload.stroke;
    expect(started).toMatchObject({ color: '#ff0000', tool: 'brush' });
    expect(drawer.of('draw_data')).toHaveLength(0);

    // unauthorised drawing is rejected and never broadcast
    const before = drawer.of('draw_data').length;
    guesser.socket.emit('draw_start', {
      id: 'evil',
      x: 0.5,
      y: 0.5,
      color: '#000000',
      width: 50,
      tool: 'brush',
    });
    guesser.socket.emit('canvas_clear', {});
    guesser.socket.emit('draw_undo', {});
    await tick(150);
    expect(drawer.of('draw_data').length).toBe(before);
    expect(drawer.of('canvas_clear')).toHaveLength(1); // only the turn-start clear, nothing from the guesser
    expect(drawer.of('draw_undo')).toHaveLength(0);

    // malformed draw payloads are rejected (out-of-range coords)
    drawer.socket.emit('draw_start', {
      id: 's2',
      x: 7,
      y: 0.1,
      color: 'red',
      width: 6,
      tool: 'brush',
    });
    await tick(100);
    expect(
      guesser.of('draw_data').some((e) => e.payload.op === 'start' && e.payload.stroke.id === 's2'),
    ).toBe(false);

    // wrong guess: visible as chat, no score
    await guesser.emit('guess', { text: 'definitely wrong' });
    await guesser.waitFor('chat_message', (m) => m.text === 'definitely wrong');
    const scoreBefore = guesser.state.players.find((p) => p.id === guesser.playerId)!.score;
    expect(scoreBefore).toBe(0);

    // correct guess (messy casing/spacing): points awarded once, broadcast, turn ends
    await guesser.emit('guess', { text: `  ${word.toUpperCase()}  ` });
    const cg = await drawer.waitFor('correct_guess');
    expect(cg.playerId).toBe(guesser.playerId);
    await guesser.emit('guess', { text: word }); // duplicate attempt
    const end = await guesser.waitFor('round_end');
    expect(end.word).toBe(word);
    expect(end.reason).toBe('all_guessed');
    await guesser.waitFor('game_state', (s) => s.phase === 'ROUND_END');
    const me = guesser.state.players.find((p) => p.id === guesser.playerId)!;
    expect(me.score).toBeGreaterThan(400);
    expect(guesser.of('correct_guess')).toHaveLength(1);
    // the typed word was never echoed as chat while the round was live (it is public only after round_end)
    const endIdx = guesser.events.findIndex((e) => e.event === 'round_end');
    const echoedBefore = guesser.events
      .slice(0, endIdx)
      .some(
        (e) =>
          e.event === 'chat_message' && e.payload.text.toLowerCase().trim() === word.toLowerCase(),
      );
    expect(echoedBefore).toBe(false);

    // replay available for the finished turn, for any participant
    const replay = await guesser.emit('request_replay', {});
    expect(replay.ok).toBe(true);
    expect(replay.data.word).toBe(word);
    expect(replay.data.strokes).toHaveLength(1);
  }, 20000);

  it('rejects chat with control characters and overlong text, rate limits spam', async () => {
    const a = new Client();
    const code = await a.create('Chatty');
    const b = new Client();
    await b.join(code, 'Listener');
    expect((await a.emit('chat', { text: 'x'.repeat(500) })).ok).toBe(false);
    const ok = await a.emit('chat', { text: 'hi <b>there</b>\u0000' });
    expect(ok.ok).toBe(true);
    const m = await b.waitFor('chat_message', (m) => m.playerName === 'Chatty');
    expect(m.text).toBe('hi bthere/b'); // angle brackets + control chars stripped
    let limited = 0;
    for (let i = 0; i < 12; i++)
      if ((await a.emit('chat', { text: `spam ${i}` })).error?.code === 'RATE_LIMITED') limited++;
    expect(limited).toBeGreaterThan(0);
  });
});

describe('reconnection & spectators', () => {
  it('a reconnecting player keeps identity, gets state, drawing snapshot and no secret', async () => {
    const { code, drawer, guesser } = await startedGame();
    drawer.socket.emit('draw_start', {
      id: 'keep',
      x: 0.4,
      y: 0.4,
      color: '#00ff00',
      width: 12,
      tool: 'brush',
    });
    drawer.socket.emit('draw_move', { id: 'keep', points: [0.5, 0.5] });
    drawer.socket.emit('draw_end', { id: 'keep' });
    await guesser.waitFor('draw_data', (d) => d.op === 'end');

    const id = guesser.playerId;
    const token = guesser.token;
    guesser.socket.close();
    await drawer.waitFor(
      'game_state',
      (s) => s.players.find((p: { id: string }) => p.id === id)?.connected === false,
    );

    const again = new Client();
    const res = await again.join(code, 'ignored-name', { playerToken: token });
    expect(res.ok).toBe(true);
    expect(res.data.playerId).toBe(id);
    expect(res.data.state.phase).toBe('DRAWING');
    expect(res.data.state.game.word).toBeUndefined();
    expect(res.data.state.game.timeLeft).toBeGreaterThan(0);
    const snap = await again.waitFor('canvas_snapshot');
    expect(snap.strokes).toHaveLength(1);
    expect(snap.strokes[0].id).toBe('keep');
    await again.waitFor('chat_history');
  }, 20000);

  it('spectators can join a running game, watch the drawing, but cannot draw or guess', async () => {
    const { code, drawer, word } = await startedGame();
    drawer.socket.emit('draw_start', {
      id: 'w1',
      x: 0.3,
      y: 0.3,
      color: '#0000ff',
      width: 6,
      tool: 'brush',
    });
    const spec = new Client();
    const res = await spec.join(code, 'Watcher');
    expect(res.data.state.you.role).toBe('spectator');
    expect(res.data.state.game.word).toBeUndefined();
    drawer.socket.emit('draw_move', { id: 'w1', points: [0.4, 0.4] });
    await spec.waitFor('draw_data', (d) => d.op === 'move');
    await spec.emit('guess', { text: word });
    spec.socket.emit('draw_start', {
      id: 'sp',
      x: 0.1,
      y: 0.1,
      color: '#000000',
      width: 3,
      tool: 'brush',
    });
    await tick(150);
    expect(spec.of('correct_guess')).toHaveLength(0);
    expect(drawer.of('draw_data').some((e) => e.payload?.stroke?.id === 'sp')).toBe(false);
    const view = drawer.state.players.find((p: { name: string }) => p.name === 'Watcher');
    expect(view?.role).toBe('spectator');
    expect(view?.score).toBe(0);
    // spectator chat stays in the spectator channel
    await spec.emit('chat', { text: 'nice drawing' });
    await tick(100);
    expect(drawer.of('chat_message').some((e) => e.payload.text === 'nice drawing')).toBe(false);
  }, 20000);
});

describe('moderation over the wire', () => {
  it('host can kick and ban; banned player is refused; reports reach only the host', async () => {
    const host = new Client();
    const code = await host.create('Boss');
    const bad = new Client();
    await bad.join(code, 'Troll');
    const ok = new Client();
    await ok.join(code, 'Nice');
    expect((await ok.emit('kick_player', { playerId: bad.playerId })).error.code).toBe('NOT_HOST');
    expect(
      (
        await ok.emit('report_player', {
          targetId: bad.playerId,
          reason: 'spam',
          details: 'spamming',
        })
      ).ok,
    ).toBe(true);
    const rep = await host.waitFor('reports_update');
    expect(rep.reports[0]).toMatchObject({ targetName: 'Troll', reason: 'spam' });
    expect(ok.of('reports_update')).toHaveLength(0);
    expect(bad.of('reports_update')).toHaveLength(0);

    expect((await host.emit('kick_player', { playerId: bad.playerId, ban: true })).ok).toBe(true);
    await bad.waitFor('kicked', (k) => k.banned === true);
    const retry = new Client();
    expect((await retry.join(code, 'Troll')).error.code).toBe('BANNED');
  });
});

describe('game over & history', () => {
  it('records the finished game and exposes it via the REST API', async () => {
    const a = new Client();
    const code = await a.create('P1');
    const b = new Client();
    await b.join(code, 'P2');
    await a.waitFor('lobby_updated', (s) => s.players.length === 2);
    await a.emit('update_settings', {
      ...settings,
      rounds: 2,
      drawTime: 15,
      hints: 0,
      roomName: 'History Room',
    });
    await a.emit('start_game', {});
    for (let i = 0; i < 4; i++) {
      await a.waitFor(
        'game_state',
        (s) => s.phase === 'WORD_SELECTION' && s.game!.turn === i,
        0,
        9000,
      );
      const drawer = a.state.game!.drawerId === a.playerId ? a : b;
      const guesser = drawer === a ? b : a;
      await drawer.waitFor(
        'game_state',
        (s) => s.game?.turn === i && !!s.game?.wordOptions,
        0,
        9000,
      );
      const w = drawer.state.game!.wordOptions![0];
      await drawer.emit('word_chosen', { word: w });
      await guesser.waitFor('game_state', (s) => s.phase === 'DRAWING' && s.game!.turn === i);
      await guesser.emit('guess', { text: w });
      await a.waitFor('round_end', (r) => r.turn === i);
    }
    const over = await a.waitFor('game_over', () => true, 0, 15000);
    expect(over.leaderboard).toHaveLength(2);
    expect(over.turns).toHaveLength(4);
    expect(over.endReason).toBe('completed');
    await a.waitFor('game_state', (s) => s.phase === 'GAME_OVER');
    expect(a.state.game!.result).toHaveProperty('winner'); // null when scores tie
    expect(a.state.game!.replayTurns).toEqual([0, 1, 2, 3]);

    const hist = await getJson(`${url}/api/history/recent`);
    const rec = hist.games.find((g: any) => g.roomCode === code);
    expect(rec.roomName).toBe('History Room');
    expect(rec.finalScores).toHaveLength(2);
    const one = await getJson(`${url}/api/history/${rec.id}`);
    expect(one.turns).toHaveLength(4);

    expect((await b.emit('play_again', {})).error.code).toBe('NOT_HOST');
    expect((await a.emit('play_again', {})).ok).toBe(true);
    await b.waitFor('lobby_updated', (s) => s.phase === 'LOBBY');
  }, 60000);
});
