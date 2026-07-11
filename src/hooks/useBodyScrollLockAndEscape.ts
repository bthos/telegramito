import { useEffect, useRef } from "react"
import { useHardwareBackLayer } from "./useHardwareBack"

/** Locks `document.body` scroll and calls `onClose` on Escape while `open` is true.
 *  Also registers a hardware-back (History API) layer entry while open.
 *
 *  `onClose` is stabilised via a ref so changes to its reference do not trigger
 *  the scroll-lock effect — the lock only re-runs when `open` changes. */
export function useBodyScrollLockAndEscape(open: boolean, onClose: () => void): void {
  useHardwareBackLayer(open, onClose)

  // Stable ref: always holds the latest onClose without being a dep of the effect.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener("keydown", onKey)
    }
  }, [open]) // onClose intentionally omitted — stabilised via onCloseRef above
}
