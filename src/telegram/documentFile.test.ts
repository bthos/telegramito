import { describe, expect, it } from "vitest"
import { formatDocumentSize, safeFileDownloadName } from "./documentFile"

describe("formatDocumentSize", () => {
  it("formats small numbers", () => {
    expect(formatDocumentSize(500)).toBe("500 B")
    expect(formatDocumentSize(1024)).toBe("1.0 KB")
  })
  it("handles long-like toString", () => {
    expect(
      formatDocumentSize({ toString: () => "9999" })
    ).toBe("9.8 KB")
  })
})

describe("safeFileDownloadName", () => {
  it("strips path chars", () => {
    expect(safeFileDownloadName("a/b:c.pdf")).toBe("a_b_c.pdf")
  })
})
