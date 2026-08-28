/**
 * teleproto's `sessions/StoreSession.js` (disk-persistent, server-only session
 * store) does `require("node-localstorage")` at module top level as part of
 * the shared `teleproto/sessions` barrel — even though Telegramito only ever
 * constructs `StringSession` (see clientFactory.ts / TelegramContext.tsx).
 *
 * `node-localstorage` is fs-backed (Node-only: `fs`, `path`, and transitively
 * `write-file-atomic` → `worker_threads`/`signal-exit`). None of that exists
 * in a browser, and unlike GramJS's vendored fork (whose `StoreSession` uses
 * the isomorphic `store2` package and never touches `node-localstorage` at
 * all), teleproto's `StoreSession` genuinely requires it. Since the barrel
 * eagerly evaluates on import, an unshimmed `node-localstorage` throws at
 * app boot (`TypeError: Cannot convert a Symbol value to a string`, from
 * Vite's own browser-externalized-module Proxy tripping over a Node-only
 * dependency chain it can't resolve) well before any `StoreSession` is ever
 * constructed.
 *
 * This shim only needs to make `require("node-localstorage")` resolve to
 * *something* — `StoreSession` itself is dead code for this app. It throws
 * only if actually instantiated, so a future accidental real usage fails
 * loudly instead of silently no-op'ing.
 */
export class LocalStorage {
  constructor(_path: string) {
    throw new Error(
      "node-localstorage is not available in the browser build; " +
        "Telegramito only uses StringSession, not teleproto's StoreSession."
    )
  }
}
