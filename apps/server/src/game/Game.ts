import {
  CANVAS,
  TIMING,
  type GameResult,
  type GameState,
  type Phase,
  type ReplayData,
  type RoundEndInfo,
  type Stroke,
  type TurnSummary,
} from '@drawguess/shared';
import { GameError } from './errors';
import type { Player } from './Player';
import { RoundManager, type TurnState } from './RoundManager';
import type { Room } from './Room';
import { pickWinner, ScoreManager } from './ScoreManager';
import { WordService } from './WordService';

export type GuessOutcome = 'correct' | 'wrong' | 'close' | 'rejected';

/**
 * Server-authoritative game state machine:
 * WORD_SELECTION -> DRAWING -> ROUND_END -> (next turn | GAME_OVER)
 * Every async callback captures a turnId and no-ops if the turn changed.
 */
export class Game {
  phase: Exclude<Phase, 'LOBBY'> = 'WORD_SELECTION';
  readonly scores = new ScoreManager();
  readonly rounds: RoundManager;
  readonly turns: TurnSummary[] = [];
  readonly replays = new Map<number, ReplayData>();
  result: GameResult | undefined;
  private lastRoundEnd: RoundEndInfo | undefined;
  private used = new Set<string>();
  private deadline = 0;
  private phaseTotal = 0;
  private finished = false;
  private startedAt: number;

  constructor(
    private room: Room,
    private words: WordService,
    private now: () => number = Date.now,
    shuffle: <T>(a: T[]) => T[] = defaultShuffle,
  ) {
    const players = room.activePlayers();
    this.rounds = new RoundManager(shuffle(players.map((p) => p.id)), room.settings.rounds);
    players.forEach((p) => this.scores.register(p));
    this.startedAt = now();
  }

  start(): void {
    this.beginTurn();
  }

  // ---------- helpers ----------
  private get settings() {
    return this.room.settings;
  }
  get turn(): TurnState | null {
    return this.rounds.turn;
  }
  private isEligible = (id: string): boolean => {
    const p = this.room.players.get(id);
    return !!p && p.role === 'player' && p.connected;
  };
  private live(turnId: number, phase?: Phase): TurnState | null {
    const t = this.rounds.turn;
    if (this.finished || !t || t.turnId !== turnId) return null;
    if (phase && this.phase !== phase) return null;
    return t;
  }
  private setDeadline(sec: number): void {
    this.phaseTotal = sec;
    this.deadline = this.now() + sec * 1000;
  }
  timeLeft(): number {
    return Math.max(0, Math.ceil((this.deadline - this.now()) / 1000));
  }
  private guesserIds(): string[] {
    const t = this.turn;
    return [...this.room.players.values()]
      .filter(
        (p) =>
          p.role === 'player' &&
          p.id !== t?.drawerId &&
          this.scores.leaderboard().some((e) => e.playerId === p.id),
      )
      .map((p) => p.id);
  }

  // ---------- turn lifecycle ----------
  private beginTurn(): void {
    if (this.finished) return;
    if (this.room.activePlayers().length < 2) return this.endGame('not_enough_players');
    const t = this.rounds.advance(this.isEligible);
    if (!t) return this.endGame('completed');

    this.phase = 'WORD_SELECTION';
    t.options = this.words.choices(this.settings, this.settings.wordCount, this.used);
    if (t.options.length === 0) {
      // no words available (should be prevented by validation) - skip the turn safely
      return this.endTurn('skipped');
    }
    this.setDeadline(TIMING.wordSelectSec);
    const id = t.turnId;
    this.room.broadcast('canvas_clear', {});
    this.room.broadcast('round_start', {
      turn: t.index,
      round: t.round,
      totalTurns: this.rounds.totalTurns,
      drawerId: t.drawerId,
      drawTime: this.settings.drawTime,
    });
    const drawer = this.room.players.get(t.drawerId);
    if (drawer)
      this.room.send(drawer, 'word_options', {
        options: t.options,
        deadlineSec: TIMING.wordSelectSec,
      });
    this.room.system(`${drawer?.name ?? 'Someone'} is choosing a word…`);
    this.room.pushState();
    this.startTicker(id);
    this.room.timers.after('turn:word-select', TIMING.wordSelectSec * 1000, () => {
      const cur = this.live(id, 'WORD_SELECTION');
      if (cur) this.startDrawing(cur, cur.options[0]);
    });
  }

