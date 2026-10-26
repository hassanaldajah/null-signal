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

// Soft key tick while dialogue types out: a muffled noise tap over a short wooden "tock".
let lowpass = 0;
writeWav('tick', render(0.035, (t) => {
  lowpass += 0.35 * (noise() - lowpass);
  return lowpass * env(t, 0.0005, 0.003) + 0.5 * sine(1250, t) * env(t, 0.0008, 0.006);
}), 0.3);
