/**
 * Rasterizes `public/favicon.svg` to PNGs for the web app manifest (install / maskable).
 * Run via `npm run build` (prebuild) so `public/` is ready before Vite.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const svgPath = path.join(root, "public", "favicon.svg")

async function main() {
  for (const size of [192, 512]) {
    const out = path.join(root, "public", `pwa-${size}x${size}.png`)
    await sharp(svgPath)
      .resize(size, size, { fit: "fill" })
      .png()
      .toFile(out)
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
