import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"
import { useParentalSettings } from "../context/ParentalContext"
import { usePeriodicTick } from "../hooks/usePeriodicTick"
import { usePeerName } from "../hooks/usePeerName"
import { getDayMailRailHeadlineParts } from "../telegram/dialogPreview"
import { getPeerInfo, isBroadcastChannelDialog, dialogIsMultiMemberChat } from "../telegram/dialogUtils"
import { formatMessageTime } from "../util/timeFormat"
import type { NightMode } from "../parental/types"
import {
  buildEveningSummary,
  isInEveningEditionPeriod,
  minutesUntilNightLock,
  refineAwaitingReplyTier2,
  type EveningSummary,
} from "../util/lettersRituals"
import { getEveningThreadMessages } from "../util/eveningThreadCache"

type Props = {
  dialogs: Dialog[]
  selectedKey?: string | null
  /** Opens the correspondence thread and optionally focuses a specific message (day-mail row). */
  onSelect?: (dialog: Dialog, opts?: { focusMessageId?: number }) => void
  client?: TelegramClient | null
  nightMode?: NightMode
}

type RailRowPreview = {
  dialog: Dialog
  key: string
  chatTitle: string
  verbPhrase: string
  contentLine: string
  time: string
  ts: number
}

function DayMailRailRow({
  row,
  client,
  selectedKey,
  isFurthestSeen,
  onSelect,
}: {
  row: RailRowPreview
  client: TelegramClient | null
  selectedKey?: string | null
  isFurthestSeen: boolean
  onSelect?: (dialog: Dialog, opts?: { focusMessageId?: number }) => void
}) {
  const { t } = useTranslation()
  const msg = row.dialog.message
  const fromId = msg?.className === "Message" ? (msg as Api.Message).fromId : undefined
  const peerName = usePeerName(fromId, client)

  const whoLabel = useMemo(() => {
    if (!msg || msg.className !== "Message") {
      return ""
    }
    const m = msg as Api.Message
    if (m.out) {
      return t("chat.searchFromYou")
    }
    const pa = typeof m.postAuthor === "string" ? m.postAuthor.trim() : ""
    if (pa.length > 0) {
      return pa
    }
    const trimmedPeer = peerName.trim()
    if (trimmedPeer.length > 0) {
      return trimmedPeer
    }
    if (isBroadcastChannelDialog(row.dialog) && row.chatTitle.trim().length > 0) {
      return row.chatTitle.trim()
    }
    // Private chats: reuse dialog preview title when getEntity(name) lagged or failed.
    if (!dialogIsMultiMemberChat(row.dialog) && row.chatTitle.trim().length > 0) {
      return row.chatTitle.trim()
    }
    if (dialogIsMultiMemberChat(row.dialog)) {
      return t("letters.passageUnknownSender")
    }
    return ""
  }, [msg, peerName, row.dialog, row.chatTitle, t])

  const hasWho = whoLabel.length > 0
  const active = Boolean(selectedKey) && selectedKey === row.key
  const itemClass =
    `letters-day-mail__item${active ? " is-active" : ""}${
      isFurthestSeen ? " is-day-mail-furthest" : ""
    }`

  return (
    <li>
      <button
        type="button"
        className={itemClass}
        onClick={() => {
          const m = row.dialog.message
          const mid =
            m?.className === "Message" && typeof (m as Api.Message).id === "number"
              ? (m as Api.Message).id
              : undefined
          onSelect?.(
            row.dialog,
            typeof mid === "number" && mid > 0 ? { focusMessageId: mid } : undefined,
          )
        }}
        aria-label={t("letters.dayMailOpenMessageAria", { name: row.chatTitle })}
        aria-current={active ? "true" : undefined}
      >
        <span className="letters-day-mail__time">{row.time}</span>
        <span className="letters-day-mail__headline">
          {hasWho ? <span className="letters-day-mail__who">{whoLabel}</span> : null}
          {hasWho ? " " : null}
          <span className="letters-day-mail__what">
            {row.verbPhrase} {row.contentLine}
          </span>
        </span>
        <span className="letters-day-mail__source">{row.chatTitle}</span>
      </button>
    </li>
  )
}

