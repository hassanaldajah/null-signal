// LevelSchema: every level is pure data. The engine never hard-codes a level.

export type Lang = 'en' | 'ar';
/** Localized text. Arabic falls back to English when missing. */
export interface L {
  en: string;
  ar?: string;
}

export type AppId =
  | 'terminal' | 'files' | 'notes' | 'mail' | 'logs' | 'browser' | 'hex'
  | 'capture' | 'processes' | 'registry' | 'evidence' | 'case';

export type EvidenceType =
  | 'credential' | 'ip' | 'domain' | 'email' | 'file' | 'hash' | 'timestamp'
  | 'person' | 'artifact' | 'ioc' | 'note';

export interface EvidenceDef {
  id: string; // "ev.l02.ip" (unique across the game)
  title: L;
  type: EvidenceType;
  content: string; // the actual value (an IP, a hash, a name...)
  links?: string[]; // related evidence ids -> red strings on the board
}

/** A file in the virtual filesystem. A plain string is shorthand for { content }. */
export interface VFile {
  content: string;
  encoding?: 'utf8' | 'base64';
  mode?: string; // "-rw-r--r--"
  owner?: string;
  mtime?: string; // ISO date
}

export interface Note {
  id: string;
  title: string;
  body: string;
  color?: 'yellow' | 'cyan' | 'pink';
}

export interface Email {
  id: string;
  folder?: 'inbox' | 'spam' | 'sent';
  from: string;
  to: string;
  subject: string;
  date: string;
  /** Raw trace headers in wire order, newest hop first (Received, Return-Path, Authentication-Results...). */
  headers?: [name: string, value: string][];
  body: string;
  attachments?: { name: string; size: string; preview?: string }[];
}

export interface ProcessRow {
  pid: number;
  ppid: number;
  name: string;
  user: string;
  cpu: number;
  memMb: number;
  start: string;
  path: string;
}

export interface Packet {
  no: number;
  time: string;
  src: string;
  dst: string;
  proto: string;
  length: number;
  info: string;
  /** Optional payload text shown in the detail pane. */
  data?: string;
}

export interface Page {
  url: string;
  title: string;
  /** Plain text body, rendered as paragraphs (never as HTML). */
  body: string;
}

export interface World {
  user: string;
  host: string;
  home: string;
  cwd?: string;
  /** "Current" date inside the case (ISO). Drives `date` and `find -mtime`. */
  now?: string;
  files?: Record<string, VFile | string>;
  dirs?: string[];
  notes?: Note[];
  emails?: Email[];
  /** Paths of files shown in the Log Viewer. */
  logs?: string[];
  /** Static process snapshot for the Processes app. */
  processes?: ProcessRow[];
  /** Static registry snapshot: key path -> value name -> data. */
  registry?: Record<string, Record<string, string>>;
  /** Static packet table for the Network Capture app. */
  packets?: Packet[];
  /** Static pages for the Browser app (history order). */
  pages?: Page[];
  /** Lock screen guarding the desktop until `objective` is solved. */
  lockscreen?: { user: string; objective: string; hint?: L };
}

export type Validator =
  /** Free-text answer. Matching ignores case and extra spaces unless caseSensitive. */
  | { kind: 'answer'; accept: string[]; caseSensitive?: boolean }
  /** Answer must equal the content of an evidence item found earlier. */
  | { kind: 'evidence'; evidence: string }
  /** Solved when the player runs a terminal command matching `pattern` (regex). */
  | { kind: 'command'; pattern: string }
  /** Solved when the terminal's working directory reaches `path`. */
  | { kind: 'cwd'; path: string }
  | { kind: 'choice'; options: { id: string; label: L }[]; correct: string };

export interface Objective {
  id: string;
  prompt: L;
  validator: Validator;
  placeholder?: string;
  /** Evidence added to the board when this objective is solved. */
  grants?: EvidenceDef[];
  /** Feedback shown after a wrong answer (teaches, never gives the answer). */
  wrong?: L;
  /**
   * How the answer can be found. The validator script checks that `accept` answers
   * appear in the world or in required evidence, unless `derived` explains the reasoning.
   */
  derived?: string;
}

export interface Hint {
  tier: 'nudge' | 'direction' | 'near-solution';
  text: L;
  cost: number;
}

export interface LevelConfig {
  id: string; // "L01"
  requires: { levels: string[]; evidence: string[] };
  briefing: L;
  apps: AppId[];
  autoOpen?: AppId[];
  world: World;
  objectives: Objective[];
  hints: [Hint, Hint, Hint];
  /** Collectible: saving it lets the player skip one hint tier later. */
  intel?: { id: string; text: L };
  rewards: { points: number; achievement?: string };
  debrief: { concept: L; realTools: string[]; takeaway: L; source: string };
  echo: { intro: L; success: L };
  ghost?: { taunt: L };
  /** Maintainer walkthrough (never shown to players). */
  solution: string;
  /**
   * Proof of solvability, run by `npm run validate`: each command runs in the level's shell
   * (in order, sharing cwd) and its output must include `includes`.
   */
  selfTest: { run: string; includes: string }[];
}

export interface LevelMeta {
  id: string;
  act: number;
  order: number; // 1..30
  title: L;
  skill: L;
  boss?: boolean;
}

export interface Act {
  id: number;
  title: L;
  color: string;
  levels: LevelMeta[];
}
