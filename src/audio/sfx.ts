import { Howl, Howler } from 'howler';
import { useGame } from '../store/game';

export type Sfx =
  | 'click' | 'hover' | 'type' | 'open' | 'close' | 'success' | 'error'
  | 'evidence' | 'hint' | 'glitch' | 'boot';

const sounds = new Map<string, Howl>();
let unlocked = false;
let ambient: Howl | null = null;

function sound(name: string, loop = false): Howl {
  let howl = sounds.get(name);
  if (!howl) {
    howl = new Howl({ src: [`/audio/${name}.wav`], loop, preload: true, volume: loop ? 0.35 : 0.8 });
    sounds.set(name, howl);
  }
  return howl;
}

function applyVolume(): void {
  const { volume, muted } = useGame.getState().settings;
  Howler.volume(muted ? 0 : volume);
}

/** Call from the first user gesture (browsers block audio before that). */
export function unlockAudio(): void {
  if (unlocked) return;
  unlocked = true;
  applyVolume();
  useGame.subscribe((state, previous) => {
    if (state.settings.volume !== previous.settings.volume || state.settings.muted !== previous.settings.muted) applyVolume();
  });
}

export function play(name: Sfx): void {
  if (!unlocked) return;
  const howl = sound(name);
  if (name === 'type' || name === 'hover') howl.rate(0.9 + Math.random() * 0.25);
  howl.play();
}

/** Plays public/audio/<file>.wav at its own rate and volume (character voices, see voice.ts). */
export function playFile(file: string, rate = 1, volume = 0.8): void {
  if (!unlocked) return;
  const howl = sound(file);
  const id = howl.play();
  howl.rate(rate, id);
  howl.volume(volume, id);
}

/** Starts downloading files ahead of time so the first syllable is not late. */
export function preload(files: string[]): void {
  for (const file of files) sound(file);
}

export function startAmbient(): void {
  if (!unlocked || ambient) return;
  ambient = sound('ambient', true);
  ambient.play();
  ambient.fade(0, 0.35, 2500);
}
