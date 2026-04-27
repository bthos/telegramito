import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { getPollVotesPage, mapPollVotesList, type PollVoterRow } from "../telegram/pollVoters"
import { Button } from "./ds"
import type { TelegramClient } from "telegram"

type T = (k: string, o?: Record<string, string | number | undefined>) => string

type Props = {
  anchorX: number
  anchorY: number
  client: TelegramClient
  entity: unknown
  messageId: number
  /** Poll answer `option` bytes */
  optionBytes: unknown
  onClose: () => void
  t: T
}

function formatRowDate(d: number, locale: string): string {
  if (d <= 0) {
    return ""
  }
  try {
    return new Date(d * 1000).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })
  } catch {
    return ""
  }
}

export function MessagePollVotersPop({
  anchorX, anchorY, client, entity, messageId, optionBytes, onClose, t,
}: Props) {
  const { i18n } = useTranslation()
  const [rows, setRows] = useState<PollVoterRow[]>([])
  const [total, setTotal] = useState(0)
  const [nextOff, setNextOff] = useState<string | undefined>(undefined)
  const [err, setErr] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [place, setPlace] = useState({ top: 0, left: 0 })
  const idB = useId()
  const titleId = `pv-h-${idB}`

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const raw = await getPollVotesPage(client, entity, messageId, optionBytes, { limit: 50 })
        if (cancelled) {
          return
        }
        const m = mapPollVotesList(raw)
        setRows(m.rows)
        setTotal(m.total)
        setNextOff(m.nextOffset)
        setErr(false)
      } catch {
        if (!cancelled) {
          setRows([])
          setErr(true)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [client, entity, messageId, optionBytes])

  const loadMore = useCallback(
    async (offset: string) => {
      setLoadingMore(true)
      try {
        const raw = await getPollVotesPage(client, entity, messageId, optionBytes, { offset, limit: 50 })
        const m = mapPollVotesList(raw)
        setRows((cur) => [...cur, ...m.rows])
        setTotal(m.total)
        setNextOff(m.nextOffset)
        setErr(false)
      } catch {
        setErr(true)
      } finally {
        setLoadingMore(false)
      }
    },
    [client, entity, messageId, optionBytes]
  )

  useLayoutEffect(() => {
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
  }, [anchorX, anchorY, rows, err, loading])

  useEffect(() => {
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
  }, [onClose])

  return (
    <div
      ref={panelRef}
      className="msg-reaction-who"
      style={{ top: place.top, left: place.left, position: "fixed", zIndex: 80 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <h3 className="msg-reaction-who__h" id={titleId}>
        {t("chat.pollVotersTitle")}
      </h3>
      {loading && !err
        ? (
            <p className="msg-reaction-who__muted" role="status">
              {t("loading")}
            </p>
          )
        : null}
      {err && !loading
        ? <p className="msg-reaction-who__err" role="alert">{t("chat.pollVotersError")}</p> : null}
      {!err && !loading && rows.length === 0
        ? (
            <p className="msg-reaction-who__muted">{t("chat.pollVotersEmpty")}</p>
          )
        : null}
      {rows.length > 0
        ? (
            <ul className="msg-reaction-who__ul" role="list">
              {rows.map((r) => {
                return (
                  <li key={r.key} className="msg-reaction-who__li">
                    <span className="msg-reaction-who__name">
                      {r.name}
                    </span>
                    <span className="msg-reaction-who__end">
                      {r.date > 0
                        ? (
                            <span className="msg-reaction-who__date" title={String(r.date)}>
                              {formatRowDate(r.date, i18n.language)}
                            </span>
                          )
                        : null}
                    </span>
                  </li>
                )
              })}
            </ul>
          )
        : null}
      {nextOff && !loading && !err && rows.length < total
        ? (
            <Button
              variant="ghost"
              className="msg-reaction-who__more"
              type="button"
              onClick={() => { void loadMore(nextOff) }}
              disabled={loadingMore}
            >
              {t("chat.pollVotersMore", { n: String(Math.max(0, total - rows.length)) })}
            </Button>
          )
        : null}
    </div>
  )
}
