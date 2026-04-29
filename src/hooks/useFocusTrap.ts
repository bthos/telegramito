import { type RefObject, useEffect, useRef } from "react"

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ")

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isOpen: boolean
): void {
  const savedFocusRef = useRef<Element | null>(null)

  // Focus management: save/restore + initial focus on open
  useEffect(() => {
    if (!isOpen) return
    savedFocusRef.current = document.activeElement
    const el = containerRef.current
    if (!el) return
    const getFocusable = (): HTMLElement[] =>
      Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE))
    requestAnimationFrame(() => {
      getFocusable()[0]?.focus()
    })
    return () => {
      const saved = savedFocusRef.current
      if (saved && document.contains(saved)) {
        ;(saved as HTMLElement).focus()
      }
    }
  }, [isOpen, containerRef])

  // Tab/Shift+Tab cycling — intercept all Tab events inside the trap so
  // focus stays within the container even in environments without native
  // Tab navigation (e.g. jsdom in tests).
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return
      const el = containerRef.current
      if (!el) return
      const focusable = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusable.length === 0) return
      const idx = focusable.indexOf(document.activeElement as HTMLElement)
      if (idx === -1) return
      e.preventDefault()
      if (e.shiftKey) {
        const prev = (idx - 1 + focusable.length) % focusable.length
        focusable[prev].focus()
      } else {
        const next = (idx + 1) % focusable.length
        focusable[next].focus()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [isOpen, containerRef])

  // MutationObserver to requery when async content loads
  useEffect(() => {
    if (!isOpen) return
    const el = containerRef.current
    if (!el) return
    let timer: ReturnType<typeof setTimeout>
    const observer = new MutationObserver(() => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        // Re-focus first if nothing in container is focused
        if (!el.contains(document.activeElement)) {
          const focusable = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE))
          focusable[0]?.focus()
        }
      }, 50)
    })
    observer.observe(el, { subtree: true, childList: true })
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [isOpen, containerRef])
}
