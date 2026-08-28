/**
 * teleproto's `tl/core/GZIPPacked.js` decompresses MTProto's `gzip_packed`
 * wrapper via Node's native `zlib.unzipSync` — unlike vendored GramJS, whose
 * `GZIPPacked` uses the isomorphic `pako` package (already a proven-working
 * browser dependency in this app's current bundle) for the same job. `zlib`
 * has no browser implementation, so an unaliased import throws
 * (`zlib_1.unzipSync is not a function`) the first time Telegram sends a
 * gzip-wrapped response (common for larger payloads).
 *
 * teleproto's own `gzip()` direction is a no-op passthrough (see
 * GZIPPacked.js: `static gzip(input) { return Buffer.from(input) }`), so only
 * `unzipSync` needs a real implementation here.
 */
import { ungzip } from "pako"

export function unzipSync(input: Uint8Array): Buffer {
  return Buffer.from(ungzip(input))
}
