/**
 * Ensures MTProto LAYER in the installed `teleproto` package matches `.telegram-layer.expected`.
 *
 * migrate-teleproto (D5): teleproto is now the runtime MTProto client; LAYER lives at
 * `teleproto/tl/runtime/registry.js` (`exports.LAYER = <n>`), not GramJS's
 * `AllTLObjects.js`. The old vendored-`telegram` paths are kept as a fallback only
 * for the duration of the cutover window (AC-T15 / DD-002 removes the submodule
 * later) — remove them once `vendor/gramjs` is deleted.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")

function readLayerFromSource(filePath) {
  const s = fs.readFileSync(filePath, "utf8")
  const m = s.match(/exports\.LAYER = (\d+)/)
  if (!m) {
    throw new Error(`Could not parse exports.LAYER in ${filePath}`)
  }
  return Number(m[1])
}

const expectedPath = path.join(root, ".telegram-layer.expected")
if (!fs.existsSync(expectedPath)) {
  console.error(
    "check-telegram-layer: missing .telegram-layer.expected\n" +
      "  This file should be committed with a single integer line (the expected MTProto LAYER).",
  )
  process.exit(1)
}
const expected = Number(fs.readFileSync(expectedPath, "utf8").trim())
if (!Number.isFinite(expected)) {
  console.error("check-telegram-layer: .telegram-layer.expected must contain a single integer line")
  process.exit(1)
}

const teleprotoRegistry = path.join(root, "node_modules", "teleproto", "tl", "runtime", "registry.js")
const nm = path.join(root, "node_modules", "telegram", "tl", "AllTLObjects.js")
const vb = path.join(root, "vendor", "telegram-built", "tl", "AllTLObjects.js")
const actualPath = fs.existsSync(teleprotoRegistry) ? teleprotoRegistry : fs.existsSync(nm) ? nm : vb
if (!fs.existsSync(actualPath)) {
  console.error(
    "check-telegram-layer: no MTProto client installed (no teleproto/tl/runtime/registry.js " +
      "and no AllTLObjects.js).\n  npm install",
  )
  process.exit(1)
}

const actual = readLayerFromSource(actualPath)
if (actual !== expected) {
  console.error(
    `check-telegram-layer: LAYER mismatch.\n` +
      `  expected: ${expected} (from .telegram-layer.expected)\n` +
      `  actual:   ${actual} (from ${path.relative(root, actualPath)})\n` +
      `  Bump .telegram-layer.expected (and src/version.ts's TELEGRAM_LAYER_EXPECTED) ` +
      `to match teleproto's new LAYER, or run: npm install teleproto@latest`,
  )
  process.exit(1)
}

console.log(`check-telegram-layer: ok (LAYER ${actual})`)
