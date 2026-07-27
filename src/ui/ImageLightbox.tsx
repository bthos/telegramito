import { createPortal } from "react-dom"
import { useDismissibleLayer } from "../hooks/useDismissibleLayer"

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
  const containerRef = useDismissibleLayer(true, onClose)

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
