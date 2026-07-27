import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as bodyScrollModule from "./useBodyScrollLockAndEscape"
import * as focusTrapModule from "./useFocusTrap"
import { __resetHardwareBackForTests } from "./useHardwareBack"
import { useDismissibleLayer } from "./useDismissibleLayer"

describe("useDismissibleLayer", () => {
  beforeEach(() => {
    document.body.style.overflow = ""
    __resetHardwareBackForTests()
    vi.restoreAllMocks()
  })

  it("composes useFocusTrap and useBodyScrollLockAndEscape (AC2)", () => {
    const focusSpy = vi.spyOn(focusTrapModule, "useFocusTrap")
    const scrollSpy = vi.spyOn(bodyScrollModule, "useBodyScrollLockAndEscape")
    const onClose = vi.fn()

    renderHook(() => useDismissibleLayer(true, onClose))

    expect(focusSpy).toHaveBeenCalledWith(expect.objectContaining({ current: null }), true)
    expect(scrollSpy).toHaveBeenCalledWith(true, onClose)
  })

  it("locks body scroll while open (AC1)", () => {
    const onClose = vi.fn()
    renderHook(() => useDismissibleLayer(true, onClose))
    expect(document.body.style.overflow).toBe("hidden")
  })

  it("calls onClose on Escape while open (AC1)", () => {
    const onClose = vi.fn()
    renderHook(() => useDismissibleLayer(true, onClose))

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("does not re-run scroll lock when onClose identity changes (AC5)", () => {
    const addSpy = vi.spyOn(document, "addEventListener")
    const { rerender } = renderHook(
      ({ onClose }: { onClose: () => void }) => useDismissibleLayer(true, onClose),
      { initialProps: { onClose: vi.fn() } },
    )

    const keydownAddsAfterMount = addSpy.mock.calls.filter(([type]) => type === "keydown").length

    rerender({ onClose: vi.fn() })

    const keydownAddsAfterRerender = addSpy.mock.calls.filter(([type]) => type === "keydown").length
    expect(keydownAddsAfterRerender).toBe(keydownAddsAfterMount)
  })

  it("does not add history.pushState beyond useHardwareBack (AC3)", () => {
    const pushSpy = vi.spyOn(history, "pushState")
    const onClose = vi.fn()

    renderHook(() => useDismissibleLayer(true, onClose))

    // useHardwareBackLayer pushes once on mount; layer hook must not push extra.
    expect(pushSpy.mock.calls.length).toBe(1)
  })

  it("returns a ref object for the caller to attach", () => {
    const { result } = renderHook(() => useDismissibleLayer(true, vi.fn()))
    expect(result.current).toEqual(expect.objectContaining({ current: null }))
  })
})
