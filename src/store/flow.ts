import { create } from 'zustand';

export type Screen = 'boot' | 'login' | 'hub' | 'level';

interface FlowState {
  screen: Screen;
  levelId: string | null;
  go: (screen: Screen) => void;
  openLevel: (levelId: string) => void;
}

/** Non-persistent navigation state. */
export const useFlow = create<FlowState>()((set) => ({
  screen: 'boot',
  levelId: null,
  go: (screen) => set({ screen }),
  openLevel: (levelId) => set({ screen: 'level', levelId }),
}));
