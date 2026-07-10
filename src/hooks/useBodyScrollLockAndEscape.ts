import { useEffect } from "react"
import { useHardwareBackLayer } from "./useHardwareBack"

/** Locks `document.body` scroll and calls `onClose` on Escape while `open` is true.
 *  Also registers a hardware-back (History API) layer entry while open. */
export function useBodyScrollLockAndEscape(open: boolean, onClose: () => void): void {
  useHardwareBackLayer(open, onClose)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])
}
