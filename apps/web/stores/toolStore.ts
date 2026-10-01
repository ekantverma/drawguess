import { create } from 'zustand';
import { CANVAS } from '@drawguess/shared';

type ToolMode = 'brush' | 'marker' | 'eraser' | 'fill';

interface ToolStore {
  tool: ToolMode;
  color: string;
  size: number;
  setTool: (t: ToolMode) => void;
  setColor: (c: string) => void;
  setSize: (s: number) => void;
}

export const useToolStore = create<ToolStore>((set) => ({
  tool: 'brush',
  color: CANVAS.colors[0],
  size: CANVAS.sizes[1],
  setTool: (tool) => set({ tool }),
  setColor: (color) => set((state) => ({ color, tool: state.tool === 'fill' ? 'fill' : state.tool === 'marker' ? 'marker' : 'brush' })),
  setSize: (size) => set({ size }),
}));
