import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGES, TIMING } from '@drawguess/shared';
import { GameError } from '../src/game/errors';
import { pickWinner, ScoreManager } from '../src/game/ScoreManager';
import { WordService } from '../src/game/WordService';
import { drawerOf, setup } from './helpers';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function startTwo(over = {}) {
  const ctx = setup(over);
  const host = ctx.add('Alice');
  const bob = ctx.add('Bob');
  ctx.room.startGame(host);
  return { ...ctx, host, bob };
}
function pickWord(ctx: ReturnType<typeof startTwo>) {
  const d = drawerOf(ctx.room);
  const word = ctx.room.game!.turn!.options[0];
  ctx.room.game!.chooseWord(d, word);
  return { drawer: d, word, guesser: d.id === ctx.host.id ? ctx.bob : ctx.host };
}

describe('rooms & lobby', () => {
  it('first player is host; max player limit enforced; extra joiners rejected', () => {
    const { room, add } = setup({ maxPlayers: 2 });
    const a = add('Alice');
    add('Bob');
    expect(room.hostId).toBe(a.id);
    expect(() => add('Carol')).toThrowError(/full/i);
  });

  it('dedupes names and lets a full room take spectators', () => {
    const { room, add } = setup({ maxPlayers: 2 });
    add('Sam');
    const s2 = add('Sam');
    expect(s2.name).not.toBe('Sam');
    const spec = add('Watcher', { spectate: true });
    expect(spec.role).toBe('spectator');
    expect(room.playerCount()).toBe(2);
  });

  it('only the host can start, and needs 2 players', () => {
    const { room, add } = setup();
    const a = add('Alice');
    expect(() => room.startGame(a)).toThrowError(/at least 2/);
    const b = add('Bob');
    expect(() => room.startGame(b)).toThrowError(/host/i);
    room.startGame(a);
    expect(room.phase).toBe('WORD_SELECTION');
    expect(() => room.startGame(a)).toThrowError(/already/i); // no double start
  });

  it('host-only settings update; locked during a game', () => {
    const { room, add } = setup();
    const a = add('Alice');
    const b = add('Bob');
    expect(() => room.updateSettings(b, room.settings)).toThrowError(/host/i);
    room.updateSettings(a, { ...room.settings, rounds: 5 });
    expect(room.settings.rounds).toBe(5);
    room.startGame(a);
    expect(() => room.updateSettings(a, room.settings)).toThrowError(/locked/i);
  });
});

