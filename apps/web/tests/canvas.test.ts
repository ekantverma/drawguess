import { describe, expect, it } from 'vitest';
import type { Stroke } from '@drawguess/shared';
import { CanvasController } from '@/lib/canvasController';
import { floodFillSpans } from '@/lib/floodFill';
import { buildTimeline, ReplayPlayer, timelineLength } from '@/lib/replay';

const stroke = (id: string, over: Partial<Stroke> = {}): Stroke => ({
  id,
  playerId: 'p',
  points: [0.1, 0.1],
  color: '#000000',
  width: 6,
  tool: 'brush',
  timestamp: 0,
  t: 0,
  dur: 0,
  ...over,
});

describe('CanvasController (stroke data model)', () => {
  it('starts, appends and keeps drawing order', () => {
    const c = new CanvasController();
    c.start(stroke('a'));
    c.append('a', [0.2, 0.2, 0.3, 0.3]);
    c.start(stroke('b', { points: [0.5, 0.5] }));
    expect(c.strokes.map((s) => s.id)).toEqual(['a', 'b']);
    expect(c.strokes[0].points).toEqual([0.1, 0.1, 0.2, 0.2, 0.3, 0.3]);
  });
  it('ignores a duplicate start (same stroke delivered twice)', () => {
    const c = new CanvasController();
    c.start(stroke('a'));
    c.start(stroke('a'));
    expect(c.strokes).toHaveLength(1);
  });
  it('undo removes the last stroke, or a specific one, without corrupting the rest', () => {
    const c = new CanvasController();
    ['a', 'b', 'c'].forEach((id) => c.start(stroke(id)));
    expect(c.undo()?.id).toBe('c');
    expect(c.undo('a')?.id).toBe('a');
    expect(c.strokes.map((s) => s.id)).toEqual(['b']);
    expect(c.undo('missing')).toBeUndefined();
    expect(c.strokes).toHaveLength(1);
  });
  it('clear empties; load replaces with a deep copy (snapshot for late joiners)', () => {
    const c = new CanvasController();
    c.start(stroke('a'));
    const snap = [stroke('x', { points: [0.4, 0.4, 0.5, 0.5] })];
    c.load(snap);
    snap[0].points.push(9, 9);
    expect(c.strokes).toHaveLength(1);
    expect(c.strokes[0].points).toEqual([0.4, 0.4, 0.5, 0.5]);
    c.clear();
    expect(c.strokes).toHaveLength(0);
  });
  it('append to an unknown stroke is a no-op', () => {
    const c = new CanvasController();
    c.append('nope', [0.1, 0.1]);
    expect(c.strokes).toHaveLength(0);
  });
});

describe('floodFillSpans', () => {
  it('fills a closed region without crossing its outline', () => {
    const width = 9;
    const height = 9;
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) pixels.set([255, 255, 255, 255], i * 4);
    for (let i = 1; i < 8; i++) {
      pixels.set([0, 0, 0, 255], (1 * width + i) * 4);
      pixels.set([0, 0, 0, 255], (7 * width + i) * 4);
      pixels.set([0, 0, 0, 255], (i * width + 1) * 4);
      pixels.set([0, 0, 0, 255], (i * width + 7) * 4);
    }

    const spans = floodFillSpans(pixels, width, height, 4, 4)!;
    expect(spans).toHaveLength(5 * 4);
    expect(spans[0]).toBeCloseTo(2 / width);
    expect(spans[2]).toBeCloseTo(7 / width);
    expect(spans.some((_, i) => i % 4 === 0 && spans[i] < 2 / width)).toBe(false);
  });

  it('stops when the connected region exceeds the stroke point limit', () => {
    const pixels = new Uint8ClampedArray(4 * 4 * 4).fill(255);
    expect(floodFillSpans(pixels, 4, 4, 1, 1, 36, 4)).toBeNull();
  });
});

describe('replay timeline', () => {
  it('orders by time, squeezes long idle gaps and gives short strokes a minimum duration', () => {
    const items = buildTimeline([
      stroke('late', { t: 60_000, dur: 500 }),
      stroke('first', { t: 1000, dur: 10 }),
    ]);
    expect(items.map((i) => i.stroke.id)).toEqual(['first', 'late']);
    expect(items[0].dur).toBe(120);
    expect(items[1].start - (items[0].start + items[0].dur)).toBeLessThanOrEqual(450);
    expect(timelineLength(items)).toBe(items[1].start + items[1].dur);
  });
  it('renders progressively into its own controller (never the live one)', () => {
    const live = new CanvasController();
    live.start(stroke('live'));
    const replayCtl = new CanvasController();
    const player = new ReplayPlayer(replayCtl);
    const s = stroke('r', { points: [0, 0, 0.1, 0.1, 0.2, 0.2, 0.3, 0.3], t: 0, dur: 400 });
    (player as unknown as { items: unknown }).items = buildTimeline([s]);
    player.renderAt(0);
    expect(replayCtl.strokes[0].points.length).toBe(2);
    player.renderAt(10_000);
    expect(replayCtl.strokes[0].points).toEqual(s.points);
    expect(live.strokes.map((x) => x.id)).toEqual(['live']);
  });
});
