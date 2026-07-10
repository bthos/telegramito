import { useTranslation } from "react-i18next"
import type { CorrespondenceTab } from "../util/correspondenceFilter"

type Props = {
  value: CorrespondenceTab
  onChange: (tab: CorrespondenceTab) => void
}

const TABS: CorrespondenceTab[] = ["letters", "drafts", "returned"]

export function LettersCorrespondenceSeg({ value, onChange }: Props) {
  const { t } = useTranslation()
  return (
    <nav className="letters-mobile-seg" aria-label={t("letters.navAria")}>
      {TABS.map((k) => (
        <button
          key={k}
          type="button"
          className={value === k ? "letters-mobile-seg__chip is-active" : "letters-mobile-seg__chip"}
          onClick={() => {
            onChange(k)
          }}
          aria-current={value === k ? "page" : undefined}
        >
          {t(`letters.tab.${k}`)}
        </button>
      ))}
    </nav>
  )
}
