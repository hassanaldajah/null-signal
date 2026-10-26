import { create } from 'zustand';
import type { AppId } from '../engine/schema';

export interface WindowState {
  id: AppId;
  z: number;
  minimized: boolean;
  maximized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WindowStore {
  windows: WindowState[];
  topZ: number;
  open: (id: AppId, size: { width: number; height: number }) => void;
  close: (id: AppId) => void;
  focus: (id: AppId) => void;
  toggleMinimize: (id: AppId) => void;
  toggleMaximize: (id: AppId) => void;
  setRect: (id: AppId, rect: Partial<Pick<WindowState, 'x' | 'y' | 'width' | 'height'>>) => void;
  reset: () => void;
}

const TASKBAR = 52;

export const useWindows = create<WindowStore>()((set, get) => ({
  windows: [],
  topZ: 10,

  open: (id, size) => {
    const existing = get().windows.find((w) => w.id === id);
    const z = get().topZ + 1;
    if (existing) {
      set((state) => ({
        topZ: z,
        windows: state.windows.map((w) => (w.id === id ? { ...w, minimized: false, z } : w)),
      }));
      return;
    }
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight - TASKBAR;
    const width = Math.min(size.width, viewportW - 24);
    const height = Math.min(size.height, viewportH - 24);
    const cascade = (get().windows.length % 6) * 28;
    set((state) => ({
      topZ: z,
      windows: [
        ...state.windows,
        {
          id,
          z,
          minimized: false,
          maximized: viewportW < 760,
          x: Math.max(12, (viewportW - width) / 2 - 80 + cascade),
          y: Math.max(12, (viewportH - height) / 2 - 40 + cascade),
          width,
          height,
        },
      ],
    }));
  },

  close: (id) => set((state) => ({ windows: state.windows.filter((w) => w.id !== id) })),

  focus: (id) => {
    const target = get().windows.find((w) => w.id === id);
    if (!target || target.z === get().topZ) return;
    const z = get().topZ + 1;
    set((state) => ({ topZ: z, windows: state.windows.map((w) => (w.id === id ? { ...w, z } : w)) }));
  },

  toggleMinimize: (id) =>
    set((state) => ({ windows: state.windows.map((w) => (w.id === id ? { ...w, minimized: !w.minimized } : w)) })),

  toggleMaximize: (id) =>
    set((state) => ({ windows: state.windows.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w)) })),

  setRect: (id, rect) =>
    set((state) => ({ windows: state.windows.map((w) => (w.id === id ? { ...w, ...rect } : w)) })),

  reset: () => set({ windows: [], topZ: 10 }),
}));
