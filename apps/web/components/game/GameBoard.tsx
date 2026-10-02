'use client';
import { useState } from 'react';
import { MessageSquare, Users } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { gameCanvas } from '@/lib/canvas';
import { useGameStore } from '@/stores/gameStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Canvas } from './Canvas';
import { ChatPanel } from './ChatPanel';
import { GameOver } from './GameOver';
import { ChoosingOverlay, RoundEndOverlay, WordPicker } from './Overlays';
import { PlayerList } from './PlayerList';
import { ReplayDialog } from './ReplayDialog';
import { Toolbar } from './Toolbar';
import { TopBar } from './TopBar';
import { WordDisplay } from './WordDisplay';

export function GameBoard({ onLeave }: { onLeave: () => void }) {
  const room = useGameStore((s) => s.room);
  const desktop = useMediaQuery('(min-width: 1024px)');
  const [replay, setReplay] = useState<{ open: boolean; turn?: number }>({ open: false });
  if (!room || !room.game) return null;

  const me = room.players.find((p) => p.id === room.you.playerId);
  const isDrawer = !!me?.isDrawer;
  const canDraw = isDrawer && room.phase === 'DRAWING';
  const g = room.game;

  if (room.phase === 'GAME_OVER') {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-3 p-3">
        <TopBar room={room} onLeave={onLeave} />
        <GameOver room={room} onLeave={onLeave} />
      </div>
    );
  }

  return (
    <div
      className={
        desktop
          ? 'mx-auto flex h-dvh w-full max-w-6xl flex-col gap-2 overflow-hidden p-2'
          : 'mx-auto w-full max-w-7xl space-y-3 p-3'
      }
    >
      <TopBar room={room} onLeave={onLeave} />
      <div
        className={
          desktop
            ? 'grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] gap-2'
            : 'grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]'
        }
      >
        <main className={desktop ? 'flex min-h-0 min-w-0 flex-col gap-2' : 'min-w-0 space-y-3'}>
          <WordDisplay
            room={room}
            className="rounded-lg border-2 border-border bg-card px-3 py-2"
          />
          <div
            className={
              desktop ? 'relative flex min-h-0 flex-1 items-center justify-center' : 'relative'
            }
          >
            <Canvas
              controller={gameCanvas}
              canDraw={canDraw}
              playerId={room.you.playerId}
              className={desktop ? 'h-full min-h-0 aspect-auto' : undefined}
            />
            {room.phase === 'WORD_SELECTION' && isDrawer && g.wordOptions && (
              <WordPicker options={g.wordOptions} />
            )}
            {room.phase === 'WORD_SELECTION' && !isDrawer && <ChoosingOverlay room={room} />}
            {room.phase === 'ROUND_END' && (
              <RoundEndOverlay room={room} onReplay={(turn) => setReplay({ open: true, turn })} />
            )}
          </div>
          {canDraw && <Toolbar />}
          {!desktop && (
            <Tabs defaultValue="chat">
              <TabsList>
                <TabsTrigger value="chat">
                  <MessageSquare className="size-4" /> Chat
                </TabsTrigger>
                <TabsTrigger value="players">
                  <Users className="size-4" /> Players ({room.players.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="chat">
                <ChatPanel className="h-72" />
              </TabsContent>
              <TabsContent value="players">
                <PlayerList mode="game" className="max-h-72 overflow-y-auto" />
              </TabsContent>
            </Tabs>
          )}
        </main>
        {desktop && (
          <aside className="flex min-h-0 flex-col gap-2">
            <section className="chunk max-h-[42%] shrink-0 overflow-y-auto p-2">
              <PlayerList mode="game" />
            </section>
            <section className="chunk flex min-h-0 flex-1 flex-col p-2">
              <ChatPanel className="min-h-0 flex-1" />
            </section>
          </aside>
        )}
      </div>
      <ReplayDialog
        open={replay.open}
        onOpenChange={(o) => setReplay((r) => ({ ...r, open: o }))}
        turn={replay.turn}
      />
    </div>
  );
}
