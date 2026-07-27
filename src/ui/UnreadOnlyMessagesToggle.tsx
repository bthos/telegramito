import { useId } from "react"
import { useTranslation } from "react-i18next"
import { UnreadFilterIcon } from "./ChatFilterIcons"

export function UnreadOnlyMessagesToggle({
  active,
  onToggle,
}: {
  active: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const uid = useId()
  const labelId = `${uid}-unread-only-lbl`
  return (
    <div className="thread-header__unread">
      <span id={labelId} className="thread-header__unread-label">
        <UnreadFilterIcon />
        <span className="thread-header__unread-caption">{t("chat.messagesUnreadOnly")}</span>
      </span>
      <button
        type="button"
        className="switch"
        role="switch"
        aria-checked={active}
        aria-labelledby={labelId}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault()
            onToggle()
          }
        }}
        onClick={onToggle}
      >
        <span className="switch__track" aria-hidden>
          <span className="switch__thumb" />
        </span>
      </button>
    </div>
  )
}
