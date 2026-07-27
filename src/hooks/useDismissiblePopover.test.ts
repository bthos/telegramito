import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as focusTrapModule from "./useFocusTrap"
import * as hardwareBackModule from "./useHardwareBack"
import { __resetHardwareBackForTests } from "./useHardwareBack"
import { useDismissiblePopover } from "./useDismissiblePopover"

describe("useDismissiblePopover", () => {
  beforeEach(() => {
    document.body.style.overflow = ""
    __resetHardwareBackForTests()
    vi.restoreAllMocks()
  })

  it("composes useFocusTrap and useHardwareBackLayer (AC2)", () => {
    const focusSpy = vi.spyOn(focusTrapModule, "useFocusTrap")
    const backSpy = vi.spyOn(hardwareBackModule, "useHardwareBackLayer")
    const onClose = vi.fn()

    renderHook(() => useDismissiblePopover(true, onClose))

    expect(focusSpy).toHaveBeenCalledWith(expect.objectContaining({ current: null }), true)
    expect(backSpy).toHaveBeenCalledWith(true, onClose)
  })

  it("does not lock body scroll when open (AC1)", () => {
    renderHook(() => useDismissiblePopover(true, vi.fn()))
    expect(document.body.style.overflow).not.toBe("hidden")
  })

  it("registers hardware back layer while open (AC3)", () => {
    const pushSpy = vi.spyOn(history, "pushState")
    renderHook(() => useDismissiblePopover(true, vi.fn()))
    expect(pushSpy.mock.calls.length).toBeGreaterThanOrEqual(1)
  })

  it("does not register duplicate back layers on parent re-render (AC5)", () => {
    const pushSpy = vi.spyOn(history, "pushState")
    const { rerender } = renderHook(
      ({ onClose }: { onClose: () => void }) => useDismissiblePopover(true, onClose),
      { initialProps: { onClose: vi.fn() } },
    )

    const pushesAfterMount = pushSpy.mock.calls.length
    rerender({ onClose: vi.fn() })
    expect(pushSpy.mock.calls.length).toBe(pushesAfterMount)
  })

  it("returns a ref object for the caller to attach", () => {
    const { result } = renderHook(() => useDismissiblePopover(true, vi.fn()))
    expect(result.current).toEqual(expect.objectContaining({ current: null }))
  })
})
