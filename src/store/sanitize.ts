// Strict validation for save data coming from an imported file or from localStorage.
// Anything unexpected is dropped, so a tampered save can neither crash the game
// nor smuggle unexpected keys (e.g. "__proto__") into the store.
import type { EvidenceType } from '../engine/schema';
import type { EvidenceItem, LevelRecord, Settings } from './game';

const MAX_TEXT = 4000;
const ID = /^[A-Za-z0-9_.-]{1,64}$/;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const EVIDENCE_TYPES: EvidenceType[] = ['credential', 'ip', 'domain', 'email', 'file', 'hash', 'timestamp', 'person', 'artifact', 'ioc', 'note'];

type Plain = Record<string, unknown>;

const isPlain = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const isId = (value: unknown): value is string => typeof value === 'string' && ID.test(value) && !FORBIDDEN_KEYS.has(value);
const text = (value: unknown, max = MAX_TEXT): string | undefined =>
  typeof value === 'string' && value.length <= max ? value : undefined;
const finite = (value: unknown, min: number, max: number): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : undefined;

/** Builds a null-prototype map, keeping only safe keys whose values pass `check`. */
function record<T>(value: unknown, check: (item: unknown) => T | undefined): Record<string, T> {
  const out: Record<string, T> = Object.create(null);
  if (!isPlain(value)) return out;
  for (const [key, item] of Object.entries(value)) {
    if (!isId(key)) continue;
    const checked = check(item);
    if (checked !== undefined) out[key] = checked;
  }
  return { ...out };
}

const idList = (value: unknown, max = 500): string[] =>
  Array.isArray(value) ? value.filter(isId).slice(0, max) : [];

function localized(value: unknown): { en: string; ar?: string } | undefined {
  if (!isPlain(value)) return undefined;
  const en = text(value.en, 400);
  if (en === undefined) return undefined;
  const ar = text(value.ar, 400);
  return ar === undefined ? { en } : { en, ar };
}

function settings(value: unknown): Partial<Settings> {
  if (!isPlain(value)) return {};
  const out: Partial<Settings> = {};
  if (value.lang === 'en' || value.lang === 'ar') out.lang = value.lang;
  if (value.quality === 'low' || value.quality === 'high') out.quality = value.quality;
  const volume = finite(value.volume, 0, 1);
  if (volume !== undefined) out.volume = volume;
  if (typeof value.muted === 'boolean') out.muted = value.muted;
  if (typeof value.reducedMotion === 'boolean') out.reducedMotion = value.reducedMotion;
  return out;
}

function levelRecord(value: unknown): LevelRecord | undefined {
  if (!isPlain(value)) return undefined;
  const score = finite(value.score, 0, 100_000);
  const maxScore = finite(value.maxScore, 0, 100_000);
  const hintsUsed = finite(value.hintsUsed, 0, 3);
  const seconds = finite(value.seconds, 0, 10_000_000);
  const completedAt = text(value.completedAt, 40);
  if ([score, maxScore, hintsUsed, seconds, completedAt].includes(undefined)) return undefined;
  return { score: score!, maxScore: maxScore!, hintsUsed: hintsUsed!, seconds: seconds!, completedAt: completedAt! };
}

function evidenceItem(value: unknown): EvidenceItem | undefined {
  if (!isPlain(value)) return undefined;
  const title = localized(value.title);
  const content = text(value.content);
  const timestamp = text(value.timestamp, 40);
  if (!isId(value.id) || !isId(value.sourceLevel) || !title || content === undefined || timestamp === undefined) return undefined;
  if (!EVIDENCE_TYPES.includes(value.type as EvidenceType)) return undefined;
  return {
    id: value.id,
    title,
    type: value.type as EvidenceType,
    sourceLevel: value.sourceLevel,
    content,
    timestamp,
    links: idList(value.links, 50),
  };
}

export interface SafeSave {
  callsign?: string;
  settings: Partial<Settings>;
  completed: Record<string, LevelRecord>;
  objectives: Record<string, string[]>;
  hints: Record<string, number>;
  freeHints: Record<string, number[]>;
  evidence: Record<string, EvidenceItem>;
  boardLinks: [string, string][];
  boardPositions: Record<string, { x: number; y: number }>;
  intel: { collected: string[]; spent: string[] };
  achievements: string[];
}

/** Returns a fully validated copy of `raw`, or null if it is not save-shaped at all. */
export function sanitizeSave(raw: unknown): SafeSave | null {
  if (!isPlain(raw)) return null;
  const callsign = text(raw.callsign, 24);
  const intel = isPlain(raw.intel) ? raw.intel : {};
  return {
    callsign: callsign?.replace(/[\u0000-\u001f\u007f]/g, ''),
    settings: settings(raw.settings),
    completed: record(raw.completed, levelRecord),
    objectives: record(raw.objectives, (item) => (Array.isArray(item) ? idList(item, 50) : undefined)),
    hints: record(raw.hints, (item) => finite(item, 0, 3)),
    freeHints: record(raw.freeHints, (item) =>
      Array.isArray(item) ? item.filter((n): n is number => finite(n, 0, 2) !== undefined).slice(0, 3) : undefined),
    evidence: record(raw.evidence, evidenceItem),
    boardLinks: Array.isArray(raw.boardLinks)
      ? raw.boardLinks
        .filter((pair): pair is [string, string] => Array.isArray(pair) && pair.length === 2 && isId(pair[0]) && isId(pair[1]))
        .slice(0, 500)
      : [],
    boardPositions: record(raw.boardPositions, (item) => {
      if (!isPlain(item)) return undefined;
      const x = finite(item.x, 0, 20_000);
      const y = finite(item.y, 0, 20_000);
      return x === undefined || y === undefined ? undefined : { x, y };
    }),
    intel: { collected: idList(intel.collected, 20), spent: idList(intel.spent, 20) },
    achievements: idList(raw.achievements, 200),
  };
}
