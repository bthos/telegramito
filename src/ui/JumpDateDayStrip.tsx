import { useTranslation } from "react-i18next"
import { JumpDateCalendarIcon } from "./ChatChromeIcons"

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

type Props = {
  dayKeys: string[]
  activeDayKey?: string
  locale: string
  onPick: (dayKey: string) => void
  onOpenCalendar: () => void
  calendarLabel: string
}

/**
 * Horizontal day-of-month chips for loaded history range + calendar affordance.
 */
export function JumpDateDayStrip({
  dayKeys,
  activeDayKey,
  locale,
  onPick,
  onOpenCalendar,
  calendarLabel,
}: Props) {
  const { t } = useTranslation()
  const narrows = weekNarrows(locale)
  if (dayKeys.length === 0) {
    return null
  }
  return (
    <div className="letters-jump-strip" role="group" aria-label={t("letters.jumpStripAria")}>
      <div className="letters-jump-strip__headed">
        <span className="letters-jump-strip__lbl">{t("letters.jumpByDate")}</span>
        <div className="letters-jump-strip__wk" aria-hidden="true">
          {narrows.map((ch, i) => (
            <span key={i} className="letters-jump-strip__wk-d">
              {ch}
            </span>
          ))}
        </div>
      </div>
      <div className="letters-jump-strip__scroll">
        {dayKeys.map((k) => {
          const parts = k.split("-")
          const dom = parts.length === 3 ? Number(parts[2]) : NaN
          const label = Number.isFinite(dom) ? String(dom) : k
          const active = activeDayKey === k
          return (
            <button
              key={k}
              type="button"
              className={active ? "letters-jump-chip is-active" : "letters-jump-chip"}
              onClick={() => {
                onPick(k)
              }}
              aria-pressed={active}
              aria-label={k}
            >
              {label}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        className="letters-jump-strip__cal"
        onClick={onOpenCalendar}
        aria-label={calendarLabel}
        title={calendarLabel}
      >
        <JumpDateCalendarIcon className="letters-jump-strip__cal-ico" />
      </button>
    </div>
  )
}
