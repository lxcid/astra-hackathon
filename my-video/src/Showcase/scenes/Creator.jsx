import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import {
  Background,
  Brand,
  C,
  Eyebrow,
  Footage,
  Reveal,
  fade,
} from "../design";
export const Creator = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ color: C.paper }}>
      <Background />
      <div style={{ position: "absolute", left: 90, top: 68 }}>
        <Brand />
      </div>
      <div style={{ position: "absolute", left: 90, top: 273, width: 590 }}>
        <Reveal>
          <Eyebrow>From imagination to action</Eyebrow>
        </Reveal>
        <Reveal delay={8}>
          <div
            style={{
              fontSize: 96,
              lineHeight: 1.02,
              letterSpacing: -4,
              marginTop: 30,
            }}
          >
            Describe it.
            <br />
            <span
              style={{
                fontFamily: "Georgia",
                fontStyle: "italic",
                color: C.mint,
              }}
            >
              Defend it.
            </span>
          </div>
        </Reveal>
        <Reveal delay={25}>
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.5,
              color: C.muted,
              marginTop: 32,
              width: 530,
            }}
          >
            Start with a theme.
            <br />
            Add an optional reference image.
            <br />
            Play the world AI creates.
          </div>
        </Reveal>
        <Reveal delay={40}>
          <div
            style={{
              marginTop: 40,
              borderTop: "1px solid #ffffff25",
              paddingTop: 24,
              fontSize: 22,
              letterSpacing: 1,
              color: C.mint,
            }}
          >
            THEME → GENERATED 3D WORLD → PLAY
          </div>
        </Reveal>
      </div>
      <div
        style={{
          position: "absolute",
          left: 735,
          top: 202,
          width: 1095,
          height: 680,
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid #ffffff30",
          boxShadow: "0 28px 100px #0008",
        }}
      >
        <Sequence durationInFrames={210}>
          <Footage
            id="creator"
            style={{
              width: 2150,
              height: 1210,
              position: "absolute",
              left: -126,
              top: -515,
              objectFit: "fill",
            }}
          />
        </Sequence>
        <Sequence from={210} durationInFrames={90}>
          <Footage
            id="reveal"
            style={{
              width: 1250,
              height: 703,
              position: "absolute",
              left: -45,
              top: 0,
              objectFit: "fill",
            }}
          />
        </Sequence>
        <div
          style={{
            position: "absolute",
            inset: 0,
            boxShadow: "inset 0 0 0 1px #ffffff12",
            pointerEvents: "none",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 735,
          top: 928,
          right: 90,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 20,
          color: C.muted,
          letterSpacing: 2,
        }}
      >
        <span>ACTUAL PRODUCT CAPTURE</span>
        <span
          style={{
            color: C.mint,
            opacity: interpolate(f, [205, 215], [0, 1], fade),
          }}
        >
          GENERATION WAIT REMOVED ↗
        </span>
      </div>
    </AbsoluteFill>
  );
};
