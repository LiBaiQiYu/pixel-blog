import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = path.join(ROOT, 'public', 'audio', 'pixel-night-loop.wav');

const SAMPLE_RATE = 44100;
const BPM = 116;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const EIGHTH = BEAT / 2;
const SIXTEENTH = BEAT / 4;
const BARS = 8;
const DURATION = BAR * BARS;
const TOTAL_SAMPLES = Math.round(DURATION * SAMPLE_RATE);

const CHORDS = [
  { root: 57, notes: [57, 60, 64] },
  { root: 53, notes: [53, 57, 60] },
  { root: 48, notes: [60, 64, 67] },
  { root: 55, notes: [55, 59, 62] },
  { root: 57, notes: [57, 60, 64] },
  { root: 53, notes: [53, 57, 60] },
  { root: 55, notes: [55, 59, 62] },
  { root: 52, notes: [52, 56, 59] },
];

const MELODY = [
  [69, 72, 76, 81, 79, 76, 72, 76],
  [65, 69, 72, 77, 76, 72, 69, 72],
  [67, 72, 76, 79, 77, 76, 72, 67],
  [71, 74, 79, 83, 81, 79, 74, 71],
  [69, 72, 76, 81, 84, 83, 81, 76],
  [77, 76, 72, 69, 72, 74, 76, 77],
  [79, 77, 74, 71, 74, 76, 77, 79],
  [76, 80, 83, 88, 86, 83, 80, 76],
];

const ARP_PATTERN = [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1];

const mix = new Float32Array(TOTAL_SAMPLES);
let noiseState = 0x12345678;

