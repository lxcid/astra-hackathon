import {
  validateReferenceImage,
  referenceFingerprint,
} from "./reference-image.mjs";
import { interpretTheme, ThemeError } from "./theme-service.mjs";

// One Fetch handler serves both the local Node server and the hosted Worker.
export function createThemeAPI(interpret = interpretTheme) {
  const cache = new Map();
  let generating = 0;
  const json = (status, data) =>
    Response.json(data, {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  return async function handle(request, env = {}) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/config" && request.method === "GET")
        return json(200, { aiAvailable: Boolean(env.OPENAI_API_KEY) });
      if (url.pathname !== "/api/theme")
        return json(404, { error: "Not found" });
      if (request.method !== "POST")
        return json(405, { error: "Use POST to create a theme." });
      const origin = request.headers.get("origin");
      if (
        (origin && origin !== url.origin) ||
        request.headers.get("sec-fetch-site") === "cross-site"
      )
        return json(403, { error: "Use this application's world creator." });
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return json(415, { error: "Send a JSON theme request." });
      let body = "",
        size = 0;
      const reader = request.body?.getReader(),
        decoder = new TextDecoder();
      if (reader) {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 1500000) {
              await reader.cancel();
              throw new ThemeError(
                "Theme request is too large.",
                413,
                "too_large",
              );
            }
            body += decoder.decode(value, { stream: true });
          }
          body += decoder.decode();
        } finally {
          reader.releaseLock();
        }
      }
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        if (size > 2048)
          throw new ThemeError("Theme request is too large.", 413, "too_large");
        throw new ThemeError("Invalid JSON request.", 400, "invalid_request");
      }
      const { theme, variant = 0 } = data || {};
      let referenceImage;
      try {
        referenceImage = validateReferenceImage(data?.referenceImage);
      } catch (error) {
        throw new ThemeError(error.message, 400, "invalid_image");
      }
      if (!referenceImage && size > 2048)
        throw new ThemeError("Theme request is too large.", 413, "too_large");
      if (
        typeof theme !== "string" ||
        !theme.trim() ||
        theme.trim().length > 160 ||
        !Number.isInteger(variant) ||
        variant < 0 ||
        variant > 4294967295
      )
        throw new ThemeError(
          "Enter a theme of 1–160 characters and a valid variant.",
          400,
          "invalid_request",
        );
      const model = env.OPENAI_THEME_MODEL || "gpt-5.6-terra";
      const key = JSON.stringify([
        model,
        theme.trim().toLowerCase(),
        variant,
        await referenceFingerprint(referenceImage),
      ]);
      if (cache.has(key))
        return json(200, { theme: cache.get(key), cached: true });
      if (generating >= 2)
        return json(429, {
          error: "Two worlds are already being created. Try again shortly.",
        });
      generating++;
      try {
        const design = await interpret(theme, variant, {
          apiKey: env.OPENAI_API_KEY || "",
          model,
          ...(referenceImage ? { referenceImage } : {}),
        });
        if (cache.size >= 24) cache.delete(cache.keys().next().value);
        cache.set(key, design);
        return json(200, { theme: design, cached: false });
      } finally {
        generating--;
      }
    } catch (error) {
      return json(error instanceof ThemeError ? error.status : 500, {
        error:
          error instanceof ThemeError
            ? error.message
            : "Unable to create the world. Please try again.",
        code: error instanceof ThemeError ? error.code : "server_error",
      });
    }
  };
}
