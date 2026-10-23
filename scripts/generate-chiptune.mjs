import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = path.join(ROOT, 'public', 'audio');
const SAMPLE_RATE = 32000;
const BARS = 8;

const TRACKS = [
  {
    key: 'day',
    bpm: 126,
    leadDuty: 0.5,
    leadVolume: 0.105,
    arpVolume: 0.032,
    bassVolume: 0.19,
    drumVolume: 1,
    chords: [
      { root: 48, notes: [60, 64, 67] },
      { root: 55, notes: [55, 59, 62] },
      { root: 57, notes: [57, 60, 64] },
      { root: 53, notes: [53, 57, 60] },
      { root: 48, notes: [60, 64, 67] },
      { root: 55, notes: [55, 59, 62] },
      { root: 57, notes: [57, 60, 64] },
      { root: 55, notes: [55, 59, 62] },
    ],
    melody: [
      [72, 76, 79, 84, 79, 76, 72, 76],
      [71, 74, 79, 83, 81, 79, 74, 71],
      [69, 72, 76, 81, 79, 76, 72, 76],
      [65, 69, 72, 77, 76, 72, 69, 72],
      [72, 76, 79, 84, 86, 84, 79, 76],
      [79, 83, 86, 83, 81, 79, 74, 71],
      [81, 79, 76, 72, 76, 79, 81, 84],
      [71, 74, 79, 83, 81, 79, 74, 67],
    ],
  },
  {
    key: 'dusk',
    bpm: 108,
    leadDuty: 0.25,
    leadVolume: 0.105,
    arpVolume: 0.032,
    bassVolume: 0.2,
    drumVolume: 0.9,
    chords: [
      { root: 57, notes: [57, 60, 64] },
      { root: 53, notes: [53, 57, 60] },
      { root: 48, notes: [60, 64, 67] },
      { root: 55, notes: [55, 59, 62] },
      { root: 57, notes: [57, 60, 64] },
      { root: 53, notes: [53, 57, 60] },
      { root: 55, notes: [55, 59, 62] },
      { root: 52, notes: [52, 56, 59] },
    ],
    melody: [
      [69, 72, 76, 81, 79, 76, 72, 76],
      [65, 69, 72, 77, 76, 72, 69, 72],
      [67, 72, 76, 79, 77, 76, 72, 67],
      [71, 74, 79, 83, 81, 79, 74, 71],
      [69, 72, 76, 81, 84, 83, 81, 76],
      [77, 76, 72, 69, 72, 74, 76, 77],
      [79, 77, 74, 71, 74, 76, 77, 79],
      [76, 80, 83, 88, 86, 83, 80, 76],
    ],
  },
  {
    key: 'night',
    bpm: 88,
    leadDuty: 0.25,
    leadVolume: 0.08,
    arpVolume: 0.022,
    bassVolume: 0.16,
    drumVolume: 0.55,
    chords: [
      { root: 50, notes: [50, 53, 57] },
      { root: 46, notes: [46, 50, 53] },
      { root: 53, notes: [53, 57, 60] },
      { root: 48, notes: [48, 52, 55] },
      { root: 50, notes: [50, 53, 57] },
      { root: 46, notes: [46, 50, 53] },
      { root: 48, notes: [48, 52, 55] },
      { root: 45, notes: [45, 49, 52] },
    ],
    melody: [
      [74, null, 77, null, 81, null, 77, null],
      [74, null, 70, null, 74, null, 77, null],
      [72, null, 77, null, 81, null, 77, null],
      [76, null, 72, null, 67, null, 72, null],
      [74, null, 81, null, 84, null, 81, null],
      [82, null, 77, null, 74, null, 77, null],
      [79, null, 76, null, 72, null, 76, null],
      [81, null, 76, null, 73, null, 69, null],
    ],
  },
  {
    key: 'rain',
    bpm: 94,
    leadDuty: 0.125,
    leadVolume: 0.085,
    arpVolume: 0.03,
    bassVolume: 0.18,
    drumVolume: 0.7,
    chords: [
      { root: 52, notes: [52, 55, 59] },
      { root: 48, notes: [48, 52, 55] },
      { root: 55, notes: [55, 59, 62] },
      { root: 50, notes: [50, 54, 57] },
      { root: 52, notes: [52, 55, 59] },
      { root: 48, notes: [48, 52, 55] },
      { root: 50, notes: [50, 54, 57] },
      { root: 47, notes: [47, 51, 54] },
    ],
    melody: [
      [76, 79, 83, 79, 76, 74, 71, 74],
      [72, 76, 79, 76, 72, 71, 67, 71],
      [74, 79, 83, 86, 83, 79, 74, 71],
      [74, 78, 81, 78, 74, 72, 69, 72],
      [76, 79, 83, 88, 86, 83, 79, 76],
      [84, 79, 76, 72, 76, 79, 81, 84],
      [81, 78, 74, 72, 74, 76, 78, 81],
      [83, 78, 75, 71, 75, 78, 83, 87],
    ],
  },
  {
    key: 'storm',
    bpm: 148,
    leadDuty: 0.5,
    leadVolume: 0.115,
    arpVolume: 0.04,
    bassVolume: 0.21,
    drumVolume: 1.35,
    chords: [
      { root: 50, notes: [50, 53, 57] },
      { root: 46, notes: [46, 50, 53] },
      { root: 43, notes: [43, 46, 50] },
      { root: 45, notes: [45, 49, 52] },
      { root: 50, notes: [50, 53, 57] },
      { root: 46, notes: [46, 50, 53] },
      { root: 48, notes: [48, 52, 55] },
      { root: 45, notes: [45, 49, 52] },
    ],
    melody: [
      [74, 77, 81, 86, 84, 81, 77, 74],
      [82, 81, 77, 74, 77, 81, 82, 86],
      [79, 82, 86, 91, 89, 86, 82, 79],
      [81, 85, 88, 93, 91, 88, 85, 81],
      [86, 84, 81, 77, 81, 84, 86, 89],
      [89, 86, 82, 79, 82, 86, 89, 91],
      [88, 84, 81, 76, 81, 84, 88, 91],
      [93, 91, 88, 85, 81, 85, 88, 81],
    ],
  },
];

