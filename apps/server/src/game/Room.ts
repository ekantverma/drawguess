import { randomUUID } from 'node:crypto';
import {
  LIMITS,
  TIMING,
  type AvatarConfig,
  type ChatKind,
  type ChatMessage,
  type GameResult,
  type HistoryRecord,
  type Phase,
  type PublicPlayer,
  type ReportInfo,
  type RoomSettings,
  type RoomState,
  type ServerToClientEvents,
} from '@drawguess/shared';
import { Game } from './Game';
import { GameError } from './errors';
import { Moderation } from './Moderation';
import { Player } from './Player';
import { TimerService } from './TimerService';
import type { Payload, Transport } from './Transport';
import type { WordService } from './WordService';

export interface RoomDeps {
  transport: Transport;
  words: WordService;
  onGameFinished?: (record: HistoryRecord, room: Room) => void;
  onReport?: (report: ReportInfo, room: Room) => void;
  now?: () => number;
}

type S2C = ServerToClientEvents;

export interface JoinOptions {
  name: string;
  avatar: AvatarConfig;
  socketId: string;
  ip: string;
  token?: string;
  spectate?: boolean;
  userId?: string;
}

const MAX_CHAT = 100;

export class Room {
  readonly players = new Map<string, Player>();
  readonly timers = new TimerService();
  readonly createdAt: number;
  readonly banned = { tokens: new Set<string>(), names: new Set<string>(), ips: new Set<string>() };
  readonly reports: ReportInfo[] = [];
  readonly moderation: Moderation;
  game: Game | null = null;
  hostId = '';
  chat: ChatMessage[] = [];
  lastActive: number;
  destroyed = false;

  constructor(
    readonly code: string,
    public settings: RoomSettings,
    readonly deps: RoomDeps,
  ) {
    this.createdAt = this.lastActive = (deps.now ?? Date.now)();
    this.moderation = new Moderation(this);
  }

  get phase(): Phase {
    return this.game ? this.game.phase : 'LOBBY';
  }
  get transport(): Transport {
    return this.deps.transport;
  }

  // ---------- emit helpers ----------
  broadcast<E extends keyof S2C>(event: E, payload: Payload<E>): void {
    this.transport.emitToRoom(this.code, event, payload);
  }
  broadcastExcept<E extends keyof S2C>(player: Player, event: E, payload: Payload<E>): void {
    this.transport.emitToRoomExcept(this.code, player.socketId, event, payload);
  }
  send<E extends keyof S2C>(player: Player, event: E, payload: Payload<E>): void {
    if (player.socketId) this.transport.emitToSocket(player.socketId, event, payload);
  }
  sendMany<E extends keyof S2C>(players: Iterable<Player>, event: E, payload: Payload<E>): void {
    for (const p of players) this.send(p, event, payload);
  }

  // ---------- membership ----------
  activePlayers(): Player[] {
    return [...this.players.values()].filter((p) => p.role === 'player' && p.connected);
  }
  connectedCount(): number {
    return [...this.players.values()].filter((p) => p.connected).length;
  }
  playerCount(): number {
    return [...this.players.values()].filter((p) => p.role === 'player').length;
  }
  spectatorCount(): number {
    return this.players.size - this.playerCount();
  }
  findByToken(token: string): Player | undefined {
    return [...this.players.values()].find((p) => p.token === token);
  }
  findBySocket(socketId: string): Player | undefined {
    return [...this.players.values()].find((p) => p.socketId === socketId);
  }
  get host(): Player | undefined {
    return this.players.get(this.hostId);
  }