  private startTicker(turnId: number): void {
    this.room.timers.every('turn:tick', 1000, () => {
      if (!this.live(turnId)) return;
      this.room.broadcast('timer_update', {
        timeLeft: this.timeLeft(),
        timeTotal: this.phaseTotal,
        phase: this.phase,
      });
    });
  }

  chooseWord(player: Player, word: string): void {
    const t = this.turn;
    if (this.phase !== 'WORD_SELECTION' || !t)
      throw new GameError('BAD_PHASE', 'Not choosing a word right now');
    if (player.id !== t.drawerId)
      throw new GameError('NOT_DRAWER', 'Only the drawer can choose the word');
    const chosen = t.options.find((o) => o === word);
    if (!chosen) throw new GameError('BAD_WORD', 'That word was not offered');
    this.startDrawing(t, chosen);
  }

  private startDrawing(t: TurnState, word: string): void {
    const id = t.turnId;
    this.room.timers.clear('turn:word-select');
    t.word = word;
    t.startedAt = this.now();
    this.used.add(WordService.normalize(word));
    this.phase = 'DRAWING';
    const total = this.settings.drawTime;
    this.setDeadline(total);

    const letters = WordService.letterIndices(word).length;
    const hintCount =
      this.settings.wordMode === 'hidden'
        ? 0
        : Math.min(this.settings.hints, Math.max(0, letters - 1));
    for (let i = 1; i <= hintCount; i++) {
      this.room.timers.after(
        `turn:hint-${i}`,
        Math.round((total * 1000 * i) / (hintCount + 1)),
        () => {
          const cur = this.live(id, 'DRAWING');
          if (cur) this.revealHint(cur);
        },
      );
    }
    this.room.timers.after('turn:end', total * 1000, () => {
      if (this.live(id, 'DRAWING')) this.endTurn('time_up');
    });
    this.startTicker(id);
    this.room.broadcast('word_chosen', {
      drawerId: t.drawerId,
      hint: this.words.mask(word, t.revealed, this.settings.wordMode),
      wordLength: this.settings.wordMode === 'hidden' ? 0 : [...word].length,
    });
    this.room.pushState();
  }

  private revealHint(t: TurnState): void {
    if (!t.word) return;
    const idx = this.words.nextHintIndex(t.word, t.revealed);
    if (idx === null) return;
    t.revealed.add(idx);
    this.room.broadcast('hint_update', {
      hint: this.words.mask(t.word, t.revealed, this.settings.wordMode),
      hintsUsed: t.revealed.size,
    });
  }

  // ---------- guessing ----------
  submitGuess(player: Player, text: string): GuessOutcome {
    const t = this.turn;
    if (this.phase !== 'DRAWING' || !t || !t.word) return 'rejected';
    if (player.role !== 'player' || player.id === t.drawerId || t.guessed.has(player.id))
      return 'rejected';
    if (!this.scores.leaderboard().some((e) => e.playerId === player.id)) return 'rejected'; // joined mid-game
    if (!this.words.matches(text, t.word))
      return this.words.isClose(text, t.word) ? 'close' : 'wrong';

    const order = t.guessOrder.length + 1;
    const pts = this.scores.guesserPoints(this.timeLeftPrecise(), this.settings.drawTime, order);
    t.guessed.set(player.id, pts);
    t.guessOrder.push(player.id);
    t.gains.set(player.id, (t.gains.get(player.id) ?? 0) + pts);
    this.scores.award(player.id, pts, true);
    const drawerPts = this.scores.drawerPoints(this.guesserIds().length);
    t.gains.set(t.drawerId, (t.gains.get(t.drawerId) ?? 0) + drawerPts);
    this.scores.award(t.drawerId, drawerPts);

    this.room.broadcast('guess_result', {
      correct: true,
      playerId: player.id,
      playerName: player.name,
      points: pts,
    });
    this.room.broadcast('correct_guess', { playerId: player.id, playerName: player.name });
    this.room.system(`${player.name} guessed the word!`, 'correct');
    this.room.broadcast('score_update', { scores: this.scoreDeltas(t) });
    this.room.pushState();
    this.checkAllGuessed();
    return 'correct';
  }

  private timeLeftPrecise(): number {
    return Math.max(0, (this.deadline - this.now()) / 1000);
  }

  private scoreDeltas(t: TurnState) {
    return this.scores.leaderboard().map((e) => ({
      playerId: e.playerId,
      score: e.score,
      gained: t.gains.get(e.playerId) ?? 0,
    }));
  }

