import { create } from 'zustand';
import { levelMeta } from '../levels/manifest';
import { loadLevel } from '../levels/registry';
import { useGame } from '../store/game';
import type { LevelConfig, LevelMeta, Objective } from './schema';
import { Shell } from './shell/shell';
import { validate } from './validators';
import { Vfs } from './vfs';

export interface LevelRuntime {
  config: LevelConfig;
  meta: LevelMeta;
  vfs: Vfs;
  shell: Shell;
  commands: string[];
  startedAt: number;
}

interface RuntimeState {
  runtime: LevelRuntime | null;
  loading: boolean;
  error: string | null;
  /** Set when the level was just completed (drives the debrief screen). */
  finished: boolean;
  /** Last evidence ids granted (for the "new evidence" toast + board highlight). */
  fresh: string[];
  start: (levelId: string) => Promise<void>;
  stop: () => void;
  /** The case clock starts when the player accepts the partner's briefing, not on load. */
  startClock: () => void;
  recordCommand: (line: string) => void;
  submit: (objectiveId: string, input: string) => boolean;
}

const DEFAULT_NOW = '2026-03-14T12:00:00Z';

function evidenceContents(): Record<string, string> {
  return Object.fromEntries(Object.values(useGame.getState().evidence).map((item) => [item.id, item.content]));
}

export function maxScore(config: LevelConfig): number {
  return config.rewards.points;
}

/** Points minus the cost of every hint tier revealed, except tiers unlocked with intel. */
export function currentScore(config: LevelConfig, hintsRevealed: number, freeTiers: readonly number[] = []): number {
  const spent = config.hints
    .slice(0, hintsRevealed)
    .reduce((sum, hint, tier) => sum + (freeTiers.includes(tier) ? 0 : hint.cost), 0);
  return Math.max(0, config.rewards.points - spent);
}

export const useRuntime = create<RuntimeState>()((set, get) => {
  /** Marks an objective solved, pins its evidence and closes the level when everything is done. */
  const solve = (objective: Objective) => {
    const runtime = get().runtime;
    if (!runtime) return;
    const game = useGame.getState();
    if (game.objectives[runtime.config.id]?.includes(objective.id)) return;
    game.solveObjective(runtime.config.id, objective.id, objective.grants ?? []);
    set({ fresh: (objective.grants ?? []).map((item) => item.id) });
    const solved = useGame.getState().objectives[runtime.config.id] ?? [];
    if (runtime.config.objectives.every((item) => solved.includes(item.id))) {
      const { config } = runtime;
      const hintsUsed = useGame.getState().hints[config.id] ?? 0;
      useGame.getState().completeLevel(config.id, {
        score: currentScore(config, hintsUsed, useGame.getState().freeHints[config.id]),
        maxScore: maxScore(config),
        hintsUsed,
        seconds: Math.round((Date.now() - runtime.startedAt) / 1000),
        completedAt: new Date().toISOString(),
      });
      if (config.intel) useGame.getState().collectIntel(config.intel.id);
      if (config.rewards.achievement) useGame.getState().unlockAchievement(config.rewards.achievement);
      set({ finished: true });
    }
  };

  return {
    runtime: null,
    loading: false,
    error: null,
    finished: false,
    fresh: [],

    start: async (levelId) => {
      set({ loading: true, error: null, finished: false, runtime: null, fresh: [] });
      try {
        const config = await loadLevel(levelId);
        const meta = levelMeta(levelId);
        if (!meta) throw new Error(`Level ${levelId} missing from manifest`);
        const vfs = new Vfs(config.world);
        const shell = new Shell(vfs, {
          user: config.world.user,
          host: config.world.host,
          cwd: config.world.cwd,
          now: new Date(config.world.now ?? DEFAULT_NOW),
        });
        set({ runtime: { config, meta, vfs, shell, commands: [], startedAt: Date.now() }, loading: false });
      } catch (error) {
        set({ loading: false, error: error instanceof Error ? error.message : String(error) });
      }
    },

    stop: () => set({ runtime: null, finished: false, fresh: [] }),

    startClock: () => {
      const runtime = get().runtime;
      if (runtime) runtime.startedAt = Date.now();
    },

    recordCommand: (line) => {
      const runtime = get().runtime;
      if (!runtime) return;
      runtime.commands.push(line);
      const done = useGame.getState().objectives[runtime.config.id] ?? [];
      for (const objective of runtime.config.objectives) {
        const { kind } = objective.validator;
        if ((kind !== 'command' && kind !== 'cwd') || done.includes(objective.id)) continue;
        const ctx = { evidence: evidenceContents(), commands: runtime.commands, cwd: runtime.shell.cwd };
        if (validate(objective.validator, '', ctx)) solve(objective);
      }
    },

    submit: (objectiveId, input) => {
      const runtime = get().runtime;
      const objective = runtime?.config.objectives.find((item) => item.id === objectiveId);
      if (!runtime || !objective) return false;
      const ok = validate(objective.validator, input, { evidence: evidenceContents(), commands: runtime.commands });
      if (ok) solve(objective);
      return ok;
    },
  };
});
