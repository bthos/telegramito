import { describe, expect, it } from "vitest"
import { insertAtCursor } from "./insertAtCursor"

function makeTa(value: string, start: number, end: number): HTMLTextAreaElement {
  const ta = document.createElement("textarea")
  ta.value = value
  ta.selectionStart = start
  ta.selectionEnd = end
  return ta
}

describe("insertAtCursor", () => {
  it("inserts at start", () => {
    const ta = makeTa("hello", 0, 0)
    const r = insertAtCursor(ta, "X")
    expect(r.newValue).toBe("Xhello")
    expect(r.newCursorPos).toBe(1)
  })

  it("inserts in middle", () => {
    const ta = makeTa("hello", 2, 2)
    const r = insertAtCursor(ta, "XX")
    expect(r.newValue).toBe("heXXllo")
    expect(r.newCursorPos).toBe(4)
  })

  it("replaces selection", () => {
    const ta = makeTa("hello", 1, 4)
    const r = insertAtCursor(ta, "i")
    expect(r.newValue).toBe("hio")
    expect(r.newCursorPos).toBe(2)
  })

  it("uses explicit selection when provided", () => {
    const ta = makeTa("ab", 0, 0)
    const r = insertAtCursor(ta, "Z", { start: 1, end: 1 })
    expect(r.newValue).toBe("aZb")
    expect(r.newCursorPos).toBe(2)
  })
})