describe('word selection & secret isolation', () => {
  it('only the drawer gets options; others never see them', () => {
    const ctx = startTwo({ wordCount: 3 });
    const d = drawerOf(ctx.room);
    const other = d.id === ctx.host.id ? ctx.bob : ctx.host;
    expect(ctx.room.stateFor(d).game?.wordOptions).toHaveLength(3);
    expect(ctx.room.stateFor(other).game?.wordOptions).toBeUndefined();
    expect(ctx.room.stateFor(other).game?.word).toBeUndefined();
  });

  it('rejects non-drawers and unoffered words', () => {
    const ctx = startTwo();
    const d = drawerOf(ctx.room);
    const other = d.id === ctx.host.id ? ctx.bob : ctx.host;
    const game = ctx.room.game!;
    expect(() => game.chooseWord(other, game.turn!.options[0])).toThrowError(GameError);
    expect(() => game.chooseWord(d, 'definitely-not-offered')).toThrowError(/not offered/);
  });

  it('the secret word never appears in anything sent to non-drawers', () => {
    const ctx = startTwo();
    const { drawer, word, guesser } = pickWord(ctx);
    ctx.room.game!.submitGuess(guesser, 'zzzz');
    vi.advanceTimersByTime(20_000);
    const secret = word.toLowerCase();
    const leaked = ctx.transport.log.filter((l) => {
      const isDrawerOnly = l.to === drawer.socketId;
      // events before round_end are public; the word may only be in drawer-only sends
      const roundEnded = ctx.transport.log.findIndex((x) => x.event === 'round_end');
      const idx = ctx.transport.log.indexOf(l);
      return (
        !isDrawerOnly &&
        (roundEnded === -1 || idx < roundEnded) &&
        JSON.stringify(l.payload).toLowerCase().includes(`"${secret}"`)
      );
    });
    expect(leaked).toEqual([]);
    expect(ctx.room.stateFor(guesser).game?.word).toBeUndefined();
    expect(ctx.room.stateFor(drawer).game?.word).toBe(word);
  });

  it('auto-picks a word when the drawer runs out of time', () => {
    const ctx = startTwo();
    vi.advanceTimersByTime(TIMING.wordSelectSec * 1000 + 50);
    expect(ctx.room.phase).toBe('DRAWING');
  });

  it('honours hidden mode (no mask) and combination mode (two words)', () => {
    const hidden = startTwo({ wordMode: 'hidden' });
    pickWord(hidden);
    expect(hidden.room.stateFor(hidden.host).game?.hint).toBe('');
    const combo = startTwo({ wordMode: 'combination' });
    expect(combo.room.game!.turn!.options.every((o) => o.includes(' '))).toBe(true);
  });

  it('custom words participate in selection; custom-only uses only them', () => {
    const ctx = startTwo({
      customWords: ['banana split', 'kazoo', 'yeti'],
      customWordsOnly: true,
      wordCount: 3,
    });
    expect(ctx.room.game!.turn!.options.sort()).toEqual(['banana split', 'kazoo', 'yeti']);
  });

  it('category filter limits choices to the selected categories', () => {
    const ctx = startTwo({ categories: ['animals', 'food'], wordCount: 5 });
    const { STATIC_WORDS, flattenWordFile } = require_es();
    const allowed = new Set(
      flattenWordFile('en', STATIC_WORDS.en)
        .filter((w) => w.category === 'animals' || w.category === 'food')
        .map((w) => w.text),
    );
    for (let i = 0; i < 20; i++) {
      const opts = ctx.words.choices(ctx.room.settings, 5, new Set());
      expect(opts.length).toBe(5);
      expect(opts.every((o) => allowed.has(o))).toBe(true);
    }
  });

  it('every shipped language yields valid, distinct choices', () => {
    for (const { code: language } of LANGUAGES) {
      const ctx = startTwo({ language, wordCount: 5 });
      const opts = ctx.room.game!.turn!.options;
      expect(new Set(opts).size).toBe(5);
    }
  });

  it('uses the selected language', () => {
    const ctx = startTwo({ language: 'es', wordCount: 5 });
    const opts = ctx.room.game!.turn!.options;
    const { STATIC_WORDS, flattenWordFile } = require_es();
    const es = new Set(flattenWordFile('es', STATIC_WORDS.es).map((w) => w.text));
    expect(opts.every((o) => es.has(o))).toBe(true);
  });

  it('normalizes language aliases and keeps the selected script', () => {
    const ctx = startTwo({ language: 'Hindi' as any, wordCount: 5 });
    const opts = ctx.room.game!.turn!.options;
    const { STATIC_WORDS, flattenWordFile } = require_es();
    const hi = new Set(flattenWordFile('hi', STATIC_WORDS.hi).map((w) => w.text));
    expect(opts.every((o) => hi.has(o))).toBe(true);
  });

  it('preserves Hindi vowel marks in guesses and hints', () => {
    const ctx = startTwo({ language: 'hi' });
    expect(ctx.words.matches('किताब', 'किताब')).toBe(true);
    expect(ctx.words.matches('कतब', 'किताब')).toBe(false);
    expect(WordService.letterIndices('किताब')).toEqual([0, 1, 2]);
    expect(ctx.words.mask('किताब', new Set(), 'normal')).toBe('___');
    expect(ctx.words.mask('किताब', new Set([0]), 'normal')).toBe('कि__');
  });
});

function require_es() {
  return (globalThis as unknown as { __words: typeof import('../src/data/words') }).__words;
}

