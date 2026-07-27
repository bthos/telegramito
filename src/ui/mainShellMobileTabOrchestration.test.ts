/**
 * Characterization of mobile tab / desk orchestration (AC1).
 * Feature: .tlk/features/2026-07-27-app-code-refactor-mainshell/
 */
import { describe, expect, it } from "vitest"
import { resolveMobileTabSelect } from "./mainShellMobileTabOrchestration"

describe("resolveMobileTabSelect", () => {
  it("opens desk sheet when desk tab is tapped", () => {
    expect(resolveMobileTabSelect("desk")).toEqual({ kind: "openDesk" })
  })

  it("selects letters/dayMail/circles and closes desk sheet", () => {
    expect(resolveMobileTabSelect("letters")).toEqual({
      kind: "selectTab",
      tab: "letters",
      closeDesk: true,
    })
    expect(resolveMobileTabSelect("dayMail")).toEqual({
      kind: "selectTab",
      tab: "dayMail",
      closeDesk: true,
    })
    expect(resolveMobileTabSelect("circles")).toEqual({
      kind: "selectTab",
      tab: "circles",
      closeDesk: true,
    })
  })
})
