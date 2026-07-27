/**
 * Structure gate for MainShell refactor (AC2 / AC3).
 *
 * Post-Cmok assertions are RED until Cmok extracts modules — Bagnik test gate
 * accepts characterization suite green; structure checks run at code QA.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const uiDir = path.dirname(fileURLToPath(import.meta.url))

function loc(file: string): number {
  return fs.readFileSync(path.join(uiDir, file), "utf8").split("\n").length
}

const postCmok = process.env.MAINSHELL_STRUCTURE_GATE === "1"

describe("mainShell module structure (AC2 / AC3)", () => {
  it("MainShell remains the public façade import path", () => {
    const src = fs.readFileSync(path.join(uiDir, "MainShell.tsx"), "utf8")
    expect(src).toMatch(/export function MainShell/)
  })

  it("delegates dialog selection, chrome, and letters desk to dedicated modules (AC3)", () => {
    const mainShell = fs.readFileSync(path.join(uiDir, "MainShell.tsx"), "utf8")
    expect(mainShell).toMatch(/useMainShellDialogSelection/)
    expect(mainShell).toMatch(/mainShellChromeGate/)
    expect(mainShell).toMatch(/useMainShellMobileChrome/)
    expect(mainShell).toMatch(/LettersDeskSheet/)
    expect(mainShell).toMatch(/MainShellDesktopChatsLayout/)
  })

  it("chrome gate module exists for width/tab predicate dedupe (AC6)", () => {
    expect(fs.existsSync(path.join(uiDir, "mainShellChromeGate.ts"))).toBe(true)
  })
})

describe.skipIf(!postCmok)("mainShell module structure post-Cmok (code QA)", () => {
  it("extracts dialog selection hook", () => {
    expect(fs.existsSync(path.join(uiDir, "useMainShellDialogSelection.ts"))).toBe(true)
  })

  it("extracts mobile chrome hook and mobile list panel", () => {
    expect(fs.existsSync(path.join(uiDir, "useMainShellMobileChrome.ts"))).toBe(true)
    expect(fs.existsSync(path.join(uiDir, "MainShellMobileListPanel.tsx"))).toBe(true)
  })

  it("MainShell is no longer a god-file (≤ ~540 LOC soft ceiling)", () => {
    expect(loc("MainShell.tsx")).toBeLessThanOrEqual(540)
  })

  it("MainShell imports chrome gate instead of inline predicates", () => {
    const src = fs.readFileSync(path.join(uiDir, "MainShell.tsx"), "utf8")
    expect(src).toMatch(/mainShellChromeGate/)
  })
})
