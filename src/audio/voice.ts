// Character voices: short synthesized syllables ("talk blips") played while a character's text
// types out, plus Byte the dog's reactions. Files are made by scripts/gen-sfx.mjs.
import { playFile, preload } from './sfx';

export type Speaker = 'detective' | 'partner' | 'byte';
export type Reaction = 'yip' | 'bark' | 'whine' | 'sniff';

const SYLLABLES: Record<Speaker, number> = { detective: 6, partner: 6, byte: 4 };
const VOLUME: Record<Speaker, number> = { detective: 0.5, partner: 0.5, byte: 0.35 };
/** Typed letters per syllable: people babble, Byte only borks now and then (ECHO talks a lot). */
export const LETTERS_PER_SYLLABLE: Record<Speaker, number> = { detective: 4, partner: 4, byte: 16 };
/** A new syllable never starts before the last one has mostly finished. */
const GAP_MS = 60;
const lastBlip: Partial<Record<Speaker, number>> = {};

const syllableFile = (speaker: Speaker, n: number) => `voice-${speaker}-${n}`;

export function preloadVoices(): void {
  const files = (Object.keys(SYLLABLES) as Speaker[]).flatMap((speaker) =>
    Array.from({ length: SYLLABLES[speaker] }, (_, i) => syllableFile(speaker, i + 1)),
  );
  preload([...files, 'dog-yip', 'dog-bark', 'dog-whine', 'dog-sniff']);
}

/** One syllable in the speaker's voice, slightly detuned each time so speech never loops. */
export function blip(speaker: Speaker): void {
  const now = performance.now();
  if (now - (lastBlip[speaker] ?? 0) < GAP_MS) return;
  lastBlip[speaker] = now;
  const n = 1 + Math.floor(Math.random() * SYLLABLES[speaker]);
  playFile(syllableFile(speaker, n), 0.94 + Math.random() * 0.12, VOLUME[speaker]);
}

/** A short spoken reply with no text typing, e.g. the detective's "On it". */
export function mutter(speaker: Speaker, syllables = 3): void {
  for (let i = 0; i < syllables; i++) setTimeout(() => blip(speaker), i * 85);
}

/** Byte the dog reacting to what happens: solved (yip), wrong (whine), evidence (sniff), case closed (bark). */
export function react(reaction: Reaction): void {
  playFile(`dog-${reaction}`, 1, 0.5);
}
