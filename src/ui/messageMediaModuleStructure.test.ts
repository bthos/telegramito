/**
 * Structure gate for media-stack refactor (AC2).
 * Feature: .tlk/archive/2026-07-27-app-code-refactor-media/
 *
 * Some assertions are RED until Cmok extracts modules — Bagnik test gate accepts
 * characterization suite green; structure checks run at code QA.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const uiDir = path.dirname(fileURLToPath(import.meta.url))

function loc(file: string): number {
  return fs.readFileSync(path.join(uiDir, file), "utf8").split("\n").length
}

const postCmok = process.env.MEDIA_STRUCTURE_GATE === "1"

describe("message media module structure (AC2)", () => {
  it("MessageMediaView remains the public façade import path", () => {
    const src = fs.readFileSync(path.join(uiDir, "MessageMediaView.tsx"), "utf8")
    expect(src).toMatch(/export function MessageMediaView/)
    expect(src).toMatch(/export type \{ MediaViewerContext \}/)
  })
})

describe.skipIf(!postCmok)("message media module structure post-Cmok (code QA)", () => {
  it("extracts useMessageMediaBlob hook module", () => {
    expect(fs.existsSync(path.join(uiDir, "useMessageMediaBlob.ts"))).toBe(true)
  })

  it("extracts deferred pending/loading views module", () => {
    expect(fs.existsSync(path.join(uiDir, "messageMediaDeferredViews.tsx"))).toBe(true)
  })

  it("MessageMediaView is no longer a god-file (≤ ~800 LOC soft ceiling)", () => {
    expect(loc("MessageMediaView.tsx")).toBeLessThanOrEqual(820)
  })
})
