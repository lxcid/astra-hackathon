import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import { Brand, C, Footage, worlds, fade } from "../design";
export const Hook = () => {
  const f = useCurrentFrame();
  const idx = Math.min(3, Math.floor(f / 45));
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {worlds.map((w, i) => (
        <Sequence key={w.id} from={i * 45} durationInFrames={45}>
          <AbsoluteFill style={{ scale: 1.07 }}>
            <Footage id={w.id} start={w.start + 7} />
          </AbsoluteFill>
        </Sequence>
      ))}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(90deg, #071010d9 0%, #07101095 52%, #07101020), linear-gradient(0deg,#071010bb,transparent 35%)",
        }}
      />
      <div style={{ position: "absolute", left: 90, top: 68 }}>
        <Brand />
      </div>
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 324,
          fontSize: 112,
          lineHeight: 1.01,
          fontWeight: 500,
          letterSpacing: -5,
          color: C.paper,
        }}
      >
        <div style={{ opacity: interpolate(f, [0, 10], [0, 1], fade) }}>
          One idea.
        </div>
        <div style={{ opacity: interpolate(f, [24, 38], [0, 1], fade) }}>
          A world to{" "}
          <span
            style={{
              fontFamily: "Georgia",
              fontStyle: "italic",
              color: worlds[idx].color,
            }}
          >
            defend.
          </span>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 94,
          color: C.paper,
          fontSize: 26,
          letterSpacing: 5,
        }}
      >
        AI-GENERATED WORLDS. REAL TOWER DEFENSE.
      </div>
      <div
        style={{
          position: "absolute",
          right: 92,
          top: 72,
          color: worlds[idx].color,
          fontSize: 23,
          letterSpacing: 2,
        }}
      >
        {String(idx + 1).padStart(2, "0")} / {worlds[idx].name.toUpperCase()}
      </div>
      <div
        style={{
          position: "absolute",
          left: 92,
          right: 92,
          bottom: 58,
          display: "flex",
          gap: 10,
        }}
      >
        {worlds.map((w, i) => (
          <div
            key={w.id}
            style={{
              height: 3,
              flex: 1,
              background: i <= idx ? w.color : "#ffffff30",
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
