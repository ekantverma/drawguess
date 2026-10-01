'use client';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useRecentGames } from '@/lib/api';

const dur = (ms: number) => `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;

export default function HistoryPage() {
  const q = useRecentGames();
  return (
    <div className="mx-auto max-w-3xl p-3 sm:p-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </header>
      <h1 className="mb-1 text-3xl font-extrabold sm:text-4xl">Recent games</h1>
      <p className="mb-6 text-muted-foreground">
        {q.data?.persisted
          ? 'Saved in MongoDB.'
          : 'Stored in server memory (connect MongoDB to keep them across restarts).'}
      </p>
      {q.isLoading && <p role="status">Loading games…</p>}
      {q.error && (
        <p
          role="alert"
          className="rounded-md border-2 border-destructive bg-destructive/10 p-3 font-semibold text-destructive"
        >
          {(q.error as Error).message}
        </p>
      )}
      {q.data && q.data.games.length === 0 && (
        <div className="chunk p-8 text-center">
          <p className="font-bold">No finished games yet.</p>
          <Button asChild className="mt-3">
            <Link href="/create-room">Play the first one</Link>
          </Button>
        </div>
      )}
      <ul className="space-y-3">
        {q.data?.games.map((g) => (
          <li key={g.id}>
            <details className="chunk group p-4">
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
                <Trophy className="size-5" />
                <span className="font-extrabold">
                  {g.winner ? `${g.winner.name} won` : 'No winner'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {g.roomName} · {g.participants.length} players · {g.roundsPlayed} rounds ·{' '}
                  {dur(g.durationMs)}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(g.endedAt).toLocaleString()}
                </span>
              </summary>
              <ol className="mt-3 space-y-1">
                {g.finalScores.map((e) => (
                  <li key={e.playerId} className="flex items-center gap-2 text-sm">
                    <span className="w-5 font-display font-extrabold">{e.rank}</span>
                    <Avatar avatar={e.avatar} className="size-7" />
                    <span className="flex-1 truncate font-bold">{e.name}</span>
                    <span className="font-display font-extrabold tabular-nums">{e.score}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs font-bold text-muted-foreground">
                Words:{' '}
                <span className="font-medium capitalize">
                  {g.turns.map((t) => t.word || '-').join(', ')}
                </span>
              </p>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
