'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Ban,
  Check,
  Crown,
  Eye,
  Flag,
  MoreVertical,
  Pencil,
  UserX,
  Vote,
  WifiOff,
} from 'lucide-react';
import { REPORT_REASONS, reportSchema, type PublicPlayer } from '@drawguess/shared';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NativeSelect, Textarea } from '@/components/ui/input';
import { FieldError, Label } from '@/components/ui/label';
import { request } from '@/lib/socket';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/stores/gameStore';

const act = async (
  event: 'kick_player' | 'votekick' | 'report_player',
  payload: object,
  ok: string,
) => {
  try {
    await request(event, payload);
    toast.success(ok);
  } catch (e) {
    toast.error((e as Error).message);
  }
};

// the target comes from the menu, not from a form field
const reportFormSchema = reportSchema.omit({ targetId: true });
type ReportForm = z.input<typeof reportFormSchema>;

function ReportDialog({ target, onClose }: { target: PublicPlayer | null; onClose: () => void }) {
  const form = useForm<ReportForm>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: { reason: 'cheating', details: '' },
  });
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle>Report {target?.name}</DialogTitle>
        <DialogDescription>
          The host is notified, and the report is logged for moderation.
        </DialogDescription>
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit(async (v) => {
            await act(
              'report_player',
              { targetId: target!.id, reason: v.reason, details: v.details },
              'Report sent',
            );
            form.reset();
            onClose();
          })}
        >
          <div>
            <Label htmlFor="reason">Reason</Label>
            <NativeSelect id="reason" className="mt-1.5 capitalize" {...form.register('reason')}>
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="details">Details (optional)</Label>
            <Textarea
              id="details"
              className="mt-1.5"
              maxLength={200}
              {...form.register('details')}
            />
            <FieldError message={form.formState.errors.details?.message as string | undefined} />
          </div>
          <Button
            type="submit"
            variant="destructive"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            <Flag /> Send report
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PlayerList({ mode, className }: { mode: 'lobby' | 'game'; className?: string }) {
  const room = useGameStore((s) => s.room);
  const votekicks = useGameStore((s) => s.votekicks);
  const reports = useGameStore((s) => s.reports);
  const [reportTarget, setReportTarget] = useState<PublicPlayer | null>(null);
  if (!room) return null;

  const meId = room.you.playerId;
  const isHost = room.you.isHost;
  const iAmPlayer = room.you.role === 'player';
  const players = room.players.filter((p) => p.role === 'player');
  const spectators = room.players.filter((p) => p.role === 'spectator');
  const ordered = mode === 'game' ? [...players].sort((a, b) => b.score - a.score) : players;

  const row = (p: PublicPlayer) => {
    const isMe = p.id === meId;
    return (
      <li
        key={p.id}
        className={cn(
          'flex items-center gap-2 rounded-md border-2 px-2 py-1.5',
          p.isDrawer ? 'border-border bg-secondary/50' : 'border-transparent hover:bg-muted',
          !p.connected && 'opacity-55',
        )}
      >
        <Avatar avatar={p.avatar} className="size-9" title={p.name} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="flex items-center gap-1 truncate text-sm font-extrabold">
            <span className="truncate">{p.name}</span>
            {p.isHost && (
              <Crown className="size-3.5 shrink-0 text-secondary-foreground" aria-label="Host" />
            )}
            {isMe && <span className="text-xs font-semibold text-muted-foreground">(you)</span>}
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {!p.connected ? (
              <>
                <WifiOff className="size-3" /> reconnecting…
              </>
            ) : mode === 'game' ? (
              p.isDrawer ? (
                <>
                  <Pencil className="size-3" /> drawing
                </>
              ) : p.guessed ? (
                <span className="flex items-center gap-1 font-bold text-success">
                  <Check className="size-3" /> solved
                </span>
              ) : (
                'guessing'
              )
            ) : p.ready ? (
              <span className="font-bold text-success">Ready</span>
            ) : (
              'Not ready'
            )}
          </p>
        </div>
        {mode === 'game' && (
          <span className="font-display text-base font-extrabold tabular-nums">{p.score}</span>
        )}
        {!isMe && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={`Actions for ${p.name}`}
              >
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {iAmPlayer && !p.isHost && p.role === 'player' && (
                <DropdownMenuItem
                  onSelect={() => void act('votekick', { targetId: p.id }, 'Vote cast')}
                >
                  <Vote /> Vote to kick
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => setReportTarget(p)}>
                <Flag /> Report
              </DropdownMenuItem>
              {isHost && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    destructive
                    onSelect={() =>
                      void act('kick_player', { playerId: p.id }, `${p.name} was kicked`)
                    }
                  >
                    <UserX /> Kick
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    destructive
                    onSelect={() =>
                      void act('kick_player', { playerId: p.id, ban: true }, `${p.name} was banned`)
                    }
                  >
                    <Ban /> Ban from room
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </li>
    );
  };

  return (
    <div className={cn('flex min-h-0 flex-col gap-2', className)}>
      {Object.values(votekicks).map((v) => (
        <div
          key={v.targetId}
          className="flex items-center justify-between gap-2 rounded-md border-2 border-border bg-accent/30 px-2 py-1.5 text-xs font-bold"
        >
          <span>
            Kick {v.targetName}? {v.votes}/{v.needed} votes
          </span>
          {iAmPlayer && v.targetId !== meId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void act('votekick', { targetId: v.targetId }, 'Vote cast')}
            >
              Vote
            </Button>
          )}
        </div>
      ))}
      {isHost && reports.length > 0 && (
        <details className="rounded-md border-2 border-border bg-card px-2 py-1.5 text-xs">
          <summary className="cursor-pointer font-bold">
            <Flag className="mr-1 inline size-3" />
            {reports.length} report{reports.length > 1 ? 's' : ''} (host only)
          </summary>
          <ul className="mt-1 space-y-1">
            {reports.map((r) => (
              <li key={r.id}>
                <b>{r.reporterName}</b> → <b>{r.targetName}</b>: {r.reason}
                {r.details ? ` - ${r.details}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
      <ul className="min-h-0 space-y-1 overflow-y-auto" aria-label="Players">
        {ordered.map(row)}
      </ul>
      {spectators.length > 0 && (
        <div>
          <p className="mb-1 flex items-center gap-1 text-xs font-bold text-muted-foreground">
            <Eye className="size-3" /> Spectating ({spectators.length})
          </p>
          <ul className="space-y-1">{spectators.map(row)}</ul>
        </div>
      )}
      <ReportDialog target={reportTarget} onClose={() => setReportTarget(null)} />
      {mode === 'lobby' && players.length === 0 && <Badge>No players</Badge>}
    </div>
  );
}
