import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

// Admin app is served from /admin/* via the nginx ingress. base must match
// so all generated asset URLs and the HMR client point at /admin/.
export default defineConfig({
  base: "/admin/",
  plugins: [tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // Reach backend directly for development outside the ingress.
    proxy: {
      "/api": {
        target: "http://backend:3000",
        changeOrigin: false,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        dashboard: resolve(__dirname, "dashboard.html"),
        account: resolve(__dirname, "account.html"),
      },
    },
  },
});