describe('winner rule', () => {
  const e = (playerId: string, score: number, rank: number) => ({
    playerId,
    name: playerId,
    avatar: { color: 0, eyes: 0, mouth: 0, hat: 0 },
    score,
    correctGuesses: 0,
    rank,
    left: false,
  });
  it('unique top scorer wins; ties and all-zero games have no winner', () => {
    expect(pickWinner([e('a', 500, 1), e('b', 300, 2)])?.playerId).toBe('a');
    expect(pickWinner([e('a', 500, 1), e('b', 500, 1)])).toBeNull();
    expect(pickWinner([e('a', 0, 1), e('b', 0, 1), e('c', 0, 1)])).toBeNull();
    expect(pickWinner([])).toBeNull();
  });
  it('tied players share a rank, next rank skips', () => {
    const sm = new ScoreManager();
    const av = { color: 0, eyes: 0, mouth: 0, hat: 0 };
    ['a', 'b', 'c'].forEach((id) => sm.register({ id, name: id, avatar: av }));
    sm.award('a', 100);
    sm.award('b', 100);
    sm.award('c', 50);
    expect(sm.leaderboard().map((x) => x.rank)).toEqual([1, 1, 3]);
  });
});

describe('guessing & scoring', () => {
  it('awards a correct guess once; matching is case/space/accent-insensitive but not partial', () => {
    const ctx = startTwo();
    const { drawer, word, guesser } = pickWord(ctx);
    const game = ctx.room.game!;
    expect(game.submitGuess(guesser, word.slice(0, -1))).not.toBe('correct'); // partial
    expect(game.submitGuess(guesser, `  ${word.toUpperCase()}  `)).toBe('correct');
    const score = game.scoreOf(guesser.id);
    expect(score).toBeGreaterThan(0);
    // duplicate is rejected and does not add points
    expect(game.submitGuess(guesser, word)).toBe('rejected');
    expect(game.scoreOf(guesser.id)).toBe(score);
    // drawer earned, cannot guess own word
    expect(game.scoreOf(drawer.id)).toBeGreaterThan(0);
    expect(game.submitGuess(drawer, word)).toBe('rejected');
  });

  it('first correct guess earns more than later ones; speed matters', () => {
    const sm = new ScoreManager();
    expect(sm.guesserPoints(60, 60, 1)).toBe(500);
    expect(sm.guesserPoints(60, 60, 2)).toBeLessThan(sm.guesserPoints(60, 60, 1));
    expect(sm.guesserPoints(10, 60, 1)).toBeLessThan(sm.guesserPoints(50, 60, 1));
    expect(ScoreManager.orderMultiplier(99)).toBe(0.5);
    expect(sm.drawerPoints(4)).toBe(75);
  });

  it('ends the turn early when every guesser is correct, then moves to the next drawer', () => {
    const ctx = startTwo();
    const { drawer, word, guesser } = pickWord(ctx);
    ctx.room.game!.submitGuess(guesser, word);
    expect(ctx.room.phase).toBe('ROUND_END');
    expect(ctx.transport.events('round_end')).toHaveLength(1);
    vi.advanceTimersByTime(TIMING.roundEndSec * 1000 + 50);
    expect(ctx.room.phase).toBe('WORD_SELECTION');
    expect(drawerOf(ctx.room).id).toBe(guesser.id); // rotated
    expect(drawer.id).not.toBe(guesser.id);
  });

  it('updates the countdown during the round-end intermission', () => {
    const ctx = startTwo();
    const { word, guesser } = pickWord(ctx);
    ctx.room.game!.submitGuess(guesser, word);

    vi.advanceTimersByTime(1000);

    const intermissionTicks = ctx.transport.events('timer_update').filter(
      (event) => (event.payload as { phase: string }).phase === 'ROUND_END',
    );
    expect(intermissionTicks.at(-1)?.payload).toMatchObject({
      phase: 'ROUND_END',
      timeLeft: TIMING.roundEndSec - 1,
    });
  });

  it('timer expiry ends the turn exactly once even if timers race', () => {
    const ctx = startTwo({ drawTime: 15, hints: 0 });
    pickWord(ctx);
    vi.advanceTimersByTime(15_000 + 10);
    expect(ctx.room.phase).toBe('ROUND_END');
    vi.advanceTimersByTime(1000);
    expect(ctx.transport.events('round_end')).toHaveLength(1);
  });

  it('rejects guesses after the round has ended', () => {
    const ctx = startTwo({ drawTime: 15 });
    const { word, guesser } = pickWord(ctx);
    vi.advanceTimersByTime(16_000);
    expect(ctx.room.game!.submitGuess(guesser, word)).toBe('rejected');
  });

  it('plays a full game to completion with a winner and history record', () => {
    const ctx = startTwo({ rounds: 2 }); // 2 players x 2 rounds = 4 turns
    for (let i = 0; i < 4; i++) {
      expect(ctx.room.phase).toBe('WORD_SELECTION');
      const { word, guesser } = pickWord(ctx);
      ctx.room.game!.submitGuess(guesser, word);
      vi.advanceTimersByTime(TIMING.roundEndSec * 1000 + 50);
    }
    expect(ctx.room.phase).toBe('GAME_OVER');
    const res = ctx.room.game!.result!;
    expect(res.leaderboard).toHaveLength(2);
    // equal scores => tie => no single winner; otherwise the winner is rank 1
    if (res.winner) expect(res.winner.playerId).toBe(res.leaderboard[0].playerId);
    else expect(res.leaderboard.filter((e) => e.rank === 1).length).toBeGreaterThan(1);
    expect(res.turns).toHaveLength(4);
    expect(res.endReason).toBe('completed');
    expect(ctx.finished).toHaveLength(1);
    expect(ctx.transport.events('game_over')).toHaveLength(1);
    // every player drew equally often
    const counts: Record<string, number> = {};
    res.turns.forEach((t) => (counts[t.drawerId] = (counts[t.drawerId] ?? 0) + 1));
    expect(Object.values(counts)).toEqual([2, 2]);
    // play again returns to the lobby
    ctx.room.playAgain(ctx.host);
    expect(ctx.room.phase).toBe('LOBBY');
    expect(ctx.room.timers.activeCount).toBe(0);
  });

  it('reveals hints progressively but never the whole word', () => {
    const ctx = startTwo({ hints: 5, drawTime: 60 });
    const { word } = pickWord(ctx);
    const letters = [...word].filter((c) => /\p{L}/u.test(c)).length;
    vi.advanceTimersByTime(59_000);
    const hint = ctx.room.stateFor(ctx.host).game!.hint;
    const hidden = [...hint].filter((c) => c === '_').length;
    expect(hidden).toBeGreaterThanOrEqual(1);
    expect(hint.length).toBe(word.length);
    expect(letters - hidden).toBeLessThanOrEqual(5);
  });
});

