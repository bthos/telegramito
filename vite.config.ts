import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import { viteSingleFile } from "vite-plugin-singlefile"

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

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
    /**
     * `file://` opens cannot reliably fetch a sibling `manifest.webmanifest` (Chrome
     * often reports `net::ERR_FAILED`). Inline the built manifest as a data URL.
     */
    {
      name: "telegramito-inline-webmanifest",
      closeBundle() {
        const manifestPath = path.join(projectRoot, "dist", "manifest.webmanifest")
        const indexPath = path.join(projectRoot, "dist", "index.html")
        if (!fs.existsSync(manifestPath) || !fs.existsSync(indexPath)) {
          return
        }
        const manifest = fs.readFileSync(manifestPath, "utf8")
        const dataUrl = `data:application/manifest+json;charset=utf-8,${encodeURIComponent(manifest)}`
        const html = fs.readFileSync(indexPath, "utf8")
        const next = html.replace(
          /(<link rel="manifest" href=")([^"]+)(")/,
          `$1${dataUrl}$3`,
        )
        if (next !== html) {
          fs.writeFileSync(indexPath, next)
        }
      },
    },
  ],
  resolve: {
    /**
     * One physical copy of GramJS — avoids two `tlobjects` maps (e.g. `telegram` vs `telegram/tl/...`).
     * Do not alias `telegram` to `vendor/…`: that makes Vite treat GramJS as app source and serves raw CJS
     * in dev (`import { StringSession }` fails). Use `dependencies.telegram` → `file:./vendor/telegram-built`
     * (node_modules symlink) so `optimizeDeps.include: ["telegram"]` can pre-bundle with CJS interop.
     */
    dedupe: ["telegram"],
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
    /**
     * GramJS is `file:./vendor/telegram-built` — linked packages are skipped unless listed here.
     * Pre-bundle so dev gets ESM interop for CJS subpaths (`telegram/sessions`, etc.).
     * Keep `resolve.dedupe: ["telegram"]` so there is one physical copy / one `tlobjects` map.
     */
    include: [
      "telegram",
      "telegram/sessions",
      /** CJS subpaths — without these, dev serves raw `/vendor/…/*.js` and named ESM imports fail. */
      "telegram/events",
      "telegram/Helpers",
      "telegram/Utils",
      "telegram/client/downloads",
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
    pool: "forks",
    /** Telegram`s dependency graph is huge — run test files one at a time to avoid fork OOM. */
    maxWorkers: 1,
    fileParallelism: false,
    execArgv: ["--max-old-space-size=16384"],
  },
})
