import type { Stroke } from '@drawguess/shared';
import type { CanvasController } from './canvasController';

export interface TimelineItem {
  stroke: Stroke;
  start: number;
  dur: number;
}

/** Order strokes by time, squeeze long idle gaps, and give every stroke a visible minimum duration. */
export function buildTimeline(strokes: Stroke[], maxGap = 450): TimelineItem[] {
  const sorted = [...strokes].sort((a, b) => a.t - b.t);
  const out: TimelineItem[] = [];
  let cursor = 0;
  let prevEnd = 0;
  for (const s of sorted) {
    const gap = Math.min(Math.max(0, s.t - prevEnd), maxGap);
    const start = cursor + gap;
    const dur = Math.max(120, Math.min(s.dur, 4000));
    out.push({ stroke: s, start, dur });
    cursor = start + dur;
    prevEnd = s.t + s.dur;
  }
  return out;
}

export function timelineLength(items: TimelineItem[]): number {
  const last = items[items.length - 1];
  return last ? last.start + last.dur : 0;
}

/** Plays a recorded round into its OWN CanvasController, so the live game canvas is never touched. */
export class ReplayPlayer {
  private raf = 0;
  private startedAt = 0;
  private items: TimelineItem[] = [];
  private revealed = new Map<string, number>(); // strokeId -> points already drawn (pairs*2)
  speed = 1;

  constructor(
    private controller: CanvasController,
    private onProgress?: (fraction: number) => void,
    private onDone?: () => void,
  ) {}

  play(strokes: Stroke[], speed = 1): void {
    this.stop();
    this.speed = speed;
    this.items = buildTimeline(strokes);
    this.revealed.clear();
    this.controller.clear();
    const total = timelineLength(this.items);
    if (total === 0) return this.onDone?.();
    this.startedAt = performance.now();
    const step = () => {
      const elapsed = (performance.now() - this.startedAt) * this.speed;
      this.renderAt(elapsed);
      this.onProgress?.(Math.min(1, elapsed / total));
      if (elapsed >= total) {
        this.raf = 0;
        this.onDone?.();
      } else {
        this.raf = requestAnimationFrame(step);
      }
    };
    this.raf = requestAnimationFrame(step);
  }

  /** Deterministic renderer (also used in tests): draw the state of the timeline at `elapsed` ms. */
  renderAt(elapsed: number): void {
    for (const { stroke, start, dur } of this.items) {
      if (elapsed < start) continue;
      const total = stroke.points.length;
      const frac = Math.min(1, (elapsed - start) / dur);
      const want = Math.max(2, Math.ceil((total / 2) * frac) * 2);
      const have = this.revealed.get(stroke.id) ?? 0;
      if (have === 0) {
        this.controller.start({ ...stroke, points: stroke.points.slice(0, want) });
      } else if (want > have) {
        this.controller.append(stroke.id, stroke.points.slice(have, want));
      }
      this.revealed.set(stroke.id, Math.max(have, want));
    }
  }

  stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