  private uniqueName(name: string): string {
    const taken = new Set([...this.players.values()].map((p) => p.name.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    for (let i = 2; i < 100; i++) {
      const candidate = `${name.slice(0, LIMITS.playerName.max - 4)} ${i}`;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
    return `${name.slice(0, 10)}${randomUUID().slice(0, 4)}`;
  }

  join(o: JoinOptions): { player: Player; rejoined: boolean } {
    this.touch();
    // Reconnect: token proves identity; never trust a client-supplied player id.
    const existing = o.token ? this.findByToken(o.token) : undefined;
    if (existing) {
      if (existing.socketId && existing.socketId !== o.socketId) {
        this.transport.emitToSocket(existing.socketId, 'room_error', {
          code: 'SESSION_REPLACED',
          message: 'You opened this room in another tab.',
        });
        this.transport.leave(existing.socketId, this.code);
      }
      existing.socketId = o.socketId;
      existing.connected = true;
      this.timers.clear(`dc:${existing.id}`);
      this.transport.join(o.socketId, this.code);
      this.game?.onPlayerReconnected(existing.id);
      this.system(`${existing.name} reconnected`);
      this.pushState();
      return { player: existing, rejoined: true };
    }

    if (
      (o.token && this.banned.tokens.has(o.token)) ||
      this.banned.names.has(o.name.toLowerCase()) ||
      this.banned.ips.has(o.ip)
    ) {
      throw new GameError('BANNED', 'You are banned from this room');
    }

    let role: 'player' | 'spectator' = 'player';
    if (o.spectate || this.phase !== 'LOBBY') role = 'spectator';
    if (role === 'player' && this.playerCount() >= this.settings.maxPlayers) {
      throw new GameError('ROOM_FULL', 'This room is full. You can join as a spectator instead.');
    }
    if (role === 'spectator' && this.spectatorCount() >= LIMITS.maxSpectators) {
      throw new GameError('ROOM_FULL', 'This room has no spectator seats left.');
    }

    const player = new Player(
      this.uniqueName(o.name),
      o.avatar,
      role,
      o.socketId,
      o.ip,
      !!o.spectate,
      o.userId,
    );
    this.players.set(player.id, player);
    if (!this.hostId || !this.players.has(this.hostId)) this.hostId = player.id;
    this.transport.join(o.socketId, this.code);
    this.broadcastExcept(player, 'player_joined', { player: this.toPublic(player) });
    this.system(
      role === 'spectator' ? `${player.name} is spectating` : `${player.name} joined the room`,
    );
    this.pushState();
    return { player, rejoined: false };
  }

  handleDisconnect(player: Player): void {
    if (!this.players.has(player.id)) return;
    player.connected = false;
    player.socketId = null;
    this.touch();
    this.system(`${player.name} disconnected`);
    // Temporary disconnect: keep the seat for a grace period, then remove permanently.
    this.timers.after(`dc:${player.id}`, TIMING.reconnectGraceSec * 1000, () => {
      this.removePlayer(player.id, 'timeout');
    });
    this.game?.onPlayerDisconnected(player.id);
    this.pushState();
  }

  removePlayer(id: string, reason: 'left' | 'timeout' | 'kicked' | 'banned'): void {
    const p = this.players.get(id);
    if (!p) return;
    this.timers.clear(`dc:${id}`);
    if (p.socketId) this.transport.leave(p.socketId, this.code);
    this.players.delete(id);
    this.moderation.forget(id);
    this.broadcast('player_left', { playerId: id, name: p.name, reason });
    const verb = {
      left: 'left the room',
      timeout: 'timed out',
      kicked: 'was kicked',
      banned: 'was banned',
    }[reason];
    this.system(`${p.name} ${verb}`);
    if (this.hostId === id) this.migrateHost();
    this.game?.onPlayerRemoved(id);
    this.pushState();
  }

  private migrateHost(): void {
    const candidates = [...this.players.values()].sort((a, b) => a.joinedAt - b.joinedAt);
    const next =
      candidates.find((p) => p.connected && p.role === 'player') ??
      candidates.find((p) => p.connected) ??
      candidates[0];
    this.hostId = next?.id ?? '';
    if (next) this.system(`${next.name} is now the host`);
  }

  // ---------- settings / lifecycle ----------
  private assertHost(player: Player): void {
    if (player.id !== this.hostId) throw new GameError('NOT_HOST', 'Only the host can do that');
  }

  setReady(player: Player, ready: boolean): void {
    if (this.phase !== 'LOBBY') throw new GameError('BAD_PHASE', 'The game has already started');
    if (player.role !== 'player') throw new GameError('SPECTATOR', 'Spectators cannot ready up');
    player.ready = ready;
    this.pushState();
  }

  updateSettings(player: Player, settings: RoomSettings): void {
    this.assertHost(player);
    if (this.phase !== 'LOBBY')
      throw new GameError('BAD_PHASE', 'Settings are locked during a game');
    if (settings.maxPlayers < this.playerCount()) {
      throw new GameError(
        'BAD_SETTINGS',
        `Max players cannot be below the current ${this.playerCount()} players`,
      );
    }
    this.settings = settings;
    this.pushState();
  }

  startGame(player: Player): void {
    this.assertHost(player);
    if (this.game && this.phase !== 'LOBBY')
      throw new GameError('ALREADY_STARTED', 'The game has already started');
    if (this.activePlayers().length < 2)
      throw new GameError('NOT_ENOUGH_PLAYERS', 'You need at least 2 players to start');
    this.touch();
    this.chat = this.chat.filter((m) => m.kind === 'system').slice(-20);
    this.game = new Game(this, this.deps.words, this.deps.now);
    this.game.start();
  }

  playAgain(player: Player): void {
    this.assertHost(player);
    if (this.phase !== 'GAME_OVER') throw new GameError('BAD_PHASE', 'The game is not over yet');
    this.game?.dispose();
    this.game = null;
    for (const p of this.players.values()) {
      p.ready = false;
      // spectators who only arrived because a game was running may now play
      if (
        p.role === 'spectator' &&
        !p.spectateOnly &&
        this.playerCount() < this.settings.maxPlayers
      )
        p.role = 'player';
    }
    this.broadcast('canvas_clear', {});
    this.system('Back in the lobby. Ready for another game?');
    this.pushState();
  }

  leave(player: Player): void {
    this.removePlayer(player.id, 'left');
  }

  onGameFinished(result: GameResult): void {
    const rec: HistoryRecord = {
      id: randomUUID(),
      roomCode: this.code,
      roomName: this.settings.roomName,
      participants: result.leaderboard.map((e) => ({ name: e.name, avatar: e.avatar })),
      winner: result.winner ? { name: result.winner.name, score: result.winner.score } : null,
      finalScores: result.leaderboard,
      turns: result.turns,
      roundsPlayed: result.roundsPlayed,
      durationMs: result.durationMs,
      endedAt: new Date().toISOString(),
    };
    this.deps.onGameFinished?.(rec, this);
  }

  // ---------- chat ----------
  system(text: string, kind: ChatKind = 'system'): ChatMessage {
    return this.pushChat({
      id: randomUUID(),
      playerId: null,
      playerName: 'System',
      text,
      kind,
      channel: 'all',
      at: Date.now(),
    });
  }

  pushChat(m: ChatMessage, deliver = true): ChatMessage {
    this.chat.push(m);
    if (this.chat.length > MAX_CHAT) this.chat.splice(0, this.chat.length - MAX_CHAT);
    if (deliver) this.deliverChat(m);
    return m;
  }

  canSee(m: ChatMessage, p: Player): boolean {
    if (m.channel === 'all') return true;
    if (m.channel === 'spectators') return p.role === 'spectator';
    // guessers channel: players who already guessed, plus the drawer
    return (
      p.role === 'player' &&
      (this.game?.guessedIds().has(p.id) || this.game?.turn?.drawerId === p.id || false)
    );
  }

  private deliverChat(m: ChatMessage): void {
    if (m.channel === 'all') {
      this.broadcast(
        m.kind === 'system' || m.kind === 'correct' ? 'system_message' : 'chat_message',
        m,
      );
      return;
    }
    this.sendMany(
      [...this.players.values()].filter((p) => this.canSee(m, p)),
      'chat_message',
      m,
    );
  }

  historyFor(p: Player): ChatMessage[] {
    return this.chat.filter((m) => this.canSee(m, p));
  }

  // ---------- state ----------
  toPublic(p: Player): PublicPlayer {
    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.id === this.hostId,
      ready: p.ready,
      connected: p.connected,
      role: p.role,
      score: this.game?.scoreOf(p.id) ?? 0,
      guessed: this.game?.guessedIds().has(p.id) ?? false,
      isDrawer: !!this.game && this.game.phase !== 'GAME_OVER' && this.game.turn?.drawerId === p.id,
    };
  }

  stateFor(viewer: Player): RoomState {
    return {
      code: this.code,
      settings: this.settings,
      hostId: this.hostId,
      phase: this.phase,
      players: [...this.players.values()]
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .map((p) => this.toPublic(p)),
      you: { playerId: viewer.id, role: viewer.role, isHost: viewer.id === this.hostId },
      game: this.game ? this.game.stateFor(viewer) : null,
    };
  }

  /** Send every connected member their own personalised snapshot (secret word only for the drawer). */
  pushState(): void {
    if (this.destroyed) return;
    const event = this.phase === 'LOBBY' ? 'lobby_updated' : 'game_state';
    for (const p of this.players.values()) {
      if (p.socketId) this.send(p, event, this.stateFor(p));
    }
  }

  touch(): void {
    this.lastActive = (this.deps.now ?? Date.now)();
  }

  destroy(): void {
    this.destroyed = true;
    this.game?.dispose();
    this.timers.clearAll();
    for (const p of this.players.values())
      if (p.socketId) this.transport.leave(p.socketId, this.code);
  }
}
