import { describe, expect, it } from "vitest"
import { cn } from "./cn"

describe("cn", () => {
  it("skips nullish and flattens strings", () => {
    expect(cn("a", null, "b", undefined, false, "c")).toBe("a b c")
  })
  it("merges object keys when truthy", () => {
    expect(cn("a", { b: true, c: false })).toBe("a b")
  })
})
