import { Api } from "telegram"
import type { ReactNode } from "react"
import { mapsUrlFromGeoPoint } from "../telegram/messageMediaUnwrap"
import type { MessageMediaTranslateFn } from "./messageMediaI18n"

function formatMoney(
  totalAmount: number,
  currency: string,
  t: MessageMediaTranslateFn,
): string {
  const c = (currency || "?").toUpperCase()
  if (c === "XTR") {
    return t("chat.invoiceAmountStars", { n: totalAmount })
  }
  return t("chat.invoiceAmountFiat", { n: (totalAmount / 100).toFixed(2), cur: c })
}

function peerLabel(peer: Api.TypePeer | undefined): string {
  if (!peer) {
    return "?"
  }
  if (peer.className === "PeerUser") {
    return `user:${(peer as Api.PeerUser).userId}`
  }
  if (peer.className === "PeerChannel") {
    return `channel:${(peer as Api.PeerChannel).channelId}`
  }
  if (peer.className === "PeerChat") {
    return `chat:${(peer as Api.PeerChat).chatId}`
  }
  return "?"
}

/**
 * Renders non-blob message media: geo, contact, game, invoice, dice, story, giveaway, empty, unsupported.
 * Pass `m` = {@link import("../telegram/messageMediaUnwrap").resolveMessageMediaForDisplay} result.
 */
