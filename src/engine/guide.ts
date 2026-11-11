import type { LevelConfig } from './schema';

/**
 * Light, predictable guide costs as a share of the case's points: a nudge keeps rank S (95%),
 * nudge + clue gives A (85%), the full solution gives B (70%).
 */
const GUIDE_COST_RATE = [0.05, 0.1, 0.15];

/** Points one guide tier (0..2) takes off this case. */
export function guideCost(config: LevelConfig, tier: number): number {
  return Math.floor(config.rewards.points * (GUIDE_COST_RATE[tier] ?? 0));
}

/** Points minus the cost of every guide tier revealed, except tiers unlocked with intel. */
export function currentScore(config: LevelConfig, hintsRevealed: number, freeTiers: readonly number[] = []): number {
  let spent = 0;
  for (let tier = 0; tier < Math.min(hintsRevealed, GUIDE_COST_RATE.length); tier++) {
    if (!freeTiers.includes(tier)) spent += guideCost(config, tier);
  }
  return Math.max(0, config.rewards.points - spent);
}
