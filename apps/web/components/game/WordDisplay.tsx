'use client';
import { EyeOff } from 'lucide-react';
import type { RoomState } from '@drawguess/shared';
import { cn } from '@/lib/utils';

export function WordDisplay({ room, className }: { room: RoomState; className?: string }) {
  const g = room.game;
  if (!g) return null;
  const me = room.players.find((p) => p.id === room.you.playerId);
  const drawer = room.players.find((p) => p.id === g.drawerId);

  let label = '';
  let letters: string | null = null;
  let note = '';

  if (room.phase === 'WORD_SELECTION') {
    label = me?.isDrawer
      ? 'Pick a word to draw'
      : `${drawer?.name ?? 'The drawer'} is picking a word`;
  } else if (room.phase === 'DRAWING') {
    if (g.word) {
      label = 'Draw this';
      letters = g.word;
    } else if (room.settings.wordMode === 'hidden') {
      label = 'Hidden word';
      note = 'No blanks this time. Watch the drawing.';
    } else {
      label = me?.guessed ? 'You solved it' : 'Guess the word';
      letters = g.hint;
      note = `${g.wordLength} letters`;
    }
  } else if (room.phase === 'ROUND_END' && g.roundEnd) {
    label = 'The word was';
    letters = g.roundEnd.word || '(no word chosen)';
  }

  return (
    <div
      className={cn(
        'flex min-h-14 flex-col items-center justify-center gap-0.5 text-center',
        className,
      )}
      aria-live="polite"
    >
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      {letters !== null && (
        <div
          className="flex flex-wrap justify-center gap-x-1 gap-y-0.5 font-display text-2xl font-extrabold sm:text-3xl"
          aria-label={g.word ? g.word : `Hint: ${letters.replace(/_/g, 'blank ')}`}
        >
          {[...letters].map((ch, i) =>
            ch === ' ' ? (
              <span key={i} className="w-3" />
            ) : (
              <span
                key={i}
                className={cn(
                  'inline-block min-w-[1.1ch] border-b-4 border-foreground text-center',
                  ch === '_' && 'text-transparent',
                )}
              >
                {ch === '_' ? '0' : ch.toUpperCase()}
              </span>
            ),
          )}
        </div>
      )}
      {note && (
        <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          {room.settings.wordMode === 'hidden' && <EyeOff className="size-3" />}
          {note}
        </span>
      )}
    </div>
  );
}