  private checkAllGuessed(): void {
    const t = this.turn;
    if (this.phase !== 'DRAWING' || !t) return;
    const guessers = [...this.room.players.values()].filter(
      (p) =>
        p.role === 'player' &&
        p.connected &&
        p.id !== t.drawerId &&
        this.scores.leaderboard().some((e) => e.playerId === p.id),
    );
    if (guessers.length > 0 && guessers.every((p) => t.guessed.has(p.id)))
      this.endTurn('all_guessed');
  }

  // ---------- ending ----------
  endTurn(reason: RoundEndInfo['reason']): void {
    const t = this.turn;
    if (!t || this.finished || (this.phase !== 'WORD_SELECTION' && this.phase !== 'DRAWING'))
      return;
    this.room.timers.clearPrefix('turn:');
    this.phase = 'ROUND_END';
    this.setDeadline(TIMING.roundEndSec);
    const word = t.word ?? '';
    const gains = [...t.gains.entries()].map(([playerId, points]) => ({
      playerId,
      name: this.nameOf(playerId),
      points,
    }));
    const info: RoundEndInfo = { turn: t.index, word, drawerId: t.drawerId, reason, gains };
    this.lastRoundEnd = info;
    this.turns.push({
      turn: t.index,
      round: t.round,
      drawerId: t.drawerId,
      drawerName: this.nameOf(t.drawerId),
      word,
      reason,
      gains,
    });
    if (word) {
      this.replays.set(t.index, {
        turn: t.index,
        word,
        drawerName: this.nameOf(t.drawerId),
        strokes: t.strokes.map((s) => ({ ...s, points: [...s.points] })),
        durationMs: t.startedAt ? this.now() - t.startedAt : 0,
      });
    }
    this.room.broadcast('round_end', info);
    this.room.broadcast('score_update', { scores: this.scoreDeltas(t) });
    this.room.system(word ? `The word was "${word}"` : 'Turn skipped');
    this.room.pushState();
    const id = t.turnId;
    this.room.timers.after('turn:next', TIMING.roundEndSec * 1000, () => {
      if (this.live(id, 'ROUND_END')) this.beginTurn();
    });
  }

  private nameOf(id: string): string {
    return this.scores.leaderboard().find((e) => e.playerId === id)?.name ?? 'Player';
  }

  endGame(endReason: GameResult['endReason']): void {
    if (this.finished) return;
    this.room.timers.clearPrefix('turn:');
    this.finished = true;
    this.phase = 'GAME_OVER';
    const leaderboard = this.scores.leaderboard();
    this.result = {
      winner: pickWinner(leaderboard),
      leaderboard,
      turns: this.turns,
      roundsPlayed: Math.min(
        this.settings.rounds,
        Math.ceil(this.turns.length / Math.max(1, this.rounds.order.length)),
      ),
      durationMs: this.now() - this.startedAt,
      endReason,
    };
    this.room.broadcast('game_over', this.result);
    const tied = leaderboard.filter((e) => e.rank === 1 && e.score > 0);
    this.room.system(
      this.result.winner
        ? `${this.result.winner.name} wins the game!`
        : tied.length > 1
          ? `It's a tie between ${tied.map((e) => e.name).join(' and ')}!`
          : 'Game over, nobody scored.',
    );
    this.room.pushState();
    this.room.onGameFinished(this.result);
  }

  /** Stop everything without emitting (room teardown). */
  dispose(): void {
    this.finished = true;
    this.room.timers.clearPrefix('turn:');
  }

  // ---------- membership hooks ----------
  onPlayerRemoved(id: string): void {
    if (this.finished) return;
    this.scores.markLeft(id);
    const t = this.turn;
    if (t && t.drawerId === id && (this.phase === 'WORD_SELECTION' || this.phase === 'DRAWING')) {
      this.endTurn('drawer_left');
    } else {
      this.checkAllGuessed();
    }
    if (this.room.activePlayers().length < 2 && !this.finished) this.endGame('not_enough_players');
  }

  onPlayerDisconnected(id: string): void {
    if (this.finished) return;
    const t = this.turn;
    if (t && t.drawerId === id && (this.phase === 'WORD_SELECTION' || this.phase === 'DRAWING')) {
      const turnId = t.turnId;
      this.room.timers.after('turn:drawer-grace', TIMING.drawerGraceSec * 1000, () => {
        const cur = this.live(turnId);
        const d = this.room.players.get(id);
        if (
          cur &&
          d &&
          !d.connected &&
          (this.phase === 'WORD_SELECTION' || this.phase === 'DRAWING')
        ) {
          this.endTurn('drawer_left');
        }
      });
    } else {
      this.checkAllGuessed();
    }
  }

