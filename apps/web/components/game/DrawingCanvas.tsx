'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Konva from 'konva';
import { Layer, Rect, Stage } from 'react-konva';
import { CANVAS, type Stroke } from '@drawguess/shared';
import type { CanvasController } from '@/lib/canvasController';
import { getSocket } from '@/lib/socket';
import { useToolStore } from '@/stores/toolStore';
import { cn } from '@/lib/utils';

const FLUSH_MS = 40;
const MIN_STEP = 0.0015; // normalised distance; drops near-duplicate points
let strokeCounter = 0;

/**
 * Konva stage. The drawer's own strokes are rendered locally and immediately (no network round trip);
 * points are buffered in a ref and flushed to the server in ~40ms batches. Remote strokes arrive through
 * the shared CanvasController. Nothing here re-renders per point.
 */
export default function DrawingCanvas({
  controller,
  canDraw,
  playerId,
  className,
}: {
  controller: CanvasController;
  canDraw: boolean;
  playerId?: string;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setWidth(Math.max(240, Math.floor(entry.contentRect.width))),
    );
    ro.observe(el);
    setWidth(Math.max(240, Math.floor(el.clientWidth)));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    controller.attach(layer, Konva);
    return () => controller.detach();
  }, [controller]);

  const scale = width / CANVAS.width;
  const height = Math.round(CANVAS.height * scale);

  // ----- drawer input -----
  const live = useRef<{
    id: string;
    pending: number[];
    timer: ReturnType<typeof setInterval>;
    last: [number, number];
  } | null>(null);
  const sizeRef = useRef({ width, height });
  sizeRef.current = { width, height };

  const flush = () => {
    const l = live.current;
    if (!l || l.pending.length === 0) return;
    const socket = getSocket();
    for (let i = 0; i < l.pending.length; i += 400)
      socket.emit('draw_move', { id: l.id, points: l.pending.slice(i, i + 400) });
    l.pending = [];
  };
  const finish = () => {
    const l = live.current;
    if (!l) return;
    flush();
    clearInterval(l.timer);
    getSocket().emit('draw_end', { id: l.id });
    live.current = null;
  };

  useEffect(() => {
    if (!canDraw) finish();
    const up = () => finish();
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      finish();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDraw]);

  const norm = (stage: Konva.Stage): [number, number] | null => {
    const p = stage.getPointerPosition();
    if (!p) return null;
    const { width: w, height: h } = sizeRef.current;
    return [Math.min(1, Math.max(0, p.x / w)), Math.min(1, Math.max(0, p.y / h))];
  };

  const down = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (!canDraw || live.current) return;
    const { tool, color, size } = useToolStore.getState();
    if (tool === 'fill') {
      controller.fill(color);
      return;
    }
    const pos = norm(e.target.getStage()!);
    if (!pos) return;
    const id = `${(playerId ?? 'p').slice(0, 8)}-${Date.now().toString(36)}-${strokeCounter++}`;
    const stroke: Stroke = {
      id,
      playerId: playerId ?? '',
      points: [pos[0], pos[1]],
      color,
      width: size,
      tool: tool === 'marker' ? 'marker' : tool === 'eraser' ? 'eraser' : 'brush',
      timestamp: Date.now(),
      t: 0,
      dur: 0,
    };
    controller.start(stroke);
    getSocket().emit('draw_start', {
      id,
      x: pos[0],
      y: pos[1],
      color,
      width: size,
      tool: stroke.tool,
    });
    live.current = { id, pending: [], timer: setInterval(flush, FLUSH_MS), last: pos };
  };

  const move = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const l = live.current;
    if (!l || !canDraw) return;
    const pos = norm(e.target.getStage()!);
    if (!pos) return;
    if (Math.hypot(pos[0] - l.last[0], pos[1] - l.last[1]) < MIN_STEP) return;
    l.last = pos;
    controller.append(l.id, [pos[0], pos[1]]);
    l.pending.push(pos[0], pos[1]);
  };

  const bg = useMemo(
    () => (
      <Rect
        x={0}
        y={0}
        width={CANVAS.width}
        height={CANVAS.height}
        fill="#ffffff"
        listening={false}
      />
    ),
    [],
  );

  return (
    <div
      ref={wrapRef}
      className={cn(
        'touch-none-canvas w-full overflow-hidden rounded-md border-2 border-border bg-white',
        canDraw && 'cursor-crosshair',
        className,
      )}
      style={{ height }}
    >
      <Stage
        width={width}
        height={height}
        scaleX={scale}
        scaleY={scale}
        onPointerDown={down}
        onPointerMove={move}
      >
        <Layer listening={false}>{bg}</Layer>
        <Layer ref={layerRef} listening={false} />
      </Stage>
    </div>
  );
}
