import { io, type Socket } from 'socket.io-client';
import type { Ack, ClientToServerEvents, ServerToClientEvents } from '@drawguess/shared';
import { SOCKET_URL } from './env';
import { bindSocketEvents } from './socketBinder';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/** One socket for the whole tab, so state survives client-side navigation between pages. */
export function getSocket(): AppSocket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnectionDelayMax: 4000,
    }) as AppSocket;
    bindSocketEvents(socket);
  }
  return socket;
}

export class RequestError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

function waitConnected(s: AppSocket, ms: number): Promise<void> {
  if (s.connected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new RequestError('OFFLINE', "Can't reach the game server. Is it running?")),
      ms,
    );
    s.once('connect', () => {
      clearTimeout(t);
      resolve();
    });
    s.connect();
  });
}

/** Emit an event with an acknowledgement, as a promise. Rejects with RequestError(code, message). */
export async function request<T = undefined>(
  event: keyof ClientToServerEvents,
  payload?: unknown,
): Promise<T> {
  const s = getSocket();
  await waitConnected(s, 8000);
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new RequestError('TIMEOUT', 'The server took too long to answer.')),
      10000,
    );
    (s as unknown as { emit: (...a: unknown[]) => void }).emit(
      event,
      payload ?? {},
      (res: Ack<T>) => {
        clearTimeout(t);
        if (res.ok) resolve((res as { data: T }).data);
        else reject(new RequestError(res.error.code, res.error.message));
      },
    );
  });
}
