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
const GAP = 14;
/** Desktop icon column on the inline-start side. */
const ICONS = 128;
/** Room kept free under the Case File for ECHO and the Guide button. */
const ECHO_SPACE = 196;
const DOCK_MIN_WIDTH = 1100;

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
    let width = Math.min(size.width, viewportW - 24);
    let height = Math.min(size.height, viewportH - 24);
    let x = Math.max(12, (viewportW - width) / 2 - 80 + (get().windows.length % 6) * 28);
    let y = Math.max(12, (viewportH - height) / 2 - 40 + (get().windows.length % 6) * 28);

    // Wide screens: the Case File docks in its own column (above ECHO), tools share the rest,
    // so the objectives are never hidden behind the terminal.
    if (viewportW >= DOCK_MIN_WIDTH) {
      const rtl = document.documentElement.dir === 'rtl';
      const caseW = Math.round(Math.min(460, Math.max(380, viewportW * 0.3)));
      if (id === 'case') {
        width = caseW;
        height = Math.max(340, viewportH - GAP * 2 - ECHO_SPACE);
        x = rtl ? GAP : viewportW - caseW - GAP;
        y = GAP;
      } else {
        const room = viewportW - ICONS - caseW - GAP * 2;
        const cascade = (get().windows.filter((w) => w.id !== 'case').length % 4) * 26;
        width = Math.min(size.width, room);
        height = Math.min(size.height, viewportH - GAP * 2);
        const start = rtl ? caseW + GAP * 2 : ICONS;
        x = start + Math.min(cascade, Math.max(0, room - width));
        y = GAP + Math.min(cascade, Math.max(0, viewportH - GAP - height));
      }
    }
    set((state) => ({
      topZ: z,
      windows: [...state.windows, { id, z, minimized: false, maximized: viewportW < 760, x, y, width, height }],
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
