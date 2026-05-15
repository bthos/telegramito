import { describe, expect, it } from "vitest"
import { formatLiteraryDateLine } from "./literaryDate"

describe("formatLiteraryDateLine", () => {
  it("formats English prose weekdays", () => {
    expect(formatLiteraryDateLine(new Date(2026, 4, 15), "en")).toMatch(/Friday.*fifteenth.*May/i)
  })
})
