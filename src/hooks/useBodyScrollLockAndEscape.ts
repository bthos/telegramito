import { useEffect } from "react"

/** Locks `document.body` scroll and calls `onClose` on Escape while mounted. */
export function useBodyScrollLockAndEscape(onClose: () => void): void {
  useEffect(() => {
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
  }, [onClose])
}
