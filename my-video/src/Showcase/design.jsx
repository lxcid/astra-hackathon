import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Video } from "@remotion/media";
import { staticFile } from "remotion";
export const C = {
  ink: "#0c1213",
  paper: "#f6f2e8",
  muted: "#b5bfba",
  mint: "#bcf2c8",
};
export const worlds = [
  {
    id: "candy",
    name: "Candy Kingdom",
    lines: ["Candy", "Kingdom"],
    tag: "A sweeter kind of siege.",
    color: "#ffc4d7",
    detail: "Sugar-spun scenery. Peppermint firepower.",
    start: 2,
  },
  {
    id: "pyramid",
    name: "Ancient Pyramids",
    lines: ["Ancient", "Pyramids"],
    tag: "An ancient world. A new defense.",
    color: "#f4d48e",
    detail: "Desert monuments. Scarabs on the march.",
    start: 5,
  },
  {
    id: "hogwarts",
    name: "Hogwarts",
    lines: ["Hogwarts"],
    tag: "A little magic. A lot of strategy.",
    color: "#d0cef9",
    detail: "Moonspire Academy. Runic artillery.",
    start: 5,
  },
  {
    id: "marina",
    name: "Marina Bay Sands",
    lines: ["Marina", "Bay Sands"],
    tag: "Singapore becomes the battlefield.",
    color: "#b0eddf",
    detail: "Skygardens. Skybridges. A skyline to defend.",
    start: 4,
  },
];
export const ease = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
  easing: Easing.bezier(0.16, 1, 0.3, 1),
};
export const fade = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };
export function Footage({ id, start = 0, style = {} }) {
  return (
    <Video
      muted
      src={staticFile(`media/${id}.mp4`)}
      trimBefore={Math.round(start * 30)}
      style={{ width: "100%", height: "100%", objectFit: "cover", ...style }}
    />
  );
}
export function Emblem({ size = 42, color = C.mint }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path
        d="M32 4 43 25 60 32 43 39 32 60 21 39 4 32 21 25Z"
        stroke={color}
        strokeWidth="2"
      />
      <path d="M32 17 38 32 32 47 26 32Z" fill={color} />
    </svg>
  );
}
export function Brand({ color = C.paper }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        color,
        fontSize: 25,
        fontWeight: 600,
        letterSpacing: 6,
      }}
    >
      <Emblem size={33} color={color} /> ALDER
    </div>
  );
}
export function Eyebrow({ children, color = C.mint, style = {} }) {
  return (
    <div
      style={{
        color,
        fontSize: 21,
        fontWeight: 600,
        letterSpacing: 4,
        textTransform: "uppercase",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
export function Background() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 1000,
          height: 1000,
          right: -330,
          top: -280,
          border: "1px solid #c4e7ce15",
          borderRadius: "50%",
          scale: interpolate(f, [0, 600], [0.95, 1.08], fade),
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 820,
          height: 820,
          right: -240,
          top: -190,
          border: "1px solid #c4e7ce12",
          borderRadius: "50%",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 76% 36%, #8dac7820, transparent 65%)",
        }}
      />
    </AbsoluteFill>
  );
}
export function Reveal({ children, delay = 0, style = {} }) {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        opacity: interpolate(f, [delay, delay + 18], [0, 1], fade),
        translate: `0 ${interpolate(f, [delay, delay + 28], [25, 0], ease)}px`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
