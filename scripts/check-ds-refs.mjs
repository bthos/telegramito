/**
 * Fails if the legacy design-system path `.artefacts/ux-analysis` appears in
 * implementation or active feature specs. Canonical root: `design-system/`.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const LEGACY = ".artefacts/ux-analysis"

const SCAN_ROOTS = [
  path.join(root, "src"),
  path.join(root, ".tlk", "features"),
]

const SKIP_PATH_SEGMENTS = new Set([
  ".tlk/features/2026-07-10-design-system-reference-sync",
])

function relPosix(fullPath) {
  return path.relative(root, fullPath).replace(/\\/g, "/")
}

const SKIP_DIRS = new Set(["node_modules", "dist", ".git"])

function walk(dir, hits) {
  if (!fs.existsSync(dir)) return
  const relDir = relPosix(dir)
  if (SKIP_PATH_SEGMENTS.has(relDir)) return
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue
      walk(full, hits)
      continue
    }
    if (!/\.(tsx?|css|md)$/.test(name)) continue
    const text = fs.readFileSync(full, "utf8")
    if (text.includes(LEGACY)) {
      hits.push(relPosix(full))
    }
  }
}

const hits = []
for (const scanRoot of SCAN_ROOTS) {
  walk(scanRoot, hits)
}

if (hits.length > 0) {
  console.error(`check-ds-refs: found legacy path "${LEGACY}" in:\n`)
  for (const file of hits.sort()) {
    console.error(`  - ${file}`)
  }
  console.error(`\nUse design-system/ instead (see design-system/README.md).`)
  process.exit(1)
}

console.log("check-ds-refs: ok")