  onPlayerReconnected(id: string): void {
    if (this.turn?.drawerId === id) this.room.timers.clear('turn:drawer-grace');
  }

  // ---------- drawing (server validates drawer + phase) ----------
  private assertDrawer(player: Player): TurnState {
    const t = this.turn;
    if (this.phase !== 'DRAWING' || !t || t.drawerId !== player.id) {
      throw new GameError('NOT_DRAWER', 'Only the current drawer can draw');
    }
    return t;
  }

  drawStart(
    player: Player,
    p: {
      id: string;
      x: number;
      y: number;
      color: string;
      width: number;
      tool: 'brush' | 'marker' | 'eraser' | 'fill';
    },
  ): Stroke {
    const t = this.assertDrawer(player);
    if (t.strokes.length >= CANVAS.maxStrokesPerTurn)
      throw new GameError('LIMIT', 'Too many strokes');
    if (t.live) this.finishLive(t);
    const stroke: Stroke = {
      id: p.id,
      playerId: player.id,
      points: [p.x, p.y],
      color: p.color,
      width: p.width,
      tool: p.tool,
      timestamp: this.now(),
      t: this.now() - (t.startedAt ?? this.now()),
      dur: 0,
    };
    t.strokes.push(stroke);
    t.live = stroke;
    return stroke;
  }

  drawMove(player: Player, p: { id: string; points: number[] }): void {
    const t = this.assertDrawer(player);
    if (!t.live || t.live.id !== p.id) throw new GameError('BAD_STROKE', 'No active stroke');
    if (t.live.points.length + p.points.length > CANVAS.maxPointsPerStroke)
      throw new GameError('LIMIT', 'Stroke too long');
    t.live.points.push(...p.points);
  }

  drawEnd(player: Player, id: string): void {
    const t = this.assertDrawer(player);
    if (!t.live || t.live.id !== id) throw new GameError('BAD_STROKE', 'No active stroke');
    this.finishLive(t);
  }

  private finishLive(t: TurnState): void {
    if (t.live) {
      t.live.dur = Math.max(0, this.now() - (t.startedAt ?? this.now()) - t.live.t);
      t.live = null;
    }
  }

  undo(player: Player): string | null {
    const t = this.assertDrawer(player);
    const s = t.strokes.pop();
    if (s && t.live === s) t.live = null;
    return s?.id ?? null;
  }

  clearCanvas(player: Player): void {
    const t = this.assertDrawer(player);
    t.strokes.length = 0;
    t.live = null;
  }

  canvasStrokes(): Stroke[] {
    return this.turn && (this.phase === 'DRAWING' || this.phase === 'ROUND_END')
      ? this.turn.strokes
      : [];
  }

  // ---------- snapshots ----------
  stateFor(viewer: Player): GameState {
    const t = this.turn;
    const isDrawer = !!t && t.drawerId === viewer.id;
    const hint =
      t?.word && this.phase !== 'WORD_SELECTION'
        ? this.words.mask(t.word, t.revealed, this.settings.wordMode)
        : '';
    const state: GameState = {
      round: t?.round ?? 1,
      totalRounds: this.settings.rounds,
      turn: t?.index ?? 0,
      totalTurns: this.rounds.totalTurns,
      drawerId: t?.drawerId ?? null,
      hint,
      wordLength: t?.word && this.settings.wordMode !== 'hidden' ? [...t.word].length : 0,
      timeLeft: this.phase === 'GAME_OVER' ? 0 : this.timeLeft(),
      timeTotal: this.phaseTotal,
      hintsUsed: t?.revealed.size ?? 0,
      replayTurns: [...this.replays.keys()].sort((a, b) => a - b),
    };
    // SECRET ISOLATION: the word / options only ever go to the drawer.
    if (isDrawer && t?.word && this.phase === 'DRAWING') state.word = t.word;
    if (isDrawer && this.phase === 'WORD_SELECTION') state.wordOptions = t?.options;
    if (this.phase === 'ROUND_END' && this.lastRoundEnd) state.roundEnd = this.lastRoundEnd;
    if (this.phase === 'GAME_OVER') state.result = this.result;
    return state;
  }

  guessedIds(): Set<string> {
    return new Set(
      this.phase === 'DRAWING' || this.phase === 'ROUND_END'
        ? (this.turn?.guessed.keys() ?? [])
        : [],
    );
  }

  scoreOf(id: string): number {
    return this.scores.scoreOf(id);
  }

  secretWord(): string | null {
    return this.phase === 'DRAWING' ? (this.turn?.word ?? null) : null;
  }
}

function defaultShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
