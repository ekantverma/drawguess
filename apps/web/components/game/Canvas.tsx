'use client';
import dynamic from 'next/dynamic';

/** Konva needs the browser, so the canvas is client-only. */
export const Canvas = dynamic(() => import('./DrawingCanvas'), {
  ssr: false,
  loading: () => (
    <div
      className="aspect-[4/3] w-full animate-pulse rounded-md border-2 border-border bg-muted"
      aria-label="Loading canvas"
    />
  ),
});
