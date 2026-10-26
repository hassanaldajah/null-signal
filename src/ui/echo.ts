import { create } from 'zustand';
import type { Clip } from '../scenes/three/Character';

interface EchoState {
  text: string;
  clip: Clip;
  /** Increments on every message so the typewriter restarts even for the same text. */
  serial: number;
  say: (text: string, clip?: Clip) => void;
  settle: () => void;
}

/** ECHO, the AI assistant: one message at a time, shown with a typewriter bubble. */
export const useEcho = create<EchoState>()((set) => ({
  text: '',
  clip: 'idle',
  serial: 0,
  say: (text, clip = 'talk') => set((state) => ({ text, clip, serial: state.serial + 1 })),
  settle: () => set({ clip: 'idle' }),
}));
