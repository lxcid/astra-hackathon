import { prepareReferenceImage } from "./reference-image.mjs";
import { createBattlefield, shuffleBattlefield } from "./battlefield.mjs";
import { applyThemeColors } from "./ui-palette.mjs";
import {
  activeTheme,
  generateTheme,
  DEFAULT_THEME,
  setActiveTheme,
  validateTheme,
} from "./theme.mjs";
const $ = (selector) => document.querySelector(selector);
const form = $("#theme-form"),
  input = $("#theme-input"),
  status = $("#generation-status"),
  button = $("#generate-world");
let busy = false,
  saved,
  renderFailed = false,
  referenceImage = null;
try {
  saved = validateTheme(JSON.parse(localStorage.getItem("alder-world-v1")));
  $("#resume-world").classList.remove("hidden");
} catch {
  /* Missing or obsolete save. */
}
if (saved) input.value = saved.prompt;
applyThemeColors(saved || generateTheme(DEFAULT_THEME));
input.addEventListener("input", () => {
  if (input.value.trim()) applyThemeColors(generateTheme(input.value));
});
async function play(design) {
  setActiveTheme(design);
  applyThemeColors(design);
  try {
    localStorage.setItem("alder-world-v1", JSON.stringify(design));
  } catch {
    /* Play also works with storage disabled. */
  }
  $("#loading").classList.remove("hidden");
  try {
    await import("./game.mjs");
    $("#creator").classList.add("hidden");
    $("#begin").focus();
  } catch (error) {
    $("#loading").classList.add("hidden");
    status.textContent =
      "The 3D world could not load. Check that WebGL is enabled and reload to try again.";
    status.classList.add("error");
    console.error("World rendering failed:", error);
    renderFailed = true;
    button.disabled = true;
    button.textContent = "Reload to retry";
    const reload = document.createElement("button");
    reload.type = "button";
    reload.id = "reload-world";
    reload.textContent = "Reload";
    reload.onclick = () => location.reload();
    form.append(reload);
  }
}
function setBusy(value) {
  busy = value;
  for (const control of document.querySelectorAll(
    "#creator button:not(#reload-world), #creator textarea, #creator input",
  ))
    control.disabled = value || renderFailed;
  form.setAttribute("aria-busy", String(value));
  button.textContent = renderFailed
    ? "Reload to retry"
    : value
      ? "Imagining your world…"
      : "Create my world ↗";
}
function clearReference(resetInput = true) {
  referenceImage = null;
  if (resetInput) $("#reference-image").value = "";
  $("#reference-thumbnail").removeAttribute("src");
  $("#reference-preview").classList.add("hidden");
  $("#reference-status").textContent = "";
}
$("#remove-reference").onclick = clearReference;
$("#reference-image").onchange = async () => {
  const file = $("#reference-image").files[0];
  if (!file) return;
  clearReference(false);
  setBusy(true);
  $("#reference-status").textContent = "Preparing your image…";
  try {
    referenceImage = await prepareReferenceImage(file);
    $("#reference-thumbnail").src = referenceImage;
    $("#reference-name").textContent = file.name;
    $("#reference-preview").classList.remove("hidden");
    $("#reference-status").textContent =
      "Ready. Your image will be sent to OpenAI with your description.";
  } catch (error) {
    $("#reference-status").textContent = error.message;
  } finally {
    setBusy(false);
  }
};
for (const suggestion of document.querySelectorAll("[data-prompt]"))
  suggestion.onclick = () => {
    input.value = suggestion.dataset.prompt;
    applyThemeColors(generateTheme(input.value));
    input.focus();
  };
form.onsubmit = async (event) => {
  event.preventDefault();
  if (busy || !form.reportValidity()) return;
  if (!input.value.trim()) {
    status.textContent = "Add a few words to describe your world.";
    return;
  }
  setBusy(true);
  status.classList.remove("error");
  status.textContent =
    "Designing your towers, creatures, and landscape. This can take a minute.";
  const timeout = setTimeout(() => {
    status.textContent = "Still creating the details of your world…";
  }, 25000);
  try {
    const response = await fetch("/api/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        theme: input.value.trim(),
        variant: crypto.getRandomValues(new Uint32Array(1))[0],
        ...(referenceImage ? { referenceImage } : {}),
      }),
      signal: AbortSignal.timeout(100000),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        result.error || "Unable to create this world. Please try again.",
      );
    clearTimeout(timeout);
    status.textContent = "Your design is ready. Assembling the world…";
    await play(validateTheme(result.theme));
  } catch (error) {
    status.classList.add("error");
    status.textContent =
      error.name === "TimeoutError"
        ? "World creation took too long. Please try again."
        : error.message;
  } finally {
    clearTimeout(timeout);
    setBusy(false);
  }
};
$("#example-world").onclick = async () => {
  if (busy) return;
  setBusy(true);
  await play(generateTheme(DEFAULT_THEME));
  setBusy(false);
};
$("#resume-world").onclick = async () => {
  if (busy || !saved) return;
  setBusy(true);
  await play(saved);
  setBusy(false);
};
for (const control of document.querySelectorAll(".new-world"))
  control.onclick = () => location.reload();
fetch("/api/config")
  .then((r) => {
    if (!r.ok) throw new Error();
    return r.json();
  })
  .then((config) => {
    if (!config.aiAvailable && !busy)
      status.textContent =
        "AI world creation is not connected yet. You can explore the woodland example.";
  })
  .catch(() => {
    if (!busy)
      status.textContent =
        "Cannot reach the world creator. Check the server and try again.";
  });

$("#shuffle-route").onclick = () => {
  try {
    const routeSeed = shuffleBattlefield(
      createBattlefield(activeTheme.routeSeed),
      () => crypto.getRandomValues(new Uint32Array(1))[0],
    ).seed;
    const design = validateTheme({ ...activeTheme, routeSeed });
    sessionStorage.setItem("alder-pending-world", JSON.stringify(design));
    location.reload();
  } catch {
    $("#route-status").textContent =
      "Route shuffle needs browser storage. Enable it and try again.";
  }
};
try {
  const pending = sessionStorage.getItem("alder-pending-world");
  sessionStorage.removeItem("alder-pending-world");
  if (pending) {
    const design = validateTheme(JSON.parse(pending));
    setBusy(true);
    play(design).finally(() => setBusy(false));
  }
} catch {
  /* Invalid pending designs return to the creator. */
}
