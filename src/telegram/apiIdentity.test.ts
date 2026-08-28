import { describe, expect, it } from "vitest"
import { Api } from "teleproto"
import { Api as ApiViaTl } from "teleproto/tl"

/**
 * AC-T9 (migrate-teleproto): guards the specific bug class the vendored
 * GramJS fork's commits `4bf3226`/`bc61bb7` fixed — two physical copies of
 * the library loading (e.g. one via a bare specifier, one via a subpath)
 * would give two separate `tlobjects` maps, so `instanceof` checks and
 * constructor identity silently diverge across the app.
 *
 * `resolve.dedupe: ["teleproto"]` in vite.config.ts is what prevents this in
 * the real dev/build graph; this test is the regression guard that a future
 * edit removing that config (or misconfiguring a subpath alias) doesn't go
 * unnoticed. `teleproto/tl/custom/dialog` (the subpath the app actually
 * imports `Dialog` from) doesn't re-export `Api` itself, so this uses
 * `teleproto/tl` — the subpath `teleproto`'s own root barrel re-exports `Api`
 * from — as the second specifier form.
 */
describe("teleproto Api identity across import specifiers (AC-T9)", () => {
  it("Api imported via bare \"teleproto\" and via \"teleproto/tl\" resolve to the same module", () => {
    expect(ApiViaTl).toBe(Api)
  })

  it("Api.Message constructor reference is identical across both specifier forms", () => {
    expect(ApiViaTl.Message).toBe(Api.Message)
  })
})
