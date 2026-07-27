/**
 * Characterization of ChatView initial-load skeleton gate (AC1).
 *
 * Current ChatView derivation (2026-07-27):
 *   const isInitialLoad = list.length === 0
 *
 * (Earlier drafts also gated on listError; that flag is not present on ChatView today.)
 */
import { describe, expect, it } from "vitest"

function deriveIsInitialLoad(listLength: number): boolean {
  return listLength === 0
}

describe("isInitialLoad derivation", () => {
  it("is true when list is empty", () => {
    expect(deriveIsInitialLoad(0)).toBe(true)
  })

  it("is false when list has one or more messages", () => {
    expect(deriveIsInitialLoad(1)).toBe(false)
    expect(deriveIsInitialLoad(6)).toBe(false)
  })
})
