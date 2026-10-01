'use client';
import { useEffect } from 'react';
import { Brush, Eraser, Trash2, Undo2 } from 'lucide-react';
import { CANVAS } from '@drawguess/shared';
import { Button } from '@/components/ui/button';
import { gameCanvas } from '@/lib/canvas';
import { getSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';
import { useToolStore } from '@/stores/toolStore';

export function Toolbar({ className }: { className?: string }) {
  const { tool, color, size, setTool, setColor, setSize } = useToolStore();

  const undo = () => {
    if (!gameCanvas.undo()) return;
    getSocket().emit('draw_undo', {});
  };
  const clear = () => {
    gameCanvas.clear();
    getSocket().emit('canvas_clear', {});
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'z' &&
        !(e.target instanceof HTMLInputElement)
      ) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border-2 border-border bg-card p-2',
        className,
      )}
      role="toolbar"
      aria-label="Drawing tools"
    >
      <div className="flex gap-1" role="group" aria-label="Colors">
        {CANVAS.colors.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`Color ${c}`}
            aria-pressed={tool === 'brush' && color === c}
            className={cn(
              'size-6 rounded-full border-2 border-border transition-transform hover:scale-110',
              tool === 'brush' &&
                color === c &&
                'scale-110 ring-2 ring-ring ring-offset-1 ring-offset-card',
            )}
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1" role="group" aria-label="Brush size">
        {CANVAS.sizes.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSize(s)}
            aria-label={`Brush size ${s}`}
            aria-pressed={size === s}
            className={cn(
              'grid size-8 place-items-center rounded-md border-2 border-border',
              size === s ? 'bg-secondary' : 'bg-card hover:bg-muted',
            )}
          >
            <span
              className="rounded-full bg-foreground"
              style={{ width: Math.max(4, s * 0.7), height: Math.max(4, s * 0.7) }}
            />
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <Button
          size="icon"
          variant={tool === 'brush' ? 'default' : 'outline'}
          onClick={() => setTool('brush')}
          aria-label="Brush"
          aria-pressed={tool === 'brush'}
        >
          <Brush />
        </Button>
        <Button
          size="icon"
          variant={tool === 'eraser' ? 'default' : 'outline'}
          onClick={() => setTool('eraser')}
          aria-label="Eraser"
          aria-pressed={tool === 'eraser'}
        >
          <Eraser />
        </Button>
        <Button size="icon" variant="outline" onClick={undo} aria-label="Undo last stroke">
          <Undo2 />
        </Button>
        <Button size="icon" variant="outline" onClick={clear} aria-label="Clear canvas">
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}