const ARP_PATTERN = [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1];

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

function renderTrack(track) {
  const beat = 60 / track.bpm;
  const bar = beat * 4;
  const eighth = beat / 2;
  const sixteenth = beat / 4;
  const duration = bar * BARS;
  const totalSamples = Math.round(duration * SAMPLE_RATE);
  const mix = new Float32Array(totalSamples);
  let noiseState = 0x12345678;

  function addPulse(start, noteDuration, midi, volume, duty) {
    const startSample = Math.max(0, Math.round(start * SAMPLE_RATE));
    const endSample = Math.min(
      totalSamples,
      Math.round((start + noteDuration) * SAMPLE_RATE)
    );
    const freq = midiToFreq(midi);
    const attack = Math.min(0.006, noteDuration * 0.2);
    const release = Math.min(0.055, noteDuration * 0.45);
    let phase = 0;

    for (let i = startSample; i < endSample; i++) {
      const t = (i - startSample) / SAMPLE_RATE;
      phase = (phase + freq / SAMPLE_RATE) % 1;
      const wave = phase < duty ? 1 : -1;
      mix[i] += wave * volume * envelope(t, noteDuration, attack, release);
    }
  }

  function addTriangle(start, noteDuration, midi, volume) {
    const startSample = Math.max(0, Math.round(start * SAMPLE_RATE));
    const endSample = Math.min(
      totalSamples,
      Math.round((start + noteDuration) * SAMPLE_RATE)
    );
    const freq = midiToFreq(midi);
    const attack = Math.min(0.008, noteDuration * 0.2);
    const release = Math.min(0.08, noteDuration * 0.45);
    let phase = 0;

    for (let i = startSample; i < endSample; i++) {
      const t = (i - startSample) / SAMPLE_RATE;
      phase = (phase + freq / SAMPLE_RATE) % 1;
      const wave = 1 - 4 * Math.abs(phase - 0.5);
      mix[i] += wave * volume * envelope(t, noteDuration, attack, release);
    }
  }

  function addNoise(start, noteDuration, volume, brightness = 1) {
    const startSample = Math.max(0, Math.round(start * SAMPLE_RATE));
    const endSample = Math.min(
      totalSamples,
      Math.round((start + noteDuration) * SAMPLE_RATE)
    );
    const attack = Math.min(0.003, noteDuration * 0.2);
    const release = Math.min(0.06, noteDuration * 0.6);
    let held = 0;
    let holdCounter = 0;
    let previous = 0;

    for (let i = startSample; i < endSample; i++) {
      const t = (i - startSample) / SAMPLE_RATE;
      if (holdCounter <= 0) {
        noiseState = (Math.imul(noiseState, 1664525) + 1013904223) >>> 0;
        held = (noiseState / 0xffffffff) * 2 - 1;
        holdCounter = Math.max(1, Math.round(brightness));
      }
      holdCounter--;
      const highPassed = held - previous * 0.35;
      previous = held;
      mix[i] +=
        highPassed * volume * envelope(t, noteDuration, attack, release);
    }
  }

  function addKick(start, volume) {
    const kickDuration = 0.16;
    const startSample = Math.max(0, Math.round(start * SAMPLE_RATE));
    const endSample = Math.min(
      totalSamples,
      Math.round((start + kickDuration) * SAMPLE_RATE)
    );
    let phase = 0;

    for (let i = startSample; i < endSample; i++) {
      const t = (i - startSample) / SAMPLE_RATE;
      const freq = 128 * Math.exp(-t * 28) + 42;
      phase = (phase + freq / SAMPLE_RATE) % 1;
      const env = Math.max(0, 1 - t / kickDuration) ** 2;
      mix[i] += Math.sin(phase * Math.PI * 2) * volume * env;
    }
  }

  for (let barIndex = 0; barIndex < BARS; barIndex++) {
    const barStart = barIndex * bar;
    const chord = track.chords[barIndex % track.chords.length];

    for (let step = 0; step < 8; step++) {
      const note = track.melody[barIndex][step];
      if (note === null || note === undefined) continue;
      addPulse(
        barStart + step * eighth,
        eighth * 0.74,
        note,
        track.leadVolume,
        track.leadDuty
      );
    }

    for (let step = 0; step < 16; step++) {
      const index = ARP_PATTERN[step] % chord.notes.length;
      addPulse(
        barStart + step * sixteenth,
        sixteenth * 0.55,
        chord.notes[index] + 12,
        track.arpVolume,
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
        barStart + step * eighth,
        eighth * 0.82,
        note,
        track.bassVolume
      );
    });

    addKick(barStart, 0.42 * track.drumVolume);
    addKick(barStart + beat * 2, 0.34 * track.drumVolume);
    addNoise(barStart + beat, 0.13, 0.15 * track.drumVolume, 2);
    addNoise(barStart + beat * 3, 0.15, 0.17 * track.drumVolume, 2);

    if (track.key === 'storm') {
      addKick(barStart + beat * 3.5, 0.24 * track.drumVolume);
      addNoise(barStart + beat * 1.75, 0.08, 0.08 * track.drumVolume, 1);
    }

    for (let step = 0; step < 8; step++) {
      addNoise(
        barStart + step * eighth,
        0.035,
        (step % 2 === 0 ? 0.04 : 0.024) * track.drumVolume,
        1
      );
    }
  }

  let peak = 0;
  for (let i = 0; i < totalSamples; i++) {
    peak = Math.max(peak, Math.abs(mix[i]));
  }
  const gain = peak > 0 ? 0.88 / peak : 1;
  const fadeIn = Math.round(0.008 * SAMPLE_RATE);
  const fadeOut = Math.round(0.012 * SAMPLE_RATE);

  for (let i = 0; i < totalSamples; i++) {
    let fade = 1;
    if (i < fadeIn) fade = i / fadeIn;
    const tail = totalSamples - 1 - i;
    if (tail < fadeOut) fade = Math.min(fade, tail / fadeOut);
    mix[i] = Math.tanh(mix[i] * gain * fade);
  }

  return { samples: mix, duration };
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

await fs.mkdir(OUTPUT_DIR, { recursive: true });

for (const track of TRACKS) {
  const { samples, duration } = renderTrack(track);
  const output = path.join(OUTPUT_DIR, `pixel-${track.key}-loop.wav`);
  await fs.writeFile(output, createWav(samples));
  console.log(
    `${path.relative(ROOT, output)} · ${duration.toFixed(2)}s · ${(
      (samples.length * 2) /
      1024 /
      1024
    ).toFixed(2)} MB`
  );
}
