import { useState } from "react"
import { useTranslation } from "react-i18next"
import { safeFileDownloadName, documentExtensionLabel } from "../telegram/documentFile"
import type { Api } from "teleproto"
import type { MediaViewerContext } from "./mediaViewerContext"
import { ModalChrome } from "./ModalChrome"

export function DocumentAttachmentInline({
  url,
  name,
  sizeStr,
  doc: _doc,
  viewerContext,
  pageCount,
}: {
  url: string
  name: string
  sizeStr: string
  doc: Api.Document | null
  viewerContext?: MediaViewerContext | null
  pageCount?: number
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const dName = safeFileDownloadName(name)
  const ext = documentExtensionLabel(name)
  void _doc
  const sub = [sizeStr].filter(Boolean).join(" · ")

  return (
    <>
      <div className="msg-doc-preview-wrap">
        <div className="msg-doc-row" data-media-state="preview">
          <button type="button" className="msg-doc-row__main" onClick={() => setOpen(true)} aria-label={t("chat.documentOpenPreview")}>
            <span className={`msg-doc-row__icon ${ext === "PDF" ? "msg-doc-row__icon--pdf" : ""}`} aria-hidden>
              {ext}
            </span>
            <span className="msg-doc-row__body">
              <span className="msg-doc-row__title">{name}</span>
              {sub ? <span className="msg-doc-row__sub">{sub}</span> : null}
            </span>
          </button>
        </div>
        {viewerContext?.sentAtLabel ? (
          <div className="media-inline-meta-foot">{viewerContext.sentAtLabel}</div>
        ) : null}
      </div>
      {open ? (
        <ModalChrome onClose={() => setOpen(false)} ariaLabel={t("chat.documentViewerDialog")} className="media-modal-backdrop--surface">
          <div className="doc-preview-modal" data-media-state="full">
            <div className="doc-preview-modal__bar">
              <span className={`msg-doc-row__icon msg-doc-row__icon--sm ${ext === "PDF" ? "msg-doc-row__icon--pdf" : ""}`} aria-hidden>
                {ext}
              </span>
              <div className="doc-preview-modal__bar-text">
                <div className="doc-preview-modal__name">{name}</div>
                <div className="doc-preview-modal__sub">{t("chat.documentPreviewStub")}</div>
              </div>
              <a
                className="doc-preview-modal__dl"
                href={url}
                download={dName}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("chat.fileDownloadLabel")}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                  <path d="M8 12l-5-5h3V2h4v5h3l-5 5zM2 14h12v-2H2v2z" />
                </svg>
              </a>
              <button
                type="button"
                className="doc-preview-modal__overflow"
                aria-label={t("chat.documentOverflow")}
                aria-haspopup="menu"
              >
                ⋮
              </button>
              <button type="button" className="doc-preview-modal__close" onClick={() => setOpen(false)} aria-label={t("chat.imageViewerClose")}>
                ×
              </button>
            </div>
            <div className="doc-preview-modal__page">
              <div className="doc-preview-modal__sheet" aria-hidden>
                <div className="doc-preview-modal__ln doc-preview-modal__ln--h" />
                <div className="doc-preview-modal__ln" />
                <div className="doc-preview-modal__ln" />
                <div className="doc-preview-modal__ln doc-preview-modal__ln--short" />
                <div className="doc-preview-modal__gap" />
                <div className="doc-preview-modal__ln" />
                <div className="doc-preview-modal__ln" />
                <div className="doc-preview-modal__ln doc-preview-modal__ln--short" />
              </div>
            </div>
            {pageCount != null ? (
              <div className="doc-preview-modal__page-count">
                {t("chat.documentPageCount", { count: pageCount })}
              </div>
            ) : null}
            <a className="doc-preview-modal__open" href={url} download={dName} target="_blank" rel="noopener noreferrer">
              {t("chat.fileSaveHint")}
            </a>
          </div>
        </ModalChrome>
      ) : null}
    </>
  )
}
