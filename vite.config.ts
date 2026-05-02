import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import { viteSingleFile } from "vite-plugin-singlefile"

// https://vite.dev/config/
// Single-file build inlines JS/CSS so `dist/index.html` can be opened via file://
// (multi-chunk ESM is blocked from origin `null` in Chrome/Edge).
// `vite-plugin-pwa` runs before singlefile so the shell stays one HTML file while
// `manifest.webmanifest`, `sw.js`, and Workbox precache files ship alongside it.
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        id: "./",
        name: "Telegramito",
        short_name: "Telegramito",
        description:
          "Browser-only Telegram client with local supervised / parental UI policies.",
        theme_color: "#0c1218",
        background_color: "#0a0f16",
        display: "standalone",
        start_url: "./",
        scope: "./",
        lang: "en",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "index.html",
      },
      devOptions: {
        enabled: false,
      },
    }),
    viteSingleFile({ removeViteModuleLoader: true }),
  ],
  resolve: {
    alias: {
      buffer: "buffer",
      // Vite/rolldown sometimes resolves `node:*` built-ins in deps; map to the same
      // browser polyfills as bare `util` / `crypto` / etc.
      "node:util": "util",
      "node:buffer": "buffer",
      "node:crypto": "crypto-browserify",
      "node:stream": "stream-browserify",
      "node:os": "os-browserify",
      "node:events": "events",
      "node:vm": "vm-browserify",
      "node:process": "process",
      // GramJS (telegram/inspect.js) does require("util"). Vite’s Node stub
      // leaves `inspect` undefined → `inspect.custom` throws in bundled code.
      util: "util",
      // e.g. `socks` does `class … extends require("events")…`; empty stub →
      // "Class extends value undefined".
      events: "events",
      // `telegram/client/os.js` re-exports Node `os`; base client calls
      // `os.type()` / `os.release()` for InitConnection. Empty stub →
      // "c.default.type is not a function" in the browser.
      os: "os-browserify",
      // `telegram/CryptoFile.js` does `require("crypto")` for `randomBytes`.
      crypto: "crypto-browserify",
      // Used by `crypto-browserify` / chained modules when Vite stubs `stream`.
      stream: "stream-browserify",
      // `asn1.js` (via `crypto-browserify`) uses `vm` for `createContext`.
      vm: "vm-browserify",
    },
  },
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    include: [
      "buffer",
      "util",
      "events",
      "os-browserify",
      "crypto-browserify",
      "stream-browserify",
      "vm-browserify",
      "process",
      "telegram",
    ],
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    pool: "forks",
    /** Telegram`s dependency graph is huge — run test files one at a time to avoid fork OOM. */
    maxWorkers: 1,
    fileParallelism: false,
    execArgv: ["--max-old-space-size=16384"],
  },
})
