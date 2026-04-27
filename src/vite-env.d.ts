/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// npm `util` (browserify) — no shipped types; minimal declarations for the shim.
declare module "util" {
  export const inspect: ((value: unknown, options?: unknown) => string) & { custom?: symbol }
}

// npm `process` — CJS, default export matches Node’s process.
declare module "process" {
  const proc: NodeJS.Process
  export default proc
}

interface ImportMetaEnv {
  readonly VITE_TELEGRAM_API_ID: string
  readonly VITE_TELEGRAM_API_HASH: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
