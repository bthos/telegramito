/**
 * AC regression: design-system-css-hygiene (tokens, reactions contract, lint gate).
 * Feature: .tlk/features/2026-07-10-design-system-css-hygiene/
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
const stylesDir = path.join(root, "src", "styles")

/** Baseline from spec review before AC-H4 reactions pilot (grep metric AC-H11). */
const LETTERS_IMPORTANT_BASELINE = 13

function readCss(name: string) {
  return fs.readFileSync(path.join(stylesDir, name), "utf8")
}

function countImportant(css: string) {
  return (css.match(/!important/g) ?? []).length
}

describe("design system CSS hygiene", () => {
  it("documents --ds-* as canonical and deprecates legacy accent aliases (AC-H1)", () => {
    const tokensCss = readCss("tokens.css")
    expect(tokensCss).toContain("--ds-*` is canonical")
    expect(tokensCss).toContain("@deprecated")
    expect(tokensCss).toContain("--tg-blue: var(--ds-chat-accent)")
    expect(tokensCss).toContain("--acc: var(--ds-color-primary)")
  })

  it("reactions pilot uses shell variable contract without !important (AC-H4)", () => {
    const lettersCss = readCss("letters.css")
    expect(lettersCss).toContain("--letters-reaction-bg:")
    expect(lettersCss).toContain("background: var(--letters-reaction-bg)")
    expect(lettersCss).toContain("background: var(--letters-reaction-hover-bg)")
    const reactionsBlock = lettersCss.slice(
      lettersCss.indexOf(".letters-passage__reactions span.msg-reaction"),
      lettersCss.indexOf(".letters-passage__reactions .msg-reaction-count"),
    )
    expect(reactionsBlock).not.toContain("!important")
    expect(reactionsBlock).not.toContain("#3390ec")
    expect(reactionsBlock).not.toMatch(/rgba\(90,\s*160,\s*255/)
  })

  it("blocks new #3390ec / #b03e1b literals outside allowlist (AC-H3)", () => {
    expect(() => {
      execFileSync(process.execPath, ["scripts/lint-css-tokens.mjs"], {
        cwd: root,
        stdio: "pipe",
      })
    }).not.toThrow()
  })

  it("documents Letters layout bands in breakpoints.ts (AC-H6, AC-H7)", () => {
    const bp = fs.readFileSync(path.join(root, "src", "layout", "breakpoints.ts"), "utf8")
    expect(bp).toContain("mobileCompactMax: 700")
    expect(bp).toContain("lettersThreeColMin: 1280")
    expect(bp).toContain("700–1279px")
    expect(bp).toContain("≥1280px")
  })

  it("adds container-type roots and one @container pilot (AC-H9, AC-H10)", () => {
    const lettersCss = readCss("letters.css")
    expect(lettersCss).toContain("container-type: inline-size")
    expect(lettersCss).toContain("container-name: letters-list")
    expect(lettersCss).toContain("container-name: letters-thread")
    expect(lettersCss).toContain("container-name: letters-day-mail")
    expect(lettersCss).toMatch(/@container letters-list/)
  })

  it("reduces !important count in letters.css by ≥50% from baseline (AC-H11)", () => {
    const lettersCss = readCss("letters.css")
    const count = countImportant(lettersCss)
    const ceiling = Math.floor(LETTERS_IMPORTANT_BASELINE * 0.5)
    expect(count).toBeLessThanOrEqual(ceiling)
  })
})
