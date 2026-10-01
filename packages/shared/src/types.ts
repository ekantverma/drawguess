import type { CATEGORIES, PHASES, REPORT_REASONS, WORD_MODES } from './constants';

export type Phase = (typeof PHASES)[number];
export type WordMode = (typeof WORD_MODES)[number];
export type Category = (typeof CATEGORIES)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];
export type Role = 'player' | 'spectator';
export type LanguageCode = string;

export interface AvatarConfig {
  color: number;
  eyes: number;
  mouth: number;
  hat: number;
}

export interface RoomSettings {
  roomName: string;
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  wordCount: number;
  /** 0 = hints disabled */
  hints: number;
  wordMode: WordMode;
  language: LanguageCode;
  categories: Category[];
  customWords: string[];
  customWordsOnly: boolean;
  isPublic: boolean;
}

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: AvatarConfig;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
  role: Role;
  score: number;
  /** guessed the word this turn */
  guessed: boolean;
  isDrawer: boolean;
}

export interface Stroke {
  id: string;
  playerId: string;
  /** flat [x0,y0,x1,y1,...] normalised to 0..1 */
  points: number[];
  color: string;
  /** brush width in virtual px (800x600 stage) */
  width: number;
  tool: 'brush' | 'marker' | 'eraser';
  timestamp: number;
  /** ms since turn drawing start (for replay) */
  t: number;
  /** ms duration of the stroke (for replay) */
  dur: number;
}

export interface TurnGain {
  playerId: string;
  name: string;
  points: number;
}

export interface RoundEndInfo {
  turn: number;
  word: string;
  drawerId: string;
  reason: 'all_guessed' | 'time_up' | 'drawer_left' | 'skipped';
  gains: TurnGain[];
}

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  avatar: AvatarConfig;
  score: number;
  correctGuesses: number;
  rank: number;
  left: boolean;
}

export interface TurnSummary {
  turn: number;
  round: number;
  drawerId: string;
  drawerName: string;
  word: string;
  reason: RoundEndInfo['reason'];
  gains: TurnGain[];
}

export interface GameResult {
  winner: LeaderboardEntry | null;
  leaderboard: LeaderboardEntry[];
  turns: TurnSummary[];
  roundsPlayed: number;
  durationMs: number;
  endReason: 'completed' | 'not_enough_players';
}

export interface GameState {
  round: number;
  totalRounds: number;
  turn: number;
  totalTurns: number;
  drawerId: string | null;
  /** Masked word, e.g. "_ _ a _ _" as chars: "__a__". Hidden mode => "" */
  hint: string;
  wordLength: number;
  /** ONLY set for the current drawer (never for anyone else). */
  word?: string;
  /** ONLY set for the current drawer during WORD_SELECTION. */
  wordOptions?: string[];
  timeLeft: number;
  timeTotal: number;
  hintsUsed: number;
  roundEnd?: RoundEndInfo;
  result?: GameResult;
  /** number of stored replays available (turn indices) */
  replayTurns: number[];
}

export interface RoomState {
  code: string;
  settings: RoomSettings;
  hostId: string;
  phase: Phase;
  players: PublicPlayer[];
  you: { playerId: string; role: Role; isHost: boolean };
  game: GameState | null;
}

export type ChatChannel = 'all' | 'guessers' | 'spectators';
export type ChatKind = 'chat' | 'guess' | 'system' | 'correct' | 'close';

export interface ChatMessage {
  id: string;
  playerId: string | null;
  playerName: string;
  text: string;
  kind: ChatKind;
  channel: ChatChannel;
  at: number;
}

export interface ReportInfo {
  id: string;
  reporterId: string;
  reporterName: string;
  targetId: string;
  targetName: string;
  reason: ReportReason;
  details: string;
  at: number;
}

export interface VotekickState {
  targetId: string;
  targetName: string;
  votes: number;
  needed: number;
}

export interface PublicRoomInfo {
  code: string;
  roomName: string;
  players: number;
  maxPlayers: number;
  phase: Phase;
  language: LanguageCode;
  rounds: number;
}

export interface RoomLookup {
  exists: boolean;
  code: string;
  roomName?: string;
  players?: number;
  maxPlayers?: number;
  phase?: Phase;
  full?: boolean;
  inProgress?: boolean;
}

export interface HistoryRecord {
  id: string;
  roomCode: string;
  roomName: string;
  participants: { name: string; avatar: AvatarConfig }[];
  winner: { name: string; score: number } | null;
  finalScores: LeaderboardEntry[];
  turns: TurnSummary[];
  roundsPlayed: number;
  durationMs: number;
  endedAt: string;
}

export interface ReplayData {
  turn: number;
  word: string;
  drawerName: string;
  strokes: Stroke[];
  durationMs: number;
}
