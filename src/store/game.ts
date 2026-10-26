import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { EvidenceDef, EvidenceType, L, Lang } from '../engine/schema';
import { sanitizeSave } from './sanitize';

export interface EvidenceItem {
  id: string;
  title: L;
  type: EvidenceType;
  sourceLevel: string;
  content: string;
  timestamp: string;
  links: string[];
}

export interface LevelRecord {
  score: number;
  maxScore: number;
  hintsUsed: number;
  seconds: number;
  completedAt: string;
}

export type Quality = 'low' | 'high';

export interface Settings {
  lang: Lang;
  quality: Quality;
  volume: number;
  muted: boolean;
  reducedMotion: boolean;
}

interface GameData {
  callsign: string;
  settings: Settings;
  completed: Record<string, LevelRecord>;
  /** levelId -> solved objective ids */
  objectives: Record<string, string[]>;
  /** levelId -> hint tiers revealed (0..3) */
  hints: Record<string, number>;
  /** levelId -> tier indexes revealed with intel (they cost no points) */
  freeHints: Record<string, number[]>;
  evidence: Record<string, EvidenceItem>;
  boardLinks: [string, string][];
  boardPositions: Record<string, { x: number; y: number }>;
  intel: { collected: string[]; spent: string[] };
  achievements: string[];
}

interface GameActions {
  setCallsign: (callsign: string) => void;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  solveObjective: (levelId: string, objectiveId: string, grants: EvidenceDef[]) => void;
  revealHint: (levelId: string) => void;
  collectIntel: (intelId: string) => void;
  spendIntel: (levelId: string) => boolean;
  completeLevel: (levelId: string, record: LevelRecord) => void;
  linkEvidence: (a: string, b: string) => void;
  moveCard: (id: string, x: number, y: number) => void;
  unlockAchievement: (id: string) => boolean;
  exportSave: () => string;
  importSave: (json: string) => boolean;
  resetProgress: () => void;
}

export type GameState = GameData & GameActions;

const SAVE_VERSION = 1;
export const MAX_SAVE_BYTES = 1_000_000;

function defaultSettings(): Settings {
  const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const weakDevice = typeof navigator !== 'undefined' &&
    ((navigator.hardwareConcurrency ?? 8) <= 4 || /Mobi|Android/i.test(navigator.userAgent));
  return { lang: 'en', quality: weakDevice ? 'low' : 'high', volume: 0.7, muted: false, reducedMotion };
}

function emptyProgress(): Omit<GameData, 'settings' | 'callsign'> {
  return {
    completed: {},
    objectives: {},
    hints: {},
    freeHints: {},
    evidence: {},
    boardLinks: [],
    boardPositions: {},
    intel: { collected: [], spent: [] },
    achievements: [],
  };
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      callsign: '',
      settings: defaultSettings(),
      ...emptyProgress(),

      setCallsign: (callsign) => set({ callsign }),
      setSetting: (key, value) => set((state) => ({ settings: { ...state.settings, [key]: value } })),

      solveObjective: (levelId, objectiveId, grants) =>
        set((state) => {
          const done = state.objectives[levelId] ?? [];
          if (done.includes(objectiveId)) return state;
          const evidence = { ...state.evidence };
          const timestamp = new Date().toISOString();
          for (const item of grants) {
            evidence[item.id] = {
              id: item.id,
              title: item.title,
              type: item.type,
              sourceLevel: levelId,
              content: item.content,
              timestamp,
              links: item.links ?? [],
            };
          }
          return { objectives: { ...state.objectives, [levelId]: [...done, objectiveId] }, evidence };
        }),

      revealHint: (levelId) =>
        set((state) => ({ hints: { ...state.hints, [levelId]: Math.min(3, (state.hints[levelId] ?? 0) + 1) } })),

      collectIntel: (intelId) =>
        set((state) =>
          state.intel.collected.includes(intelId)
            ? state
            : { intel: { ...state.intel, collected: [...state.intel.collected, intelId] } }),

      spendIntel: (levelId) => {
        const { intel, hints } = get();
        const available = intel.collected.find((id) => !intel.spent.includes(id));
        if (!available || (hints[levelId] ?? 0) >= 3) return false;
        const tier = hints[levelId] ?? 0;
        set((state) => ({
          intel: { ...intel, spent: [...intel.spent, available] },
          hints: { ...hints, [levelId]: tier + 1 },
          freeHints: { ...state.freeHints, [levelId]: [...(state.freeHints[levelId] ?? []), tier] },
        }));
        return true;
      },

      completeLevel: (levelId, record) =>
        set((state) => {
          const previous = state.completed[levelId];
          if (previous && previous.score >= record.score) return state;
          return { completed: { ...state.completed, [levelId]: record } };
        }),

      linkEvidence: (a, b) =>
        set((state) => {
          if (a === b || state.boardLinks.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) return state;
          return { boardLinks: [...state.boardLinks, [a, b]] };
        }),

      moveCard: (id, x, y) => set((state) => ({ boardPositions: { ...state.boardPositions, [id]: { x, y } } })),

      unlockAchievement: (id) => {
        if (get().achievements.includes(id)) return false;
        set((state) => ({ achievements: [...state.achievements, id] }));
        return true;
      },

      exportSave: () => {
        const { callsign, settings, completed, objectives, hints, freeHints, evidence, boardLinks, boardPositions, intel, achievements } = get();
        return JSON.stringify({
          game: 'null-signal',
          version: SAVE_VERSION,
          data: { callsign, settings, completed, objectives, hints, freeHints, evidence, boardLinks, boardPositions, intel, achievements },
        }, null, 2);
      },

      importSave: (json) => {
        if (json.length > MAX_SAVE_BYTES) return false;
        try {
          const parsed: unknown = JSON.parse(json);
          if (typeof parsed !== 'object' || parsed === null || (parsed as { game?: unknown }).game !== 'null-signal') return false;
          const safe = sanitizeSave((parsed as { data?: unknown }).data);
          if (!safe) return false;
          set({ ...emptyProgress(), ...safe, callsign: safe.callsign ?? '', settings: { ...defaultSettings(), ...safe.settings } });
          return true;
        } catch {
          return false;
        }
      },

      resetProgress: () => set({ ...emptyProgress(), callsign: '' }),
    }),
    {
      name: 'null-signal-save',
      version: SAVE_VERSION,
      storage: createJSONStorage(() => localStorage),
      // localStorage is user-editable: validate it exactly like an imported file.
      merge: (persisted, current) => {
        const safe = sanitizeSave(persisted);
        if (!safe) return current;
        return { ...current, ...safe, callsign: safe.callsign ?? '', settings: { ...current.settings, ...safe.settings } };
      },
      partialize: ({ callsign, settings, completed, objectives, hints, freeHints, evidence, boardLinks, boardPositions, intel, achievements }) =>
        ({ callsign, settings, completed, objectives, hints, freeHints, evidence, boardLinks, boardPositions, intel, achievements }),
    },
  ),
);

/** Act rank from the share of points earned. */
export function rankFor(score: number, max: number): 'S' | 'A' | 'B' | 'C' {
  const ratio = max > 0 ? score / max : 0;
  if (ratio >= 0.95) return 'S';
  if (ratio >= 0.8) return 'A';
  if (ratio >= 0.6) return 'B';
  return 'C';
}