function midiToFreq(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function envelope(t, duration, attack, release) {
  if (t < 0 || t > duration) return 0;
  if (t < attack) return t / attack;
  const releaseStart = duration - release;
  if (t > releaseStart) return Math.max(0, (duration - t) / release);
  return 1;
}

function addPulse(start, duration, midi, volume, duty = 0.5) {
  const startSample = Math.max(0, Math.round(start * SAMPLE_RATE));
  const endSample = Math.min(
    TOTAL_SAMPLES,
    Math.round((start + duration) * SAMPLE_RATE)
  );
  const freq = midiToFreq(midi);
  const attack = Math.min(0.006, duration * 0.2);
  const release = Math.min(0.055, duration * 0.45);
  let phase = 0;

  for (let i = startSample; i < endSample; i++) {
    const t = (i - startSample) / SAMPLE_RATE;
    phase = (phase + freq / SAMPLE_RATE) % 1;
    const wave = phase < duty ? 1 : -1;
    mix[i] += wave * volume * envelope(t, duration, attack, release);
  }
}

function addTriangle(start, duration, midi, volume) {
  const startSample = Math.max(0, Math.round(start * SAMPLE_RATE));
  const endSample = Math.min(
    TOTAL_SAMPLES,
    Math.round((start + duration) * SAMPLE_RATE)
  );
  const freq = midiToFreq(midi);
  const attack = Math.min(0.008, duration * 0.2);
  const release = Math.min(0.08, duration * 0.45);
  let phase = 0;

  for (let i = startSample; i < endSample; i++) {
    const t = (i - startSample) / SAMPLE_RATE;
    phase = (phase + freq / SAMPLE_RATE) % 1;
    const wave = 1 - 4 * Math.abs(phase - 0.5);
    mix[i] += wave * volume * envelope(t, duration, attack, release);
  }
}

function addNoise(start, duration, volume, brightness = 1) {
  const startSample = Math.max(0, Math.round(start * SAMPLE_RATE));
  const endSample = Math.min(
    TOTAL_SAMPLES,
    Math.round((start + duration) * SAMPLE_RATE)
  );
  const attack = Math.min(0.003, duration * 0.2);
  const release = Math.min(0.06, duration * 0.6);
  let held = 0;
  let holdCounter = 0;
  let previous = 0;

  for (let i = startSample; i < endSample; i++) {
    const t = (i - startSample) / SAMPLE_RATE;
    const holdSamples = Math.max(1, Math.round(brightness));
    if (holdCounter <= 0) {
      noiseState = (Math.imul(noiseState, 1664525) + 1013904223) >>> 0;
      held = (noiseState / 0xffffffff) * 2 - 1;
      holdCounter = holdSamples;
    }
    holdCounter--;
    const highPassed = held - previous * 0.35;
    previous = held;
    mix[i] +=
      highPassed * volume * envelope(t, duration, attack, release);
  }
}

function addKick(start, volume) {
  const duration = 0.16;
  const startSample = Math.max(0, Math.round(start * SAMPLE_RATE));
  const endSample = Math.min(
    TOTAL_SAMPLES,
    Math.round((start + duration) * SAMPLE_RATE)
  );
  let phase = 0;

  for (let i = startSample; i < endSample; i++) {
    const t = (i - startSample) / SAMPLE_RATE;
    const freq = 128 * Math.exp(-t * 28) + 42;
    phase = (phase + freq / SAMPLE_RATE) % 1;
    const env = Math.max(0, 1 - t / duration) ** 2;
    mix[i] += Math.sin(phase * Math.PI * 2) * volume * env;
  }
}

for (let bar = 0; bar < BARS; bar++) {
  const barStart = bar * BAR;
  const chord = CHORDS[bar % CHORDS.length];

  for (let step = 0; step < 8; step++) {
    const note = MELODY[bar][step];
    addPulse(
      barStart + step * EIGHTH,
      EIGHTH * 0.74,
      note,
      0.115,
      0.25
    );
  }

  for (let step = 0; step < 16; step++) {
    const index = ARP_PATTERN[step] % chord.notes.length;
    const note = chord.notes[index] + 12;
    addPulse(
      barStart + step * SIXTEENTH,
      SIXTEENTH * 0.55,
      note,
      0.035,
      0.125
    );
  }

  const bassNotes = [
    chord.root - 12,
    chord.root - 12,
    chord.root - 5,
    chord.root - 12,
    chord.root,
    chord.root - 12,
    chord.root - 5,
    chord.root - 12,
  ];
  bassNotes.forEach((note, step) => {
    addTriangle(
      barStart + step * EIGHTH,
      EIGHTH * 0.82,
      note,
      0.2
    );
  });

  addKick(barStart, 0.42);
  addKick(barStart + BEAT * 2, 0.34);
  addNoise(barStart + BEAT, 0.13, 0.16, 2);
  addNoise(barStart + BEAT * 3, 0.15, 0.18, 2);

  for (let step = 0; step < 8; step++) {
    addNoise(
      barStart + step * EIGHTH,
      0.035,
      step % 2 === 0 ? 0.045 : 0.028,
      1
    );
  }
}

let peak = 0;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  peak = Math.max(peak, Math.abs(mix[i]));
}
const gain = peak > 0 ? 0.88 / peak : 1;
const fadeIn = Math.round(0.008 * SAMPLE_RATE);
const fadeOut = Math.round(0.012 * SAMPLE_RATE);

for (let i = 0; i < TOTAL_SAMPLES; i++) {
  let fade = 1;
  if (i < fadeIn) fade = i / fadeIn;
  const tail = TOTAL_SAMPLES - 1 - i;
  if (tail < fadeOut) fade = Math.min(fade, tail / fadeOut);
  mix[i] = Math.tanh(mix[i] * gain * fade);
}

function createWav(samples) {
  const dataBytes = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);

  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
  }
  return buffer;
}

await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
await fs.writeFile(OUTPUT, createWav(mix));
console.log(
  `Wrote ${path.relative(ROOT, OUTPUT)} · ${DURATION.toFixed(2)}s · ${(
    (TOTAL_SAMPLES * 2) /
    1024 /
    1024
  ).toFixed(2)} MB`
);
