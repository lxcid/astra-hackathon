import { test } from "node:test";
import assert from "node:assert/strict";
import { uiPalette, contrast } from "../public/ui-palette.mjs";
import { generateTheme } from "../public/theme.mjs";
test("theme surfaces differ and small text retains readable contrast for extreme AI palettes", () => {
  const themes = [
    "forest",
    "cyberpunk",
    "candy",
    "ocean",
    "volcanic",
    "winter",
  ].map((t) => generateTheme(t).palette);
  for (const fill of ["#000000", "#ffffff", "#ff00ff", "#0000ff"])
    themes.push(
      Object.fromEntries(Object.keys(themes[0]).map((k) => [k, fill])),
    );
  const panels = new Set();
  for (const palette of themes) {
    const tokens = uiPalette(palette);
    panels.add(tokens.panel);
    for (const ink of ["text", "muted", "accent", "danger", "success", "warm"])
      for (const surface of ["bg", "panel", "raised"])
        assert.ok(
          contrast(tokens[ink], tokens[surface]) >= 4.5,
          `${ink} on ${surface}`,
        );
    assert.ok(contrast(tokens.accent, tokens["on-accent"]) >= 4.5);
  }
  assert.ok(panels.size > 6);
});
