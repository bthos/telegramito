import { useTranslation } from "react-i18next"
import { TelegramMark } from "./TelegramMark"

type Props = {
  /** e.g. `app-root app-root--peripheral app-boot` for first paint newsprint shell. */
  className?: string
}

/** Initial “Loading…” shell: app mark + status text. */
export function BootLoading({ className = "app-boot" }: Props) {
  const { t } = useTranslation()
  return (
    <div className={className} role="status" aria-live="polite">
      <TelegramMark className="app-boot__mark" alt="" />
      <span className="app-boot__label">{t("loading")}</span>
    </div>
  )
}
