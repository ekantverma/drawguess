'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Globe2, Loader2 } from 'lucide-react';
import { LIMITS, roomCodeSchema, type JoinedData, type AvatarConfig } from '@drawguess/shared';
import { IdentityForm } from '@/components/IdentityForm';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePublicRooms, useRoomLookup } from '@/lib/api';
import { gameCanvas } from '@/lib/canvas';
import { saveProfile, saveSession } from '@/lib/profile';
import { request } from '@/lib/socket';
import { useGameStore } from '@/stores/gameStore';

function JoinInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState(
    (params.get('code') ?? '').toUpperCase().slice(0, LIMITS.roomCodeLength),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = roomCodeSchema.safeParse(code).success;
  const lookup = useRoomLookup(code, valid);
  const pub = usePublicRooms();
  const info = lookup.data;
  const notFound = valid && info && !info.exists;

  useEffect(() => setError(''), [code]);

  const join = async (v: { name: string; avatar: AvatarConfig; spectate: boolean }) => {
    if (!valid) return setError('Enter the 6-character room code first.');
    setBusy(true);
    setError('');
    try {
      // Reset first: the server sends the canvas snapshot + chat history *before* the ack.
      useGameStore.getState().resetRoom();
      gameCanvas.clear();
      const data = await request<JoinedData>('join_room', {
        roomCode: code,
        playerName: v.name,
        avatar: v.avatar,
        spectate: v.spectate, // explicit choice only; mid-game joiners are made spectators by the server and promoted next lobby
      });
      saveProfile({ name: v.name, avatar: v.avatar });
      saveSession(code, { token: data.playerToken, playerId: data.playerId });
      useGameStore.getState().applyState(data.state);
      router.push(data.state.phase === 'LOBBY' ? `/room/${code}` : `/game/${code}`);
    } catch (e) {
      const err = e as Error & { code?: string };
      setError(
        err.code === 'ROOM_FULL'
          ? 'This room is full. Use "Just watch" to join as a spectator.'
          : err.message,
      );
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-3 sm:p-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </header>
      <h1 className="mb-1 text-3xl font-extrabold sm:text-4xl">Join a room</h1>
      <p className="mb-6 text-muted-foreground">
        Got a code from a friend? Type it in. Or hop into a public room.
      </p>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="chunk space-y-4 p-4">
          <div>
            <Label htmlFor="code">Room code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '')
                    .slice(0, LIMITS.roomCodeLength),
                )
              }
              className="mt-1.5 h-14 text-center font-mono text-3xl font-extrabold tracking-[0.4em]"
              placeholder="ABC123"
              autoComplete="off"
              autoCapitalize="characters"
              aria-describedby="code-status"
              aria-invalid={!!notFound}
            />
            <p
              id="code-status"
              className="mt-2 flex min-h-5 items-center gap-1.5 text-sm font-semibold"
              role="status"
            >
              {valid && lookup.isLoading && (
                <>
                  <Loader2 className="size-4 animate-spin" /> Looking for that room…
                </>
              )}
              {valid && lookup.error && (
                <span className="text-destructive">
                  <AlertCircle className="mr-1 inline size-4" />
                  {(lookup.error as Error).message}
                </span>
              )}
              {notFound && (
                <span className="text-destructive">
                  <AlertCircle className="mr-1 inline size-4" />
                  No room with that code. Check it and try again.
                </span>
              )}
              {info?.exists && !info.full && !info.inProgress && (
                <span className="text-success">
                  <CheckCircle2 className="mr-1 inline size-4" />“{info.roomName}” · {info.players}/
                  {info.maxPlayers} players
                </span>
              )}
              {info?.exists && info.full && (
                <span className="text-destructive">
                  <AlertCircle className="mr-1 inline size-4" />“{info.roomName}” is full. You can
                  still watch.
                </span>
              )}
              {info?.exists && info.inProgress && (
                <span>
                  <AlertCircle className="mr-1 inline size-4" />“{info.roomName}” is mid-game.
                  You'll join as a spectator.
                </span>
              )}
            </p>
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-md border-2 border-destructive bg-destructive/10 p-2 text-sm font-semibold text-destructive"
            >
              {error}
            </p>
          )}
          <IdentityForm
            submitLabel={info?.inProgress ? 'Join as spectator' : 'Join room'}
            allowSpectate={!info?.inProgress}
            busy={busy || !!notFound}
            onSubmit={join}
          />
        </section>
        <aside className="chunk h-fit p-4" aria-labelledby="pub-h">
          <h2 id="pub-h" className="mb-2 flex items-center gap-2 text-lg font-extrabold">
            <Globe2 className="size-5" /> Public rooms
          </h2>
          {pub.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {pub.error && <p className="text-sm text-destructive">{(pub.error as Error).message}</p>}
          {pub.data && pub.data.rooms.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No public rooms right now.{' '}
              <Link href="/create-room" className="font-bold underline">
                Start one
              </Link>{' '}
              and tick &ldquo;Public room&rdquo;.
            </p>
          )}
          <ul className="space-y-2">
            {pub.data?.rooms.map((r) => (
              <li key={r.code}>
                <button
                  type="button"
                  onClick={() => setCode(r.code)}
                  className="w-full rounded-md border-2 border-border bg-card p-2 text-left hover:bg-muted"
                >
                  <span className="block truncate font-extrabold">{r.roomName}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{r.code}</span> · {r.players}/{r.maxPlayers}
                    {r.phase !== 'LOBBY' && <Badge variant="secondary">in game</Badge>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinInner />
    </Suspense>
  );
}
