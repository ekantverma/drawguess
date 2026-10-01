import { create } from 'zustand';
import type { ChatMessage, ReportInfo, RoomState, VotekickState } from '@drawguess/shared';
import type { ConnectionStatus } from '@/types';

const MAX_CHAT = 200;

interface GameStore {
  connection: ConnectionStatus;
  room: RoomState | null;
  chat: ChatMessage[];
  timeLeft: number;
  votekicks: Record<string, VotekickState>;
  reports: ReportInfo[];
  kicked: { reason: string; banned: boolean } | null;
  replaced: boolean;
  setConnection: (c: ConnectionStatus) => void;
  applyState: (s: RoomState) => void;
  patchHint: (hint: string, hintsUsed: number) => void;
  patchScores: (scores: { playerId: string; score: number }[]) => void;
  setTimer: (t: number) => void;
  addChat: (m: ChatMessage) => void;
  setChatHistory: (m: ChatMessage[]) => void;
  setVotekick: (targetId: string, v: VotekickState | null) => void;
  setReports: (r: ReportInfo[]) => void;
  setKicked: (k: { reason: string; banned: boolean } | null) => void;
  setReplaced: (b: boolean) => void;
  resetRoom: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  connection: 'connecting',
  room: null,
  chat: [],
  timeLeft: 0,
  votekicks: {},
  reports: [],
  kicked: null,
  replaced: false,
  setConnection: (connection) => set({ connection }),
  applyState: (room) => set({ room, timeLeft: room.game?.timeLeft ?? 0 }),
  patchHint: (hint, hintsUsed) =>
    set((s) =>
      s.room?.game ? { room: { ...s.room, game: { ...s.room.game, hint, hintsUsed } } } : s,
    ),
  patchScores: (scores) =>
    set((s) => {
      if (!s.room) return s;
      const map = new Map(scores.map((x) => [x.playerId, x.score]));
      return {
        room: {
          ...s.room,
          players: s.room.players.map((p) => (map.has(p.id) ? { ...p, score: map.get(p.id)! } : p)),
        },
      };
    }),
  setTimer: (timeLeft) => set({ timeLeft }),
  addChat: (m) =>
    set((s) => {
      if (s.chat.some((c) => c.id === m.id)) return s;
      const chat = [...s.chat, m];
      return { chat: chat.length > MAX_CHAT ? chat.slice(-MAX_CHAT) : chat };
    }),
  setChatHistory: (chat) => set({ chat }),
  setVotekick: (targetId, v) =>
    set((s) => {
      const votekicks = { ...s.votekicks };
      if (v) votekicks[targetId] = v;
      else delete votekicks[targetId];
      return { votekicks };
    }),
  setReports: (reports) => set({ reports }),
  setKicked: (kicked) => set({ kicked }),
  setReplaced: (replaced) => set({ replaced }),
  resetRoom: () =>
    set({
      room: null,
      chat: [],
      timeLeft: 0,
      votekicks: {},
      reports: [],
      kicked: null,
      replaced: false,
    }),
}));

export const selectMe = (s: GameStore) =>
  s.room?.players.find((p) => p.id === s.room?.you.playerId);
