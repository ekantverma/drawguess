import type { Server, Socket } from 'socket.io';
import { verifyToken } from '../services/AuthService';
import { COOKIE_NAME } from '../services/AuthService';
import type { RoomRegistry } from '../game/RoomRegistry';
import { ConnectionContext } from './ConnectionContext';
import { ChatHandler, DrawHandler, GameHandler, ModerationHandler, RoomHandler } from './handlers';

function cookieOf(header: string | undefined, name: string): string | undefined {
  return header
    ?.split(';')
    .map((c) => c.trim().split('='))
    .find(([k]) => k === name)?.[1];
}

/** Wires every connection to its handler classes. */
export class SocketGateway {
  constructor(
    private io: Server,
    private registry: RoomRegistry,
  ) {}

  start(): void {
    this.io.on('connection', (socket: Socket) => {
      const fwd = socket.handshake.headers['x-forwarded-for'];
      const ip =
        (typeof fwd === 'string' ? fwd.split(',')[0].trim() : socket.handshake.address) ||
        'unknown';
      const userId = verifyToken(cookieOf(socket.handshake.headers.cookie, COOKIE_NAME));
      const ctx = new ConnectionContext(socket, ip, userId, this.registry);
      [RoomHandler, GameHandler, DrawHandler, ChatHandler, ModerationHandler].forEach((H) =>
        new H(ctx, this.registry).register(),
      );
    });
  }
}
