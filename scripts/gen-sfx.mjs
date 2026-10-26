// Procedurally synthesizes every sound effect into public/audio/*.wav (no licensing needed).
// Run: npm run sfx
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'audio');
mkdirSync(out, { recursive: true });

let seed = 7;
const noise = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed / 2147483647) * 2 - 1;
};
const env = (t, attack, decay) => (t < attack ? t / attack : Math.exp(-(t - attack) / decay));

function render(seconds, sample) {
  const data = new Float32Array(Math.floor(seconds * RATE));
  for (let i = 0; i < data.length; i++) data[i] = sample(i / RATE, i);
  return data;
}

function writeWav(name, data, gain = 0.8) {
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  const scale = peak > 0 ? gain / peak : 0;
  const buffer = Buffer.alloc(44 + data.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + data.length * 2, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(RATE, 24);
  buffer.writeUInt32LE(RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(data.length * 2, 40);
  data.forEach((v, i) => buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v * scale)) * 32767), 44 + i * 2));
  writeFileSync(join(out, `${name}.wav`), buffer);
  console.log(`audio/${name}.wav  ${(buffer.length / 1024).toFixed(1)} KB`);
}

const sine = (f, t) => Math.sin(2 * Math.PI * f * t);
const square = (f, t) => Math.sign(sine(f, t));

writeWav('click', render(0.06, (t) => square(1800, t) * env(t, 0.001, 0.012) * 0.6), 0.5);
writeWav('hover', render(0.05, (t) => sine(2400 + 4000 * t, t) * env(t, 0.002, 0.012)), 0.25);
writeWav('type', render(0.03, (t) => noise() * env(t, 0.0005, 0.004)), 0.35);
writeWav('open', render(0.22, (t) => (sine(440 + 900 * t, t) + 0.4 * sine(880 + 1800 * t, t)) * env(t, 0.01, 0.07)), 0.5);
writeWav('close', render(0.18, (t) => sine(900 - 1200 * t, t) * env(t, 0.005, 0.05)), 0.45);
writeWav('success', render(0.7, (t) => {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  const index = Math.min(3, Math.floor(t / 0.09));
  return (sine(notes[index], t) + 0.3 * sine(notes[index] * 2, t)) * env(t - index * 0.09, 0.005, 0.25);
}), 0.6);
writeWav('error', render(0.32, (t) => (square(140, t) * 0.5 + sine(95, t)) * env(t, 0.005, 0.12)), 0.5);
writeWav('evidence', render(0.5, (t) => (sine(1318.5, t) * env(t, 0.003, 0.12) + sine(1975.5, t - 0.08) * (t > 0.08 ? env(t - 0.08, 0.003, 0.18) : 0))), 0.55);
writeWav('hint', render(0.45, (t) => sine(660 + 40 * sine(6, t), t) * env(t, 0.03, 0.18) + 0.25 * sine(1320, t) * env(t, 0.03, 0.1)), 0.45);
writeWav('glitch', render(0.4, (t, i) => {
  const crush = Math.floor(i / 40) % 2 ? 1 : -1;
  return (noise() * 0.6 + square(60 + 400 * Math.floor(t * 20) % 7, t) * 0.4) * crush * env(t, 0.002, 0.15);
}), 0.5);
writeWav('boot', render(1.6, (t) => {
  const sweep = sine(55 + 220 * t * t, t) * env(t, 0.4, 0.8);
  const shimmer = sine(1760 + 300 * sine(3, t), t) * 0.15 * Math.max(0, t - 0.6);
  return sweep + shimmer;
}), 0.6);
writeWav('ambient', render(8, (t) => {
  // Seamless 8 s loop: frequencies are multiples of 1/8 Hz.
  const drone = sine(55, t) * 0.5 + sine(82.5, t) * 0.3 + sine(110.125, t) * 0.15;
  const pulse = 0.5 + 0.5 * sine(0.25, t);
  return drone * (0.7 + 0.3 * pulse) + noise() * 0.02;
}), 0.35);

// --- Voices ---------------------------------------------------------------------------------
// "Talk blips" (as in Animal Crossing or Undertale): each character gets a few short sung
// syllables that play while their text types out. Additive formant synthesis: the harmonics of
// a gliding pitch are weighted by three vowel formant peaks, so a blip sounds like a vowel.
// Female vowel formants in Hz (Peterson & Barney, 1952).
const VOWELS = {
  a: [850, 1220, 2810],
  ae: [860, 2050, 2850],
  e: [610, 2330, 2990],
  i: [310, 2790, 3310],
  o: [590, 920, 2710],
  u: [370, 950, 2670],
};

/** Band-pass filtered noise (RBJ biquad): consonants, breath, sniffs. */
function bandNoise(length, center, q) {
  const w0 = (2 * Math.PI * center) / RATE;
  const alpha = Math.sin(w0) / (2 * q);
  const a0 = 1 + alpha;
  const b0 = alpha / a0;
  const a1 = (-2 * Math.cos(w0)) / a0;
  const a2 = (1 - alpha) / a0;
  const out = new Float32Array(length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < length; i++) {
    const x = noise();
    const y = b0 * x - b0 * x2 - a1 * y1 - a2 * y2;
    out[i] = y;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
  }
  return out;
}

