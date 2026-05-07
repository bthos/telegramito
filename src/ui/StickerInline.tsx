import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { Api } from "telegram"
import { ModalChrome } from "./ModalChrome"

export function StickerInline({
  url,
  doc,
}: {
  url: string
  doc: Api.Document | null
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const packHint = t("chat.stickerPackHintGeneric")
  void doc

  return (
    <>
      <button type="button" className="msg-sticker-hit" onClick={() => setOpen(true)} aria-label={t("chat.openSticker")}>
        <img className="msg-sticker-img" src={url} alt="" draggable={false} />
      </button>
      {open ? (
        <ModalChrome onClose={() => setOpen(false)} ariaLabel={t("chat.stickerViewerDialog")} className="media-modal-backdrop--surface">
          <div className="sticker-full-modal" data-media-state="full">
            <button type="button" className="sticker-full-modal__close" onClick={() => setOpen(false)} aria-label={t("chat.imageViewerClose")}>
              ×
            </button>
            <div className="sticker-full-modal__big" aria-hidden>
              <img className="msg-sticker-img msg-sticker-img--lg" src={url} alt="" draggable={false} />
            </div>
            <div className="sticker-full-modal__meta">
              <div className="sticker-full-modal__name">{t("chat.stickerDefaultName")}</div>
              <div className="sticker-full-modal__sub">{packHint}</div>
            </div>
            <div className="sticker-full-modal__pack" aria-hidden>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="sticker-full-modal__cell" />
              ))}
            </div>
          </div>
        </ModalChrome>
      ) : null}
    </>
  )
}
