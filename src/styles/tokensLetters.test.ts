/**
 * AC-T6 regression: Letters v2 terracotta tokens on `.app-root--main`.
 * Feature: .tlk/features/2026-07-10-design-system-token-realignment/
 *
 * jsdom does not resolve `var(--token)` in getComputedStyle; assertions use
 * stylesheet source + cascade structure instead.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import "./tokens.css"
import "./tokens-letters.css"

const LETTERS_TERRACOTTA = "#b03e1b"
const stylesDir = path.dirname(fileURLToPath(import.meta.url))

function readCss(name: string) {
  return fs.readFileSync(path.join(stylesDir, name), "utf8")
}

describe("Letters token realignment", () => {
  it("defines --ds-font-serif and --font-serif on :root (AC-T1)", () => {
    const tokensCss = readCss("tokens.css")
    expect(tokensCss).toContain("--ds-font-serif:")
    expect(tokensCss).toContain("Spectral")
    expect(tokensCss).toContain("--font-serif: var(--ds-font-serif)")
  })

  it("scopes DS literals in tokens-letters.css for Letters light (AC-T2)", () => {
    const lettersCss = readCss("tokens-letters.css")
    expect(lettersCss).toMatch(
      /html\[data-theme="light"\] \.app-root--main[\s\S]*?--ds-chat-accent:\s*#b03e1b/,
    )
    expect(lettersCss).toMatch(
      /html\[data-theme="light"\] \.app-root--main[\s\S]*?--chat-bg:\s*#cac5bc/,
    )
    expect(lettersCss).toMatch(
      /html\[data-theme="light"\] \.app-root--main[\s\S]*?--bubble-in:\s*#e9e4d8/,
    )
    expect(lettersCss).toMatch(
      /html\[data-theme="light"\] \.app-root--main[\s\S]*?--overlay:\s*rgba\(20,\s*14,\s*10,\s*0\.92\)/,
    )
    expect(lettersCss).toMatch(
      /html\[data-theme="light"\] \.app-root--main[\s\S]*?--ok:\s*#4a8c3f/,
    )
  })

  it("maps --tg-blue to terracotta via --ds-chat-accent on Letters light (AC-T3, AC-T6)", () => {
    const tokensCss = readCss("tokens.css")
    const lettersCss = readCss("tokens-letters.css")
    expect(tokensCss).toContain("--tg-blue: var(--ds-chat-accent)")
    expect(lettersCss).toMatch(
      /html\[data-theme="light"\] \.app-root--main[\s\S]*?--ds-chat-accent:\s*#b03e1b/,
    )
    expect(LETTERS_TERRACOTTA).toBe("#b03e1b")
  })

  it("uses warm newsprint preview shade and shimmer on Letters light (AC-T4, AC-T5)", () => {
    const lettersCss = readCss("tokens-letters.css")
    expect(lettersCss).toMatch(
      /html\[data-theme="light"\] \.app-root--main[\s\S]*?--placeholder-bg:\s*#c8c2b8/,
    )
    expect(lettersCss).toContain("#c9c3b8")
    expect(lettersCss).not.toMatch(/--ds-media-preview-shade:[^;]*#a855f7/)
  })

  it("maps warm dark tokens on Letters dark (AC-T7)", () => {
    const lettersCss = readCss("tokens-letters.css")
    expect(lettersCss).toMatch(
      /html\[data-theme="dark"\] \.app-root--main[\s\S]*?--ds-chat-accent:\s*#e07548/,
    )
    expect(lettersCss).toMatch(
      /html\[data-theme="dark"\] \.app-root--main[\s\S]*?--ds-overlay:\s*rgba\(20,\s*14,\s*10,\s*0\.92\)/,
    )
  })

  it("has no hardcoded #3390ec fallbacks in media/placeholder stylesheets (AC-T3)", () => {
    for (const file of [
      "media-states.css",
      "message-media-states.css",
      "design-system-media.css",
      "placeholders.css",
    ]) {
      expect(readCss(file)).not.toContain("#3390ec")
    }
  })

  it("documents legacy blue deprecation on --acc / --ds-color-primary (AC-T8)", () => {
    const tokensCss = readCss("tokens.css")
    expect(tokensCss).toContain("@deprecated")
    expect(tokensCss).toContain("tokens-letters.css")
  })
})
