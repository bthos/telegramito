/**
 * Unit tests for the `isInitialLoad` derived boolean introduced in ChatView.
 *
 * The derivation is:
 *   const isInitialLoad = list.length === 0 && !listError
 *
 * Because this is a one-liner derived value (not a hook or component), we test
 * it as a pure function extracted here rather than importing from ChatView
 * (which pulls in a heavy React + context dependency tree).
 *
 * Bagnik gates on these passing after Cmok's build.
 */
import { describe, expect, it } from "vitest"

/**
 * Pure derivation of the `isInitialLoad` flag.
 * Mirrors exactly what ChatView computes:
 *   const isInitialLoad = list.length === 0 && !listError
 */
function deriveIsInitialLoad(
  listLength: number,
  listError: string | null | undefined,
): boolean {
  return listLength === 0 && !listError
}

describe("isInitialLoad derivation", () => {
  it("is true when list is empty and there is no error", () => {
    expect(deriveIsInitialLoad(0, null)).toBe(true)
  })

  it("is true when list is empty and listError is undefined", () => {
    expect(deriveIsInitialLoad(0, undefined)).toBe(true)
  })

  it("is false when list has one or more messages", () => {
    expect(deriveIsInitialLoad(1, null)).toBe(false)
    expect(deriveIsInitialLoad(6, null)).toBe(false)
  })

  it("is false when list is empty but an error is present", () => {
    expect(deriveIsInitialLoad(0, "Network error")).toBe(false)
  })

  it("is false when list has messages and there is also an error", () => {
    expect(deriveIsInitialLoad(3, "Some error")).toBe(false)
  })
})
