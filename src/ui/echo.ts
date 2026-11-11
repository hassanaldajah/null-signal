import { create } from 'zustand';
import type { L } from '../engine/schema';
import type { Clip } from '../scenes/three/Character';

interface EchoState {
  /** Kept localized, so the bubble follows a language switch. */
  message: L | null;
  clip: Clip;
  /** Increments on every message so the typewriter restarts even for the same text. */
  serial: number;
  say: (message: L, clip?: Clip) => void;
  /** A short animation without words (ECHO points when a hint opens). */
  gesture: (clip: Clip) => void;
  settle: () => void;
}

/** ECHO, the AI assistant: one message at a time, shown with a typewriter bubble. */
export const useEcho = create<EchoState>()((set) => ({
  message: null,
  clip: 'idle',
  serial: 0,
  say: (message, clip = 'talk') => set((state) => ({ message, clip, serial: state.serial + 1 })),
  gesture: (clip) => {
    set({ clip });
    setTimeout(() => set({ clip: 'idle' }), 1600);
  },
  settle: () => set({ clip: 'idle' }),
}));

/** The Guide panel: opened from the corner button or from the Case File. */
export const useGuide = create<{ open: boolean; setOpen: (open: boolean) => void }>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
