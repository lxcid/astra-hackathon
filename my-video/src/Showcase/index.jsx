import { AbsoluteFill, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { TransitionSeries } from "@remotion/transitions";
import { Hook } from "./scenes/Hook";
import { Creator } from "./scenes/Creator";
import { World } from "./scenes/World";
import { Comparison } from "./scenes/Comparison";
import { Finale } from "./scenes/Finale";
import { worlds } from "./design";
export const Showcase = () => (
  <AbsoluteFill
    style={{
      fontFamily: '"Avenir Next", Avenir, Arial, sans-serif',
      background: "#0c1213",
    }}
  >
    <Audio src={staticFile("media/alder-score.wav")} />
    <TransitionSeries>
      <TransitionSeries.Sequence
        durationInFrames={180}
        name="01 · One idea. Four worlds."
      >
        <Hook />
      </TransitionSeries.Sequence>
      <TransitionSeries.Sequence
        durationInFrames={300}
        name="02 · Describe → Generate → Play"
      >
        <Creator />
      </TransitionSeries.Sequence>
      {worlds.map((world, index) => (
        <TransitionSeries.Sequence
          key={world.id}
          durationInFrames={420}
          name={`0${index + 3} · ${world.name}`}
        >
          <World world={world} index={index} />
        </TransitionSeries.Sequence>
      ))}
      <TransitionSeries.Sequence
        durationInFrames={300}
        name="07 · Four worlds. One engine."
      >
        <Comparison />
      </TransitionSeries.Sequence>
      <TransitionSeries.Sequence
        durationInFrames={240}
        name="08 · What will you defend?"
      >
        <Finale />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
