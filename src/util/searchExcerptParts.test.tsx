import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { searchExcerptParts, searchQueryTokens } from "./searchExcerptParts"

function excerptText(text: string, query: string, maxLen = 80): string {
  const node = searchExcerptParts(text, query, maxLen)
  const { container } = render(<p data-testid="ex">{node}</p>)
  return container.querySelector("[data-testid=ex]")?.textContent ?? ""
}

function excerptHtml(text: string, query: string, maxLen = 80): string {
  const node = searchExcerptParts(text, query, maxLen)
  const { container } = render(<p data-testid="ex">{node}</p>)
  return container.querySelector("[data-testid=ex]")?.innerHTML ?? ""
}

describe("searchQueryTokens", () => {
  it("splits on whitespace and drops empties", () => {
    expect(searchQueryTokens("  brunch   sunday ")).toEqual(["brunch", "sunday"])
  })

  it("returns empty for blank query", () => {
    expect(searchQueryTokens("   ")).toEqual([])
  })
})

describe("searchExcerptParts (AC5 / D6)", () => {
  it("bolds every query token inside the excerpt, not only a contiguous phrase", () => {
    const html = excerptHtml("let's get brunch later on sunday maybe", "brunch sunday")
    expect(html).toContain("<strong>brunch</strong>")
    expect(html).toContain("<strong>sunday</strong>")
    expect(html).not.toContain("<strong>brunch later on sunday</strong>")
  })

  it("re-anchors the window on the earliest token when the match is past maxLen", () => {
    const prefix = "x".repeat(100)
    const text = `${prefix} brunch later`
    const shown = excerptText(text, "brunch", 40)
    expect(shown.startsWith("…")).toBe(true)
    expect(shown.toLowerCase()).toContain("brunch")
    expect(shown).not.toMatch(/^x+$/)
  })

  it("adds a trailing ellipsis when the window does not reach the end", () => {
    const text = "brunch " + "word ".repeat(40)
    const shown = excerptText(text, "brunch", 30)
    expect(shown.endsWith("…")).toBe(true)
  })

  it("falls back to a plain head window when no literal token appears", () => {
    const text = "abcdefghijklmnopqrstuvwxyz"
    const shown = excerptText(text, "zzzz", 10)
    expect(shown).toBe("abcdefghi…")
    expect(excerptHtml(text, "zzzz", 10)).not.toContain("<strong>")
  })

  it("is case-insensitive for token matching", () => {
    const html = excerptHtml("Brunch on Sunday", "brunch")
    expect(html).toContain("<strong>Brunch</strong>")
  })

  it("returns empty string unchanged", () => {
    expect(excerptText("", "brunch")).toBe("")
  })
})
