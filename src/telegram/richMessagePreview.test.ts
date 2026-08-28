import { describe, expect, it } from "vitest"
import { Api } from "teleproto"
import {
  isRichMessage,
  isRichOnly,
  richMessageExcerpt,
  richMessagePreviewLine,
} from "./richMessagePreview"

const t = ((k: string) => k) as (k: string, o?: Record<string, unknown>) => string

function para(text: string): Api.TypePageBlock {
  return new Api.PageBlockParagraph({ text: new Api.TextPlain({ text }) })
}

function rich(...texts: string[]): Api.RichMessage {
  return new Api.RichMessage({
    blocks: texts.map(para),
    photos: [],
    documents: [],
  } as never)
}

describe("isRichMessage", () => {
  it("narrows a real RichMessage and rejects everything else", () => {
    expect(isRichMessage(rich("x"))).toBe(true)
    expect(isRichMessage(undefined)).toBe(false)
    expect(isRichMessage(null)).toBe(false)
    expect(isRichMessage({ className: "RichMessage" })).toBe(false)
  })
})

describe("isRichOnly (AC-R1 / AC-R2 detection)", () => {
  it("true only when a rich body is present and plain text is empty", () => {
    expect(isRichOnly({ message: "", richMessage: rich("hi") })).toBe(true)
    expect(isRichOnly({ message: "   ", richMessage: rich("hi") })).toBe(true)
    expect(isRichOnly({ message: undefined, richMessage: rich("hi") })).toBe(true)
  })
  it("false when plain text is present (plain wins — AC-R2)", () => {
    expect(isRichOnly({ message: "hello", richMessage: rich("hi") })).toBe(false)
  })
  it("false when there is no rich body", () => {
    expect(isRichOnly({ message: "", richMessage: undefined })).toBe(false)
    expect(isRichOnly({ message: "", richMessage: null })).toBe(false)
  })
})

describe("richMessageExcerpt (AC-R8, bounded)", () => {
  it("renders the first blocks to a collapsed, truncated plain string", () => {
    const r = rich("First paragraph.", "Second paragraph.")
    expect(richMessageExcerpt(r, 200)).toBe("First paragraph.\n\nSecond paragraph.".replace(/\s+/g, " "))
  })
  it("truncates to maxLen with an ellipsis", () => {
    const r = rich("abcdefghijklmnopqrstuvwxyz")
    const out = richMessageExcerpt(r, 10)!
    expect(out.length).toBe(10)
    expect(out.endsWith("…")).toBe(true)
  })
  it("only walks the first maxBlocks blocks", () => {
    const r = rich("one", "two", "three", "four", "five")
    const out = richMessageExcerpt(r, 500, 2)!
    expect(out).toContain("one")
    expect(out).toContain("two")
    expect(out).not.toContain("three")
  })
  it("returns null for non-rich input, empty blocks, or whitespace-only content", () => {
    expect(richMessageExcerpt(undefined)).toBeNull()
    expect(richMessageExcerpt(new Api.RichMessage({ blocks: [], photos: [], documents: [] } as never))).toBeNull()
    expect(richMessageExcerpt(rich("   "))).toBeNull()
  })
})

describe("richMessagePreviewLine", () => {
  it("prefers the excerpt when one is available", () => {
    expect(richMessagePreviewLine(rich("Article opening line"), t)).toBe("Article opening line")
  })
  it("falls back to the localized label when no excerpt", () => {
    expect(richMessagePreviewLine(rich("  "), t)).toBe("chat.previewRichMessage")
    expect(richMessagePreviewLine(undefined, t)).toBe("chat.previewRichMessage")
  })
})
