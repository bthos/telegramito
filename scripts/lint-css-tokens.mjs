/**
 * Fails if legacy accent hex literals appear outside the token allowlist.
 * Feature: design-system-css-hygiene AC-H3.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")

/** Lowercase hex literals gated by CI (canonical definitions live in allowlist files). */
const FORBIDDEN_LITERALS = ["#3390ec", "#b03e1b"]

const ALLOWLIST_SUFFIXES = [
  "design-system/",
  "src/styles/tokens.css",
  "src/styles/tokens-letters.css",
]

const SCAN_ROOTS = [path.join(root, "src")]

const SKIP_DIRS = new Set(["node_modules", "dist", ".git"])

function relPosix(fullPath) {
  return path.relative(root, fullPath).replace(/\\/g, "/")
}

function isAllowlisted(relPath) {
  return ALLOWLIST_SUFFIXES.some(
    (suffix) => relPath === suffix || relPath.startsWith(suffix),
  )
}

function walk(dir, hits) {
  if (!fs.existsSync(dir)) return
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue
      walk(full, hits)
      continue
    }
    if (!name.endsWith(".css")) continue
    const rel = relPosix(full)
    if (isAllowlisted(rel)) continue
    const text = fs.readFileSync(full, "utf8").toLowerCase()
    for (const literal of FORBIDDEN_LITERALS) {
      if (text.includes(literal)) {
        hits.push({ file: rel, literal })
      }
    }
  }
}

const hits = []
for (const scanRoot of SCAN_ROOTS) {
  walk(scanRoot, hits)
}

if (hits.length > 0) {
  console.error("lint-css-tokens: forbidden accent literals outside allowlist:\n")
  for (const { file, literal } of hits.sort((a, b) => a.file.localeCompare(b.file))) {
    console.error(`  - ${file}: ${literal}`)
  }
  console.error(
    `\nAllowlist: ${ALLOWLIST_SUFFIXES.join(", ")} (see design-system-css-hygiene AC-H3).`,
  )
  process.exit(1)
}

console.log("lint-css-tokens: ok")
