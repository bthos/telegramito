import { useTranslation } from "react-i18next"
import { formatUnreadBadge } from "../util/formatUnreadBadge"

type Props = {
  count: number
  childMode: boolean
  onClick: () => void
}

export function LettersFreshMailPill({ count, childMode, onClick }: Props) {
  const { t } = useTranslation()
  const capped = formatUnreadBadge(count)
  const label = childMode
    ? t("letters.freshMailChild", { count: capped })
    : t("letters.freshMail", { count: capped })
  const aria = childMode
    ? t("letters.freshMailAriaChild", { count: capped })
    : t("letters.freshMailAria", { count: capped })

  return (
    <button
      type="button"
      className="letters-fresh-mail"
      onClick={onClick}
      aria-label={aria}
      title={aria}
    >
      {label}
    </button>
  )
}
