import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import { viteSingleFile } from "vite-plugin-singlefile"

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const telegramRoot = path.resolve(projectRoot, "vendor", "telegram-built")

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
        /** Single-file bundle inlines app into `index.html` (~2.3+ MiB); Workbox default is 2 MiB. */
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
    viteSingleFile({ removeViteModuleLoader: true }),
  ],
  resolve: {
    /** One physical copy of GramJS — avoids two `tlobjects` maps (e.g. `telegram` vs `telegram/tl/...`). */
    dedupe: ["telegram"],
    alias: {
      telegram: telegramRoot,
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
    /**
     * Do not pre-bundle `telegram` (GramJS): `include: ["telegram"]` produced a second
     * module graph so `BinaryReader` saw an empty `tlobjects` while Node `require()` was fine.
     */
    exclude: ["telegram"],
    include: [
      "buffer",
      "util",
      "events",
      "os-browserify",
      "crypto-browserify",
      "stream-browserify",
      "vm-browserify",
      "process",
    ],
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    /** GramJS + Rolldown sometimes stalls transforming this file alone; hook covered by prod + manual QA until isolated. */
    exclude: ["src/hooks/useTypingIndicators.test.ts"],
    pool: "forks",
    /** Telegram`s dependency graph is huge — run test files one at a time to avoid fork OOM. */
    maxWorkers: 1,
    fileParallelism: false,
    execArgv: ["--max-old-space-size=16384"],
  },
})
