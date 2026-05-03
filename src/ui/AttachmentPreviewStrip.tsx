import { useTranslation } from "react-i18next"
import type { DraftAttachment } from "../hooks/useDraftAttachments"
import { formatDocumentSize } from "../telegram/documentFile"

function truncateName(name: string, max = 20): string {
  if (name.length <= max) return name
  return `${name.slice(0, Math.max(0, max - 1))}…`
}

type Props = {
  attachments: DraftAttachment[]
  onRemove: (id: string) => void
  onRetry?: (id: string) => void
}

export function AttachmentPreviewStrip({
  attachments,
  onRemove,
  onRetry,
}: Props) {
  const { t } = useTranslation()

  if (attachments.length === 0) {
    return null
  }

  return (
    <ul className="attachment-strip" role="list">
      {attachments.map((a) => {
        const name = truncateName(a.file.name)
        const removeLabel = t("chat.attachRemove", { name: a.file.name })
        const sizeStr = formatDocumentSize(a.file.size)
        return (
          <li
            key={a.id}
            className={
              a.failed
                ? "attachment-strip__item attachment-strip__item--failed"
                : "attachment-strip__item"
            }
          >
            {a.kind === "video" ? (
              <div className="attachment-strip__thumb-wrap">
                <video
                  className="attachment-strip__thumb"
                  src={a.previewUrl}
                  muted
                  playsInline
                  preload="metadata"
                  aria-hidden
                />
                <button
                  type="button"
                  className="attachment-strip__x"
                  aria-label={removeLabel}
                  onClick={() => {
                    onRemove(a.id)
                  }}
                >
                  ×
                </button>
              </div>
            ) : a.kind === "image" ? (
              <div className="attachment-strip__thumb-wrap">
                <img
                  className="attachment-strip__thumb"
                  src={a.previewUrl}
                  alt=""
                  draggable={false}
                />
                <button
                  type="button"
                  className="attachment-strip__x"
                  aria-label={removeLabel}
                  onClick={() => {
                    onRemove(a.id)
                  }}
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="attachment-strip__doc">
                <span className="attachment-strip__doc-name">
                  {name}
                  {" · "}
                  {sizeStr}
                </span>
                <button
                  type="button"
                  className="attachment-strip__x attachment-strip__x--doc"
                  aria-label={removeLabel}
                  onClick={() => {
                    onRemove(a.id)
                  }}
                >
                  ×
                </button>
              </div>
            )}
            {a.failed ? (
              <button
                type="button"
                className="attachment-strip__retry"
                onClick={() => {
                  onRetry?.(a.id)
                }}
              >
                {t("chat.attachUploadFailed")}
                {" — "}
                {t("chat.attachRetryUpload")}
              </button>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
