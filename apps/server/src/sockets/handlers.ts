import {
  createRoomSchema,
  drawEndSchema,
  drawMoveSchema,
  drawStartSchema,
  joinRoomSchema,
  kickSchema,
  readySchema,
  replayRequestSchema,
  reportSchema,
  settingsSchema,
  textSchema,
  votekickSchema,
  wordChosenSchema,
  type JoinedData,
  type ReplayData,
} from '@drawguess/shared';
import { z } from 'zod';
import { ChatService } from '../game/ChatService';
import { GameError } from '../game/errors';
import type { Player } from '../game/Player';
import type { Room } from '../game/Room';
import type { RoomRegistry } from '../game/RoomRegistry';
import { on, type ConnectionContext } from './ConnectionContext';

const empty = z.object({}).passthrough().optional();

abstract class Handler {
  constructor(
    protected ctx: ConnectionContext,
    protected registry: RoomRegistry,
  ) {}
  abstract register(): void;
}

/** Create / join / leave / ready / settings / disconnect. */
export class RoomHandler extends Handler {
  register(): void {
    const { ctx } = this;
    on(ctx, 'create_room', { schema: createRoomSchema, bucket: 'room' }, (p) => {
      this.leaveCurrent();
      const room = this.registry.create(p.settings);
      const { player } = room.join({
        name: p.hostName,
        avatar: p.avatar,
        socketId: ctx.socket.id,
        ip: ctx.ip,
        userId: ctx.userId,
      });
      ctx.bind(room, player);
      return { roomCode: room.code, ...this.joined(room, player) };
    });

    on(ctx, 'join_room', { schema: joinRoomSchema, bucket: 'room' }, (p) => {
      const room = this.registry.get(p.roomCode);
      if (!room) throw new GameError('ROOM_NOT_FOUND', 'No room with that code exists');
      if (ctx.roomCode && ctx.roomCode !== room.code) this.leaveCurrent();
      const { player } = room.join({
        name: p.playerName,
        avatar: p.avatar,
        socketId: ctx.socket.id,
        ip: ctx.ip,
        token: p.playerToken,
        spectate: p.spectate,
        userId: ctx.userId,
      });
      ctx.bind(room, player);
      // Late joiners / reconnects: bring them up to date with drawing + chat.
      const strokes = room.game?.canvasStrokes() ?? [];
      if (strokes.length) room.send(player, 'canvas_snapshot', { strokes });
      room.send(player, 'chat_history', { messages: room.historyFor(player) });
      if (player.id === room.hostId && room.reports.length)
        room.send(player, 'reports_update', { reports: room.reports });
      return this.joined(room, player);
    });

    on(ctx, 'leave_room', { schema: null }, () => {
      this.leaveCurrent();
    });
    on(ctx, 'player_ready', { schema: readySchema }, (p) => {
      const { room, player } = ctx.current();
      room.setReady(player, p.ready);
    });
    on(ctx, 'update_settings', { schema: settingsSchema }, (s) => {
      const { room, player } = ctx.current();
      room.updateSettings(player, s);
    });

    ctx.socket.on('disconnect', () => {
      const room = ctx.roomCode ? this.registry.get(ctx.roomCode) : undefined;
      const player = room && ctx.playerId ? room.players.get(ctx.playerId) : undefined;
      // Only the socket that currently owns the seat may mark it disconnected.
      if (room && player && player.socketId === ctx.socket.id) room.handleDisconnect(player);
    });
  }

  private joined(room: Room, player: Player): JoinedData {
    return { playerId: player.id, playerToken: player.token, state: room.stateFor(player) };
  }

  private leaveCurrent(): void {
    const { ctx } = this;
    const room = ctx.roomCode ? this.registry.get(ctx.roomCode) : undefined;
    const player = room && ctx.playerId ? room.players.get(ctx.playerId) : undefined;
    if (room && player && player.socketId === ctx.socket.id) room.leave(player);
    ctx.unbind();
  }
}

