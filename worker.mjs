import { createThemeAPI } from "./lib/theme-api.mjs";
const themeAPI = createThemeAPI();
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return themeAPI(request, env);
    return env.ASSETS.fetch(request);
  },
};
