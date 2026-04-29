import { renderHook } from "@testing-library/react"
import { createRef } from "react"
import { describe, expect, it, beforeEach } from "vitest"
import { useFocusTrap } from "./useFocusTrap"

function makeContainer(...labels: string[]): HTMLDivElement {
  const container = document.createElement("div")
  for (const label of labels) {
    const btn = document.createElement("button")
    btn.textContent = label
    container.appendChild(btn)
  }
  document.body.appendChild(container)
  return container
}

function tabEvent(shift = false): KeyboardEvent {
  return new KeyboardEvent("keydown", {
    key: "Tab",
    shiftKey: shift,
    bubbles: true,
    cancelable: true,
  })
}

describe("useFocusTrap", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
  })

  it("is a no-op when isOpen is false", () => {
    const container = makeContainer("A", "B")
    const ref = createRef<HTMLDivElement>()
    ;(ref as { current: HTMLDivElement }).current = container

    renderHook(() => useFocusTrap(ref, false))

    expect(document.activeElement).toBe(document.body)
  })

  it("moves focus to the first focusable element when opened", async () => {
    const container = makeContainer("First", "Second")
    const ref = createRef<HTMLDivElement>()
    ;(ref as { current: HTMLDivElement }).current = container

    renderHook(() => useFocusTrap(ref, true))

    await new Promise((r) => requestAnimationFrame(r))

    const buttons = container.querySelectorAll("button")
    expect(document.activeElement).toBe(buttons[0])
  })

  it("Tab cycles forward through focusable elements", async () => {
    const container = makeContainer("A", "B", "C")
    const ref = createRef<HTMLDivElement>()
    ;(ref as { current: HTMLDivElement }).current = container

    renderHook(() => useFocusTrap(ref, true))
    await new Promise((r) => requestAnimationFrame(r))

    const [btnA, btnB] = container.querySelectorAll("button")
    btnA.focus()

    document.dispatchEvent(tabEvent(false))
    expect(document.activeElement).toBe(btnB)
  })

  it("Tab wraps from last to first focusable element", async () => {
    const container = makeContainer("A", "B")
    const ref = createRef<HTMLDivElement>()
    ;(ref as { current: HTMLDivElement }).current = container

    renderHook(() => useFocusTrap(ref, true))
    await new Promise((r) => requestAnimationFrame(r))

    const buttons = container.querySelectorAll("button")
    buttons[buttons.length - 1].focus()

    document.dispatchEvent(tabEvent(false))
    expect(document.activeElement).toBe(buttons[0])
  })

  it("Shift+Tab wraps from first to last focusable element", async () => {
    const container = makeContainer("A", "B", "C")
    const ref = createRef<HTMLDivElement>()
    ;(ref as { current: HTMLDivElement }).current = container

    renderHook(() => useFocusTrap(ref, true))
    await new Promise((r) => requestAnimationFrame(r))

    const buttons = container.querySelectorAll("button")
    buttons[0].focus()

    document.dispatchEvent(tabEvent(true))
    expect(document.activeElement).toBe(buttons[buttons.length - 1])
  })

  it("restores focus to the previously focused element on close", async () => {
    const outside = document.createElement("button")
    outside.textContent = "Outside"
    document.body.appendChild(outside)
    outside.focus()

    const container = makeContainer("Inside")
    const ref = createRef<HTMLDivElement>()
    ;(ref as { current: HTMLDivElement }).current = container

    const { rerender } = renderHook(
      ({ open }: { open: boolean }) => useFocusTrap(ref, open),
      { initialProps: { open: true } }
    )
    await new Promise((r) => requestAnimationFrame(r))

    rerender({ open: false })

    expect(document.activeElement).toBe(outside)
  })
})
