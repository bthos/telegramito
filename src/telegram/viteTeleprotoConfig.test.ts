import { describe, expect, it } from "vitest"

/**
 * AC-T2 (migrate-teleproto): `vite.config.ts`'s `resolve.dedupe` and
 * `optimizeDeps.include` name `teleproto` (+ the subpaths the app actually
 * imports) and no longer name the retired `telegram` package, now that the
 * cutover (Phase 2) removed it from `package.json` and this config.
 */
describe("vite.config.ts teleproto wiring (AC-T2)", () => {
  it("dedupes teleproto and includes its subpaths in optimizeDeps, with no telegram entries left", async () => {
    const config = (await import("../../vite.config.ts")).default
    const dedupe = config.resolve?.dedupe ?? []
    const include = config.optimizeDeps?.include ?? []

    expect(dedupe).toContain("teleproto")
    expect(dedupe).not.toContain("telegram")

    for (const expected of [
      "teleproto",
      "teleproto/sessions",
      "teleproto/events",
      "teleproto/Helpers",
      "teleproto/Utils",
      "teleproto/client/downloads",
      "teleproto/tl/custom/dialog",
      "teleproto/extensions",
      "teleproto/extensions/markdown",
    ]) {
      expect(include).toContain(expected)
    }

    expect(include.some((s) => s === "telegram" || s.startsWith("telegram/"))).toBe(false)
  })
})
