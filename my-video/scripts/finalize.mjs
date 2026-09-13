// AAC encoders may pad the end. Deliver exactly 90 seconds with fast-start metadata.
import { execFileSync } from "node:child_process";
import { renameSync } from "node:fs";
const output = "out/alder-hackathon-90s.mp4";
const temporary = "out/alder-exact-90s.mp4";
execFileSync(
  "ffmpeg",
  [
    "-v",
    "error",
    "-i",
    output,
    "-i",
    "public/media/alder-score.wav",
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-t",
    "90",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "320k",
    "-movflags",
    "+faststart",
    "-y",
    temporary,
  ],
  { stdio: "inherit" },
);
const result = JSON.parse(
  execFileSync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "json",
    temporary,
  ]),
);
if (Number(result.format.duration) !== 90)
  throw new Error(`Expected 90 seconds, got ${result.format.duration}`);
renameSync(temporary, output);
console.log("Finalized exactly 90.000 seconds.");
