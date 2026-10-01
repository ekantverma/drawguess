import { toast } from 'sonner';
import type { AppSocket } from './socket';
import { gameCanvas } from './canvas';
import { clearSession } from './profile';
import { useGameStore } from '@/stores/gameStore';

/** Translate server events into store/canvas updates. Called once per socket. */
export function bindSocketEvents(socket: AppSocket): void {
  const st = () => useGameStore.getState();

  socket.on('connect', () => st().setConnection('connected'));
  socket.on('disconnect', () => st().setConnection('disconnected'));
  socket.io.on('reconnect_attempt', () => st().setConnection('connecting'));
  socket.on('connect_error', () => st().setConnection('disconnected'));

  socket.on('lobby_updated', (s) => st().applyState(s));
  socket.on('game_state', (s) => st().applyState(s));
  socket.on('timer_update', (t) => st().setTimer(t.timeLeft));
  socket.on('hint_update', (h) => st().patchHint(h.hint, h.hintsUsed));
  socket.on('score_update', (u) => st().patchScores(u.scores));

  socket.on('chat_message', (m) => st().addChat(m));
  socket.on('system_message', (m) => st().addChat(m));
  socket.on('chat_history', (h) => st().setChatHistory(h.messages));
  socket.on('guess_result', (r) => {
    const me = st().room?.you.playerId;
    if (r.correct && r.playerId === me) toast.success(`You got it! +${r.points} points`);
  });

  socket.on('draw_data', (d) => {
    if (d.op === 'start') gameCanvas.start(d.stroke);
    else if (d.op === 'move') gameCanvas.append(d.id, d.points);
  });
  socket.on('draw_undo', (u) => gameCanvas.undo(u.strokeId));
  socket.on('canvas_clear', () => gameCanvas.clear());
  socket.on('canvas_snapshot', (s) => gameCanvas.load(s.strokes));

  socket.on('votekick_update', (v) => st().setVotekick(v.targetId, v.vote));
  socket.on('reports_update', (r) => st().setReports(r.reports));

  socket.on('kicked', (k) => {
    const code = st().room?.code;
    if (code) clearSession(code);
    st().setKicked(k);
  });
  socket.on('room_error', (e) => {
    if (e.code === 'SESSION_REPLACED') {
      st().setReplaced(true);
      return;
    }
    if (e.code === 'NOT_DRAWER') return; // stale draw events right after a turn ends are harmless
    toast.error(e.message);
  });
}
