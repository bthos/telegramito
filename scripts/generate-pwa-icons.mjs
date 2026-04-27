/**
 * Writes solid-color PNGs for the web app manifest (install / maskable).
 * Run via `npm run build` (prebuild) so `public/` is always present before Vite.
 */
import { writeFileSync } from "node:fs"
import { PNG } from "pngjs"

function writeSquarePng(size, outPath, rgba) {
  const png = new PNG({ width: size, height: size, colorType: 6 })
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (size * y + x) << 2
      png.data[i] = rgba[0]
      png.data[i + 1] = rgba[1]
      png.data[i + 2] = rgba[2]
      png.data[i + 3] = rgba[3]
    }
  }
  writeFileSync(outPath, PNG.sync.write(png))
}

// Matches `--ds-color-page` in `src/styles/tokens.css` (#0c1218).
const fill = [12, 18, 24, 255]
writeSquarePng(192, "public/pwa-192x192.png", fill)
writeSquarePng(512, "public/pwa-512x512.png", fill)
