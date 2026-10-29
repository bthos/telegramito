/**
 * Node 25+ ships an experimental `localStorage` global that is `undefined` without
 * `--localstorage-file`; it shadows jsdom's implementation in Vitest. Restore jsdom's.
 */
type VitestJsdomGlobal = typeof globalThis & { jsdom?: { window: Window } }

const g: VitestJsdomGlobal = globalThis
if (g.jsdom && g.localStorage === undefined) {
  Object.defineProperty(g, "localStorage", {
    configurable: true,
    value: g.jsdom.window.localStorage,
  })
}
