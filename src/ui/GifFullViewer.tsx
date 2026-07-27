import { createPortal } from "react-dom"
import { useDismissibleLayer } from "../hooks/useDismissibleLayer"

export type GifFullViewerProps = {
  src: string
  caption: string
  onClose: () => void
  ariaLabel: string
  labelClose: string
  labelFavourite: string
  labelForward: string
  labelSave: string
}

/**
 * Full-screen GIF overlay per design-system/preview/gif.html (full state):
 * dark backdrop → centred video (loop/autoPlay/muted) → caption → 3 visual-only action buttons.
 */
export function GifFullViewer({
  src,
  caption,
  onClose,
  ariaLabel,
  labelFavourite,
  labelForward,
  labelSave,
}: GifFullViewerProps) {
  const rootRef = useDismissibleLayer(true, onClose)

  const node = (
    <div
      ref={rootRef}
      className="gif-full-viewer"
      data-media-state="full"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={onClose}
    >
      <div className="gif-full-viewer__chrome" onClick={(e) => e.stopPropagation()}>
        <video
          className="gif-full-viewer__video"
          src={src}
          loop
          autoPlay
          muted
          playsInline
        />
        {caption.trim() ? (
          <div className="gif-full-viewer__caption">{caption}</div>
        ) : null}
        <div className="gif-full-viewer__actions" aria-label={ariaLabel}>
          <button
            type="button"
            className="gif-full-viewer__act"
            aria-label={labelFavourite}
            title={labelFavourite}
          />
          <button
            type="button"
            className="gif-full-viewer__act"
            aria-label={labelForward}
            title={labelForward}
          />
          <button
            type="button"
            className="gif-full-viewer__act"
            aria-label={labelSave}
            title={labelSave}
          />
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
