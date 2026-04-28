import { describe, expect, it } from "vitest"
import { getStickyDateTsForRow } from "./timeFormat"

describe("getStickyDateTsForRow", () => {
  const sep = (dayKey: string, ts: number) => ({ kind: "sep" as const, dayKey, ts })
  const msg = () => ({ kind: "msg" as const, message: {} })

  it("returns sep ts at rowIndex when row is a sep", () => {
    const list = [sep("2024-01-01", 100), msg(), msg()]
    expect(getStickyDateTsForRow(list, 0)).toBe(100)
  })

  it("walks back to previous sep for a message row", () => {
    const list = [sep("2024-01-01", 100), msg(), msg()]
    expect(getStickyDateTsForRow(list, 2)).toBe(100)
  })

  it("uses newer day sep when row is on second day", () => {
    const list = [
      sep("2024-01-01", 100),
      msg(),
      sep("2024-01-02", 200),
      msg(),
    ]
    expect(getStickyDateTsForRow(list, 3)).toBe(200)
  })
})
