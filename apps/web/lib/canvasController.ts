import type Konva from 'konva';
import { CANVAS, type Stroke } from '@drawguess/shared';

type KonvaLib = typeof Konva;

/**
 * Owns the stroke list (structured data, normalised 0..1) and mirrors it onto a Konva layer.
 * High-frequency updates mutate Konva nodes directly and call batchDraw(), so React never re-renders per point.
 * Works without a layer too (pure data), which is how it is unit-tested.
 */
export class CanvasController {
  strokes: Stroke[] = [];
  private layer: Konva.Layer | null = null;
  private K: KonvaLib | null = null;
  private nodes = new Map<string, Konva.Line>();
  private fillNode: Konva.Rect | null = null;
  private backgroundColor = '#ffffff';

  attach(layer: Konva.Layer, K: KonvaLib): void {
    this.layer = layer;
    this.K = K;
    this.rebuild();
  }

  detach(): void {
    this.nodes.forEach((n) => n.destroy());
    this.fillNode?.destroy();
    this.fillNode = null;
    this.nodes.clear();
    this.layer = null;
  }

  private static virtual(points: number[]): number[] {
    const out: number[] = new Array(points.length);
    for (let i = 0; i < points.length; i += 2) {
      out[i] = points[i] * CANVAS.width;
      out[i + 1] = points[i + 1] * CANVAS.height;
    }
    // a lone tap becomes a dot: zero-length lines are not drawn reliably
    if (out.length === 2) out.push(out[0] + 0.01, out[1]);
    return out;
  }

  private makeNode(s: Stroke): Konva.Line | null {
    if (!this.K || !this.layer) return null;
    const marker = s.tool === 'marker';
    const node = new this.K.Line({
      points: CanvasController.virtual(s.points),
      stroke: s.color,
      strokeWidth: s.width,
      lineCap: 'round',
      lineJoin: 'round',
      tension: s.tool === 'eraser' ? 0 : 0.35,
      globalCompositeOperation: s.tool === 'eraser' ? 'destination-out' : 'source-over',
      opacity: marker ? 0.45 : 1,
      listening: false,
      perfectDrawEnabled: false,
    });
    this.layer.add(node);
    this.nodes.set(s.id, node);
    return node;
  }

  fill(color: string): void {
    if (!this.K || !this.layer) return;
    this.backgroundColor = color;
    if (this.fillNode) this.fillNode.destroy();
    this.fillNode = new this.K.Rect({
      x: 0,
      y: 0,
      width: CANVAS.width,
      height: CANVAS.height,
      fill: color,
      listening: false,
    });
    this.layer.add(this.fillNode);
    this.layer.batchDraw();
  }

  private rebuild(): void {
    this.nodes.forEach((n) => n.destroy());
    this.nodes.clear();
    if (this.fillNode) this.fillNode.destroy();
    this.fillNode = this.K && this.layer
      ? new this.K.Rect({
          x: 0,
          y: 0,
          width: CANVAS.width,
          height: CANVAS.height,
          fill: this.backgroundColor,
          listening: false,
        })
      : null;
    if (this.fillNode) this.layer?.add(this.fillNode);
    this.strokes.forEach((s) => this.makeNode(s));
    this.layer?.batchDraw();
  }

  /** Replace everything (late join / reconnect snapshot). */
  load(strokes: Stroke[]): void {
    this.strokes = strokes.map((s) => ({ ...s, points: [...s.points] }));
    this.rebuild();
  }

  start(stroke: Stroke): void {
    if (this.nodes.has(stroke.id) || this.strokes.some((s) => s.id === stroke.id)) return;
    this.strokes.push(stroke);
    this.makeNode(stroke);
    this.layer?.batchDraw();
  }

  append(id: string, points: number[]): void {
    const s = this.find(id);
    if (!s || points.length === 0) return;
    for (const p of points) s.points.push(p);
    const node = this.nodes.get(id);
    if (node) {
      const arr = node.points();
      // drop the synthetic dot segment added for single points
      if (s.points.length - points.length === 2) arr.length = 2;
      for (let i = 0; i < points.length; i += 2)
        arr.push(points[i] * CANVAS.width, points[i + 1] * CANVAS.height);
      node.points(arr);
      this.layer?.batchDraw();
    }
  }

  private find(id: string): Stroke | undefined {
    for (let i = this.strokes.length - 1; i >= 0; i--)
      if (this.strokes[i].id === id) return this.strokes[i];
    return undefined;
  }

  /** Remove the given stroke, or the last one. Returns what was removed. */
  undo(id?: string | null): Stroke | undefined {
    const idx = id ? this.strokes.findIndex((s) => s.id === id) : this.strokes.length - 1;
    if (idx < 0) return undefined;
    const [removed] = this.strokes.splice(idx, 1);
    this.nodes.get(removed.id)?.destroy();
    this.nodes.delete(removed.id);
    this.layer?.batchDraw();
    return removed;
  }

  clear(): void {
    this.strokes = [];
    this.backgroundColor = '#ffffff';
    this.nodes.forEach((n) => n.destroy());
    this.nodes.clear();
    if (this.fillNode) this.fillNode.destroy();
    this.fillNode = null;
    this.rebuild();
  }
}
