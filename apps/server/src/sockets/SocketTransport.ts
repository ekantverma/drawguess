import type { Server } from 'socket.io';
import type { Payload, Transport } from '../game/Transport';
import type { ServerToClientEvents } from '@drawguess/shared';

/* eslint-disable @typescript-eslint/no-explicit-any */
export class SocketTransport implements Transport {
  constructor(private io: Server) {}

  emitToSocket<E extends keyof ServerToClientEvents>(
    socketId: string,
    event: E,
    payload: Payload<E>,
  ): void {
    (this.io.to(socketId) as any).emit(event, payload);
  }
  emitToRoom<E extends keyof ServerToClientEvents>(
    code: string,
    event: E,
    payload: Payload<E>,
  ): void {
    (this.io.to(code) as any).emit(event, payload);
  }
  emitToRoomExcept<E extends keyof ServerToClientEvents>(
    code: string,
    except: string | null,
    event: E,
    payload: Payload<E>,
  ): void {
    const target = except ? this.io.to(code).except(except) : this.io.to(code);
    (target as any).emit(event, payload);
  }
  join(socketId: string, code: string): void {
    this.io.sockets.sockets.get(socketId)?.join(code);
  }
  leave(socketId: string, code: string): void {
    this.io.sockets.sockets.get(socketId)?.leave(code);
  }
}
