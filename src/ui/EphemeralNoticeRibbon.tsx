import { useTranslation } from "react-i18next"

/**
 * ephemeral-messages (AC-E2 / D7): a non-blocking chat-header ribbon shown
 * below the pinned-message banner and above the message list when disappearing
 * / guest ("ephemeral") messages arrive for the open chat. Not a toast, not a
 * modal, not an error — `role="status"`, dismissible, once per session per peer.
 */
export function EphemeralNoticeRibbon({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="ephemeral-ribbon" role="status">
      <span className="ephemeral-ribbon__text">{t("chat.ephemeralNotice")}</span>
      <button
        type="button"
        className="ephemeral-ribbon__dismiss"
        onClick={onDismiss}
        aria-label={t("chat.ephemeralNoticeDismiss")}
        title={t("chat.ephemeralNoticeDismiss")}
      >
        ×
      </button>
    </div>
  )
}
