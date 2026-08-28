import { describe, expect, it } from "vitest"
import { Api } from "teleproto"
import { parseComposeMarkdown } from "./composeMarkdown"

/**
 * AC-T18 (migrate-teleproto, Cycle A): outbound markdown parsing.
 * `parseComposeMarkdown` wraps teleproto's `MarkdownParser` but only returns a
 * result when the parse is lossless (`unparse(parsed) === input`); otherwise the
 * caller sends the text verbatim so no user character is ever dropped.
 */
describe("parseComposeMarkdown — well-formed markdown", () => {
  it("extracts a bold run and strips the delimiters", () => {
    const r = parseComposeMarkdown("**bold**")
    expect(r).not.toBeNull()
    expect(r!.message).toBe("bold")
    expect(r!.entities).toHaveLength(1)
    expect(r!.entities[0]).toBeInstanceOf(Api.MessageEntityBold)
    expect(r!.entities[0].offset).toBe(0)
    expect(r!.entities[0].length).toBe(4)
  })

  it("extracts italic (`__`)", () => {
    const r = parseComposeMarkdown("__italic__")
    expect(r!.message).toBe("italic")
    expect(r!.entities[0]).toBeInstanceOf(Api.MessageEntityItalic)
    expect(r!.entities[0].length).toBe(6)
  })

  it("extracts strike (`~~`)", () => {
    const r = parseComposeMarkdown("~~strike~~")
    expect(r!.message).toBe("strike")
    expect(r!.entities[0]).toBeInstanceOf(Api.MessageEntityStrike)
  })

  it("extracts inline code (`` ` ``)", () => {
    const r = parseComposeMarkdown("`code`")
    expect(r!.message).toBe("code")
    expect(r!.entities[0]).toBeInstanceOf(Api.MessageEntityCode)
    expect(r!.entities[0].length).toBe(4)
  })

  it("strips triple-backtick delimiters losslessly (teleproto md mode maps ``` to code, not pre)", () => {
    // Documented limitation: teleproto's `md` MarkdownParser matches a single
    // backtick before the triple, so ```pre``` degrades to inline code. It still
    // round-trips exactly, so it is sent with delimiters stripped (AC-T18) — the
    // entity type differs from an ideal Pre block. See docs/migrate-teleproto.md.
    const r = parseComposeMarkdown("```pre```")
    expect(r).not.toBeNull()
    expect(r!.message).toBe("pre")
    expect(r!.entities.some((e) => e instanceof Api.MessageEntityCode)).toBe(true)
  })

  it("keeps surrounding plain text and offsets it correctly", () => {
    const r = parseComposeMarkdown("hello **world**!")
    expect(r!.message).toBe("hello world!")
    expect(r!.entities[0]).toBeInstanceOf(Api.MessageEntityBold)
    expect(r!.entities[0].offset).toBe(6)
    expect(r!.entities[0].length).toBe(5)
  })

  it("handles two separate runs of the same delimiter", () => {
    const r = parseComposeMarkdown("**a** plain **b**")
    expect(r!.message).toBe("a plain b")
    expect(r!.entities).toHaveLength(2)
    expect(r!.entities.every((e) => e instanceof Api.MessageEntityBold)).toBe(true)
    expect(r!.entities.map((e) => [e.offset, e.length])).toEqual([
      [0, 1],
      [8, 1],
    ])
  })

  it("handles nested entities", () => {
    const r = parseComposeMarkdown("**bold__nested__**")
    expect(r!.message).toBe("boldnested")
    const bold = r!.entities.find((e) => e instanceof Api.MessageEntityBold)
    const italic = r!.entities.find((e) => e instanceof Api.MessageEntityItalic)
    expect(bold).toBeDefined()
    expect(italic).toBeDefined()
    expect([bold!.offset, bold!.length]).toEqual([0, 10])
    expect([italic!.offset, italic!.length]).toEqual([4, 6])
  })

  it("extracts a mix of all four inline delimiters in one message", () => {
    const r = parseComposeMarkdown("**bold** and __it__ and ~~s~~ and `c`")
    expect(r!.message).toBe("bold and it and s and c")
    expect(r!.entities.map((e) => e.className).sort()).toEqual(
      [
        "MessageEntityBold",
        "MessageEntityCode",
        "MessageEntityItalic",
        "MessageEntityStrike",
      ].sort(),
    )
  })
})

describe("parseComposeMarkdown — lossless guard (send verbatim)", () => {
  it("returns null for an unmatched `**` (would drop characters)", () => {
    expect(parseComposeMarkdown("a**b")).toBeNull()
  })

  it("returns null for a stray single backtick", () => {
    expect(parseComposeMarkdown("x`y")).toBeNull()
  })

  it("returns null for a lone delimiter", () => {
    expect(parseComposeMarkdown("**")).toBeNull()
  })

  it("returns null when there are no markdown delimiters at all", () => {
    expect(parseComposeMarkdown("no delims here")).toBeNull()
  })

  it("returns null for empty / whitespace input", () => {
    expect(parseComposeMarkdown("")).toBeNull()
    expect(parseComposeMarkdown("   ")).toBeNull()
  })

  it("does not parse `[text](url)` link syntax (not a teleproto md delimiter)", () => {
    expect(parseComposeMarkdown("see [docs](https://example.com)")).toBeNull()
  })

  it("does not parse `||spoiler||` syntax", () => {
    expect(parseComposeMarkdown("boo ||spoiler||")).toBeNull()
  })
})
