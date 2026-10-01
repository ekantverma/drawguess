'use client';
import { useState } from 'react';
import { Film, Hourglass } from 'lucide-react';
import { toast } from 'sonner';
import type { RoomState } from '@drawguess/shared';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { request } from '@/lib/socket';
import { useGameStore } from '@/stores/gameStore';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="absolute inset-0 z-10 grid place-items-center overflow-y-auto bg-background/85 p-3 backdrop-blur-[2px]">
    <div className="chunk w-full max-w-md animate-pop p-5 text-center">{children}</div>
  </div>
);

export function WordPicker({ options }: { options: string[] }) {
  const timeLeft = useGameStore((s) => s.timeLeft);
  const [busy, setBusy] = useState(false);
  const choose = async (word: string) => {
    setBusy(true);
    try {
      await request('word_chosen', { word });
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <Shell>
      <h2 className="text-2xl font-extrabold">Your turn to draw</h2>
      <p className="mb-3 text-sm text-muted-foreground">Pick a word. Auto-picks in {timeLeft}s.</p>
      <div className="grid gap-2">
        {options.map((w) => (
          <Button
            key={w}
            size="lg"
            variant="secondary"
            disabled={busy}
            onClick={() => choose(w)}
            className="font-display text-lg capitalize"
          >
            {w}
          </Button>
        ))}
      </div>
    </Shell>
  );
}

export function ChoosingOverlay({ room }: { room: RoomState }) {
  const drawer = room.players.find((p) => p.id === room.game?.drawerId);
  return (
    <Shell>
      {drawer && <Avatar avatar={drawer.avatar} className="mx-auto size-16" title={drawer.name} />}
      <h2 className="mt-2 text-xl font-extrabold">
        {drawer?.name ?? 'Someone'} is choosing a word
      </h2>
      <p className="mt-1 flex items-center justify-center gap-1 text-sm text-muted-foreground">
        <Hourglass className="size-4" /> Get your guessing fingers ready
      </p>
    </Shell>
  );
}

export function RoundEndOverlay({
  room,
  onReplay,
}: {
  room: RoomState;
  onReplay: (turn: number) => void;
}) {
  const end = room.game?.roundEnd;
  const timeLeft = useGameStore((s) => s.timeLeft);
  if (!end) return null;
  const reason = {
    all_guessed: 'Everyone got it!',
    time_up: "Time's up!",
    drawer_left: 'The drawer left.',
    skipped: 'Turn skipped.',
  }[end.reason];
  const hasReplay = room.game?.replayTurns.includes(end.turn);
  return (
    <Shell>
      <p className="text-sm font-bold text-muted-foreground">{reason}</p>
      {end.word && (
        <>
          <p className="text-xs font-semibold text-muted-foreground">The word was</p>
          <h2 className="font-display text-3xl font-extrabold capitalize">{end.word}</h2>
        </>
      )}
      <ul className="mx-auto my-3 max-w-xs space-y-1 text-left">
        {end.gains.length === 0 && (
          <li className="text-center text-sm text-muted-foreground">Nobody scored this time.</li>
        )}
        {[...end.gains]
          .sort((a, b) => b.points - a.points)
          .map((g) => (
            <li key={g.playerId} className="flex justify-between text-sm font-bold">
              <span className="truncate">{g.name}</span>
              <span className="text-success">+{g.points}</span>
            </li>
          ))}
      </ul>
      <div className="flex items-center justify-center gap-3">
        {hasReplay && (
          <Button size="sm" variant="outline" onClick={() => onReplay(end.turn)}>
            <Film /> Replay drawing
          </Button>
        )}
        <span className="text-xs font-semibold text-muted-foreground">
          Next turn in {timeLeft}s
        </span>
      </div>
    </Shell>
  );
}
