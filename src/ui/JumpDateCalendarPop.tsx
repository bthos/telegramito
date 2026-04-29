import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react"
import { useTranslation } from "react-i18next"
import { useFocusTrap } from "../hooks/useFocusTrap"
import { parseDayKey } from "../util/chatHistoryJump"
import { getLocalDayKey } from "../util/timeFormat"

export type JumpDateCalendarPopProps = {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  loadedDayKeys: ReadonlySet<string>
  minDayKey: string
  maxDayKey: string
  /** Any day in the month to show when opening (e.g. sticky header day). */
  initialDayKey: string
  onPick: (dayKey: string) => void
  onDismiss: () => void
}

function dayKeyFromYmd(y: number, m0: number, d: number): string {
  const noon = new Date(y, m0, d, 12, 0, 0)
  return getLocalDayKey(Math.floor(noon.getTime() / 1000))
}

function daysInMonth(y: number, m0: number): number {
  return new Date(y, m0 + 1, 0).getDate()
}

/** Monday = 0 … Sunday = 6 for the first row of a Monday-first grid. */
function mondayIndexFromDate(y: number, m0: number, day: number): number {
  const dow = new Date(y, m0, day).getDay()
  return dow === 0 ? 6 : dow - 1
}

function weekdayHeaders(locale: string): string[] {
  const monday = new Date(2024, 0, 1)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(d)
  })
}

function monthIndex(y: number, m: number): number {
  return y * 12 + m
}

