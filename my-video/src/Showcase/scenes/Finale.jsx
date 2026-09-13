import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import {
  Background,
  C,
  Emblem,
  Eyebrow,
  Footage,
  Reveal,
  worlds,
  fade,
} from "../design";
export const Finale = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ color: C.paper }}>
      <Background />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          gap: 4,
          opacity: 0.24,
        }}
      >
        {worlds.map((w) => (
          <div
            key={w.id}
            style={{ width: 480, overflow: "hidden", position: "relative" }}
          >
            <Footage
              id={w.id}
              start={w.start + 18}
              style={{
                position: "absolute",
                width: 1920,
                height: 1080,
                left: -720,
                maxWidth: "none",
              }}
            />
          </div>
        ))}
      </div>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center,#0c1213ed 5%,#0c1213be 52%,#0c121330)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 192,
          textAlign: "center",
        }}
      >
        <Reveal>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Emblem size={68} />
          </div>
        </Reveal>
        <Reveal delay={8}>
          <div
            style={{
              fontSize: 138,
              letterSpacing: 30,
              fontWeight: 400,
              marginTop: 14,
              marginLeft: 30,
            }}
          >
            ALDER
          </div>
        </Reveal>
        <Reveal delay={18}>
          <Eyebrow style={{ marginTop: 10 }}>
            Theme-driven tower defense
          </Eyebrow>
        </Reveal>
        <Reveal delay={30}>
          <div
            style={{
              fontSize: 78,
              fontFamily: "Georgia",
              letterSpacing: -2,
              marginTop: 70,
            }}
          >
            What will <em style={{ color: C.mint }}>you</em> defend?
          </div>
        </Reveal>
        <Reveal delay={42}>
          <div
            style={{
              marginTop: 39,
              fontSize: 27,
              color: C.muted,
              letterSpacing: 1,
            }}
          >
            Describe a theme. Generate a world. Make your stand.
          </div>
        </Reveal>
        <Reveal delay={58}>
          <div
            style={{
              display: "inline-block",
              marginTop: 68,
              borderTop: "1px solid #ffffff35",
              paddingTop: 23,
              fontSize: 20,
              letterSpacing: 4,
              color: C.mint,
            }}
          >
            BUILT WITH OPENAI + THREE.JS
          </div>
        </Reveal>
      </div>
      <AbsoluteFill
        style={{
          background: C.ink,
          opacity: interpolate(f, [218, 239], [0, 1], fade),
        }}
      />
    </AbsoluteFill>
  );
};
