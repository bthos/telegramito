/**
 * Must load before any GramJS/telegram import: they touch `Buffer` at module init.
 * In production (single-file build) the Rollup `banner` also prepends the same
 * so one concatenated `type=module` still works.
 */
import { Buffer } from "buffer"

const g = globalThis as { Buffer?: typeof Buffer }
if (g.Buffer === undefined) {
  Object.defineProperty(g, "Buffer", {
    value: Buffer,
    configurable: true,
    writable: true,
    enumerable: false,
  })
}
