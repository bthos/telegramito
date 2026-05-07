import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { MessageMediaTranslateFn } from "./messageMediaI18n"
import { ModalChrome } from "./ModalChrome"
import type { Api } from "telegram"

function MapHero() {
  return (
    <div className="geo-full-modal__map" aria-hidden>
      <span className="geo-full-modal__pin" />
    </div>
  )
}

export function ExpandableGeoCard({
  href,
  t,
}: {
  href: string | null
  t: MessageMediaTranslateFn
}) {
  const { t: te } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <>
      <div data-media-state="preview" className="msg-media msg-media--card msg-media--geo" role="group" aria-label={t("chat.previewLocation")}>
        <button type="button" className="msg-media-expand-hit" onClick={() => setOpen(true)} aria-label={te("chat.mediaExpandMap")}>
          <div className="msg-media-geo-preview">
            <div className="msg-media-geo-preview__map" aria-hidden>
              <span className="msg-media-geo-preview__pin" />
            </div>
            <div className="msg-media-geo-preview__body">
              {href ? (
                <span className="msg-media-card__link">{t("chat.mediaOpenInMaps")}</span>
              ) : (
                <span className="msg-media-card__muted">{t("chat.mediaLocationNoCoords")}</span>
              )}
            </div>
          </div>
        </button>
      </div>
      {open ? (
        <ModalChrome onClose={() => setOpen(false)} ariaLabel={te("chat.geoViewerDialog")} className="media-modal-backdrop--surface">
          <div className="geo-full-modal" data-media-state="full">
            <div className="geo-full-modal__chrome">
              <button type="button" className="geo-full-modal__close" onClick={() => setOpen(false)} aria-label={te("chat.imageViewerClose")}>
                ×
              </button>
              <MapHero />
              <div className="geo-full-modal__sheet">
                <div className="geo-full-modal__sheet-row">
                  <span className="geo-full-modal__ic" aria-hidden />
                  <div>
                    <div className="geo-full-modal__sheet-title">{t("chat.previewLocation")}</div>
                    {href ? (
                      <a className="msg-media-card__link" href={href} target="_blank" rel="noopener noreferrer">
                        {t("chat.mediaOpenInMaps")}
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModalChrome>
      ) : null}
    </>
  )
}

export function ExpandableVenueCard({
  v,
  href,
  t,
}: {
  v: Api.MessageMediaVenue
  href: string | null
  t: MessageMediaTranslateFn
}) {
  const { t: te } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <>
      <div data-media-state="preview" className="msg-media msg-media--card msg-media--venue" role="group" aria-label={t("chat.previewLocation")}>
        <button type="button" className="msg-media-expand-hit" onClick={() => setOpen(true)} aria-label={te("chat.mediaExpandMap")}>
          <div className="msg-media-geo-preview">
            <div className="msg-media-geo-preview__map" aria-hidden>
              <span className="msg-media-geo-preview__pin" />
            </div>
            <div className="msg-media-geo-preview__body">
              {v.title ? <div className="msg-media-card__title">{v.title}</div> : null}
              {v.address ? <div className="msg-media-card__line">{v.address}</div> : null}
              {href ? (
                <span className="msg-media-card__link">{t("chat.mediaOpenInMaps")}</span>
              ) : null}
            </div>
          </div>
        </button>
      </div>
      {open ? (
        <ModalChrome onClose={() => setOpen(false)} ariaLabel={te("chat.venueViewerDialog")} className="media-modal-backdrop--surface">
          <div className="geo-full-modal" data-media-state="full">
            <button type="button" className="geo-full-modal__close" onClick={() => setOpen(false)} aria-label={te("chat.imageViewerClose")}>
              ×
            </button>
            <MapHero />
            <div className="geo-full-modal__sheet">
              <div className="geo-full-modal__sheet-title">{v.title || t("chat.previewLocation")}</div>
              {v.address ? <div className="geo-full-modal__sheet-sub">{v.address}</div> : null}
              {href ? (
                <a className="msg-media-card__link" href={href} target="_blank" rel="noopener noreferrer">
                  {t("chat.mediaOpenInMaps")}
                </a>
              ) : null}
            </div>
          </div>
        </ModalChrome>
      ) : null}
    </>
  )
}

