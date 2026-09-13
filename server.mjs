import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { createThemeAPI } from "./lib/theme-api.mjs";
const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, "public");
const vendor = resolve(directory, "node_modules/three");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};
const themeAPI = createThemeAPI();
export const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    const host = req.headers.host;
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host || "")) {
      res.writeHead(403, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          error: "Use the local application to generate a world.",
        }),
      );
    }
    const request = new Request(`http://${host}${req.url}`, {
      method: req.method,
      headers: req.headers,
      ...(!["GET", "HEAD"].includes(req.method)
        ? { body: Readable.toWeb(req), duplex: "half" }
        : {}),
    });
    const response = await themeAPI(request, process.env);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    return res.end(await response.text());
  }

  try {
    const isVendor = url.pathname.startsWith("/vendor/three/");
    const base = isVendor ? vendor : root;
    const relative =
      decodeURIComponent(
        isVendor
          ? url.pathname.slice("/vendor/three/".length)
          : url.pathname.slice(1),
      ) || "index.html";
    const file = resolve(base, relative);
    if (!file.startsWith(base + sep) || !(await stat(file)).isFile())
      throw new Error("Not found");
    res.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  server.listen(Number(process.env.PORT || 3000), "127.0.0.1", () =>
    console.log(
      `ALDER is running at http://127.0.0.1:${server.address().port}`,
    ),
  );
