import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  base: 'Concert-job-graphs',
  server: {
    port: 5000,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