export function MessageMediaStatic({
  m,
  t,
}: {
  m: Api.Message
  t: MessageMediaTranslateFn
}): ReactNode {
  const med = m.media
  if (!med) {
    return null
  }
  const cn = med.className
  if (cn === "MessageMediaGeo") {
    const g = (med as Api.MessageMediaGeo).geo
    const href = g ? mapsUrlFromGeoPoint(g) : null
    return (
      <div className="msg-media msg-media--card" role="group" aria-label={t("chat.previewLocation")}>
        {href ? (
          <a className="msg-media-card__link" href={href} target="_blank" rel="noopener noreferrer">
            {t("chat.mediaOpenInMaps")}
          </a>
        ) : (
          <span className="msg-media-card__muted">{t("chat.mediaLocationNoCoords")}</span>
        )}
      </div>
    )
  }
  if (cn === "MessageMediaVenue") {
    const v = med as Api.MessageMediaVenue
    const g = v.geo
    const href = g ? mapsUrlFromGeoPoint(g) : null
    return (
      <div className="msg-media msg-media--card" role="group" aria-label={t("chat.previewLocation")}>
        {v.title ? <div className="msg-media-card__title">{v.title}</div> : null}
        {v.address ? <div className="msg-media-card__line">{v.address}</div> : null}
        {href ? (
          <a className="msg-media-card__link" href={href} target="_blank" rel="noopener noreferrer">
            {t("chat.mediaOpenInMaps")}
          </a>
        ) : null}
      </div>
    )
  }
  if (cn === "MessageMediaGeoLive") {
    const gl = med as Api.MessageMediaGeoLive
    const g = gl.geo
    const href = g ? mapsUrlFromGeoPoint(g) : null
    return (
      <div className="msg-media msg-media--card" role="group" aria-label={t("chat.previewLocationLive")}>
        {href ? (
          <a className="msg-media-card__link" href={href} target="_blank" rel="noopener noreferrer">
            {t("chat.mediaOpenLiveInMaps")}
          </a>
        ) : (
          <span className="msg-media-card__muted">{t("chat.mediaLocationNoCoords")}</span>
        )}
        {gl.period != null ? (
          <div className="msg-media-card__line">{t("chat.mediaLivePeriod", { s: String(gl.period) })}</div>
        ) : null}
      </div>
    )
  }
  if (cn === "MessageMediaContact") {
    const c = med as Api.MessageMediaContact
    const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || t("chat.previewContact")
    return (
      <div className="msg-media msg-media--card" role="group" aria-label={t("chat.previewContact")}>
        <div className="msg-media-card__title">{name}</div>
        {c.phoneNumber ? (
          <a className="msg-media-card__link" href={`tel:${c.phoneNumber.replace(/[^\d+]/g, "")}`}>
            {c.phoneNumber}
          </a>
        ) : null}
      </div>
    )
  }
  if (cn === "MessageMediaGame") {
    const gm = (med as Api.MessageMediaGame).game
    if (gm && gm.className === "Game") {
      const g0 = gm as Api.Game
      return (
        <div className="msg-media msg-media--card" role="group" aria-label={t("chat.previewGame")}>
          {g0.title ? <div className="msg-media-card__title">{g0.title}</div> : null}
          {g0.description
            ? <p className="msg-media-card__line msg-media-card__line--pre">{g0.description}</p>
            : null}
        </div>
      )
    }
    return <div className="msg-media msg-media--card">{t("chat.previewGame")}</div>
  }
  if (cn === "MessageMediaInvoice") {
    const inv = med as Api.MessageMediaInvoice
    const amount = formatMoney(
      Number(inv.totalAmount),
      String(inv.currency || ""),
      t
    )
    const botParam = inv.startParam
    return (
      <div className="msg-media msg-media--card" role="group" aria-label={t("chat.previewInvoice")}>
        <div className="msg-media-card__title">{inv.title || t("chat.previewInvoice")}</div>
        {inv.description ? <p className="msg-media-card__line msg-media-card__line--pre">{inv.description}</p> : null}
        <div className="msg-media-card__line msg-media-card__strong">{amount}</div>
        {botParam
          ? <p className="msg-media-card__muted">{t("chat.invoiceCompleteInTelegram")}</p>
          : null}
      </div>
    )
  }
  if (cn === "MessageMediaDice") {
    const d = med as Api.MessageMediaDice
    const val = d.value
    return (
      <div
        className="msg-media msg-media--card msg-media--dice"
        role="img"
        aria-label={t("chat.previewDice")}
      >
        <span className="msg-media-dice-emoji" aria-hidden>{d.emoticon || "🎲"}</span>
        {typeof val === "number" && val > 0
          ? <span className="msg-media-dice-value">{t("chat.diceValue", { n: val })}</span>
          : <span className="msg-media-card__muted">{t("chat.diceRolling")}</span>}
      </div>
    )
  }
  if (cn === "MessageMediaStory") {
    const s = med as Api.MessageMediaStory
    return (
      <div className="msg-media msg-media--card" role="group" aria-label={t("chat.previewStory")}>
        <div className="msg-media-card__line">
          {t("chat.storyFrom", { peer: peerLabel(s.peer) })}
          {s.id != null ? ` #${s.id}` : ""}
        </div>
        <a className="msg-media-card__link" href="https://t.me" target="_blank" rel="noopener noreferrer">
          {t("chat.storyOpenInApp")}
        </a>
      </div>
    )
  }
  if (cn === "MessageMediaGiveaway" || cn === "MessageMediaGiveawayResults") {
    const g = med as Api.MessageMediaGiveaway & Api.MessageMediaGiveawayResults
    const gGive = med.className === "MessageMediaGiveaway" ? (med as Api.MessageMediaGiveaway) : null
    const desc
      = gGive?.prizeDescription
        ?? (g as { prizeDescription?: string }).prizeDescription
    return (
      <div className="msg-media msg-media--card" role="group" aria-label={t("chat.previewGiveaway")}>
        {desc ? <div className="msg-media-card__title">{desc}</div> : <div className="msg-media-card__title">{t("chat.previewGiveaway")}</div>}
        {gGive != null && typeof gGive.quantity === "number" ? (
          <div className="msg-media-card__line">
            {t("chat.giveawayWinners", { n: gGive.quantity })}
          </div>
        ) : null}
        <p className="msg-media-card__muted">{t("chat.giveawayViewInTelegram")}</p>
      </div>
    )
  }
  if (cn === "MessageMediaEmpty") {
    return (
      <div className="msg-media msg-media--card" role="status">
        <span className="msg-media-card__muted">{t("chat.mediaEmpty")}</span>
      </div>
    )
  }
  if (cn === "MessageMediaUnsupported") {
    return (
      <div className="msg-media msg-media--card" role="status">
        <span className="msg-media-card__muted">{t("chat.mediaUnsupported")}</span>
      </div>
    )
  }
  return null
}
