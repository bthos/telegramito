import { describe, expect, it } from "vitest"
import { formatDocumentSize, getMessageDocument, safeFileDownloadName } from "./documentFile"
import type { Api } from "telegram"

describe("getMessageDocument", () => {
  it("reads document from top-level field", () => {
    const doc = { className: "Document" as const, id: 1, attributes: [] }
    const m = { className: "Message" as const, id: 1, document: doc, media: null } as unknown as Api.Message
    expect(getMessageDocument(m)).toBe(doc)
  })
  it("reads document from MessageMediaDocument when top-level is missing", () => {
    const doc = { className: "Document" as const, id: 1, attributes: [] }
    const m = {
      className: "Message" as const,
      id: 1,
      document: null,
      media: { className: "MessageMediaDocument" as const, document: doc, flags: 0 },
    } as unknown as Api.Message
    expect(getMessageDocument(m)).toBe(doc)
  })
  it("returns null when no document", () => {
    const m = { className: "Message" as const, id: 1, document: null, media: null } as unknown as Api.Message
    expect(getMessageDocument(m)).toBeNull()
  })
})

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
