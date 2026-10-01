import type {
  AvatarConfig,
  ChatMessage,
  GameResult,
  PublicPlayer,
  ReplayData,
  ReportInfo,
  RoomSettings,
  RoomState,
  RoundEndInfo,
  Stroke,
  VotekickState,
} from './types';

export type AckError = { code: string; message: string };
export type Ack<T = undefined> =
  ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error: AckError };

export interface JoinedData {
  playerId: string;
  playerToken: string;
  state: RoomState;
}

export interface CreateRoomPayload {
  hostName: string;
  avatar: AvatarConfig;
  settings: RoomSettings;
}
export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
  avatar: AvatarConfig;
  playerToken?: string;
  spectate?: boolean;
}

export type DrawData =
  | { op: 'start'; stroke: Stroke }
  | { op: 'move'; id: string; points: number[] }
  | { op: 'end'; id: string };

export interface ClientToServerEvents {
  create_room: (
    p: CreateRoomPayload,
    ack: (r: Ack<JoinedData & { roomCode: string }>) => void,
  ) => void;
  join_room: (p: JoinRoomPayload, ack: (r: Ack<JoinedData>) => void) => void;
  leave_room: (ack?: (r: Ack) => void) => void;
  player_ready: (p: { ready: boolean }, ack?: (r: Ack) => void) => void;
  update_settings: (p: RoomSettings, ack?: (r: Ack) => void) => void;
  start_game: (p: object, ack?: (r: Ack) => void) => void;
  play_again: (p: object, ack?: (r: Ack) => void) => void;
  word_chosen: (p: { word: string }, ack?: (r: Ack) => void) => void;

  draw_start: (p: {
    id: string;
    x: number;
    y: number;
    color: string;
    width: number;
    tool: 'brush' | 'eraser';
  }) => void;
  draw_move: (p: { id: string; points: number[] }) => void;
  draw_end: (p: { id: string }) => void;
  draw_undo: (p: object) => void;
  canvas_clear: (p: object) => void;

  guess: (p: { text: string }, ack?: (r: Ack) => void) => void;
  chat: (p: { text: string }, ack?: (r: Ack) => void) => void;

  kick_player: (p: { playerId: string; ban?: boolean }, ack?: (r: Ack) => void) => void;
  votekick: (p: { targetId: string }, ack?: (r: Ack) => void) => void;
  report_player: (
    p: { targetId: string; reason: ReportInfo['reason']; details?: string },
    ack?: (r: Ack) => void,
  ) => void;
  request_replay: (p: { turn?: number }, ack: (r: Ack<ReplayData>) => void) => void;
}

export interface ServerToClientEvents {
  player_joined: (p: { player: PublicPlayer }) => void;
  player_left: (p: {
    playerId: string;
    name: string;
    reason: 'left' | 'timeout' | 'kicked' | 'banned';
  }) => void;
  lobby_updated: (state: RoomState) => void;
  room_error: (e: AckError) => void;
  kicked: (p: { reason: string; banned: boolean }) => void;

  game_state: (state: RoomState) => void;
  round_start: (p: {
    turn: number;
    round: number;
    totalTurns: number;
    drawerId: string;
    drawTime: number;
  }) => void;
  word_options: (p: { options: string[]; deadlineSec: number }) => void;
  word_chosen: (p: { drawerId: string; hint: string; wordLength: number }) => void;
  timer_update: (p: { timeLeft: number; timeTotal: number; phase: RoomState['phase'] }) => void;
  hint_update: (p: { hint: string; hintsUsed: number }) => void;
  score_update: (p: { scores: { playerId: string; score: number; gained: number }[] }) => void;
  round_end: (p: RoundEndInfo) => void;
  game_over: (p: GameResult) => void;

  draw_data: (d: DrawData) => void;
  draw_undo: (p: { strokeId: string | null }) => void;
  canvas_clear: (p: object) => void;
  canvas_snapshot: (p: { strokes: Stroke[] }) => void;

  guess_result: (p: {
    correct: boolean;
    playerId: string;
    playerName: string;
    points: number;
  }) => void;
  correct_guess: (p: { playerId: string; playerName: string }) => void;
  chat_message: (m: ChatMessage) => void;
  chat_history: (p: { messages: ChatMessage[] }) => void;
  system_message: (m: ChatMessage) => void;

  votekick_update: (p: { vote: VotekickState | null; targetId: string }) => void;
  reports_update: (p: { reports: ReportInfo[] }) => void;
}
