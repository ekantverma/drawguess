'use client';
import { useState } from 'react';
import { LogOut } from 'lucide-react';
import type { RoomState } from '@drawguess/shared';
import { LogoMark } from '@/components/Logo';
import { CopyButton } from '@/components/CopyButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConnectionBadge } from './ConnectionBadge';
import { GameSoundToggle } from './GameSoundToggle';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/stores/gameStore';

export function TopBar({ room, onLeave }: { room: RoomState; onLeave: () => void }) {
  const timeLeft = useGameStore((s) => s.timeLeft);
  const [confirm, setConfirm] = useState(false);
  const g = room.game;
  const me = room.players.find((p) => p.id === room.you.playerId);
  const drawer = room.players.find((p) => p.id === g?.drawerId);
  const status =
    room.phase === 'WORD_SELECTION'
      ? me?.isDrawer
        ? "You're choosing a word"
        : `${drawer?.name ?? '…'} is choosing`
      : room.phase === 'DRAWING'
        ? me?.isDrawer
          ? "You're drawing"
          : room.you.role === 'spectator'
            ? 'Spectating'
            : me?.guessed
              ? 'Solved!'
              : `${drawer?.name ?? ''} is drawing`
        : room.phase === 'ROUND_END'
          ? 'Round over'
          : 'Final results';
  const timed = room.phase === 'DRAWING' || room.phase === 'WORD_SELECTION';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <header className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border-2 border-border bg-card px-2 py-2 shadow-chunk-sm sm:px-3 lg:flex lg:flex-nowrap">
      <LogoMark className="hidden size-8 lg:block" />
      <span className="hidden lg:inline-flex">
        <CopyButton
          size="sm"
          variant="outline"
          value={`${origin}/room/${room.code}`}
          label="Invite link"
          aria-label={`Copy invite link for room ${room.code}`}
        >
          <span className="font-mono tracking-widest">{room.code}</span>
        </CopyButton>
      </span>
      <span className="inline-flex lg:hidden"><ConnectionBadge /></span>
      {g && room.phase !== 'GAME_OVER' && (
        <span className="min-w-0 truncate text-center text-xs font-bold sm:text-sm lg:text-left" aria-label="Round progress">
          Round {g.round}/{g.totalRounds}
        </span>
      )}
      <span className="hidden text-sm font-semibold text-muted-foreground lg:inline">{status}</span>
      <div className="ml-auto flex items-center gap-2">
        {timed && (
          <span
            role="timer"
            aria-label={`${timeLeft} seconds left`}
            className={cn(
              'min-w-14 shrink-0 rounded-md border-2 border-border bg-secondary px-2 py-1 text-center font-display text-xl font-extrabold tabular-nums',
              timeLeft <= 10 && 'animate-wiggle bg-destructive text-destructive-foreground',
            )}
          >
            {timeLeft}
          </span>
        )}
        <span className="hidden lg:inline-flex"><ConnectionBadge /></span>
        <span className="hidden lg:inline-flex"><GameSoundToggle /></span>
        <span className="hidden lg:inline-flex"><ThemeToggle /></span>
        <Button variant="outline" size="sm" onClick={() => setConfirm(true)}>
          <LogOut /> Leave
        </Button>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle>Leave this game?</DialogTitle>
          <DialogDescription>
            Your score stays on the board, but you won&apos;t be able to rejoin your seat.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Stay</Button>
            </DialogClose>
            <Button variant="destructive" onClick={onLeave}>
              Leave game
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
