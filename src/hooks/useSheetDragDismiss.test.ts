import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useSheetDragDismiss } from "./useSheetDragDismiss"

function makeRef<T extends HTMLElement>(el: T): { current: T } {
  return { current: el }
}

function firePointer(
  el: HTMLElement,
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
  clientY: number,
  extra: PointerEventInit = {},
) {
  el.dispatchEvent(
    new PointerEvent(type, { clientY, pointerId: 1, bubbles: true, cancelable: true, ...extra }),
  )
}

describe("useSheetDragDismiss", () => {
  it("dismisses when dragged past the threshold", () => {
    const panel = document.createElement("div")
    const backdrop = document.createElement("div")
    document.body.append(backdrop, panel)
    const onDismiss = vi.fn()

    renderHook(() =>
      useSheetDragDismiss(makeRef(panel), makeRef(backdrop), {
        open: true,
        onDismiss,
        threshold: 50,
      }),
    )

    firePointer(backdrop, "pointerdown", 0)
    firePointer(backdrop, "pointermove", 80)
    firePointer(backdrop, "pointerup", 80)

    expect(onDismiss).toHaveBeenCalledTimes(1)

    panel.remove()
    backdrop.remove()
  })

  it("springs back without dismissing when released under the threshold", () => {
    const panel = document.createElement("div")
    const backdrop = document.createElement("div")
    document.body.append(backdrop, panel)
    const onDismiss = vi.fn()

    renderHook(() =>
      useSheetDragDismiss(makeRef(panel), makeRef(backdrop), {
        open: true,
        onDismiss,
        threshold: 100,
      }),
    )

    firePointer(backdrop, "pointerdown", 0)
    firePointer(backdrop, "pointermove", 40)
    expect(panel.style.transform).toBe("translateY(40px)")

    firePointer(backdrop, "pointerup", 40)

    expect(onDismiss).not.toHaveBeenCalled()
    expect(panel.style.transform).toBe("")

    panel.remove()
    backdrop.remove()
  })

  it("does not follow upward drags (only downward dismiss)", () => {
    const panel = document.createElement("div")
    const backdrop = document.createElement("div")
    document.body.append(backdrop, panel)
    const onDismiss = vi.fn()

    renderHook(() =>
      useSheetDragDismiss(makeRef(panel), makeRef(backdrop), {
        open: true,
        onDismiss,
        threshold: 50,
      }),
    )

    firePointer(backdrop, "pointerdown", 100)
    firePointer(backdrop, "pointermove", 20)
    expect(panel.style.transform).toBe("translateY(0px)")

    firePointer(backdrop, "pointerup", 20)
    expect(onDismiss).not.toHaveBeenCalled()

    panel.remove()
    backdrop.remove()
  })

  it("ignores drag gestures while closed", () => {
    const panel = document.createElement("div")
    const backdrop = document.createElement("div")
    document.body.append(backdrop, panel)
    const onDismiss = vi.fn()

    renderHook(() =>
      useSheetDragDismiss(makeRef(panel), makeRef(backdrop), {
        open: false,
        onDismiss,
        threshold: 10,
      }),
    )

    firePointer(backdrop, "pointerdown", 0)
    firePointer(backdrop, "pointermove", 200)
    firePointer(backdrop, "pointerup", 200)

    expect(onDismiss).not.toHaveBeenCalled()
    expect(panel.style.transform).toBe("")

    panel.remove()
    backdrop.remove()
  })

  it("ignores non-primary mouse buttons", () => {
    const panel = document.createElement("div")
    const backdrop = document.createElement("div")
    document.body.append(backdrop, panel)
    const onDismiss = vi.fn()

    renderHook(() =>
      useSheetDragDismiss(makeRef(panel), makeRef(backdrop), {
        open: true,
        onDismiss,
        threshold: 10,
      }),
    )

    firePointer(backdrop, "pointerdown", 0, { pointerType: "mouse", button: 2 })
    firePointer(backdrop, "pointermove", 200)
    firePointer(backdrop, "pointerup", 200)

    expect(onDismiss).not.toHaveBeenCalled()
    expect(panel.style.transform).toBe("")

    panel.remove()
    backdrop.remove()
  })

  it("cleans up listeners and resets inline styles on unmount mid-drag", () => {
    const panel = document.createElement("div")
    const backdrop = document.createElement("div")
    document.body.append(backdrop, panel)
    const onDismiss = vi.fn()

    const { unmount } = renderHook(() =>
      useSheetDragDismiss(makeRef(panel), makeRef(backdrop), {
        open: true,
        onDismiss,
        threshold: 1000,
      }),
    )

    firePointer(backdrop, "pointerdown", 0)
    firePointer(backdrop, "pointermove", 30)
    expect(panel.style.transform).toBe("translateY(30px)")

    unmount()

    expect(panel.style.transform).toBe("")
    expect(onDismiss).not.toHaveBeenCalled()

    panel.remove()
    backdrop.remove()
  })
})
