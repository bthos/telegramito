import { useRef, type RefObject } from "react"
import { useFocusTrap } from "./useFocusTrap"
import { useHardwareBackLayer } from "./useHardwareBack"

/**
 * Focus trap + hardware back for anchored popovers (no body scroll lock).
 * Composes existing primitives — no additional lifecycle side effects.
 */
export function useDismissiblePopover(
  open: boolean,
  onClose: () => void,
): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, open)
  useHardwareBackLayer(open, onClose)
  return ref
}
