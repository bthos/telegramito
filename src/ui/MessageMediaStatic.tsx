import { Api } from "telegram"
import type { ReactNode } from "react"
import { mapsUrlFromGeoPoint } from "../telegram/messageMediaUnwrap"
import { asTwe } from "../telegram/twe"
import type { MessageMediaTranslateFn } from "./messageMediaI18n"
import {
  ExpandableContactCard,
  ExpandableGeoCard,
  ExpandableGeoLiveCard,
  ExpandableVenueCard,
} from "./staticLocationViews"

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

function contactInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0]!.charAt(0)
    const b = parts[parts.length - 1]!.charAt(0)
    return `${a}${b}`.toUpperCase()
  }
  const one = parts[0] ?? displayName
  return one.slice(0, 2).toUpperCase() || "?"
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
 * Renders non-blob message media: geo, contact, game, invoice, dice (incl. TON outcomes), story, giveaway, paid (Stars), todo list, live stream, empty, unsupported.
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
    return <ExpandableGeoCard href={href} t={t} />
  }
  if (cn === "MessageMediaVenue") {
    const v = med as Api.MessageMediaVenue
    const g = v.geo
    const href = g ? mapsUrlFromGeoPoint(g) : null
    return <ExpandableVenueCard v={v} href={href} t={t} />
  }
  if (cn === "MessageMediaGeoLive") {
    const gl = med as Api.MessageMediaGeoLive
    const g = gl.geo
    const href = g ? mapsUrlFromGeoPoint(g) : null
    return <ExpandableGeoLiveCard gl={gl} href={href} t={t} />
  }
  if (cn === "MessageMediaContact") {
    const c = med as Api.MessageMediaContact
    const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || t("chat.previewContact")
    const initials = contactInitials(name)
    return (
      <ExpandableContactCard
        c={c}
        displayName={name}
        initials={initials}
        t={t}
      />
    )
  }
  if (cn === "MessageMediaGame") {
    const gm = (med as Api.MessageMediaGame).game
    if (gm && gm.className === "Game") {
      const g0 = gm as Api.Game
      return (
        <div data-media-state="preview" className="msg-media msg-media--card" role="group" aria-label={t("chat.previewGame")}>
          {g0.title ? <div className="msg-media-card__title">{g0.title}</div> : null}
          {g0.description
            ? <p className="msg-media-card__line msg-media-card__line--pre">{g0.description}</p>
            : null}
        </div>
      )
    }
    return <div data-media-state="preview" className="msg-media msg-media--card">{t("chat.previewGame")}</div>
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
      <div data-media-state="preview" className="msg-media msg-media--card" role="group" aria-label={t("chat.previewInvoice")}>
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
    const go = d.gameOutcome
    const ton =
      go != null && go.className === "messages.EmojiGameOutcome"
        ? (go as Api.messages.EmojiGameOutcome)
        : null
    const tonStake = ton != null ? Number(ton.stakeTonAmount) : NaN
    const tonWin = ton != null ? Number(ton.tonAmount) : NaN
    return (
      <div
        data-media-state="preview"
        className="msg-media msg-media--card msg-media--dice"
        role="img"
        aria-label={t("chat.previewDice")}
      >
        <span className="msg-media-dice-emoji" aria-hidden>{d.emoticon || "🎲"}</span>
        {typeof val === "number" && val > 0
          ? <span className="msg-media-dice-value">{t("chat.diceValue", { n: val })}</span>
          : <span className="msg-media-card__muted">{t("chat.diceRolling")}</span>}
        {ton != null && Number.isFinite(tonStake) && Number.isFinite(tonWin) ? (
          <p className="msg-media-card__line msg-media-card__muted">
            {t("chat.diceTonOutcome", { stake: String(tonStake), win: String(tonWin) })}
          </p>
        ) : null}
      </div>
    )
  }
  if (cn === "MessageMediaStory") {
    const s = med as Api.MessageMediaStory
    return (
      <div data-media-state="preview" className="msg-media msg-media--card" role="group" aria-label={t("chat.previewStory")}>
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
      <div data-media-state="preview" className="msg-media msg-media--card" role="group" aria-label={t("chat.previewGiveaway")}>
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
  if (cn === "MessageMediaToDo") {
    const td = med as Api.MessageMediaToDo
    const list = td.todo
    if (list && list.className === "TodoList") {
      const L = list as Api.TodoList
      const title = asTwe(L.title).text.trim() || t("chat.previewTodo")
      const items = (L.list ?? []).filter((x): x is Api.TodoItem => x.className === "TodoItem")
      return (
        <div data-media-state="preview" className="msg-media msg-media--card" role="group" aria-label={t("chat.previewTodo")}>
          <div className="msg-media-card__title">{title}</div>
          {L.othersCanAppend || L.othersCanComplete
            ? (
                <p className="msg-media-card__muted msg-media-card__hint">
                  {t("chat.todoListFlags", {
                    append: L.othersCanAppend ? t("chat.todoOthersAppend") : "—",
                    complete: L.othersCanComplete ? t("chat.todoOthersComplete") : "—",
                  })}
                </p>
              )
            : null}
          {items.length > 0
            ? (
                <ol className="msg-media-card__todo">
                  {items.map((it) => (
                    <li key={it.id} className="msg-media-card__line">
                      {asTwe(it.title).text || `#${it.id}`}
                    </li>
                  ))}
                </ol>
              )
            : null}
        </div>
      )
    }
    return (
      <div data-media-state="preview" className="msg-media msg-media--card" role="group" aria-label={t("chat.previewTodo")}>
        <span className="msg-media-card__muted">{t("chat.previewTodo")}</span>
      </div>
    )
  }
  if (cn === "MessageMediaVideoStream") {
    const vs = med as Api.MessageMediaVideoStream
    return (
      <div data-media-state="preview" className="msg-media msg-media--card" role="group" aria-label={t("chat.previewVideoStream")}>
        <div className="msg-media-card__title">{t("chat.previewVideoStream")}</div>
        {vs.rtmpStream
          ? <p className="msg-media-card__line">{t("chat.videoStreamRtmp")}</p>
          : null}
        <p className="msg-media-card__muted msg-media-card__hint">{t("chat.videoStreamHint")}</p>
      </div>
    )
  }
  if (cn === "MessageMediaPaidMedia") {
    const pm = med as Api.MessageMediaPaidMedia
    const raw = pm.starsAmount
    const starsN = typeof raw === "bigint" ? Number(raw) : Number(raw)
    const starsLabel = Number.isFinite(starsN) && starsN > 0
      ? t("chat.invoiceAmountStars", { n: starsN })
      : null
    return (
      <div data-media-state="preview" className="msg-media msg-media--card" role="group" aria-label={t("chat.previewPaidMedia")}>
        <div className="msg-media-card__title">{t("chat.previewPaidMedia")}</div>
        {starsLabel ? <div className="msg-media-card__line msg-media-card__strong">{starsLabel}</div> : null}
        <p className="msg-media-card__muted msg-media-card__hint">{t("chat.paidBundlePlaceholder")}</p>
      </div>
    )
  }
  if (cn === "MessageMediaEmpty") {
    return (
      <div data-media-state="preview" className="msg-media msg-media--card" role="status">
        <span className="msg-media-card__muted">{t("chat.mediaEmpty")}</span>
      </div>
    )
  }
  if (cn === "MessageMediaUnsupported") {
    return (
      <div
        data-media-state="preview"
        className="msg-media msg-media--card msg-media--unsupported"
        role="status"
        data-testid="MessageMediaUnsupported"
      >
        <span className="msg-media-card__muted">{t("chat.mediaUnsupported")}</span>
        <p className="msg-media-card__muted msg-media-card__hint">{t("chat.mediaUnsupportedHint")}</p>
      </div>
    )
  }
  return null
}