describe('drawing authorisation', () => {
  it('only the drawer can draw, undo, or clear; state is kept server-side', () => {
    const ctx = startTwo();
    const { drawer, guesser } = pickWord(ctx);
    const game = ctx.room.game!;
    const p = { id: 's1', x: 0.1, y: 0.2, color: '#ff0000', width: 6, tool: 'brush' as const };
    expect(() => game.drawStart(guesser, p)).toThrowError(/drawer/i);
    game.drawStart(drawer, p);
    game.drawMove(drawer, { id: 's1', points: [0.2, 0.3] });
    game.drawEnd(drawer, 's1');
    expect(game.canvasStrokes()[0].points).toEqual([0.1, 0.2, 0.2, 0.3]);
    expect(() => game.undo(guesser)).toThrowError(GameError);
    expect(() => game.clearCanvas(guesser)).toThrowError(GameError);
    expect(game.undo(drawer)).toBe('s1');
    expect(game.canvasStrokes()).toHaveLength(0);
  });

  it('refuses drawing before a word is chosen', () => {
    const ctx = startTwo();
    const d = drawerOf(ctx.room);
    expect(() =>
      ctx.room.game!.drawStart(d, {
        id: 'x',
        x: 0,
        y: 0,
        color: '#000000',
        width: 3,
        tool: 'brush',
      }),
    ).toThrowError();
  });

  it('keeps a replay of each finished turn', () => {
    const ctx = startTwo();
    const { drawer, word, guesser } = pickWord(ctx);
    ctx.room.game!.drawStart(drawer, {
      id: 'r1',
      x: 0.5,
      y: 0.5,
      color: '#000000',
      width: 3,
      tool: 'brush',
    });
    ctx.room.game!.drawEnd(drawer, 'r1');
    ctx.room.game!.submitGuess(guesser, word);
    const replay = ctx.room.game!.replays.get(0)!;
    expect(replay.word).toBe(word);
    expect(replay.strokes).toHaveLength(1);
    expect(ctx.room.stateFor(guesser).game?.replayTurns).toEqual([0]);
  });
});

