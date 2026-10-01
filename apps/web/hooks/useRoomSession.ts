'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AvatarConfig, JoinedData } from '@drawguess/shared';
import { gameCanvas } from '@/lib/canvas';
import {
  clearSession,
  loadProfile,
  loadSession,
  randomAvatar,
  saveProfile,
  saveSession,
} from '@/lib/profile';
import { getSocket, request, RequestError } from '@/lib/socket';
import { useGameStore } from '@/stores/gameStore';
import type { SessionError, SessionStatus } from '@/types';

export interface Identity {
  name: string;
  avatar: AvatarConfig;
  spectate?: boolean;
}

/**
 * Binds this tab to a room: joins with the saved token (reconnect-safe), re-joins automatically after
 * a socket reconnect, and exposes join()/leave() for the identity form and leave buttons.
 */
export function useRoomSession(code: string) {
  const connection = useGameStore((s) => s.connection);
  const room = useGameStore((s) => s.room);
  const kicked = useGameStore((s) => s.kicked);
  const replaced = useGameStore((s) => s.replaced);
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [error, setError] = useState<SessionError | null>(null);
  const joining = useRef(false);
  const wasDown = useRef(false);

  const doJoin = useCallback(
    async (identity: Identity | null) => {
      if (joining.current) return;
      joining.current = true;
      setStatus('joining');
      setError(null);
      try {
        const sess = loadSession(code);
        const prof = loadProfile();
        const name = identity?.name ?? prof?.name ?? 'Player';
        const avatar = identity?.avatar ?? prof?.avatar ?? randomAvatar();
        if (useGameStore.getState().room?.code !== code) {
          useGameStore.getState().resetRoom();
          gameCanvas.clear();
        }
        const data = await request<JoinedData>('join_room', {
          roomCode: code,
          playerName: name,
          avatar,
          playerToken: sess?.token,
          spectate: identity?.spectate,
        });
        if (identity) saveProfile({ name: identity.name, avatar: identity.avatar });
        saveSession(code, { token: data.playerToken, playerId: data.playerId });
        useGameStore.getState().applyState(data.state);
        wasDown.current = false;
        setStatus('joined');
      } catch (e) {
        const err = e as RequestError;
        if (err.code === 'ROOM_NOT_FOUND') clearSession(code);
        setError({ code: err.code ?? 'ERROR', message: err.message });
        setStatus(err.code === 'ROOM_FULL' && !identity?.spectate ? 'needs-identity' : 'error');
      } finally {
        joining.current = false;
      }
    },
    [code],
  );

  useEffect(() => {
    getSocket(); // make sure the socket exists and is connecting
  }, []);

  useEffect(() => {
    if (connection !== 'connected') {
      if (status === 'joined') wasDown.current = true;
      return;
    }
    if (kicked || replaced) return;
    if (room?.code === code && !wasDown.current && status !== 'idle') return;
    if (room?.code === code && !wasDown.current && status === 'idle') {
      setStatus('joined');
      return;
    }
    if (!loadSession(code)) {
      setStatus('needs-identity');
      return;
    }
    void doJoin(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, code, kicked, replaced]);

  const leave = useCallback(async () => {
    try {
      await request('leave_room');
    } catch {
      /* already gone */
    }
    clearSession(code);
    gameCanvas.clear();
    useGameStore.getState().resetRoom();
    setStatus('idle');
  }, [code]);

  return {
    status,
    error,
    connection,
    room: room?.code === code ? room : null,
    join: doJoin,
    leave,
    kicked,
    replaced,
  };
}
