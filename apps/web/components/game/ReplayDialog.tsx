'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import type { ReplayData } from '@drawguess/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { NativeSelect } from '@/components/ui/input';
import { CanvasController } from '@/lib/canvasController';
import { ReplayPlayer } from '@/lib/replay';
import { request } from '@/lib/socket';
import { useGameStore } from '@/stores/gameStore';
import { Canvas } from './Canvas';

/**
 * Replays a finished turn on its OWN canvas controller + Konva stage.
 * The live game canvas and the server's active round are never touched.
 */
export function ReplayDialog({
  open,
  onOpenChange,
  turn: initial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  turn?: number;
}) {
  const turns = useGameStore((s) => s.room?.game?.replayTurns ?? []);
  const controller = useMemo(() => new CanvasController(), [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const player = useRef<ReplayPlayer | null>(null);
  const [turn, setTurn] = useState<number | undefined>(initial);
  const [data, setData] = useState<ReplayData | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (open) setTurn(initial);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setData(null);
    setError('');
    request<ReplayData>('request_replay', { turn })
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [open, turn]);

  const play = (d: ReplayData | null = data, sp = speed) => {
    if (!d) return;
    player.current?.stop();
    player.current = new ReplayPlayer(controller, setProgress);
    player.current.play(d.strokes, sp);
  };

  useEffect(() => {
    play(data);
    return () => player.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogTitle>Round replay</DialogTitle>
        <DialogDescription>
          {data ? (
            <>
              Drawn by <b>{data.drawerName}</b>. The word was{' '}
              <b className="capitalize">{data.word}</b>.
            </>
          ) : (
            error || 'Loading replay…'
          )}
        </DialogDescription>
        <Canvas controller={controller} canDraw={false} />
        <div
          className="h-2 overflow-hidden rounded-full border-2 border-border bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
        >
          <div className="h-full bg-primary" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => play()} disabled={!data}>
            <Play /> Play again
          </Button>
          {[1, 2, 4].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={speed === s ? 'secondary' : 'outline'}
              onClick={() => {
                setSpeed(s);
                play(data, s);
              }}
            >
              {s}x
            </Button>
          ))}
          {turns.length > 1 && (
            <NativeSelect
              className="ml-auto h-9 w-auto"
              value={turn ?? turns[turns.length - 1]}
              onChange={(e) => setTurn(Number(e.target.value))}
              aria-label="Choose turn"
            >
              {turns.map((t) => (
                <option key={t} value={t}>
                  Turn {t + 1}
                </option>
              ))}
            </NativeSelect>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
