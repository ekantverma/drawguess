import type { Socket } from 'socket.io';
import type { ZodTypeAny, z } from 'zod';
import { GameError } from '../game/errors';
import type { Player } from '../game/Player';
import type { Room } from '../game/Room';
import type { RoomRegistry } from '../game/RoomRegistry';
import type { ChatService } from '../game/ChatService';
import { TokenBucket } from '../utils/TokenBucket';

export type BucketName = 'room' | 'chat' | 'draw' | 'default';
const BUCKETS: Record<BucketName, [number, number]> = {
  room: [6, 0.5],
  chat: [5, 1.5],
  draw: [250, 120],
  default: [20, 6],
};

/** Per-socket state: which room/player this socket is bound to + rate limiters. */
export class ConnectionContext {
  roomCode?: string;
  playerId?: string;
  private buckets = new Map<BucketName, TokenBucket>();
  private chatServices = new Map<string, ChatService>();

  constructor(
    readonly socket: Socket,
    readonly ip: string,
    readonly userId: string | undefined,
    readonly registry: RoomRegistry,
  ) {}

  allow(name: BucketName, cost = 1): boolean {
    let b = this.buckets.get(name);
    if (!b) {
      const [cap, refill] = BUCKETS[name];
      b = new TokenBucket(cap, refill);
      this.buckets.set(name, b);
    }
    return b.take(cost);
  }

  /** Resolve the room + player this socket belongs to. Identity comes from the server, never the client. */
  current(): { room: Room; player: Player } {
    const room = this.roomCode ? this.registry.get(this.roomCode) : undefined;
    const player = room && this.playerId ? room.players.get(this.playerId) : undefined;
    if (!room || !player || player.socketId !== this.socket.id) {
      throw new GameError('NOT_IN_ROOM', 'You are not in a room');
    }
    return { room, player };
  }

  bind(room: Room, player: Player): void {
    this.roomCode = room.code;
    this.playerId = player.id;
  }
  unbind(): void {
    this.roomCode = undefined;
    this.playerId = undefined;
  }
}

type Handler<S extends ZodTypeAny | null> = (
  input: S extends ZodTypeAny ? z.infer<S> : undefined,
) => unknown;

/**
 * Register a socket event with: rate limiting, zod validation, optional ack, uniform error handling.
 * `quiet` events (drawing) never ack; failures only emit a room_error for real rule violations.
 */
export function on<S extends ZodTypeAny | null>(
  ctx: ConnectionContext,
  event: string,
  opts: { schema: S; bucket?: BucketName; quiet?: boolean },
  fn: Handler<S>,
): void {
  ctx.socket.on(event, async (...args: unknown[]) => {
    const ackFn =
      typeof args[args.length - 1] === 'function'
        ? (args.pop() as (r: unknown) => void)
        : undefined;
    const raw = args[0];
    const fail = (code: string, message: string) => {
      if (ackFn) ackFn({ ok: false, error: { code, message } });
      else ctx.socket.emit('room_error', { code, message });
    };
    try {
      if (!ctx.allow(opts.bucket ?? 'default')) {
        if (!opts.quiet) fail('RATE_LIMITED', 'Slow down a little.');
        return;
      }
      let input: unknown = undefined;
      if (opts.schema) {
        const parsed = opts.schema.safeParse(raw);
        if (!parsed.success) {
          return fail('INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Invalid input');
        }
        input = parsed.data;
      }
      const data = await fn(input as never);
      if (ackFn) ackFn(data === undefined ? { ok: true } : { ok: true, data });
    } catch (err) {
      if (err instanceof GameError) return fail(err.code, err.message);
      console.error(`[socket:${event}]`, err);
      fail('INTERNAL', 'Something went wrong');
    }
  });
}
