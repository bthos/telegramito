import { describe, expect, it } from "vitest"
import { normalizePhone } from "./normalizePhone"

describe("normalizePhone", () => {
  it("strips common separators and keeps a leading +", () => {
    expect(normalizePhone("+34 123-456 789")).toBe("+34123456789")
    expect(normalizePhone("+1 (555) 123.4567")).toBe("+15551234567")
  })

  it("adds the + when the user omitted it", () => {
    expect(normalizePhone("34123456789")).toBe("+34123456789")
  })

  it("rejects letters, misplaced + and the bare prefix", () => {
    expect(normalizePhone("abc123")).toBeNull()
    expect(normalizePhone("+34a123456")).toBeNull()
    expect(normalizePhone("34+123456789")).toBeNull()
    expect(normalizePhone("+")).toBeNull()
  })

  it("enforces the digit count bounds (5..15), not the string length", () => {
    expect(normalizePhone("+1234")).toBeNull()
    expect(normalizePhone("+12345")).toBe("+12345")
    expect(normalizePhone("+123456789012345")).toBe("+123456789012345")
    expect(normalizePhone("+1234567890123456")).toBeNull()
  })
})
