/**
 * Builds GramJS from the git submodule at vendor/gramjs the same way as upstream
 * prepare_dist / npmpublish: tsc, then overlay real TL typings (api.d.ts), static
 * schema files, and package metadata into dist/, then copies dist → vendor/telegram-built.
 *
 * Runs from preinstall before dependencies resolve. Skips if submodule HEAD unchanged
 * and vendor/telegram-built/index.js exists (unless --force).
 */
import { execSync, spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const gramjsDir = path.join(root, "vendor", "gramjs")
const outDir = path.join(root, "vendor", "telegram-built")
const stampPath = path.join(outDir, ".submodule-head")
const force = process.argv.includes("--force")

function run(cmd, cwd) {
  const r = spawnSync(cmd, { shell: true, cwd, stdio: "inherit", env: process.env })
  if (r.status !== 0) {
    process.exit(r.status ?? 1)
  }
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

const gramPkg = path.join(gramjsDir, "package.json")
if (!fs.existsSync(gramPkg)) {
  console.error(
    "prepare-vendor-telegram: vendor/gramjs is missing.\n" +
      "  git submodule update --init --recursive\n" +
      "Then run npm install again.",
  )
  process.exit(1)
}

let head = ""
try {
  head = execSync("git rev-parse HEAD", { cwd: gramjsDir, encoding: "utf8" }).trim()
} catch {
  console.error("prepare-vendor-telegram: vendor/gramjs is not a git checkout.")
  process.exit(1)
}

/** HEAD alone is not enough: local patches to vendor/gramjs do not move HEAD, but dist must rebuild. */
function isGramJsWorktreeClean() {
  try {
    return execSync("git status --porcelain", { cwd: gramjsDir, encoding: "utf8" }).trim() === ""
  } catch {
    return false
  }
}

if (
  !force
  && fs.existsSync(stampPath)
  && fs.existsSync(path.join(outDir, "index.js"))
) {
  const prev = fs.readFileSync(stampPath, "utf8").trim()
  if (prev === head && isGramJsWorktreeClean()) {
    console.log("prepare-vendor-telegram: skip (vendor/gramjs HEAD unchanged, worktree clean)")
    process.exit(0)
  }
  if (prev === head && !isGramJsWorktreeClean()) {
    console.log(
      "prepare-vendor-telegram: vendor/gramjs has local changes; rebuilding (HEAD matches stamp)",
    )
  }
}

console.log("prepare-vendor-telegram: building GramJS from vendor/gramjs …")
run("npm install", gramjsDir)
run("npx tsc", gramjsDir)

const distDir = path.join(gramjsDir, "dist")
if (!fs.existsSync(path.join(distDir, "index.js"))) {
  console.error("prepare-vendor-telegram: tsc did not produce vendor/gramjs/dist/index.js")
  process.exit(1)
}

// Match vendor/gramjs/prepare_dist.sh / npmpublish.bat (real Api lives in gramjs/tl/api.d.ts)
copyFile(path.join(gramjsDir, "package.json"), path.join(distDir, "package.json"))
for (const name of ["README.md", "LICENSE"]) {
  const src = path.join(gramjsDir, name)
  if (fs.existsSync(src)) {
    copyFile(src, path.join(distDir, name))
  }
}
const staticDst = path.join(distDir, "tl", "static")
fs.mkdirSync(staticDst, { recursive: true })
copyFile(
  path.join(gramjsDir, "gramjs", "tl", "static", "api.tl"),
  path.join(staticDst, "api.tl"),
)
copyFile(
  path.join(gramjsDir, "gramjs", "tl", "static", "schema.tl"),
  path.join(staticDst, "schema.tl"),
)
// Regenerate `tl/apiTl.js` (and `tl/api.d.ts`) from `static/api.tl` so runtime TL matches schema edits.
run("node dist/tl/generateModule.js", gramjsDir)
copyFile(path.join(distDir, "tl", "apiTl.js"), path.join(gramjsDir, "gramjs", "tl", "apiTl.js"))
copyFile(path.join(distDir, "tl", "api.d.ts"), path.join(gramjsDir, "gramjs", "tl", "api.d.ts"))
copyFile(
  path.join(gramjsDir, "gramjs", "define.d.ts"),
  path.join(distDir, "define.d.ts"),
)

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })
fs.cpSync(distDir, outDir, { recursive: true })
fs.writeFileSync(stampPath, `${head}\n`)

const allTlPath = path.join(outDir, "tl", "AllTLObjects.js")
const allSrc = fs.readFileSync(allTlPath, "utf8")
const layerM = allSrc.match(/exports\.LAYER = (\d+)/)
if (!layerM) {
  console.warn("prepare-vendor-telegram: could not parse LAYER from tl/AllTLObjects.js")
} else {
  fs.writeFileSync(path.join(root, ".telegram-layer.expected"), `${layerM[1]}\n`)
}

const v = JSON.parse(fs.readFileSync(path.join(outDir, "package.json"), "utf8")).version
console.log(`prepare-vendor-telegram: done → vendor/telegram-built (${v})`)
