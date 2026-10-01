'use client';
import { useRef, useState } from 'react';
import { Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const COLORS = ['#1d1b4b', '#ef476f', '#3a5bf0', '#06a77d'];
interface P {
  color: string;
  d: string;
}

/** A real, local-only sketch pad for the landing page: try the feel before you create a room. */
export function DoodlePad() {
  const [paths, setPaths] = useState<P[]>([]);
  const [color, setColor] = useState(COLORS[1]);
  const drawing = useRef(false);
  const svg = useRef<SVGSVGElement>(null);

  const pt = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return `${Math.round(((e.clientX - r.left) / r.width) * 400)} ${Math.round(((e.clientY - r.top) / r.height) * 300)}`;
  };
  const down = (e: React.PointerEvent) => {
    drawing.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setPaths((p) => [...p, { color, d: `M${pt(e)} L${pt(e)}` }]);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    setPaths((p) => p.map((x, i) => (i === p.length - 1 ? { ...x, d: `${x.d} L${pt(e)}` } : x)));
  };

  return (
    <figure className="relative mx-auto w-full max-w-md rotate-[1.5deg]">
      <span
        aria-hidden
        className="absolute -top-3 left-1/2 z-10 h-6 w-24 -translate-x-1/2 -rotate-3 rounded-sm border-2 border-border bg-secondary/80"
      />
      <div className="chunk paper-dots p-3 pt-5">
        <svg
          ref={svg}
          viewBox="0 0 400 300"
          className="touch-none-canvas aspect-[4/3] w-full cursor-crosshair rounded-md border-2 border-border bg-white"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={() => (drawing.current = false)}
          onPointerLeave={() => (drawing.current = false)}
          role="img"
          aria-label="Doodle pad. Draw with your mouse or finger."
        >
          {paths.length === 0 && (
            <text
              x="200"
              y="155"
              textAnchor="middle"
              className="fill-muted-foreground font-display text-2xl font-extrabold"
              opacity="0.5"
            >
              Draw a cat. Go on.
            </text>
          )}
          {paths.map((p, i) => (
            <path
              key={i}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
        <figcaption className="mt-3 flex items-center justify-between gap-2">
          <div className="flex gap-1.5" role="group" aria-label="Pen color">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Pen color ${c}`}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className={cn(
                  'size-7 rounded-full border-2 border-border',
                  color === c && 'ring-2 ring-ring ring-offset-2 ring-offset-card',
                )}
                style={{ background: c }}
              />
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => setPaths([])}>
            <Eraser /> Wipe
          </Button>
        </figcaption>
      </div>
    </figure>
  );
}