export class GameHandler extends Handler {
  register(): void {
    const { ctx } = this;
    on(ctx, 'start_game', { schema: empty }, () => {
      const { room, player } = ctx.current();
      room.startGame(player);
    });
    on(ctx, 'play_again', { schema: empty }, () => {
      const { room, player } = ctx.current();
      room.playAgain(player);
    });
    on(ctx, 'word_chosen', { schema: wordChosenSchema }, (p) => {
      const { room, player } = ctx.current();
      if (!room.game) throw new GameError('BAD_PHASE', 'No game in progress');
      room.game.chooseWord(player, p.word);
    });
    on(ctx, 'request_replay', { schema: replayRequestSchema }, (p): ReplayData => {
      const { room } = ctx.current();
      const replays = room.game?.replays;
      if (!replays || replays.size === 0)
        throw new GameError('NO_REPLAY', 'No completed rounds to replay yet');
      const turn = p.turn ?? Math.max(...replays.keys());
      const replay = replays.get(turn);
      if (!replay) throw new GameError('NO_REPLAY', 'That round has no replay');
      return replay;
    });
  }
}

/** Every draw event is authorised by the server: phase === DRAWING and sender === current drawer. */
export class DrawHandler extends Handler {
  register(): void {
    const { ctx } = this;
    const q = { bucket: 'draw' as const, quiet: true };
    on(ctx, 'draw_start', { schema: drawStartSchema, ...q }, (p) => {
      const { room, player } = ctx.current();
      const stroke = this.game(room).drawStart(player, p);
      room.broadcastExcept(player, 'draw_data', { op: 'start', stroke });
    });
    on(ctx, 'draw_move', { schema: drawMoveSchema, ...q }, (p) => {
      const { room, player } = ctx.current();
      this.game(room).drawMove(player, p);
      room.broadcastExcept(player, 'draw_data', { op: 'move', id: p.id, points: p.points });
    });
    on(ctx, 'draw_end', { schema: drawEndSchema, ...q }, (p) => {
      const { room, player } = ctx.current();
      this.game(room).drawEnd(player, p.id);
      room.broadcastExcept(player, 'draw_data', { op: 'end', id: p.id });
    });
    on(ctx, 'draw_undo', { schema: empty, ...q }, () => {
      const { room, player } = ctx.current();
      const strokeId = this.game(room).undo(player);
      room.broadcastExcept(player, 'draw_undo', { strokeId });
    });
    on(ctx, 'canvas_clear', { schema: empty, ...q }, () => {
      const { room, player } = ctx.current();
      this.game(room).clearCanvas(player);
      room.broadcastExcept(player, 'canvas_clear', {});
    });
  }

  private game(room: Room) {
    if (!room.game) throw new GameError('NOT_DRAWER', 'No game in progress');
    return room.game;
  }
}

export class ChatHandler extends Handler {
  private services = new Map<string, ChatService>();

  register(): void {
    const { ctx } = this;
    on(ctx, 'guess', { schema: textSchema, bucket: 'chat' }, (p) => {
      const { room, player } = ctx.current();
      this.service(room).guess(player, p.text);
    });
    on(ctx, 'chat', { schema: textSchema, bucket: 'chat' }, (p) => {
      const { room, player } = ctx.current();
      this.service(room).chat(player, p.text);
    });
  }

  private service(room: Room): ChatService {
    let s = this.services.get(room.code);
    if (!s) {
      s = new ChatService(room, room.deps.words);
      this.services.set(room.code, s);
    }
    return s;
  }
}

export class ModerationHandler extends Handler {
  register(): void {
    const { ctx } = this;
    on(ctx, 'kick_player', { schema: kickSchema }, (p) => {
      const { room, player } = ctx.current();
      room.moderation.kick(player, p.playerId, !!p.ban);
    });
    on(ctx, 'votekick', { schema: votekickSchema }, (p) => {
      const { room, player } = ctx.current();
      room.moderation.voteKick(player, p.targetId);
    });
    on(ctx, 'report_player', { schema: reportSchema }, (p) => {
      const { room, player } = ctx.current();
      room.moderation.report(player, p.targetId, p.reason, p.details);
    });
  }
}
