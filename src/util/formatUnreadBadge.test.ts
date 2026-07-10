import { describe, expect, it } from "vitest"
import { formatUnreadBadge } from "./formatUnreadBadge"

describe("formatUnreadBadge", () => {
  it("returns empty for non-positive counts", () => {
    expect(formatUnreadBadge(0)).toBe("")
    expect(formatUnreadBadge(-1)).toBe("")
  })

  it("caps at 999+", () => {
    expect(formatUnreadBadge(999)).toBe("999")
    expect(formatUnreadBadge(1000)).toBe("999+")
    expect(formatUnreadBadge(1704)).toBe("999+")
  })
})
