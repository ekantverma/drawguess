'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Film, History, LogOut, RotateCcw, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import type { RoomState } from '@drawguess/shared';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { request } from '@/lib/socket';
import { cn } from '@/lib/utils';
import { ReplayDialog } from './ReplayDialog';

export function GameOver({ room, onLeave }: { room: RoomState; onLeave: () => void }) {
  const result = room.game?.result;
  const [replay, setReplay] = useState<{ open: boolean; turn?: number }>({ open: false });
  if (!result) return null;
  const top = result.leaderboard.slice(0, 3);
  const tied = result.leaderboard.filter((e) => e.rank === 1 && e.score > 0);
  const title = result.winner
    ? `${result.winner.name} wins!`
    : tied.length > 1
      ? `It's a tie: ${tied.map((e) => e.name).join(' & ')}`
      : 'Nobody scored this time';
  const elapsedSeconds = Math.floor(result.durationMs / 1000);
  const elapsedTime = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')}`;
  const podium = [top[1], top[0], top[2]].filter(Boolean);
  const heights = { 1: 'h-28', 2: 'h-20', 3: 'h-14' } as Record<number, string>;
  const tone = { 1: 'bg-secondary', 2: 'bg-muted', 3: 'bg-accent/50' } as Record<number, string>;
  const again = async () => {
    try {
      await request('play_again');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="chunk p-6 text-center">
        <Trophy className="mx-auto size-8" />
        <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
        <p role="timer" aria-label={`Game time ${elapsedTime}`} className="mt-1 text-sm font-semibold text-muted-foreground">
          Game time {elapsedTime}
        </p>
        {result.endReason === 'not_enough_players' && (
          <p className="mt-1 text-sm text-muted-foreground">
            The game ended early because too many players left.
          </p>
        )}
        <div className="mt-6 flex items-end justify-center gap-3">
          {podium.map((e) => (
            <div key={e.playerId} className="flex w-24 flex-col items-center sm:w-28">
              <Avatar avatar={e.avatar} className="size-14" title={e.name} />
              <p className="max-w-full truncate text-sm font-extrabold">{e.name}</p>
              <p className="font-display font-extrabold tabular-nums">{e.score}</p>
              <div
                className={cn(
                  'mt-1 grid w-full place-items-center rounded-t-md border-2 border-border font-display text-2xl font-extrabold',
                  heights[e.rank] ?? 'h-10',
                  tone[e.rank] ?? 'bg-muted',
                )}
              >
                {e.rank}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="chunk p-4">
        <h2 className="mb-2 text-lg font-extrabold">Final leaderboard</h2>
        <ol className="space-y-1">
          {result.leaderboard.map((e) => (
            <li
              key={e.playerId}
              className="flex items-center gap-3 rounded-md px-2 py-1.5 odd:bg-muted/60"
            >
              <span className="w-6 text-center font-display font-extrabold">{e.rank}</span>
              <Avatar avatar={e.avatar} className="size-8" title={e.name} />
              <span className="flex-1 truncate font-bold">
                {e.name}
                {e.left && (
                  <span className="ml-1 text-xs font-medium text-muted-foreground">(left)</span>
                )}
              </span>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {e.correctGuesses} correct
              </span>
              <span className="w-16 text-right font-display font-extrabold tabular-nums">
                {e.score}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="chunk p-4">
        <h2 className="mb-2 text-lg font-extrabold">Turn by turn</h2>
        <ul className="divide-y divide-border/20">
          {result.turns.map((t) => (
            <li key={t.turn} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <span className="w-14 font-bold text-muted-foreground">Turn {t.turn + 1}</span>
              <span className="font-extrabold capitalize">{t.word || '-'}</span>
              <span className="text-muted-foreground">drawn by {t.drawerName}</span>
              <span className="text-xs text-muted-foreground">
                {t.gains.filter((g) => g.playerId !== t.drawerId).length} solved
              </span>
              {room.game?.replayTurns.includes(t.turn) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => setReplay({ open: true, turn: t.turn })}
                >
                  <Film /> Replay
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap justify-center gap-3">
        {room.you.isHost ? (
          <Button size="lg" onClick={again}>
            <RotateCcw /> Play again
          </Button>
        ) : (
          <p className="self-center text-sm font-semibold text-muted-foreground">
            Waiting for the host to start another game…
          </p>
        )}
        <Button size="lg" variant="outline" asChild>
          <Link href="/history">
            <History /> Game history
          </Link>
        </Button>
        <Button size="lg" variant="outline" onClick={onLeave}>
          <LogOut /> Leave
        </Button>
      </div>
      <ReplayDialog
        open={replay.open}
        onOpenChange={(o) => setReplay((r) => ({ ...r, open: o }))}
        turn={replay.turn}
      />
    </div>
  );
}
