'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ban, Loader2, SearchX, WifiOff } from 'lucide-react';
import type { RoomState } from '@drawguess/shared';
import { Logo } from '@/components/Logo';
import { IdentityForm } from '@/components/IdentityForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRoomSession } from '@/hooks/useRoomSession';
import { useRoomLookup } from '@/lib/api';

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-md space-y-5">
        <div className="flex justify-center">
          <Logo />
        </div>
        {children}
      </div>
    </main>
  );
}

function Notice({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="grid size-12 place-items-center rounded-full border-2 border-border bg-muted">
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center gap-2">
        {action ?? (
          <Button asChild>
            <Link href="/">Back home</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** Handles every non-happy state of being in a room, then renders the lobby/game once we are in. */
export function RoomGate({
  code,
  view,
  children,
}: {
  code: string;
  view: 'lobby' | 'game';
  children: (room: RoomState, leave: () => Promise<void>) => React.ReactNode;
}) {
  const router = useRouter();
  const s = useRoomSession(code);
  const needsIdentity = s.status === 'needs-identity';
  const lookup = useRoomLookup(code, needsIdentity || s.status === 'error');
  const phase = s.room?.phase;

  useEffect(() => {
    if (s.status !== 'joined' || !phase) return;
    if (view === 'lobby' && phase !== 'LOBBY') router.replace(`/game/${code}`);
    if (view === 'game' && phase === 'LOBBY') router.replace(`/room/${code}`);
  }, [s.status, phase, view, code, router]);

  const leaveAndGo = async () => {
    await s.leave();
    router.push('/');
  };

  if (s.kicked) {
    return (
      <Centered>
        <Notice
          icon={<Ban />}
          title={s.kicked.banned ? 'You were banned' : 'You were removed'}
          body={s.kicked.reason}
        />
      </Centered>
    );
  }
  if (s.replaced) {
    return (
      <Centered>
        <Notice
          icon={<WifiOff />}
          title="Opened somewhere else"
          body="This room was opened in another tab, which now controls your seat. Close this one or reload to take it back."
          action={<Button onClick={() => location.reload()}>Take it back</Button>}
        />
      </Centered>
    );
  }
  if (s.status === 'error') {
    const notFound = s.error?.code === 'ROOM_NOT_FOUND';
    return (
      <Centered>
        <Notice
          icon={notFound ? <SearchX /> : <Ban />}
          title={
            notFound
              ? 'Room not found'
              : s.error?.code === 'BANNED'
                ? 'You are banned here'
                : "Couldn't join"
          }
          body={
            notFound
              ? 'That code does not match an open room. It may have been closed, or the server restarted and cleared active rooms.'
              : (s.error?.message ?? 'Something went wrong.')
          }
          action={
            <>
              <Button asChild variant="outline">
                <Link href="/join">Enter another code</Link>
              </Button>
              <Button asChild>
                <Link href="/create-room">Create a room</Link>
              </Button>
            </>
          }
        />
      </Centered>
    );
  }
  if (needsIdentity && lookup.data && !lookup.data.exists) {
    return (
      <Centered>
        <Notice
          icon={<SearchX />}
          title="Room not found"
          body="That code does not match an open room. It may have been closed, or the server restarted and cleared active rooms."
          action={
            <>
              <Button asChild variant="outline">
                <Link href="/join">Enter another code</Link>
              </Button>
              <Button asChild>
                <Link href="/create-room">Create a room</Link>
              </Button>
            </>
          }
        />
      </Centered>
    );
  }
  if (needsIdentity) {
    const l = lookup.data;
    return (
      <Centered>
        <Card>
          <CardHeader>
            <CardTitle>Join room {code}</CardTitle>
            <CardDescription>
              {lookup.isLoading
                ? 'Checking the room…'
                : lookup.error
                  ? (lookup.error as Error).message
                  : l && !l.exists
                    ? 'This room does not exist.'
                    : l?.inProgress
                      ? `“${l.roomName}” is mid-game. You can watch as a spectator and play next game.`
                      : l?.full
                        ? `“${l.roomName}” is full. You can still watch as a spectator.`
                        : `You're invited to “${l?.roomName}” (${l?.players}/${l?.maxPlayers} players).`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {s.error && (
              <p
                role="alert"
                className="mb-3 rounded-md border-2 border-destructive bg-destructive/10 p-2 text-sm font-semibold text-destructive"
              >
                {s.error.message}
              </p>
            )}
            <IdentityForm
              submitLabel={l?.inProgress || l?.full ? 'Join as spectator' : 'Join room'}
              allowSpectate={!l?.inProgress}
              busy={s.status === 'joining'}
              onSubmit={(v) => s.join({ name: v.name, avatar: v.avatar, spectate: v.spectate })}
            />
          </CardContent>
        </Card>
      </Centered>
    );
  }
  if (s.status !== 'joined' || !s.room) {
    const offline = s.connection === 'disconnected';
    return (
      <Centered>
        <Notice
          icon={offline ? <WifiOff /> : <Loader2 className="animate-spin" />}
          title={offline ? "Can't reach the game server" : 'Joining room…'}
          body={
            offline
              ? 'Make sure the server is running. We keep retrying automatically.'
              : 'Hang tight, grabbing your seat.'
          }
          action={
            <Button variant="outline" asChild>
              <Link href="/">Back home</Link>
            </Button>
          }
        />
      </Centered>
    );
  }
  if ((view === 'lobby') !== (s.room.phase === 'LOBBY')) {
    return (
      <Centered>
        <Notice
          icon={<Loader2 className="animate-spin" />}
          title="One moment…"
          body="Taking you to the right screen."
          action={<span />}
        />
      </Centered>
    );
  }
  return <>{children(s.room, leaveAndGo)}</>;
}
