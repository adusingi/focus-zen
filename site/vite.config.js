import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// The landing page (focus.mobayilo.com): plain HTML and CSS, no JavaScript.
// Vite only fingerprints the assets and writes site/dist for `wrangler deploy`.
const here = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  root: here("."),
  appType: "mpa",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        index: here("index.html"),
        thanks: here("thanks.html"),
        notFound: here("404.html"),
      },
    },
  },
});
