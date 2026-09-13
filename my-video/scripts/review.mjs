import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  selectComposition,
  renderStill,
} from "@remotion/renderer";
import path from "node:path";
import { enableTailwind } from "@remotion/tailwind-v4";
const browserExecutable =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const serveUrl = await bundle({
  entryPoint: path.resolve("src/index.js"),
  rspack: true,
  bundlerOverride: enableTailwind,
});
const browser = await openBrowser("chrome", { browserExecutable });
try {
  const composition = await selectComposition({
    serveUrl,
    id: "AlderShowcase",
    puppeteerInstance: browser,
  });
  for (const [name, frame] of [
    ["hook", 110],
    ["creator", 290],
    ["reveal", 430],
    ["candy", 550],
    ["combat", 750],
    ["pyramid", 965],
    ["hogwarts", 1400],
    ["marina", 1820],
    ["comparison", 2295],
    ["finale", 2575],
  ]) {
    await renderStill({
      serveUrl,
      composition,
      frame,
      output: `review/${name}.png`,
      puppeteerInstance: browser,
      logLevel: "error",
    });
    console.log(`Checked ${name}: frame ${frame}`);
  }
} finally {
  await browser.close({ silent: true });
}
