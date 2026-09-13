# ALDER — 90-second hackathon film

A 1920 × 1080, 30 fps showcase made from the four original recordings in `clips/`. Composition: **AlderShowcase**, exactly **2,700 frames / 90 seconds**.

## Preview and export

```sh
npm ci
npm run dev
npm run render
```

Export requires FFmpeg and FFprobe. The automatic `postrender` step removes AAC padding to deliver an exact 90.000-second file.

The finished export is `out/alder-hackathon-90s.mp4` (H.264, compatible YUV420p). `npm run render:preview` creates a smaller 540p draft. On machines with Chrome already installed, pass `--browser-executable="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"` to the render command to use it.

## Edit

- `src/Showcase/index.jsx` — master timeline and music.
- `src/Showcase/design.jsx` — theme names, colors, source offsets, shared components.
- `src/Showcase/scenes/` — hook, creation demo, theme chapter, comparison, end card.
- `public/media/` — prepared clips and original score used by Remotion.
- `scripts/prepare-media.py` — recreates the selects using FFmpeg; `--force` refreshes existing selects.
- `scripts/score.mjs` — generates the original 120 BPM stereo score, including transition accents.
- `scripts/finalize.mjs` — trims audio padding and enables fast-start playback.
- `scripts/review.mjs` — renders representative frames for visual review using local Chrome.

Prepared footage and the score are included in Git so the composition can render after cloning. Original MOV recordings in `clips/`, generated review images in `review/`, and exports in `out/` stay local and are ignored by Git. Recreating the prepared footage requires the original recordings.

Original MOV recordings are preserved. The selects remove the browser chrome, normalize variable frame rates to 30 fps, and preserve normal playback speed. Source generation wait is removed with an editorial cut, labeled on screen. Title overlays disappear after roughly four seconds of each theme chapter to leave the action visible. There is no voiceover; the story is told through footage, brief on-screen text, and music.

## Timeline

| Time        | Scene                                                            |
| ----------- | ---------------------------------------------------------------- |
| 00:00–00:06 | Four-theme cold open: “One idea. A world to defend.”             |
| 00:06–00:16 | Actual theme input, reference image, and generated world preview |
| 00:16–00:30 | Candy Kingdom                                                    |
| 00:30–00:44 | Ancient Pyramids                                                 |
| 00:44–00:58 | Hogwarts / Moonspire Academy                                     |
| 00:58–01:12 | Marina Bay Sands                                                 |
| 01:12–01:22 | Four simultaneous worlds; generated visuals, shared combat       |
| 01:22–01:30 | ALDER end card: “What will you defend?”                          |

## Audio and assets

The electronic score is synthesized specifically for this film from oscillators and deterministic noise. It contains no downloaded music or sound samples. All gameplay and the reference image visible within the product capture come from the supplied recordings. Fonts use the locally installed Avenir Next / Georgia stack with fallbacks.

Validation: `npm run lint`. Use FFprobe to verify the delivered runtime and streams, and inspect representative frames before delivery.
