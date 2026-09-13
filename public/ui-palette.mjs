function rgb(color) {
  return [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
}
export function mix(a, b, t) {
  return (
    "#" +
    rgb(a)
      .map((v, i) =>
        Math.round(v * (1 - t) + rgb(b)[i] * t)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
function luminance(color) {
  return rgb(color)
    .map((v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}
export function contrast(a, b) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function readable(color, background) {
  let result = color;
  for (let i = 0; i < 20 && contrast(result, background) < 4.5; i++)
    result = mix(result, "#ffffff", 0.12);
  return result;
}
export function uiPalette(palette) {
  const base = mix(palette.sky, palette.body, 0.35),
    background = mix(base, "#000000", 0.8),
    panel = mix(base, "#000000", 0.6);
  let raised = mix(base, "#000000", 0.38);
  while (contrast("#ffffff", raised) < 5.5)
    raised = mix(raised, "#000000", 0.12);
  const surface = luminance(raised) > luminance(panel) ? raised : panel;
  const accent = readable(palette.glow, surface),
    text = readable(mix(palette.trim, "#ffffff", 0.87), surface);
  return {
    bg: background,
    panel,
    raised,
    text,
    muted: readable(mix(text, panel, 0.26), surface),
    accent,
    "on-accent":
      contrast(accent, "#000000") > contrast(accent, "#ffffff")
        ? "#000000"
        : "#ffffff",
    border: mix(accent, panel, 0.65),
    danger: readable(palette.danger, surface),
    success: readable(palette.foliage, surface),
    warm: readable(palette.trim, surface),
  };
}
export function applyThemeColors(theme) {
  const tokens = uiPalette(theme.palette);
  for (const [name, color] of Object.entries(tokens))
    document.documentElement.style.setProperty(`--ui-${name}`, color);
  document.documentElement.style.setProperty("--theme-accent", tokens.accent);
  document.documentElement.style.setProperty("--theme-surface", tokens.panel);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", tokens.bg);
}
