/**
 * Characterization of ChatView initial-load skeleton gate (AC1).
 */
import { describe, expect, it } from "vitest"
import { isInitialLoad } from "./chatInitialLoad"

describe("isInitialLoad derivation", () => {
  it("is true when list is empty", () => {
    expect(isInitialLoad(0)).toBe(true)
  })

  it("is false when list has one or more messages", () => {
    expect(isInitialLoad(1)).toBe(false)
    expect(isInitialLoad(6)).toBe(false)
  })
})
