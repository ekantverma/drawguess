'use client';
import { useEffect } from 'react';
import { Eraser, Paintbrush, PaintBucket, Pencil, Trash2, Undo2 } from 'lucide-react';
import { CANVAS } from '@drawguess/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
      <div className="flex gap-1" role="group" aria-label="Tool palette">
        <Button
          size="icon"
          variant={tool === 'brush' ? 'default' : 'outline'}
          onClick={() => setTool('brush')}
          aria-label="Brush tool"
          aria-pressed={tool === 'brush'}
          title="Brush"
        >
          <Paintbrush className="size-4" />
        </Button>
        <Button
          size="icon"
          variant={tool === 'marker' ? 'default' : 'outline'}
          onClick={() => setTool('marker')}
          aria-label="Marker tool"
          aria-pressed={tool === 'marker'}
          title="Marker"
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          size="icon"
          variant={tool === 'eraser' ? 'default' : 'outline'}
          onClick={() => setTool('eraser')}
          aria-label="Eraser tool"
          aria-pressed={tool === 'eraser'}
          title="Eraser"
        >
          <Eraser className="size-4" />
        </Button>
        <Button
          size="icon"
          variant={tool === 'fill' ? 'default' : 'outline'}
          onClick={() => setTool('fill')}
          aria-label="Fill tool"
          aria-pressed={tool === 'fill'}
          title="Fill"
        >
          <PaintBucket className="size-4" />
        </Button>
      </div>

      <div role="group" aria-label="Colors">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-2 px-2.5"
              aria-label="Choose color"
              title="Choose color"
            >
              <span
                aria-hidden="true"
                className="size-5 rounded-full border-2 border-border"
                style={{ background: color }}
              />
              Color
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="grid min-w-0 grid-cols-4 gap-1.5 p-2"
            aria-label="Color palette"
          >
            <DropdownMenuLabel className="col-span-4">Choose a color</DropdownMenuLabel>
            {CANVAS.colors.map((c) => (
              <DropdownMenuItem
                key={c}
                onSelect={() => setColor(c)}
                role="menuitemradio"
                aria-checked={color === c}
                aria-label={`Choose color ${c}`}
                title={c}
                className="grid size-9 place-items-center p-0"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-5 rounded-full border-2 border-border',
                    color === c && 'ring-2 ring-ring ring-offset-1 ring-offset-card',
                  )}
                  style={{ background: c }}
                />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