export function DayMailRail({
  dialogs,
  selectedKey = null,
  onSelect,
  client = null,
  nightMode: nightModeProp,
}: Props) {
  const { t, i18n } = useTranslation()
  const { settings } = useParentalSettings()
  const nightMode = nightModeProp ?? settings.nightMode
  const now = usePeriodicTick(30_000)
  const railRef = useRef<HTMLDivElement>(null)
  /** Smallest top-visible row index since last list reset (= newest row the user has aligned with). */
  const newestSeenTopIndexRef = useRef<number | null>(null)
  const [furthestSeenIndex, setFurthestSeenIndex] = useState(0)

  const items = useMemo(() => {
    const rows: RailRowPreview[] = []
    const cap = 50
    let i = 0
    for (const d of dialogs) {
      if (i++ > cap) break
      const { key, name } = getPeerInfo(d)
      const m = d.message
      const ts = m && typeof m.date === "number" ? m.date : 0
      if ((d.unreadCount ?? 0) < 1 || ts <= 0) {
        continue
      }
      const { verb, content } = getDayMailRailHeadlineParts(d, t, 96, i18n.language)
      rows.push({
        dialog: d,
        key,
        chatTitle: name,
        verbPhrase: verb,
        contentLine: content || t("chat.previewAttachment"),
        time: formatMessageTime(ts, i18n.language),
        ts,
      })
    }
    rows.sort((a, b) => b.ts - a.ts)
    return rows.slice(0, 14)
  }, [dialogs, t, i18n.language])

  const itemFinger = useMemo(() => items.map((r) => r.key).join("\0"), [items])

  const cappedFurthestIndex =
    items.length === 0
      ? 0
      : Math.min(Math.max(0, furthestSeenIndex), items.length - 1)

  /**
   * Newest-first list: top row = index 0.
   * Current top visible row (smallest index intersecting the rail viewport).
   */
  const measureTopVisibleIndex = useCallback((): number => {
    const rail = railRef.current
    if (!rail) return 0
    const ul = rail.querySelector("ul.letters-day-mail__list--timeline")
    if (!ul) return 0
    const lis = [...ul.querySelectorAll(":scope > li")] as HTMLElement[]
    if (lis.length === 0) return 0
    const railRect = rail.getBoundingClientRect()
    for (let i = 0; i < lis.length; i++) {
      const r = lis[i].getBoundingClientRect()
      if (r.top < railRect.bottom && r.bottom > railRect.top) {
        return i
      }
    }
    return 0
  }, [])

  useEffect(() => {
    newestSeenTopIndexRef.current = null
    const rail = railRef.current
    if (!rail || items.length === 0) {
      return
    }

    const apply = (): void => {
      const r = railRef.current
      if (!r) return
      const scrollable = r.scrollHeight > r.clientHeight + 2
      /*
       * Short list: pin marker to newest (index 0). Otherwise running min(top)
       * tracks the freshest row the user has “passed” while scrolling.
       */
      if (!scrollable) {
        newestSeenTopIndexRef.current = 0
        setFurthestSeenIndex(0)
        return
      }
      const topNow = measureTopVisibleIndex()
      const prevMin = newestSeenTopIndexRef.current
      newestSeenTopIndexRef.current =
        prevMin === null ? topNow : Math.min(prevMin, topNow)
      setFurthestSeenIndex(newestSeenTopIndexRef.current)
    }

    let raf = 0
    const schedule = (): void => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        raf = 0
        apply()
      })
    }

    schedule()

    rail.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            schedule()
          })
        : null
    ro?.observe(rail)

    return () => {
      rail.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      if (raf) cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [itemFinger, items.length, measureTopVisibleIndex])

  const eveningEdition =
    nightMode != null && isInEveningEditionPeriod(nightMode, now)
  const baseEveningSummary = useMemo(
    () =>
      eveningEdition
        ? buildEveningSummary(dialogs, now, { getThreadMessages: getEveningThreadMessages })
        : null,
    [dialogs, eveningEdition, now],
  )
  const [tier2EveningSummary, setTier2EveningSummary] = useState<EveningSummary | null>(null)
  const eveningPrecise =
    settings.appMode === "parent" && settings.eveningSummaryPreciseEnabled === true

  useEffect(() => {
    if (!baseEveningSummary || !eveningPrecise || !client) {
      setTier2EveningSummary(null)
      return
    }
    let cancelled = false
    void refineAwaitingReplyTier2(baseEveningSummary, dialogs, client, now, {
      enabled: true,
    }).then((refined) => {
      if (!cancelled) {
        setTier2EveningSummary(refined)
      }
    })
    return () => {
      cancelled = true
    }
  }, [baseEveningSummary, client, dialogs, eveningPrecise, now])

  const eveningSummary = tier2EveningSummary ?? baseEveningSummary

  const dialogByKey = useMemo(() => {
    const map = new Map<string, Dialog>()
    for (const d of dialogs) {
      map.set(getPeerInfo(d).key, d)
    }
    return map
  }, [dialogs])

  const handleSummarySelect = useCallback(
    (key: string) => {
      const d = dialogByKey.get(key)
      if (d) onSelect?.(d)
    },
    [dialogByKey, onSelect],
  )

  const lockMinutes = nightMode != null ? minutesUntilNightLock(nightMode, now) : null

  return (
    <div className="letters-day-mail" ref={railRef}>
      <h2 className="letters-day-mail__h">
        {eveningEdition ? t("letters.eveningEditionTitle") : t("letters.dayMailTitle")}
      </h2>
      <p className="letters-day-mail__sub">
        {eveningEdition ? t("letters.eveningEditionSubtitle") : t("letters.dayMailSubtitle")}
      </p>
      {lockMinutes != null ? (
        <p className="letters-day-mail__lock-notice small" role="status">
          {t("letters.eveningLockNotice", { time: nightMode!.start })}
        </p>
      ) : null}
      {eveningSummary &&
      (eveningSummary.wroteToday.length > 0 ||
        eveningSummary.awaitingReply.length > 0 ||
        eveningSummary.broadcastToday.length > 0 ||
        eveningSummary.postedToChannelsToday.length > 0) ? (
        <section className="letters-day-mail__summary" aria-label={t("letters.eveningSummaryAria")}>
          {eveningSummary.wroteToday.length > 0 ? (
            <p className="letters-day-mail__summary-line small">
              <span className="letters-day-mail__summary-label">
                {t("letters.evening.wroteToYou")}
              </span>{" "}
              {eveningSummary.wroteToday.map((x, i) => (
                <Fragment key={x.key}>
                  {i > 0 ? ", " : null}
                  <button
                    type="button"
                    className="letters-day-mail__summary-name"
                    onClick={() => handleSummarySelect(x.key)}
                  >
                    {x.name}
                  </button>
                </Fragment>
              ))}
            </p>
          ) : null}
          {eveningSummary.awaitingReply.length > 0 ? (
            <p className="letters-day-mail__summary-line small">
              <span className="letters-day-mail__summary-label">
                {t("letters.evening.awaitingReply")}
              </span>{" "}
              {eveningSummary.awaitingReply.map((x, i) => (
                <Fragment key={x.key}>
                  {i > 0 ? ", " : null}
                  <button
                    type="button"
                    className="letters-day-mail__summary-name"
                    onClick={() => handleSummarySelect(x.key)}
                  >
                    {x.name}
                  </button>
                </Fragment>
              ))}
            </p>
          ) : null}
          {eveningSummary.broadcastToday.length > 0 ? (
            <p className="letters-day-mail__summary-line small">
              <span className="letters-day-mail__summary-label">
                {t("letters.evening.broadcastToday")}
              </span>{" "}
              {eveningSummary.broadcastToday.map((x, i) => (
                <Fragment key={x.key}>
                  {i > 0 ? ", " : null}
                  <button
                    type="button"
                    className="letters-day-mail__summary-name"
                    onClick={() => handleSummarySelect(x.key)}
                  >
                    {x.name}
                  </button>
                </Fragment>
              ))}
            </p>
          ) : null}
          {eveningSummary.postedToChannelsToday.length > 0 ? (
            <p className="letters-day-mail__summary-line small">
              <span className="letters-day-mail__summary-label">
                {t("letters.evening.postedToChannels")}
              </span>{" "}
              {eveningSummary.postedToChannelsToday.map((x, i) => (
                <Fragment key={x.key}>
                  {i > 0 ? ", " : null}
                  <button
                    type="button"
                    className="letters-day-mail__summary-name"
                    onClick={() => handleSummarySelect(x.key)}
                  >
                    {x.name}
                  </button>
                </Fragment>
              ))}
            </p>
          ) : null}
        </section>
      ) : null}
      {items.length === 0 ? (
        <p className="letters-day-mail__empty muted small" role="status">
          {t("letters.dayMailEmpty")}
        </p>
      ) : (
        <ul className="letters-day-mail__list letters-day-mail__list--timeline" role="list">
          {items.map((it, rowIndex) => (
            <DayMailRailRow
              key={it.key}
              row={it}
              client={client}
              selectedKey={selectedKey}
              isFurthestSeen={rowIndex === cappedFurthestIndex}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
