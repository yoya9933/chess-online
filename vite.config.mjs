import { defineConfig } from "vite";
import vinext from "vinext";

export default defineConfig({
  plugins: [vinext()],
  build: {
    rollupOptions: {
      external: ["cloudflare:workers"],
    },
  },
});