export function ExpandableGeoLiveCard({
  gl,
  href,
  t,
}: {
  gl: Api.MessageMediaGeoLive
  href: string | null
  t: MessageMediaTranslateFn
}) {
  const { t: te } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <>
      <div data-media-state="preview" className="msg-media msg-media--card msg-media--geo-live" role="group" aria-label={t("chat.previewLocationLive")}>
        <button type="button" className="msg-media-expand-hit" onClick={() => setOpen(true)} aria-label={te("chat.mediaExpandMap")}>
          <div className="msg-media-geo-preview">
            <div className="msg-media-geo-preview__map" aria-hidden>
              <span className="msg-media-geo-preview__live">{t("chat.liveLocationBadge")}</span>
              <span className="msg-media-geo-preview__pin" />
            </div>
            <div className="msg-media-geo-preview__body">
              {href ? (
                <span className="msg-media-card__link">{t("chat.mediaOpenLiveInMaps")}</span>
              ) : (
                <span className="msg-media-card__muted">{t("chat.mediaLocationNoCoords")}</span>
              )}
              {gl.period != null ? (
                <div className="msg-media-card__line">{t("chat.mediaLivePeriod", { s: String(gl.period) })}</div>
              ) : null}
            </div>
          </div>
        </button>
      </div>
      {open ? (
        <ModalChrome onClose={() => setOpen(false)} ariaLabel={te("chat.geoLiveViewerDialog")} className="media-modal-backdrop--surface">
          <div className="geo-full-modal" data-media-state="full">
            <button type="button" className="geo-full-modal__close" onClick={() => setOpen(false)} aria-label={te("chat.imageViewerClose")}>
              ×
            </button>
            <div className="geo-full-modal__map geo-full-modal__map--live" aria-hidden>
              <span className="geo-full-modal__pin" />
            </div>
            <div className="geo-full-modal__sheet">
              <div className="geo-full-modal__sheet-title">{t("chat.previewLocationLive")}</div>
              {href ? (
                <a className="msg-media-card__link" href={href} target="_blank" rel="noopener noreferrer">
                  {t("chat.mediaOpenLiveInMaps")}
                </a>
              ) : null}
            </div>
          </div>
        </ModalChrome>
      ) : null}
    </>
  )
}

export function ExpandableContactCard({
  c,
  displayName,
  initials,
  t,
}: {
  c: Api.MessageMediaContact
  displayName: string
  initials: string
  t: MessageMediaTranslateFn
}) {
  const { t: te } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <>
      <div data-media-state="preview" className="msg-media msg-media--card msg-media--contact" role="group" aria-label={t("chat.previewContact")}>
        <button type="button" className="msg-media-expand-hit msg-media-expand-hit--contact" onClick={() => setOpen(true)} aria-label={te("chat.contactOpenCard")}>
          <div className="msg-media-contact-row">
            <span className="msg-media-contact-row__avatar" aria-hidden>
              {initials}
            </span>
            <div className="msg-media-contact-row__body">
              <div className="msg-media-contact-row__name">{displayName}</div>
              {c.phoneNumber ? (
                <span className="msg-media-contact-row__phone">{c.phoneNumber}</span>
              ) : null}
            </div>
          </div>
        </button>
      </div>
      {open ? (
        <ModalChrome onClose={() => setOpen(false)} ariaLabel={te("chat.contactViewerDialog")} className="media-modal-backdrop--surface">
          <div className="contact-full-card" data-media-state="full">
            <div className="contact-full-card__head">
              <div className="contact-full-card__big-avatar">{initials}</div>
            </div>
            <div className="contact-full-card__body">
              <div className="contact-full-card__name">{displayName}</div>
              {c.phoneNumber ? (
                <a className="contact-full-card__phone" href={`tel:${c.phoneNumber.replace(/[^\d+]/g, "")}`}>
                  {c.phoneNumber}
                </a>
              ) : null}
              <div className="contact-full-card__hint msg-media-card__muted">{te("chat.contactCardHint")}</div>
            </div>
          </div>
        </ModalChrome>
      ) : null}
    </>
  )
}
