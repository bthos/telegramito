import { useRef, type RefObject } from "react"
import { useBodyScrollLockAndEscape } from "./useBodyScrollLockAndEscape"
import { useFocusTrap } from "./useFocusTrap"

/**
 * Focus trap + body scroll lock + Escape + hardware back for modal overlays and sheets.
 * Composes existing primitives — no additional lifecycle side effects.
 */
export function useDismissibleLayer(
  open: boolean,
  onClose: () => void,
): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, open)
  useBodyScrollLockAndEscape(open, onClose)
  return ref
}
