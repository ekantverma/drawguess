import { create } from 'zustand';
import { CANVAS } from '@drawguess/shared';

interface ToolStore {
  tool: 'brush' | 'eraser';
  color: string;
  size: number;
  setTool: (t: 'brush' | 'eraser') => void;
  setColor: (c: string) => void;
  setSize: (s: number) => void;
}

export const useToolStore = create<ToolStore>((set) => ({
  tool: 'brush',
  color: CANVAS.colors[0],
  size: CANVAS.sizes[1],
  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color, tool: 'brush' }),
  setSize: (size) => set({ size }),
}));
