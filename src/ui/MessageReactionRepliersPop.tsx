import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import { withTransientRetry } from "../telegram/invokeWithTransientRetry"
import { getMessageReactionsListPage, mapReactionsList, type ReactionReplierRow } from "../telegram/reactionRepliers"
import { setMessageReactions } from "../telegram/reactionsAndPolls"
import { Button } from "./ds"
import { reactionsEqual, myReactionsList } from "./reactionRepliersUi"
import { formatPollVoterTimestamp, pollVoterTimestampTitle } from "../util/timeFormat"

type T = (k: string, o?: Record<string, string | number | undefined>) => string

type Props = {
  open: boolean
  anchorX: number
  anchorY: number
  client: TelegramClient
  entity: unknown
  messageReactions: Api.TypeMessageReactions | undefined
  messageId: number
  targetReaction: Api.TypeReaction
  /** Shown in heading, e.g. "👍" or custom emoji */
  reactionLabel: string
  onClose: () => void
  onUpdated: (reactionsFromUpdate: Api.TypeMessageReactions | null) => void
  t: T
}

export function MessageReactionRepliersPop({
  open,
  anchorX,
  anchorY,
  client,
  entity,
  messageReactions,
  messageId,
  targetReaction,
  reactionLabel,
  onClose,
  onUpdated,
  t,
}: Props) {
  const { i18n } = useTranslation()
  const [rows, setRows] = useState<ReactionReplierRow[]>([])
  const [total, setTotal] = useState(0)
  const [nextOff, setNextOff] = useState<string | undefined>(undefined)
  const [err, setErr] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [place, setPlace] = useState({ top: 0, left: 0 })
  const idB = useId()
  const titleId = `rep-who-h-${idB}`

  const myR =
    messageReactions?.className === "MessageReactions"
      ? myReactionsList((messageReactions as Api.MessageReactions).recentReactions)
      : []
  const iHaveThis = myR.some((r) => reactionsEqual(r, targetReaction))

  const canRemove = useMemo(
    () => iHaveThis || rows.some((r) => r.isMine),
    [iHaveThis, rows]
  )
  const showInlineRemove = rows.some((r) => r.isMine)

  const loadPage = useCallback(
    async (offset?: string) => {
      if (!open) {
        return
      }
      if (offset) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setErr(false)
      }
      try {
        const raw = await getMessageReactionsListPage(client, entity, messageId, targetReaction, {
          offset,
          limit: 80,
        })
        const m = mapReactionsList(raw)
        if (offset) {
          setRows((cur) => [...cur, ...m.rows])
        } else {
          setRows(m.rows)
        }
        setTotal(m.total)
        setNextOff(m.nextOffset)
        setErr(false)
      } catch {
        if (!offset) {
          setRows([])
        }
        setErr(true)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [open, client, entity, messageId, targetReaction]
  )

  useEffect(() => {
    if (!open) {
      setRows([])
      setNextOff(undefined)
      setErr(false)
      return
    }
    void loadPage()
  }, [open, loadPage])

  const removeMine = useCallback(async () => {
    if (!canRemove) {
      return
    }
    setBusy(true)
    try {
      let current = myR
      if (!iHaveThis && rows.some((r) => r.isMine)) {
        const res = await withTransientRetry(client, () =>
          client.getMessages(entity as never, { ids: [messageId] })
        )
        const first = res[0] as Api.Message | undefined
        const mr = first?.reactions
        if (mr?.className === "MessageReactions") {
          current = myReactionsList((mr as Api.MessageReactions).recentReactions)
        }
      }
      const next = current.filter((r) => !reactionsEqual(r, targetReaction))
      const fromUpdate = await setMessageReactions(client, entity, messageId, next)
      onUpdated(fromUpdate)
      onClose()
    } catch {
      /* no-op */
    } finally {
      setBusy(false)
    }
  }, [canRemove, client, entity, iHaveThis, messageId, myR, onClose, onUpdated, rows, targetReaction])

  useLayoutEffect(() => {
    if (!open) {
      return
    }
    const el = panelRef.current
    if (el == null) {
      return
    }
    const pad = 8
    const w = el.offsetWidth
    const h = el.offsetHeight
    const vpW = window.innerWidth
    const vpH = window.innerHeight
    let top = anchorY + pad
    if (top + h > vpH - pad) {
      top = Math.max(pad, anchorY - h - pad)
    }
    if (top < pad) {
      top = pad
    }
    let left = anchorX - w * 0.4
    left = Math.max(pad, Math.min(left, vpW - w - pad))
    setPlace({ top, left })
  }, [open, anchorX, anchorY, rows, err, loading])

  useEffect(() => {
    if (!open) {
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    const onDown = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) {
        return
      }
      onClose()
    }
    const onScroll = () => {
      onClose()
    }
    document.addEventListener("keydown", onKey, true)
    document.addEventListener("mousedown", onDown, true)
    window.addEventListener("scroll", onScroll, true)
    return () => {
      document.removeEventListener("keydown", onKey, true)
      document.removeEventListener("mousedown", onDown, true)
      window.removeEventListener("scroll", onScroll, true)
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  const panel = (
    <div
      ref={panelRef}
      className="msg-reaction-who"
      style={{ top: place.top, left: place.left, position: "fixed" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <h3 className="msg-reaction-who__h" id={titleId}>
        {t("chat.reactionRepliersTitle", { label: reactionLabel })}
      </h3>
      {loading && !err ? (
        <p className="msg-reaction-who__muted" role="status">
          {t("loading")}
        </p>
      ) : null}
      {err && !loading ? <p className="msg-reaction-who__err" role="alert">{t("chat.reactionRepliersError")}</p> : null}
      {!err && !loading && rows.length === 0 ? (
        <p className="msg-reaction-who__muted">{t("chat.reactionRepliersEmpty")}</p>
      ) : null}
      {rows.length > 0 ? (
        <ul className="msg-reaction-who__ul" role="list">
          {rows.map((r) => {
            return (
              <li key={r.key} className="msg-reaction-who__li">
                <span className="msg-reaction-who__name">
                  {r.isMine ? <span className="msg-reaction-who__you">{t("chat.reactionRepliersYou")} · </span> : null}
                  {r.name}
                </span>
                <span className="msg-reaction-who__end">
                  {r.date > 0 ? (
                    <span
                      className="msg-reaction-who__date"
                      title={pollVoterTimestampTitle(r.date, i18n.language)}
                    >
                      {formatPollVoterTimestamp(r.date, i18n.language)}
                    </span>
                  ) : null}
                  {r.isMine && !err ? (
                    <button
                      type="button"
                      className="msg-reaction-who__row-btn"
                      onClick={() => { void removeMine() }}
                      disabled={busy}
                      aria-label={t("chat.reactionRepliersRemoveMine")}
                    >
                      ×
                    </button>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}
      {canRemove && !loading && !err && !showInlineRemove ? (
        <Button
          variant="ghost"
          className="msg-reaction-who__remove"
          type="button"
          onClick={() => { void removeMine() }}
          disabled={busy}
        >
          {t("chat.reactionRepliersRemoveMine")}
        </Button>
      ) : null}
      {nextOff && !loading && !err && rows.length < total ? (
        <Button
          variant="ghost"
          className="msg-reaction-who__more"
          type="button"
          onClick={() => { void loadPage(nextOff) }}
          disabled={loadingMore}
        >
          {t("chat.reactionRepliersMore", { n: String(total - rows.length) })}
        </Button>
      ) : null}
    </div>
  )

  return createPortal(panel, document.body)
}
