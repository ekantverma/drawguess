import type { ServerToClientEvents } from '@drawguess/shared';

type S2C = ServerToClientEvents;
export type Payload<E extends keyof S2C> = Parameters<S2C[E]>[0];

/** Domain code talks to this interface, never to Socket.IO directly (keeps game logic testable). */
export interface Transport {
  emitToSocket<E extends keyof S2C>(socketId: string, event: E, payload: Payload<E>): void;
  emitToRoom<E extends keyof S2C>(code: string, event: E, payload: Payload<E>): void;
  emitToRoomExcept<E extends keyof S2C>(
    code: string,
    exceptSocketId: string | null,
    event: E,
    payload: Payload<E>,
  ): void;
  join(socketId: string, code: string): void;
  leave(socketId: string, code: string): void;
}
