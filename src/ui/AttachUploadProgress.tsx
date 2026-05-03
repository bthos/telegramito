import { useTranslation } from "react-i18next"

type Props = {
  sent: number
  total: number
}

export function AttachUploadProgress({ sent, total }: Props) {
  const { t } = useTranslation()
  if (total <= 0) {
    return null
  }
  const pct = Math.round((sent / total) * 100)
  return (
    <div
      className="attach-upload-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={t("chat.attachUploadProgressAria", { pct })}
    >
      <div
        className="attach-upload-progress__bar"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
