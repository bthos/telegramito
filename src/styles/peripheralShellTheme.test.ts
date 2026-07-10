/**
 * AC regression: letters-peripheral-shell-theme (auth/boot envelope + in-desk settings).
 * Feature: .tlk/features/2026-07-10-letters-peripheral-shell-theme/
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
const stylesDir = path.join(root, "src", "styles")

function readCss(name: string) {
  return fs.readFileSync(path.join(stylesDir, name), "utf8")
}

describe("letters peripheral shell theme", () => {
  it("scopes newsprint tokens to peripheral shell (AC-P2)", () => {
    const peripheral = readCss("tokens-peripheral.css")
    expect(peripheral).toContain(".app-root--peripheral")
    expect(peripheral).toContain("--bg: var(--letters-paper")

    const letters = readCss("tokens-letters.css")
    expect(letters).toMatch(/html\[data-theme="light"\] \.app-root--main,\s*\nhtml\[data-theme="light"\] \.app-root--peripheral/)
    expect(letters).toContain("--acc: #b03e1b")
  })

  it("styles auth and boot with warm envelope surfaces (AC-P2, AC-P4)", () => {
    const shell = readCss("peripheral-shell.css")
    expect(shell).toContain(".app-root--peripheral .auth-screen")
    expect(shell).toContain("var(--letters-accent-soft")
    expect(shell).not.toContain("#1a3860")
    expect(shell).toContain(".app-root--peripheral .app-boot")
  })

  it("overrides in-desk settings to terracotta tokens (AC-P3)", () => {
    const letters = readCss("tokens-letters.css")
    expect(letters).toContain(".app-root--main .settings")
    expect(letters).toContain(".app-root--main button.switch[aria-checked=\"true\"] .switch__track")
    const settingsBlock = letters.slice(letters.indexOf("/* Settings in-desk"))
    expect(settingsBlock).not.toContain("#3390ec")
    expect(settingsBlock).not.toMatch(/rgba\(90,\s*160,\s*255/)
  })

  it("imports peripheral stylesheets from index.css", () => {
    const indexCss = fs.readFileSync(path.join(root, "src", "index.css"), "utf8")
    expect(indexCss).toContain("tokens-peripheral.css")
    expect(indexCss).toContain("peripheral-shell.css")
  })
})
