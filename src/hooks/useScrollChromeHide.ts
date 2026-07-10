import { type RefObject, useEffect, useRef, useState } from "react"

/**
 * Hides chrome when the user scrolls down; shows again on scroll up.
 * `scrollRootRef` should point at the scrolling element (or a wrapper containing one).
 */
export function useScrollChromeHide(
  scrollRootRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): boolean {
  const [hidden, setHidden] = useState(false)
  const lastYRef = useRef(0)

  useEffect(() => {
    if (!enabled) {
      queueMicrotask(() => {
        setHidden(false)
      })
      return
    }
    const root = scrollRootRef.current
    if (!root) return

    const scroller =
      root.querySelector<HTMLElement>(".chat-list, .letters-day-mail, .letters-mobile-panel-scroll") ??
      root

    lastYRef.current = scroller.scrollTop

    const onScroll = (): void => {
      const y = scroller.scrollTop
      const delta = y - lastYRef.current
      if (y <= 4) {
        setHidden(false)
      } else if (delta > 6) {
        setHidden(true)
      } else if (delta < -6) {
        setHidden(false)
      }
      lastYRef.current = y
    }

    scroller.addEventListener("scroll", onScroll, { passive: true })
    return () => scroller.removeEventListener("scroll", onScroll)
  }, [enabled, scrollRootRef])

  return hidden
}
