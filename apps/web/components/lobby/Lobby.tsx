'use client';
import { useState } from 'react';
import { Check, LogOut, Play, Users } from 'lucide-react';
import { toast } from 'sonner';
import { LANGUAGES, type RoomSettings, type RoomState } from '@drawguess/shared';
import { ConnectionBadge } from '@/components/game/ConnectionBadge';
import { PlayerList } from '@/components/game/PlayerList';
import { CopyButton } from '@/components/CopyButton';
import { Logo } from '@/components/Logo';
import { SettingsForm, toInput } from '@/components/SettingsForm';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { request } from '@/lib/socket';

function Summary({ s }: { s: RoomSettings }) {
  const rows: [string, string][] = [
    ['Max players', String(s.maxPlayers)],
    ['Rounds', String(s.rounds)],
    ['Drawing time', `${s.drawTime}s`],
    ['Word choices', String(s.wordCount)],
    ['Hints', s.hints ? String(s.hints) : 'Off'],
    ['Word mode', s.wordMode],
    ['Language', LANGUAGES.find((l) => l.code === s.language)?.label ?? s.language],
    ['Categories', s.categories.length ? s.categories.join(', ') : 'All'],
    [
      'Custom words',
      s.customWords.length
        ? `${s.customWords.length}${s.customWordsOnly ? ' (only these)' : ''}`
        : 'None',
    ],
    ['Visibility', s.isPublic ? 'Public' : 'Private'],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-bold text-muted-foreground">{k}</dt>
          <dd className="font-extrabold capitalize">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Lobby({ room, onLeave }: { room: RoomState; onLeave: () => void }) {
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const me = room.players.find((p) => p.id === room.you.playerId);
  const players = room.players.filter((p) => p.role === 'player');
  const connectedPlayers = players.filter((p) => p.connected).length;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const link = `${origin}/room/${room.code}`;
  const canStart = room.you.isHost && connectedPlayers >= 2;

  const start = async () => {
    setStarting(true);
    try {
      await request('start_game');
    } catch (e) {
      toast.error((e as Error).message);
      setStarting(false);
    }
  };
  const save = async (s: RoomSettings) => {
    setSaving(true);
    try {
      await request('update_settings', s);
      toast.success('Settings saved');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const toggleReady = async () => {
    try {
      await request('player_ready', { ready: !me?.ready });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-3 sm:p-6">
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <Logo />
        <div className="ml-auto flex items-center gap-2">
          <ConnectionBadge />
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={onLeave}>
            <LogOut /> Leave
          </Button>
        </div>
      </header>

      <section className="chunk mb-5 flex flex-wrap items-center gap-4 bg-secondary p-4 text-secondary-foreground">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-extrabold sm:text-3xl">{room.settings.roomName}</h1>
          <p className="text-sm font-semibold opacity-80">
            Share the code or the link. Friends can join until the game starts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-md border-2 border-border bg-card px-3 py-1.5 font-mono text-2xl font-extrabold tracking-[0.3em] text-card-foreground"
            aria-label={`Room code ${room.code.split('').join(' ')}`}
          >
            {room.code}
          </span>
          <CopyButton value={room.code} label="Room code" variant="outline">
            Code
          </CopyButton>
          <CopyButton value={link} label="Invite link" variant="default">
            Invite link
          </CopyButton>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="chunk space-y-4 p-4" aria-labelledby="players-h">
          <div className="flex items-center justify-between">
            <h2 id="players-h" className="flex items-center gap-2 text-lg font-extrabold">
              <Users className="size-5" /> Players
            </h2>
            <Badge>
              {players.length}/{room.settings.maxPlayers}
            </Badge>
          </div>
          <PlayerList mode="lobby" />
          <div className="space-y-2 border-t-2 border-dashed border-border/40 pt-4">
            {room.you.role === 'player' && !room.you.isHost && (
              <Button
                variant={me?.ready ? 'secondary' : 'outline'}
                className="w-full"
                onClick={toggleReady}
                aria-pressed={!!me?.ready}
              >
                <Check /> {me?.ready ? "I'm ready" : 'Mark me ready'}
              </Button>
            )}
            {room.you.isHost ? (
              <>
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!canStart || starting}
                  onClick={start}
                >
                  <Play /> {starting ? 'Starting…' : 'Start game'}
                </Button>
                {!canStart && (
                  <p className="text-center text-xs font-semibold text-muted-foreground">
                    You need at least 2 connected players to start.
                  </p>
                )}
              </>
            ) : (
              <p className="text-center text-sm font-semibold text-muted-foreground" role="status">
                {room.you.role === 'spectator'
                  ? "You're watching. You'll see the game when the host starts it."
                  : 'Waiting for the host to start the game…'}
              </p>
            )}
          </div>
        </section>

        <section className="chunk p-4" aria-labelledby="settings-h">
          <h2 id="settings-h" className="mb-3 text-lg font-extrabold">
            {room.you.isHost ? 'Room settings' : 'Settings (set by the host)'}
          </h2>
          {room.you.isHost ? (
            <SettingsForm
              key={JSON.stringify(room.settings)}
              compact
              initial={toInput(room.settings)}
              submitLabel="Save settings"
              busy={saving}
              onSubmit={save}
            />
          ) : (
            <Summary s={room.settings} />
          )}
        </section>
      </div>
    </div>
  );
}
