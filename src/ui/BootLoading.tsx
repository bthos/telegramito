import { useTranslation } from "react-i18next"
import { TelegramMark } from "./TelegramMark"

type Props = {
  /** e.g. `app-root app-root--peripheral app-boot` for first paint newsprint shell. */
  className?: string
}

/** Initial “Loading…” shell: app mark broadcasting radio waves + status text. */
export function BootLoading({ className = "app-boot" }: Props) {
  const { t } = useTranslation()
  return (
    <div className={className} role="status" aria-live="polite">
      <span className="app-boot__mark-wrap" aria-hidden="true">
        <svg className="app-boot__waves" viewBox="0 0 100 100" focusable="false">
          <circle className="app-boot__wave" cx="50" cy="50" r="48" />
          <circle className="app-boot__wave" cx="50" cy="50" r="48" />
          <circle className="app-boot__wave" cx="50" cy="50" r="48" />
        </svg>
        <TelegramMark className="app-boot__mark" alt="" />
      </span>
      <span className="app-boot__label">{t("loading")}</span>
    </div>
  )
}
