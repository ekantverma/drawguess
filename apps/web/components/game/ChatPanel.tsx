'use client';
import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { LIMITS, type ChatMessage } from '@drawguess/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { request } from '@/lib/socket';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/stores/gameStore';

function Line({ m }: { m: ChatMessage }) {
  if (m.kind === 'system')
    return <li className="px-1 text-xs italic text-muted-foreground">{m.text}</li>;
  if (m.kind === 'correct')
    return (
      <li className="rounded-md bg-success/15 px-2 py-1 text-sm font-bold text-success">
        {m.text}
      </li>
    );
  if (m.kind === 'close')
    return <li className="rounded-md bg-secondary/40 px-2 py-1 text-sm font-bold">{m.text}</li>;
  return (
    <li
      className={cn(
        'break-words px-1 text-sm',
        m.channel !== 'all' && 'rounded-md bg-muted px-2 py-1',
      )}
    >
      {m.channel === 'guessers' && (
        <span className="mr-1 text-[10px] font-extrabold uppercase text-success">solved</span>
      )}
      {m.channel === 'spectators' && (
        <span className="mr-1 text-[10px] font-extrabold uppercase text-accent-foreground">
          spectators
        </span>
      )}
      <span className="font-extrabold">{m.playerName}: </span>
      <span>{m.text}</span>
    </li>
  );
}

export function ChatPanel({ className }: { className?: string }) {
  const chat = useGameStore((s) => s.chat);
  const room = useGameStore((s) => s.room);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [chat]);

  const me = room?.players.find((p) => p.id === room.you.playerId);
  const phase = room?.phase;
  const isDrawer = !!me?.isDrawer;
  const canGuess =
    !!me &&
    me.id === room?.you.playerId &&
    me.role === 'player' &&
    phase === 'DRAWING' &&
    !isDrawer &&
    !me.guessed;
  const placeholder =
    me?.role === 'spectator'
      ? 'Chat with other spectators'
      : isDrawer && phase === 'DRAWING'
        ? "You're drawing (don't type the word!)"
        : canGuess
          ? 'Type your guess…'
          : me?.guessed && phase === 'DRAWING'
            ? 'You solved it! Chat with other solvers'
            : 'Say something nice';

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await request(canGuess ? 'guess' : 'chat', { text: t });
      setText('');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <ul
        ref={listRef}
        aria-live="polite"
        aria-label="Chat"
        className="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-md border-2 border-border bg-card p-2"
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
      >
        {chat.length === 0 && (
          <li className="p-2 text-sm text-muted-foreground">No messages yet. Say hi!</li>
        )}
        {chat.map((m) => (
          <Line key={m.id} m={m} />
        ))}
      </ul>
      <form onSubmit={send} className="mt-2 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={LIMITS.chatLength}
          placeholder={placeholder}
          aria-label="Message"
          autoComplete="off"
        />
        <Button type="submit" size="icon" disabled={sending || !text.trim()} aria-label="Send">
          <Send />
        </Button>
      </form>
    </div>
  );
}
