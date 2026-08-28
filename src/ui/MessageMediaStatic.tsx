import { Api } from "teleproto"
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
import {
  UxDiceCard,
  UxGameCard,
  UxGiveawayCard,
  UxGiveawayResultsCard,
  UxInvoiceCard,
  UxPaidMediaCard,
  UxStoryCard,
  UxTodoCard,
  UxUnsupportedCard,
} from "./staticUxMediaCards"

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
      return <UxGameCard game={gm as Api.Game} t={t} />
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
    return <UxInvoiceCard inv={inv} amountLabel={amount} t={t} />
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
      <UxDiceCard
        emoticon={d.emoticon}
        value={typeof val === "number" ? val : undefined}
        tonStake={Number.isFinite(tonStake) ? tonStake : undefined}
        tonWin={Number.isFinite(tonWin) ? tonWin : undefined}
        t={t}
      />
    )
  }
  if (cn === "MessageMediaStory") {
    const s = med as Api.MessageMediaStory
    return <UxStoryCard story={s} t={t} />
  }
  if (cn === "MessageMediaGiveaway") {
    return <UxGiveawayCard g={med as Api.MessageMediaGiveaway} t={t} />
  }
  if (cn === "MessageMediaGiveawayResults") {
    return <UxGiveawayResultsCard g={med as Api.MessageMediaGiveawayResults} t={t} />
  }
  if (cn === "MessageMediaToDo") {
    const td = med as Api.MessageMediaToDo
    const list = td.todo
    if (list && list.className === "TodoList") {
      const L = list as Api.TodoList
      const title = asTwe(L.title).text.trim() || t("chat.previewTodo")
      const items = (L.list ?? []).filter((x): x is Api.TodoItem => x.className === "TodoItem")
      const completedIds = new Set<number>()
      for (const c of td.completions ?? []) {
        if (c.className === "TodoCompletion") {
          completedIds.add((c as Api.TodoCompletion).id)
        }
      }
      return (
        <UxTodoCard
          title={title}
          items={items}
          completedIds={completedIds}
          flags={{ append: Boolean(L.othersCanAppend), complete: Boolean(L.othersCanComplete) }}
          t={t}
        />
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
      <UxPaidMediaCard
        starsLabel={starsLabel}
        t={t}
      />
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
    return <UxUnsupportedCard t={t} />
  }
  return null
}
