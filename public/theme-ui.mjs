import { applyThemeColors } from "./ui-palette.mjs";
import { BUILDINGS, ENEMY_TYPES, WAVES } from "./world.mjs";
import { ROLE_COPY } from "./theme.mjs";
export function themeText(text, theme) {
  const replacements = [
    ...Object.entries(BUILDINGS).map(([k, v]) => [
      v.name,
      theme.towers[k].name,
    ]),
    ...Object.entries(ENEMY_TYPES).map(([k, v]) => [
      v.name,
      theme.enemies[k].name,
    ]),
    ...WAVES.map((v, i) => [v.name, `Wave ${i + 1}`]),
    ["Root wardens", theme.abilities.rally.name],
    ["root wardens", theme.abilities.rally.name],
    ["wardens", theme.abilities.rally.name],
    ["Life bloom", theme.abilities.bloom.name],
    ["Alder", theme.goal],
    ["The hollow", "The enemy"],
  ].sort((a, b) => b[0].length - a[0].length);
  const escaped = replacements.map(([from]) =>
    from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  return text.replace(
    new RegExp(escaped.join("|"), "g"),
    (match) => replacements.find(([from]) => from === match)[1],
  );
}
export function applyThemeUI(theme) {
  const $ = (s) => document.querySelector(s);
  document.title = `${theme.title} — ALDER`;
  applyThemeColors(theme);
  $("#title-screen .eyebrow").textContent = theme.prompt;
  $("#title-screen h1").textContent = theme.title;
  $("#title-screen .subtitle").textContent = `Defend ${theme.goal}.`;
  $("#title-screen .intro").textContent =
    "Raise your towers. Hold the bends. Make this world your own.";
  $("#begin").textContent = "Play this world ↗";
  $("#route-status").textContent =
    `Route ${theme.routeSeed.toString(16).toUpperCase()} · shuffle before playing`;
  $("#title-screen .title-small").textContent =
    `${theme.source === "ai" ? "AI-DESIGNED" : "EXAMPLE"} WORLD · SIX WAVES`;
  $("#title-screen .title-bottom > span").textContent = theme.interpretation;
  for (const [key, definition] of Object.entries({
    ...theme.towers,
    ...theme.abilities,
  })) {
    const button = $(`[data-action="${key}"]`);
    button.querySelector("strong").textContent = definition.name;
    button.querySelector(".tip").textContent = ROLE_COPY[key];
  }
  $("#pause-overlay h2").textContent = "Your world waits.";
  $("#help .eyebrow").textContent = "DEFEND YOUR WORLD";
  $("#help p").textContent =
    `Enemies follow the marked road to ${theme.goal}. Each escape costs lives. Amber comes from defeated enemies and cleared waves.`;
  const terms = $("#help").querySelectorAll("dt");
  terms[1].textContent = `5 · ${theme.abilities.rally.name}`;
  terms[2].textContent = `6 / Space · ${theme.abilities.bloom.name}`;
  $("#help dd").textContent =
    "Choose rapid, splash, slow, or armor-piercing towers. Click a tower to upgrade or sell it.";
  $("#close-help").textContent = "Back to the world";
  $("#seed-title").textContent = "World details ↗";
  $("#seed-game").textContent = "World details ↗";
  $("#seed-modal .eyebrow").textContent = "YOUR WORLD DESIGN";
  $("#seed-modal h2").textContent = theme.title;
  $("#seed-modal .seed-pair")?.remove();
  $("#seed-modal p").textContent = theme.prompt;
  $("#seed-modal small").textContent =
    `${theme.interpretation} Four tower roles, six waves, and a seeded route. Combat rules stay fixed.`;
}