describe('chat routing', () => {
  it('blocks the drawer from leaking the word and keeps guessers-only chat private', () => {
    const ctx = setup();
    const alice = ctx.add('Alice');
    ctx.add('Bob');
    ctx.add('Carol');
    ctx.room.startGame(alice);
    const drawer = drawerOf(ctx.room);
    const word = ctx.room.game!.turn!.options[0];
    ctx.room.game!.chooseWord(drawer, word);
    expect(() => ctx.chat.chat(drawer, `it is ${word}!`)).toThrowError(/reveal/);
    const [g1, g2] = [...ctx.room.players.values()].filter((p) => p.id !== drawer.id);
    ctx.room.game!.submitGuess(g1, word);
    expect(ctx.room.phase).toBe('DRAWING'); // g2 still guessing
    ctx.transport.log.length = 0;
    ctx.chat.chat(g1, 'easy one');
    const delivered = ctx.transport.events('chat_message').map((l) => l.to);
    expect(delivered).not.toContain(g2.socketId); // g2 has not guessed yet, must not see it
    expect(delivered).not.toContain(`room:${ctx.room.code}`);
    expect(delivered).toContain(drawer.socketId);
  });

  it('a non-guesser typing the word in chat is treated as a guess, never echoed', () => {
    const ctx = startTwo();
    const { word, guesser } = pickWord(ctx);
    ctx.transport.log.length = 0;
    ctx.chat.chat(guesser, word);
    expect(ctx.room.game!.scoreOf(guesser.id)).toBeGreaterThan(0);
    const echoed = ctx.transport.log.filter(
      (l) => l.event === 'chat_message' && JSON.stringify(l.payload).includes(word),
    );
    expect(echoed).toHaveLength(0);
  });
});

describe('spectators', () => {
  it('join mid-game as spectators: can watch, cannot guess or earn points', () => {
    const ctx = startTwo();
    const { word } = pickWord(ctx);
    const spec = ctx.add('Watcher');
    expect(spec.role).toBe('spectator');
    expect(ctx.room.game!.submitGuess(spec, word)).toBe('rejected');
    expect(ctx.room.stateFor(spec).game?.word).toBeUndefined();
    expect(ctx.room.game!.scoreOf(spec.id)).toBe(0);
    expect(() =>
      ctx.room.game!.drawStart(spec, {
        id: 'x',
        x: 0,
        y: 0,
        color: '#000000',
        width: 3,
        tool: 'brush',
      }),
    ).toThrowError();
  });
});