export function JumpDateCalendarPop({
  open,
  anchorRef,
  loadedDayKeys,
  minDayKey,
  maxDayKey,
  initialDayKey,
  onPick,
  onDismiss,
}: JumpDateCalendarPopProps) {
  const { t, i18n } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  useFocusTrap(containerRef, open)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const minParts = useMemo(() => parseDayKey(minDayKey), [minDayKey])
  const maxParts = useMemo(() => parseDayKey(maxDayKey), [maxDayKey])
  const minMonthIdx = monthIndex(minParts.y, minParts.m)
  const maxMonthIdx = monthIndex(maxParts.y, maxParts.m)

  const initial = useMemo(() => parseDayKey(initialDayKey), [initialDayKey])

  const [visible, setVisible] = useState<{ y: number; m: number }>(() => ({
    y: initial.y,
    m: initial.m,
  }))

  useEffect(() => {
    if (!open) {
      return
    }
    const p = parseDayKey(initialDayKey)
    setVisible({ y: p.y, m: p.m })
  }, [open, initialDayKey])

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      return
    }
    const r = anchorRef.current.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const top = r.bottom + 8
    setPos({ top, left: cx })
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) {
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
    }
  }, [open, onDismiss])

  const todayKey = useMemo(
    () => getLocalDayKey(Math.floor(Date.now() / 1000)),
    [open],
  )

  const monthTitle = useMemo(() => {
    const d = new Date(visible.y, visible.m, 1, 12, 0, 0)
    return new Intl.DateTimeFormat(i18n.language, {
      month: "long",
      year: "numeric",
    }).format(d)
  }, [visible.y, visible.m, i18n.language])

  const headers = useMemo(() => weekdayHeaders(i18n.language), [i18n.language])

  const visMonthIdx = monthIndex(visible.y, visible.m)
  const canPrevMonth = visMonthIdx > minMonthIdx
  const canNextMonth = visMonthIdx < maxMonthIdx

  const goPrev = () => {
    setVisible((v) => {
      if (v.m === 0) {
        return { y: v.y - 1, m: 11 }
      }
      return { y: v.y, m: v.m - 1 }
    })
  }

  const goNext = () => {
    setVisible((v) => {
      if (v.m === 11) {
        return { y: v.y + 1, m: 0 }
      }
      return { y: v.y, m: v.m + 1 }
    })
  }

  const dim = daysInMonth(visible.y, visible.m)
  const lead = mondayIndexFromDate(visible.y, visible.m, 1)
  const cells: {
    key: string
    dayKey: string
    inMonth: boolean
    hasMessages: boolean
    inRange: boolean
  }[] = []

  const prevMonth = visible.m === 0 ? { y: visible.y - 1, m: 11 } : { y: visible.y, m: visible.m - 1 }
  const prevDim = daysInMonth(prevMonth.y, prevMonth.m)
  for (let i = 0; i < lead; i++) {
    const d = prevDim - lead + i + 1
    const dk = dayKeyFromYmd(prevMonth.y, prevMonth.m, d)
    cells.push({
      key: `p-${dk}`,
      dayKey: dk,
      inMonth: false,
      hasMessages: loadedDayKeys.has(dk),
      inRange: dk >= minDayKey && dk <= maxDayKey,
    })
  }
  for (let d = 1; d <= dim; d++) {
    const dk = dayKeyFromYmd(visible.y, visible.m, d)
    cells.push({
      key: `c-${dk}`,
      dayKey: dk,
      inMonth: true,
      hasMessages: loadedDayKeys.has(dk),
      inRange: dk >= minDayKey && dk <= maxDayKey,
    })
  }
  const tail = (7 - (cells.length % 7)) % 7
  const nextMonth = visible.m === 11 ? { y: visible.y + 1, m: 0 } : { y: visible.y, m: visible.m + 1 }
  for (let i = 0; i < tail; i++) {
    const d = i + 1
    const dk = dayKeyFromYmd(nextMonth.y, nextMonth.m, d)
    cells.push({
      key: `n-${dk}`,
      dayKey: dk,
      inMonth: false,
      hasMessages: loadedDayKeys.has(dk),
      inRange: dk >= minDayKey && dk <= maxDayKey,
    })
  }

  const pickable = (c: (typeof cells)[0]) =>
    c.hasMessages && c.inRange

  const onToday = () => {
    if (!loadedDayKeys.has(todayKey) || todayKey < minDayKey || todayKey > maxDayKey) {
      return
    }
    onPick(todayKey)
    onDismiss()
  }

  const dayNumLabel = (dk: string) => String(Number(dk.slice(8)))

  if (!open) {
    return null
  }

  const leftClamped = Math.min(
    Math.max(16, pos.left),
    typeof window !== "undefined" ? window.innerWidth - 16 : pos.left,
  )

  return (
    <>
      <div className="jump-date-cal__backdrop" aria-hidden onClick={onDismiss} />
      <div
        className="jump-date-cal"
        ref={containerRef}
        role="dialog"
        aria-label={t("chat.jumpCalendarTitle")}
        style={{
          top: pos.top,
          left: leftClamped,
        }}
      >
        <div className="jump-date-cal__head">
          <button
            type="button"
            className="jump-date-cal__nav"
            onClick={goPrev}
            disabled={!canPrevMonth}
            aria-label={t("chat.jumpCalendarPrevMonth")}
          >
            ‹
          </button>
          <span className="jump-date-cal__title">{monthTitle}</span>
          <button
            type="button"
            className="jump-date-cal__nav"
            onClick={goNext}
            disabled={!canNextMonth}
            aria-label={t("chat.jumpCalendarNextMonth")}
          >
            ›
          </button>
        </div>
        <div className="jump-date-cal__weekdays" aria-hidden>
          {headers.map((h) => (
            <span key={h} className="jump-date-cal__wd">
              {h}
            </span>
          ))}
        </div>
        <div className="jump-date-cal__grid">
          {cells.map((c) => {
            const canPick = pickable(c)
            const muted = !c.inMonth
            return (
              <button
                key={c.key}
                type="button"
                className={
                  "jump-date-cal__day"
                  + (muted ? " jump-date-cal__day--muted" : "")
                  + (canPick ? "" : " jump-date-cal__day--disabled")
                  + (c.dayKey === todayKey ? " jump-date-cal__day--today" : "")
                }
                disabled={!canPick}
                onClick={() => {
                  if (canPick) {
                    onPick(c.dayKey)
                    onDismiss()
                  }
                }}
                aria-label={
                  canPick
                    ? c.dayKey
                    : t("chat.jumpCalendarNoMessagesDay", { date: c.dayKey })
                }
              >
                {dayNumLabel(c.dayKey)}
              </button>
            )
          })}
        </div>
        <div className="jump-date-cal__footer">
          <button type="button" className="jump-date-cal__link" onClick={onDismiss}>
            {t("chat.jumpCalendarClear")}
          </button>
          <button
            type="button"
            className="jump-date-cal__link"
            onClick={onToday}
            disabled={
              !loadedDayKeys.has(todayKey) || todayKey < minDayKey || todayKey > maxDayKey
            }
          >
            {t("chat.jumpCalendarToday")}
          </button>
        </div>
      </div>
    </>
  )
}
