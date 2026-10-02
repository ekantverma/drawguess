import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
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

function waitConnected(s: AppSocket): Promise<void> {
  if (s.connected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const noticeId = 'socket-connection-slow';
    const noticeTimer = setTimeout(() => {
      toast.info('Connection is taking longer than usual. Still trying…', { id: noticeId });
    }, 8000);
    const timeout = setTimeout(() => {
      s.off('connect', onConnect);
      toast.dismiss(noticeId);
      reject(
        new RequestError(
          'OFFLINE',
          "Couldn't connect. Check your connection and try again.",
        ),
      );
    }, 15000);
    const onConnect = () => {
      clearTimeout(noticeTimer);
      clearTimeout(timeout);
      toast.dismiss(noticeId);
      resolve();
    };
    s.once('connect', onConnect);
    s.connect();
  });
}

/** Emit an event with an acknowledgement, as a promise. Rejects with RequestError(code, message). */
export async function request<T = undefined>(
  event: keyof ClientToServerEvents,
  payload?: unknown,
): Promise<T> {
  const s = getSocket();
  await waitConnected(s);
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
