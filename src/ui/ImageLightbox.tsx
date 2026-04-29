import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useFocusTrap } from "../hooks/useFocusTrap"

type Props = {
  url: string
  onClose: () => void
  labelClose: string
  labelBackdrop: string
}

/**
 * Full-screen image overlay (SPA-friendly — no navigation).
 */
export function ImageLightbox({ url, onClose, labelClose, labelBackdrop }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  useFocusTrap(containerRef, true)

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

  const node = (
    <div
      className="media-lightbox"
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={labelBackdrop}
      onClick={onClose}
    >
      <button
        type="button"
        className="media-lightbox__close"
        aria-label={labelClose}
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        ×
      </button>
      <img
        className="media-lightbox__img"
        src={url}
        alt=""
        onClick={(e) => {
          e.stopPropagation()
        }}
      />
    </div>
  )

  return createPortal(node, document.body)
}
