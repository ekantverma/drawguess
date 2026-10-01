'use client';
import { useQuery } from '@tanstack/react-query';
import type { HistoryRecord, PublicRoomInfo, RoomLookup } from '@drawguess/shared';
import { API_URL } from './env';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError('OFFLINE', "Can't reach the game server. Is it running?");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new ApiError(body?.error?.code ?? 'ERROR', body?.error?.message ?? 'Request failed');
  return body as T;
}

export const useRoomLookup = (code: string, enabled: boolean) =>
  useQuery({
    queryKey: ['room', code],
    queryFn: () => api<RoomLookup>(`/api/rooms/${code}`),
    enabled,
    retry: false,
    staleTime: 0,
  });

export const usePublicRooms = () =>
  useQuery({
    queryKey: ['public-rooms'],
    queryFn: () => api<{ rooms: PublicRoomInfo[] }>('/api/rooms/public'),
    refetchInterval: 5000,
    retry: 1,
  });

export const useRecentGames = () =>
  useQuery({
    queryKey: ['history'],
    queryFn: () =>
      api<{ games: HistoryRecord[]; persisted: boolean }>('/api/history/recent?limit=20'),
    retry: 1,
  });

export interface Me {
  user: {
    id: string;
    username: string;
    email: string;
    stats: { gamesPlayed: number; gamesWon: number; correctGuesses: number; totalPoints: number };
  } | null;
  dbEnabled: boolean;
}
export const useMe = () =>
  useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/api/auth/me'), retry: false });
