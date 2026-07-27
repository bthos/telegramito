/**
 * Characterization of MainShell search filter (AC1).
 * Feature: .tlk/features/2026-07-27-app-code-refactor-mainshell/
 */
import { describe, expect, it } from "vitest"
import type { Dialog } from "telegram/tl/custom/dialog"
import type { Api } from "telegram"
import { filterDialogsBySearch } from "./mainShellDialogFilter"

const tr = (k: string) => k

function namedDialog(name: string, preview = ""): Dialog {
  return {
    name,
    message: preview
      ? ({ className: "Message", message: preview } as unknown as Api.Message)
      : undefined,
  } as unknown as Dialog
}

describe("filterDialogsBySearch", () => {
  it("returns all dialogs when query is empty", () => {
    const dialogs = [namedDialog("Alice"), namedDialog("Bob")]
    expect(filterDialogsBySearch(dialogs, "  ", tr)).toEqual(dialogs)
  })

  it("matches peer name case-insensitively", () => {
    const dialogs = [namedDialog("Alice"), namedDialog("Bob")]
    expect(filterDialogsBySearch(dialogs, "ali", tr)).toEqual([namedDialog("Alice")])
  })

  it("matches dialog preview text via getDialogPreviewText", () => {
    const dialogs = [namedDialog("X", "hello world"), namedDialog("Y", "other")]
    expect(filterDialogsBySearch(dialogs, "hello", tr)).toEqual([namedDialog("X", "hello world")])
  })
})
