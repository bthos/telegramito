import { useTranslation } from "react-i18next"
import { formatUnreadBadge } from "../util/formatUnreadBadge"

export type MobileShellTab = "letters" | "dayMail" | "circles" | "desk"

type Props = {
  active: MobileShellTab
  onSelect: (tab: MobileShellTab) => void
  dayMailBadge?: number
}

const TAB_ORDER: MobileShellTab[] = ["letters", "dayMail", "circles", "desk"]

export function LettersMobileTabBar({ active, onSelect, dayMailBadge = 0 }: Props) {
  const { t } = useTranslation()
  const badgeText = formatUnreadBadge(dayMailBadge)

  return (
    <nav
      className="letters-mobile-tabbar"
      role="tablist"
      aria-label={t("letters.mobileTabBarAria")}
    >
      {TAB_ORDER.map((tab) => {
        const selected = active === tab
        const showBadge = tab === "dayMail" && badgeText.length > 0 && !selected
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`letters-mobile-tab-${tab}`}
            aria-selected={selected}
            aria-controls={`letters-mobile-panel-${tab}`}
            className={selected ? "letters-mobile-tab is-active" : "letters-mobile-tab"}
            onClick={() => {
              onSelect(tab)
            }}
          >
            <span className="letters-mobile-tab__glyph" aria-hidden>
              {t(`letters.mobileTabGlyph.${tab}`)}
            </span>
            <span className="letters-mobile-tab__label">{t(`letters.mobileTab.${tab}`)}</span>
            {showBadge ? (
              <span className="letters-mobile-tab__badge" aria-hidden>
                {badgeText}
              </span>
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}
