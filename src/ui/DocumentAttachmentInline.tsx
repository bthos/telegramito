import { useState } from "react"
import { useTranslation } from "react-i18next"
import { safeFileDownloadName, documentExtensionLabel } from "../telegram/documentFile"
import type { Api } from "telegram"
import { ModalChrome } from "./ModalChrome"

export function DocumentAttachmentInline({
  url,
  name,
  sizeStr,
  doc: _doc,
}: {
  url: string
  name: string
  sizeStr: string
  doc: Api.Document | null
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const dName = safeFileDownloadName(name)
  const ext = documentExtensionLabel(name)
  void _doc
  const sub = [sizeStr].filter(Boolean).join(" · ")

  return (
    <>
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
        <a
          className="msg-doc-row__dl"
          href={url}
          download={dName}
          target="_blank"
          rel="noopener noreferrer"
          title={t("chat.fileSaveHint")}
          onClick={(e) => e.stopPropagation()}
        >
          {t("chat.documentDownloadShort")}
        </a>
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
            <a className="doc-preview-modal__open" href={url} download={dName} target="_blank" rel="noopener noreferrer">
              {t("chat.fileSaveHint")}
            </a>
          </div>
        </ModalChrome>
      ) : null}
    </>
  )
}
