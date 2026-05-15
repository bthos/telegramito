import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { Api } from "telegram"
import { JumpDateCalendarIcon } from "./ChatChromeIcons"
import { getLocalDayKey } from "../util/timeFormat"

const DAY_MS = 86_400_000
const DNA_BARS = 14
/** 4 × 7 — handoff calendar sketch */
const CAL_CELLS = 28

function localMidnightUtcMs(tsMs: number): number {
  const d = new Date(tsMs)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function dayIndexSinceToday(msgDayMs: number, todayMs: number): number {
  return Math.round((todayMs - msgDayMs) / DAY_MS)
}

function weekNarrows(locale: string): readonly string[] {
  const fmt = new Intl.DateTimeFormat(locale.length > 1 ? locale : "en", { weekday: "narrow" })
  const sundayRef = new Date(2026, 0, 4)
  const out: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(sundayRef)
    d.setDate(sundayRef.getDate() + i)
    out.push(fmt.format(d))
  }
  return out
}

function peakDayLabel(locale: string, todayMs: number, peakBarIndex: number): string {
  const peakDayAge = DNA_BARS - 1 - peakBarIndex
  const peakDayMs = todayMs - peakDayAge * DAY_MS
  return new Intl.DateTimeFormat(locale.length > 1 ? locale : "en", {
    month: "short",
    day: "numeric",
  }).format(new Date(peakDayMs))
}

export type LettersThreadInsightsLayout = "full" | "volume" | "calendar"

/**
 * Inline DNA + calendar sketch (handoff): labels, 14 bars, 28-day grid with DOM,
 * terra peak; optional day jump + calendar popover affordance.
 */
export function LettersThreadInsights({
  messages,
  locale,
  activeDayKey,
  onPickDay,
  onOpenCalendar,
  calendarLabel,
  layout = "full",
}: {
  messages: readonly Api.Message[]
  locale: string
  activeDayKey?: string
  onPickDay?: (dayKey: string) => void
  onOpenCalendar?: () => void
  calendarLabel?: string
  /** `volume` / `calendar` split the two-column widget (e.g. rail vs header). */
  layout?: LettersThreadInsightsLayout
}) {
  const { t } = useTranslation()
  const { dnaCounts, gridCounts, dnaPeak, cellPeak, todayMs, maxDna, peakCount } = useMemo(() => {
    const today = localMidnightUtcMs(Date.now())
    const dna = Array<number>(DNA_BARS).fill(0)
    const grid = Array<number>(CAL_CELLS).fill(0)

    for (const m of messages) {
      if (m.className !== "Message" || m.id == null) {
        continue
      }
      if (typeof m.date !== "number" || !Number.isFinite(m.date)) {
        continue
      }
      const dayMs = localMidnightUtcMs(m.date * 1000)
      const aged = dayIndexSinceToday(dayMs, today)
      if (aged >= 0 && aged < DNA_BARS) {
        dna[DNA_BARS - 1 - aged] += 1
      }
      if (aged >= 0 && aged < CAL_CELLS) {
        grid[CAL_CELLS - 1 - aged] += 1
      }
    }

    const dnaPeakIdx = dna.reduce((best, v, i) => (v > dna[best] ? i : best), 0)
    const cellPeakIdx = grid.reduce((best, v, i) => (v > grid[best] ? i : best), 0)
    const maxD = Math.max(1, ...dna)
    const pCount = dna[dnaPeakIdx] ?? 0
    return {
      dnaCounts: dna,
      gridCounts: grid,
      dnaPeak: dnaPeakIdx,
      cellPeak: cellPeakIdx,
      todayMs: today,
      maxDna: maxD,
      peakCount: pCount,
    }
  }, [messages])

  const narrows = useMemo(() => weekNarrows(locale), [locale])
  const peakFoot =
    peakCount > 0 ? (
      <>
        {`${t("letters.insightsPeak")} `}
        <span className="letters-insights__peak-val">{peakCount}</span>
        {` · ${peakDayLabel(locale, todayMs, dnaPeak)}`}
      </>
    ) : (
      <>{`${t("letters.insightsPeak")} — · —`}</>
    )

  const sectionClass =
    layout === "full"
      ? "letters-insights"
      : layout === "volume"
        ? "letters-insights letters-insights--volume-only"
        : "letters-insights letters-insights--calendar-only"

  return (
    <section className={sectionClass} aria-label={t("letters.insightsAria")} role="region">
      <span className="sr-only">{t("letters.insightsSrOnly")}</span>
      <div className="letters-insights__inner">
        <div className="letters-insights__col letters-insights__col--dna">
          <span className="letters-insights__h">{t("letters.insightsVolumeLabel")}</span>
          <div className="letters-insights__dna">
            {dnaCounts.map((c, i) => {
              const isPeak = c > 0 && i === dnaPeak
              const hPx = Math.max(c > 0 ? 5 : 2, Math.round((c / maxDna) * 44))
              return (
                <span
                  key={i}
                  className={`letters-insights__bar${isPeak ? " is-peak" : ""}`}
                  style={{ height: `${hPx}px` }}
                />
              )
            })}
          </div>
          <span className="letters-insights__dna-foot">{peakFoot}</span>
        </div>
        <span className="letters-insights__rule" aria-hidden />
        <div className="letters-insights__col letters-insights__col--cal">
          <div className="letters-insights__cal-head">
            <span className="letters-insights__h">{t("letters.jumpByDate")}</span>
            {onOpenCalendar ? (
              <button
                type="button"
                className="letters-insights__cal-open"
                onClick={() => {
                  onOpenCalendar()
                }}
                aria-label={calendarLabel ?? t("chat.jumpToDate")}
                title={calendarLabel ?? t("chat.jumpToDate")}
              >
                <JumpDateCalendarIcon className="letters-insights__cal-open-ico" aria-hidden />
              </button>
            ) : null}
          </div>
          <div className="letters-insights__wk" aria-hidden="true">
            {narrows.map((ch, i) => (
              <span key={i} className="letters-insights__wk-d">
                {ch}
              </span>
            ))}
          </div>
          <div className="letters-insights__cal-grid" role="presentation">
            {gridCounts.map((c, i) => {
              const aged = CAL_CELLS - 1 - i
              const cellDayMs = todayMs - aged * DAY_MS
              const dom = new Date(cellDayMs).getDate()
              const dayKey = getLocalDayKey(Math.floor(cellDayMs / 1000))
              const isPeakCell = c > 0 && i === cellPeak
              const isActive = Boolean(activeDayKey) && activeDayKey === dayKey
              const isQuiet = c === 0
              const cellClass = [
                "letters-insights__cal-cell",
                isPeakCell ? "is-peak" : "",
                !isPeakCell && isActive ? "is-active-day" : "",
                isQuiet ? "is-quiet" : "",
              ]
                .filter(Boolean)
                .join(" ")

              const inner = <span className="letters-insights__cal-dom">{dom}</span>

              if (onPickDay) {
                return (
                  <button
                    key={i}
                    type="button"
                    className={cellClass}
                    aria-label={dayKey}
                    aria-pressed={isActive ? "true" : "false"}
                    onClick={() => {
                      onPickDay(dayKey)
                    }}
                  >
                    {inner}
                  </button>
                )
              }

              return (
                <span key={i} className={cellClass}>
                  {inner}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
