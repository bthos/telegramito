/**
 * Ensures MTProto LAYER in the installed `telegram` package matches `.telegram-layer.expected`
 * (updated by `scripts/prepare-vendor-telegram.mjs` when rebuilding from vendor/gramjs).
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")

function readLayerFromAllTlObjects(filePath) {
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
      "  Run npm install (preinstall builds vendor/telegram-built) or npm run rebuild:telegram",
  )
  process.exit(1)
}
const expected = Number(fs.readFileSync(expectedPath, "utf8").trim())
if (!Number.isFinite(expected)) {
  console.error("check-telegram-layer: .telegram-layer.expected must contain a single integer line")
  process.exit(1)
}

const nm = path.join(root, "node_modules", "telegram", "tl", "AllTLObjects.js")
const vb = path.join(root, "vendor", "telegram-built", "tl", "AllTLObjects.js")
const actualPath = fs.existsSync(nm) ? nm : vb
if (!fs.existsSync(actualPath)) {
  console.error(
    "check-telegram-layer: telegram not built (no AllTLObjects.js).\n" +
      "  git submodule update --init && npm install",
  )
  process.exit(1)
}

const actual = readLayerFromAllTlObjects(actualPath)
if (actual !== expected) {
  console.error(
    `check-telegram-layer: LAYER mismatch.\n` +
      `  expected: ${expected} (from .telegram-layer.expected)\n` +
      `  actual:   ${actual} (from ${path.relative(root, actualPath)})\n` +
      `  After bumping vendor/gramjs, run: npm run rebuild:telegram`,
  )
  process.exit(1)
}

console.log(`check-telegram-layer: ok (LAYER ${actual})`)
