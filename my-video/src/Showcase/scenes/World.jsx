import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, Eyebrow, Footage, Reveal, fade } from "../design";
export const World = ({ world, index }) => {
  const f = useCurrentFrame();
  const titleOpacity = interpolate(f, [0, 14, 100, 123], [0, 1, 1, 0], fade);
  return (
    <AbsoluteFill style={{ background: C.ink, color: C.paper }}>
      <AbsoluteFill>
        <Footage id={world.id} start={world.start} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(0deg, #071010ee 0%, #07101065 15%, transparent 30%, transparent 74%, #07101070 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          opacity: titleOpacity,
          background:
            "linear-gradient(90deg, #071010df 0%, #07101095 30%, transparent 68%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 90,
          top: 267,
          opacity: titleOpacity,
          translate: `${interpolate(f, [0, 24], [-18, 0], fade)}px 0`,
        }}
      >
        <Eyebrow color={world.color}>
          WORLD {String(index + 1).padStart(2, "0")} / 04
        </Eyebrow>
        <div
          style={{
            fontSize: index === 3 ? 110 : 116,
            fontFamily: "Georgia",
            lineHeight: 1.02,
            letterSpacing: -4,
            marginTop: 28,
          }}
        >
          {world.lines.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
        <div style={{ marginTop: 32, fontSize: 28, color: world.color }}>
          {world.tag}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          bottom: 68,
          display: "flex",
          alignItems: "end",
          justifyContent: "space-between",
        }}
      >
        <Reveal delay={15}>
          <div
            style={{
              fontSize: 21,
              color: world.color,
              letterSpacing: 3,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            {world.name}
          </div>
          <div style={{ fontSize: 31, letterSpacing: -0.4 }}>
            {f < 210
              ? world.detail
              : [
                  "Place towers. Upgrade your defenses.",
                  "Read the wave. Pick your counter.",
                  "Call reinforcements. Time your abilities.",
                  "Hold the line across six waves.",
                ][index]}
          </div>
        </Reveal>
        <div style={{ display: "flex", gap: 9, marginBottom: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: i === index ? 70 : 20,
                height: 4,
                background: i === index ? world.color : "#ffffff40",
              }}
            />
          ))}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          height: 4,
          background: world.color,
          width: `${interpolate(f, [0, 419], [0, 100], fade)}%`,
        }}
      />
    </AbsoluteFill>
  );
};
