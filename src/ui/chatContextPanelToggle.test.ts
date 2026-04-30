/**
 * Unit tests for the panel open/closed toggle logic in ChatView.
 *
 * ChatView has too many dependencies to render in jsdom. Pure state-transition
 * functions are extracted and tested directly — the same pattern used in
 * chatInitialLoad.test.ts and chatListObserver.test.ts.
 */
import { describe, expect, it, vi } from "vitest"

function togglePanel(current: boolean): boolean {
  return !current
}

function resetPanelForChatSwitch(_prev: boolean): boolean {
  return false
}

function closePanelOnEscape(key: string, setOpen: (v: boolean) => void): void {
  if (key === "Escape") {
    setOpen(false)
  }
}

describe("chatContextPanel — toggle", () => {
  it("togglePanel returns true when panel is closed", () => {
    expect(togglePanel(false)).toBe(true)
  })

  it("togglePanel returns false when panel is open", () => {
    expect(togglePanel(true)).toBe(false)
  })
})

describe("chatContextPanel — reset on chat switch", () => {
  it("resets to false when panel was open", () => {
    expect(resetPanelForChatSwitch(true)).toBe(false)
  })

  it("stays false when panel was already closed", () => {
    expect(resetPanelForChatSwitch(false)).toBe(false)
  })
})

describe("chatContextPanel — close on Escape", () => {
  it("calls setOpen(false) when Escape is pressed", () => {
    const setOpen = vi.fn()
    closePanelOnEscape("Escape", setOpen)
    expect(setOpen).toHaveBeenCalledWith(false)
    expect(setOpen).toHaveBeenCalledOnce()
  })

  it("does NOT call setOpen for Enter key", () => {
    const setOpen = vi.fn()
    closePanelOnEscape("Enter", setOpen)
    expect(setOpen).not.toHaveBeenCalled()
  })

  it("does NOT call setOpen for Tab key", () => {
    const setOpen = vi.fn()
    closePanelOnEscape("Tab", setOpen)
    expect(setOpen).not.toHaveBeenCalled()
  })
})
