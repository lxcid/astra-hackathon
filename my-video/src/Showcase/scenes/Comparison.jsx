import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import {
  Background,
  Brand,
  C,
  Eyebrow,
  Footage,
  Reveal,
  worlds,
  ease,
} from "../design";
export const Comparison = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ color: C.paper }}>
      <Background />
      <div style={{ position: "absolute", left: 90, top: 62 }}>
        <Brand />
      </div>
      <div style={{ position: "absolute", left: 90, top: 153 }}>
        <Reveal>
          <div style={{ fontSize: 72, letterSpacing: -2 }}>
            The strategy stays.{" "}
            <span
              style={{
                fontFamily: "Georgia",
                fontStyle: "italic",
                color: C.mint,
              }}
            >
              The world changes.
            </span>
          </div>
        </Reveal>
      </div>
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 288,
          right: 90,
          height: 560,
          display: "flex",
          gap: 18,
        }}
      >
        {worlds.map((w, i) => (
          <div
            key={w.id}
            style={{
              position: "relative",
              flex: 1,
              overflow: "hidden",
              borderRadius: 10,
              border: `1px solid ${w.color}50`,
              translate: `0 ${interpolate(f, [i * 4, i * 4 + 25], [55, 0], ease)}px`,
            }}
          >
            <Footage
              id={w.id}
              start={w.start + 20}
              style={{
                position: "absolute",
                width: 996,
                height: 560,
                maxWidth: "none",
                left: -292,
                top: 0,
                objectFit: "fill",
              }}
            />
            <AbsoluteFill
              style={{
                background: "linear-gradient(0deg,#071010ee, transparent 45%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 24,
                top: 24,
                color: w.color,
                fontSize: 20,
                letterSpacing: 3,
              }}
            >
              0{i + 1}
            </div>
            <div
              style={{
                position: "absolute",
                left: 24,
                right: 20,
                bottom: 27,
                fontFamily: "Georgia",
                fontSize: 37,
                lineHeight: 1.1,
                color: w.color,
              }}
            >
              {w.name}
            </div>
          </div>
        ))}
      </div>
      <Reveal
        delay={35}
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          bottom: 86,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Eyebrow color={C.paper}>Themed towers + enemies</Eyebrow>
        <Eyebrow color={C.paper}>Distinct landmarks + palettes</Eyebrow>
        <Eyebrow color={C.mint}>One combat engine</Eyebrow>
      </Reveal>
    </AbsoluteFill>
  );
};