function voice({ f0, seconds, vowel, formants = VOWELS[vowel], contour = () => 1, vibrato = 0.012, bright = 1, breath = 0.02, rough = 0, consonant = 0 }) {
  const peaks = [[formants[0], 90, 1], [formants[1], 130, 0.5 * bright], [formants[2], 200, 0.28 * bright]];
  const length = Math.floor(seconds * RATE);
  const data = new Float32Array(length);
  const hiss = bandNoise(length, 4200, 1.5);
  const air = bandNoise(length, formants[1], 2);
  let phase = 0;
  for (let i = 0; i < length; i++) {
    const t = i / RATE;
    const f = f0 * contour(t / seconds) * (1 + vibrato * sine(6, t));
    phase += f / RATE;
    let voiced = 0;
    for (let k = 1; k * f < 4500; k++) {
      let gain = 0.015;
      for (const [center, width, weight] of peaks) gain += weight / (1 + ((k * f - center) / width) ** 2);
      voiced += (gain / Math.sqrt(k)) * Math.sin(2 * Math.PI * k * phase);
    }
    // Rough voices (barks) get noise that pulses with every vocal-fold cycle.
    const pulse = 0.5 + 0.5 * Math.cos(2 * Math.PI * phase);
    const fade = Math.min(1, t / 0.012) * Math.min(1, Math.max(0, (seconds - t) / 0.03));
    const burst = consonant && t < consonant ? Math.min(1, t / 0.002) * (1 - t / consonant) : 0;
    data[i] = (voiced + air[i] * (breath + rough * pulse) * 6) * fade + hiss[i] * burst * 6;
  }
  return data;
}

const silence = (seconds) => new Float32Array(Math.floor(seconds * RATE));
function concat(...parts) {
  const out = new Float32Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

// [vowel, pitch Hz, glide over the syllable, seconds, consonant burst seconds]
const SPEAKERS = {
  // The detective: warm, lower, unhurried.
  detective: { bright: 0.85, syllables: [['a', 212, -0.07, 0.09, 0.01], ['o', 204, -0.05, 0.085, 0], ['e', 220, -0.08, 0.08, 0.012], ['u', 200, -0.04, 0.09, 0], ['ae', 216, -0.06, 0.085, 0.01], ['i', 226, -0.07, 0.075, 0]] },
  // Her partner: brighter and quicker.
  partner: { bright: 1.2, syllables: [['e', 268, 0.04, 0.075, 0.01], ['i', 282, -0.05, 0.07, 0], ['a', 262, -0.08, 0.08, 0.01], ['ae', 274, 0.03, 0.075, 0], ['o', 258, -0.06, 0.08, 0.012], ['i', 290, 0.05, 0.07, 0]] },
};
for (const [name, { bright, syllables }] of Object.entries(SPEAKERS)) {
  syllables.forEach(([vowel, f0, glide, seconds, consonant], i) =>
    writeWav(`voice-${name}-${i + 1}`, voice({ vowel, f0, seconds, consonant, bright, contour: (p) => 1 + glide * p }), 0.5));
}

// Byte, the little robot dog: short falling "borks" while ECHO talks through it, and reactions.
const DOG = [700, 1350, 2600];
[[560, 0.065], [620, 0.06], [520, 0.07], [660, 0.055]].forEach(([f0, seconds], i) =>
  writeWav(`voice-byte-${i + 1}`, voice({ f0, seconds, formants: DOG, contour: (p) => 1 - 0.3 * p, rough: 0.15, vibrato: 0, bright: 0.9 }), 0.45));
const YIP = [800, 1500, 2900];
writeWav('dog-yip', concat(
  voice({ f0: 880, seconds: 0.1, formants: YIP, contour: (p) => 1.05 - 0.3 * p, rough: 0.1, vibrato: 0 }),
  silence(0.05),
  voice({ f0: 990, seconds: 0.09, formants: YIP, contour: (p) => 1.05 - 0.28 * p, rough: 0.1, vibrato: 0 }),
), 0.5);
writeWav('dog-bark', voice({ f0: 430, seconds: 0.17, formants: [550, 1150, 2400], contour: (p) => 1.1 - 0.4 * p, rough: 0.6, vibrato: 0.02, bright: 1.1 }), 0.55);
writeWav('dog-whine', voice({ f0: 640, seconds: 0.55, formants: [700, 1700, 3000], contour: (p) => 1 + 0.45 * Math.sin(Math.PI * p) - 0.15 * p, vibrato: 0.025, bright: 0.5, breath: 0.04 }), 0.4);
writeWav('dog-sniff', concat(...[0, 1, 2].flatMap((i) => [
  bandNoise(Math.floor(0.05 * RATE), 2600 + i * 300, 1.2).map((v, j) => v * env(j / RATE, 0.008, 0.015)),
  silence(0.035),
])), 0.45);
