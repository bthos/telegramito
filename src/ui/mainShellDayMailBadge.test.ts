/**
 * Characterization of day-mail tab badge (AC1).
 * Feature: .tlk/features/2026-07-27-app-code-refactor-mainshell/
 */
import { describe, expect, it } from "vitest"
import type { Dialog } from "telegram/tl/custom/dialog"
import { countDayMailBadge } from "./mainShellDayMailBadge"

function dialog(unread: number, date: number | undefined): Dialog {
  return {
    unreadCount: unread,
    message: date != null ? { date } : undefined,
  } as unknown as Dialog
}

describe("countDayMailBadge", () => {
  it("counts dialogs with unread and dated messages", () => {
    expect(
      countDayMailBadge([
        dialog(1, 1_700_000_000),
        dialog(0, 1_700_000_000),
        dialog(2, undefined),
        dialog(3, 1_700_000_001),
      ]),
    ).toBe(2)
  })

  it("caps at 14 matches", () => {
    const many = Array.from({ length: 20 }, () => dialog(1, 1))
    expect(countDayMailBadge(many)).toBe(14)
  })
})
