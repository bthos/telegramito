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
 * overlay chrome, top bar (avatar + who + time), image stage, bottom caption + actions.
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
}: Props) {
  const { t } = useTranslation()
  const containerRef = useDismissibleLayer(true, onClose)
  const initials = peerInitials ?? initialsFromTitle(peerTitle)

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
        <div className="photo-viewer__stage">
          <img
            className="photo-viewer__img"
            src={url}
            alt=""
            onClick={(e) => e.stopPropagation()}
          />
        </div>
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
                />
                <button
                  type="button"
                  className="photo-viewer__act-ico"
                  aria-label={t("chat.photoActionSave")}
                  title={t("chat.photoActionSave")}
                />
                <button
                  type="button"
                  className="photo-viewer__act-ico"
                  aria-label={t("chat.photoActionShare")}
                  title={t("chat.photoActionShare")}
                />
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
