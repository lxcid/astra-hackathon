// Original deterministic electronic score, composed for this 90-second edit.
// No downloaded music, samples, or third-party sound recordings.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const dir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public/media",
);
const sr = 48000,
  seconds = 90,
  N = sr * seconds,
  L = new Float32Array(N),
  R = new Float32Array(N);
let seed = 418;
const noise = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2147483648 - 1;
};
const hz = (n) => 440 * 2 ** ((n - 69) / 12);
const tau = 2 * Math.PI;
function add(start, dur, fn, vol = 0.1, pan = 0) {
  const a = Math.floor(start * sr),
    len = Math.floor(dur * sr);
  for (let i = 0; i < len && a + i < N; i++) {
    if (a + i < 0) continue;
    const t = i / sr,
      v = fn(t, i, len) * vol;
    L[a + i] += v * Math.sqrt((1 - pan) / 2);
    R[a + i] += v * Math.sqrt((1 + pan) / 2);
  }
}
function note(at, n, dur, vol, pan = 0, kind = "pluck") {
  const f = hz(n);
  add(
    at,
    dur,
    (t) => {
      const env =
        kind === "pad"
          ? Math.min(t / 0.7, 1) * Math.min((dur - t) / 0.8, 1)
          : Math.min(t / 0.006, 1) * Math.exp(-t * 5);
      return (
        env *
        (Math.sin(tau * f * t) +
          0.25 * Math.sin(tau * f * 2.002 * t) +
          0.1 * Math.sin(tau * f * 3 * t))
      );
    },
    vol,
    pan,
  );
}
const beat = 0.5; // 120 BPM, scene cuts land on downbeats.
const chords = [
  [50, 57, 62, 65, 69],
  [46, 53, 58, 62, 65],
  [53, 60, 65, 69, 72],
  [48, 55, 60, 64, 67],
];
for (let bar = 0; bar < 45; bar++) {
  const at = bar * 2,
    ch = chords[Math.floor(bar / 2) % 4];
  const energy =
    at < 6 ? 0.45 : at < 16 ? 0.32 : at < 72 ? 0.8 : at < 82 ? 1 : 0.45;
  ch.forEach((n, i) => note(at, n, 2.8, 0.04 * energy, (i - 2) * 0.35, "pad"));
  if (at >= 6 && at < 86)
    for (let s = 0; s < 8; s++) {
      note(
        at + s * 0.25,
        ch[[0, 2, 3, 4, 2, 3, 1, 3][s]] + 12,
        0.7,
        0.065 * energy,
        s % 2 ? 0.45 : -0.45,
      );
      if (s % 2 === 0) note(at + s * 0.25, ch[0] - 12, 0.4, 0.16 * energy, 0);
    }
  if (at >= 16 && at < 82) {
    for (let b = 0; b < 4; b++) {
      add(
        at + b * beat,
        0.3,
        (t) =>
          Math.sin(tau * (47 * t + 8 * (1 - Math.exp(-t * 30)))) *
          Math.exp(-t * 17),
        0.43,
      );
      if (b % 2)
        add(
          at + b * beat,
          0.16,
          (t) =>
            (noise() * 0.7 + Math.sin(tau * 185 * t) * 0.3) * Math.exp(-t * 28),
          0.17,
        );
    }
    for (let s = 0; s < 8; s++)
      add(
        at + s * 0.25,
        0.055,
        (t) => noise() * Math.exp(-t * 75),
        s % 2 ? 0.065 : 0.035,
        s % 2 ? 0.6 : -0.6,
      );
  }
}
// The melody opens out across the final world and comparison.
[74, 77, 81, 79, 77, 74, 72, 69, 74, 77, 81, 84, 81, 79, 77, 74].forEach(
  (n, i) => note(58 + i * 1.5, n, 1.8, 0.075, i % 2 ? 0.25 : -0.25),
);
for (const cut of [6, 16, 30, 44, 58, 72, 82]) {
  add(cut - 0.65, 0.65, (t) => noise() * (t / 0.65) ** 2 * 0.65, 0.13);
  add(
    cut,
    1.4,
    (t) =>
      Math.sin(tau * 42 * t) * Math.exp(-t * 5) +
      noise() * 0.12 * Math.exp(-t * 12),
    0.28,
  );
  [74, 81, 86].forEach((n, i) =>
    note(cut + i * 0.05, n, 1.3, 0.045, (i - 1) * 0.5),
  );
}
// Closing D minor add9 resolves under the end card.
[50, 57, 62, 65, 69, 76].forEach((n, i) =>
  note(86, n, 4, 0.065, (i - 2.5) * 0.25, "pad"),
);
let peak = 0;
for (let i = 0; i < N; i++) {
  let t = i / sr;
  const env = Math.min(t / 0.6, 1) * Math.min((90 - t) / 2, 1);
  L[i] = Math.tanh(L[i] * env);
  R[i] = Math.tanh(R[i] * env);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const wav = Buffer.alloc(44 + N * 4);
wav.write("RIFF");
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(sr, 24);
wav.writeUInt32LE(sr * 4, 28);
wav.writeUInt16LE(4, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  wav.writeInt16LE(Math.round((L[i] / peak) * 27000), 44 + i * 4);
  wav.writeInt16LE(Math.round((R[i] / peak) * 27000), 46 + i * 4);
}
fs.writeFileSync(path.join(dir, "alder-score.wav"), wav);
console.log("Wrote original 90-second stereo score.");
