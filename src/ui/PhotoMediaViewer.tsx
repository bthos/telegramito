import { type ReactNode } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import { useDismissibleLayer } from "../hooks/useDismissibleLayer"

type Props = {
  url: string
  onClose: () => void
  labelClose: string
  labelBackdrop: string
  /** Top bar: chat / peer title (e.g. from getPeerInfo). */
  peerTitle: string
  sentAtLabel: string
  /** Caption under the image (message body), may be empty. */
  caption: string
  /** Optional initials for avatar disc (2 chars). */
  peerInitials?: string
  /** Decorative action icons in footer (favourite, save, check) per UX mock. */
  footerActions?: ReactNode
  /** Mirrors the original message: caption sat above the media, not below (Telegram's `invertMedia`). */
  captionAbove?: boolean
}

function initialsFromTitle(title: string): string {
  const p = title.trim().split(/\s+/).filter(Boolean)
  if (p.length >= 2) {
    return `${p[0]!.slice(0, 1)}${p[p.length - 1]!.slice(0, 1)}`.toUpperCase()
  }
  return (p[0] ?? title).slice(0, 2).toUpperCase() || "?"
}

/**
 * Full-screen photo viewer matching `design-system/preview/photo.html` (full state):
 * an image stage column + a content column (top bar, caption, actions). By default
 * the image comes first (left) since captions normally sit below the media in the
 * bubble; when `captionAbove` is set (Telegram's `invertMedia`), the column order
 * mirrors so content leads instead. Stacks vertically on narrow viewports (see the
 * `max-width: 720px` override in media-states.css), preserving the same order.
 */
export function PhotoMediaViewer({
  url,
  onClose,
  labelClose,
  labelBackdrop,
  peerTitle,
  sentAtLabel,
  caption,
  peerInitials,
  footerActions,
  captionAbove = false,
}: Props) {
  const { t } = useTranslation()
  const containerRef = useDismissibleLayer(true, onClose)
  const initials = peerInitials ?? initialsFromTitle(peerTitle)

  const contentBlock = (
    <div className="photo-viewer__content" key="content">
      <header className="photo-viewer__top">
        <div className="photo-viewer__avatar" aria-hidden>
          {initials}
        </div>
        <div className="photo-viewer__who">
          <b className="photo-viewer__name">{peerTitle}</b>
          <span className="photo-viewer__meta">{sentAtLabel}</span>
        </div>
        <span className="photo-viewer__spacer" />
        <button
          type="button"
          className="photo-viewer__icon-btn"
          aria-label={labelClose}
          onClick={onClose}
        >
          <span aria-hidden>×</span>
        </button>
      </header>
      <footer className="photo-viewer__bottom">
        {caption.trim() ? <div className="photo-viewer__caption">{caption}</div> : <div className="photo-viewer__spacer" />}
        <div
          className="photo-viewer__actions"
          {...(footerActions ? {} : { "aria-hidden": true as const })}
        >
          {footerActions ?? (
            <>
              <button
                type="button"
                className="photo-viewer__act-ico"
                aria-label={t("chat.photoActionFavourite")}
                title={t("chat.photoActionFavourite")}
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path
                    d="M10 17s-6-3.5-6-8a4 4 0 017-2.6A4 4 0 0118 9c0 4.5-6 8-6 8z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="photo-viewer__act-ico"
                aria-label={t("chat.photoActionSave")}
                title={t("chat.photoActionSave")}
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path
                    d="M6 3.5h8a1 1 0 011 1V17l-5-3.2L5 17V4.5a1 1 0 011-1z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="photo-viewer__act-ico"
                aria-label={t("chat.photoActionShare")}
                title={t("chat.photoActionShare")}
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path
                    d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 12v4a1 1 0 001 1h10a1 1 0 001-1v-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  )

  const stageBlock = (
    <div className="photo-viewer__stage" key="stage">
      <img
        className="photo-viewer__img"
        src={url}
        alt=""
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )

  const node = (
    <div
      className="media-lightbox media-lightbox--rich photo-viewer"
      data-media-state="full"
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={labelBackdrop}
      onClick={onClose}
    >
      <div className="photo-viewer__shell" onClick={(e) => e.stopPropagation()}>
        {captionAbove ? (
          <>
            {contentBlock}
            {stageBlock}
          </>
        ) : (
          <>
            {stageBlock}
            {contentBlock}
          </>
        )}
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
