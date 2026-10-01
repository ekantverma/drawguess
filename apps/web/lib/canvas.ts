import { CanvasController } from './canvasController';

/** The single controller for the live game canvas (socket events write here; <DrawingCanvas> renders it). */
export const gameCanvas = new CanvasController();
