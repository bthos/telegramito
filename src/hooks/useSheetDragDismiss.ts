import { useEffect, useRef, type RefObject } from "react"

type Options = {
  open: boolean
  onDismiss: () => void
  /** Downward drag distance (px) past which release dismisses the sheet. */
  threshold?: number
}

/**
 * Drag-to-dismiss for bottom sheets: attach `panelRef` to the sliding sheet
 * and `backdropRef` to its dimmed scrim. Dragging down on the backdrop
 * (mouse or touch, via Pointer Events) follows the pointer 1:1 by
 * translating the panel and fading the scrim, then either snaps the sheet
 * closed past `threshold` or springs back to rest on release.
 *
 * Panel/backdrop transitions are toggled off during the drag (so the panel
 * tracks the pointer with no lag) and restored — after a forced reflow, so
 * the browser actually animates the reset — on release.
 */
export function useSheetDragDismiss(
  panelRef: RefObject<HTMLElement | null>,
  backdropRef: RefObject<HTMLElement | null>,
  { open, onDismiss, threshold = 96 }: Options,
): void {
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  useEffect(() => {
    const panel = panelRef.current
    const backdrop = backdropRef.current
    if (!open || !panel || !backdrop) return

    let dragging = false
    let startY = 0
    let deltaY = 0
    let pointerId: number | null = null

    const settle = (dismiss: boolean) => {
      dragging = false
      pointerId = null
      panel.style.transition = ""
      backdrop.style.transition = ""
      // Force a reflow between re-enabling the transition and clearing the
      // inline transform/opacity, so the snap-back/fade-in is animated
      // instead of jumping straight to rest in the same paint.
      void panel.offsetHeight
      panel.style.transform = ""
      backdrop.style.opacity = ""
      if (dismiss) onDismissRef.current()
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return
      dragging = true
      startY = e.clientY
      deltaY = 0
      pointerId = e.pointerId
      panel.style.transition = "none"
      backdrop.style.transition = "none"
      try {
        backdrop.setPointerCapture(e.pointerId)
      } catch {
        // Pointer capture unsupported (older browsers, jsdom) — drag still
        // tracks fine via the listeners below.
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointerId) return
      deltaY = Math.max(0, e.clientY - startY)
      panel.style.transform = `translateY(${deltaY}px)`
      backdrop.style.opacity = String(Math.max(0, 1 - deltaY / (threshold * 2)))
    }

    const onPointerUp = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointerId) return
      settle(deltaY > threshold)
    }

    backdrop.addEventListener("pointerdown", onPointerDown)
    backdrop.addEventListener("pointermove", onPointerMove)
    backdrop.addEventListener("pointerup", onPointerUp)
    backdrop.addEventListener("pointercancel", onPointerUp)

    return () => {
      backdrop.removeEventListener("pointerdown", onPointerDown)
      backdrop.removeEventListener("pointermove", onPointerMove)
      backdrop.removeEventListener("pointerup", onPointerUp)
      backdrop.removeEventListener("pointercancel", onPointerUp)
      if (dragging) settle(false)
    }
  }, [open, threshold, panelRef, backdropRef])
}
