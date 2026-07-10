import { useTranslation } from "react-i18next"

type Props = {
  onClick: () => void
}

export function LettersWriteFab({ onClick }: Props) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      className="letters-write-fab"
      onClick={onClick}
      aria-label={t("letters.write")}
      title={t("letters.write")}
    >
      {t("letters.writeFab")}
    </button>
  )
}