describe('reconnection & departures', () => {
  it('rebinds the same player via token and keeps the score', () => {
    const ctx = startTwo();
    const { guesser, word } = pickWord(ctx);
    ctx.room.game!.submitGuess(guesser, word);
    const score = ctx.room.game!.scoreOf(guesser.id);
    ctx.room.handleDisconnect(guesser);
    expect(guesser.connected).toBe(false);
    const { player, rejoined } = ctx.room.join({
      name: 'whatever',
      avatar: guesser.avatar,
      socketId: 'new-sock',
      ip: '1.1.1.1',
      token: guesser.token,
    });
    expect(rejoined).toBe(true);
    expect(player.id).toBe(guesser.id);
    expect(ctx.room.game!.scoreOf(player.id)).toBe(score);
    vi.advanceTimersByTime(TIMING.reconnectGraceSec * 1000 + 100);
    expect(ctx.room.players.has(guesser.id)).toBe(true); // grace timer cancelled
  });

  it('removes players after the grace period and migrates the host', () => {
    const { room, add } = setup();
    const a = add('Alice');
    const b = add('Bob');
    add('Cara');
    room.handleDisconnect(a);
    vi.advanceTimersByTime(TIMING.reconnectGraceSec * 1000 + 100);
    expect(room.players.has(a.id)).toBe(false);
    expect(room.hostId).toBe(b.id);
  });

  it('ends the turn if the drawer stays disconnected', () => {
    const ctx = startTwo();
    const { drawer } = pickWord(ctx);
    ctx.room.handleDisconnect(drawer);
    vi.advanceTimersByTime(TIMING.drawerGraceSec * 1000 + 100);
    expect(ctx.room.phase === 'ROUND_END' || ctx.room.phase === 'GAME_OVER').toBe(true);
  });

  it('ends the game when fewer than 2 players remain', () => {
    const ctx = startTwo();
    pickWord(ctx);
    ctx.room.leave(ctx.bob);
    expect(ctx.room.phase).toBe('GAME_OVER');
    expect(ctx.room.game!.result?.endReason).toBe('not_enough_players');
  });

  it('registry sweeps empty rooms and clears their timers', () => {
    const ctx = startTwo();
    ctx.room.handleDisconnect(ctx.host);
    ctx.room.handleDisconnect(ctx.bob);
    vi.advanceTimersByTime(TIMING.emptyRoomTtlSec * 1000 + 60_000);
    // players timed out, so room is empty
    expect(ctx.registry.sweep(Date.now() + TIMING.emptyRoomTtlSec * 1000 + 1)).toBe(1);
    expect(ctx.registry.get(ctx.room.code)).toBeUndefined();
    expect(ctx.room.timers.activeCount).toBe(0);
  });
});

describe('moderation', () => {
  it('host kick and ban (banned player cannot rejoin); non-host cannot kick', () => {
    const { room, add } = setup();
    const host = add('Host');
    const b = add('Bob');
    const c = add('Cara');
    expect(() => room.moderation.kick(b, c.id, false)).toThrowError(/host/i);
    room.moderation.kick(host, b.id, false);
    expect(room.players.has(b.id)).toBe(false);
    room.moderation.kick(host, c.id, true);
    expect(() =>
      room.join({ name: 'Cara', avatar: c.avatar, socketId: 'x', ip: 'other' }),
    ).toThrowError(/banned/i);
    expect(() =>
      room.join({ name: 'New', avatar: c.avatar, socketId: 'y', ip: c.ip }),
    ).toThrowError(/banned/i);
  });

  it('votekick needs a majority and never targets the host', () => {
    const { room, add } = setup();
    const host = add('Host');
    const b = add('Bob');
    const c = add('Cara');
    const d = add('Dan');
    expect(() => room.moderation.voteKick(b, host.id)).toThrowError(/host/i);
    room.moderation.voteKick(b, d.id);
    expect(room.players.has(d.id)).toBe(true);
    expect(() => room.moderation.voteKick(b, d.id)).toThrowError(/already/i);
    room.moderation.voteKick(c, d.id); // 2 of 3 eligible voters
    expect(room.players.has(d.id)).toBe(false);
  });

  it('reports are validated, de-duplicated and only sent to the host', () => {
    const { room, add, transport } = setup();
    const host = add('Host');
    const b = add('Bob');
    room.moderation.report(b, host.id, 'spam', 'spamming');
    expect(() => room.moderation.report(b, host.id, 'spam')).toThrowError(/already/i);
    expect(() => room.moderation.report(b, b.id, 'spam')).toThrowError(/yourself/i);
    const upd = transport.events('reports_update');
    expect(upd).toHaveLength(1);
    expect(upd[0].to).toBe(host.socketId);
  });
});
