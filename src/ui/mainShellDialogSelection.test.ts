/**
 * Characterization of MainShell dialog selection retain/clear (AC1).
 * Feature: .tlk/features/2026-07-27-app-code-refactor-mainshell/
 */
import { describe, expect, it } from "vitest"
import {
  shouldClearDeniedPrivateSelection,
  shouldClearSelectionForNightLock,
  shouldRetainSelectedDialog,
} from "./mainShellDialogSelection"

describe("shouldRetainSelectedDialog", () => {
  it("retains when peer is eligible and still loaded", () => {
    expect(
      shouldRetainSelectedDialog({
        selectedKey: "u:1",
        eligibleKeys: ["u:1", "u:2"],
        loadedKeys: ["u:1", "u:3"],
      }),
    ).toBe(true)
  })

  it("clears when peer drops from eligible or loaded sets", () => {
    expect(
      shouldRetainSelectedDialog({
        selectedKey: "u:1",
        eligibleKeys: ["u:2"],
        loadedKeys: ["u:1"],
      }),
    ).toBe(false)
    expect(
      shouldRetainSelectedDialog({
        selectedKey: "u:1",
        eligibleKeys: ["u:1"],
        loadedKeys: ["u:2"],
      }),
    ).toBe(false)
  })
})

describe("shouldClearDeniedPrivateSelection", () => {
  it("clears denied private chat in child mode only", () => {
    expect(
      shouldClearDeniedPrivateSelection({
        appMode: "child",
        isPrivateUser: true,
        peerKey: "u:9",
        deniedPeerIds: new Set(["u:9"]),
      }),
    ).toBe(true)
    expect(
      shouldClearDeniedPrivateSelection({
        appMode: "parent",
        isPrivateUser: true,
        peerKey: "u:9",
        deniedPeerIds: new Set(["u:9"]),
      }),
    ).toBe(false)
    expect(
      shouldClearDeniedPrivateSelection({
        appMode: "child",
        isPrivateUser: false,
        peerKey: "u:9",
        deniedPeerIds: new Set(["u:9"]),
      }),
    ).toBe(false)
  })
})

describe("shouldClearSelectionForNightLock", () => {
  it("clears selection for child during night list lock", () => {
    expect(
      shouldClearSelectionForNightLock({
        nightHidden: true,
        appMode: "child",
        hasSelection: true,
      }),
    ).toBe(true)
    expect(
      shouldClearSelectionForNightLock({
        nightHidden: true,
        appMode: "parent",
        hasSelection: true,
      }),
    ).toBe(false)
    expect(
      shouldClearSelectionForNightLock({
        nightHidden: false,
        appMode: "child",
        hasSelection: true,
      }),
    ).toBe(false)
  })
})
