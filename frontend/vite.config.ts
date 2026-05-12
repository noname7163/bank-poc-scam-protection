import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import type { Connect } from "vite";
import { resolve } from "node:path";

const BACKEND_INTERNAL_URL =
  process.env.VITE_BACKEND_INTERNAL_URL ?? "http://backend:3000";

// MPA path rewrites. Real path-style URLs (`/overview`, `/transaction/:id`) are
// mapped to the matching `<page>.html` so each "page" stays a separate document
// with its own CSP nonce, fresh shield bootstrap, etc.
const pathRewrites: Array<{ match: RegExp; html: string }> = [
  { match: /^\/overview\/?$/, html: "/overview.html" },
  { match: /^\/transaction\/[^/]+\/?$/, html: "/transaction.html" },
  { match: /^\/quarantine\/?$/, html: "/quarantine.html" },
  { match: /^\/locked\/?$/, html: "/locked.html" },
];

function rewriteMiddleware(): Connect.NextHandleFunction {
  return (req, _res, next) => {
    if (!req.url) return next();
    const [pathname, search = ""] = req.url.split("?");
    for (const { match, html } of pathRewrites) {
      if (match.test(pathname)) {
        req.url = search ? `${html}?${search}` : html;
        break;
      }
    }
    next();
  };
}

const PUBLIC_BANK_HOST =
  process.env.VITE_PUBLIC_BANK_HOST ?? "http://localhost:8080";

export default defineConfig({
  define: {
    __PUBLIC_BANK_HOST__: JSON.stringify(PUBLIC_BANK_HOST),
  },
  plugins: [
    tailwindcss(),
    {
      name: "banking-shield-path-rewrite",
      configureServer(server) {
        server.middlewares.use(rewriteMiddleware());
      },
    },
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: BACKEND_INTERNAL_URL,
        changeOrigin: false,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        overview: resolve(__dirname, "overview.html"),
        transaction: resolve(__dirname, "transaction.html"),
        quarantine: resolve(__dirname, "quarantine.html"),
        locked: resolve(__dirname, "locked.html"),
      },
    },
  },
});
