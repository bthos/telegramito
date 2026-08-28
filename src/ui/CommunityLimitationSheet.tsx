import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import { useDismissibleLayer } from "../hooks/useDismissibleLayer"
import type { CommunityStub } from "../telegram/communityDialogs"
import { getLettersPortalRoot } from "../util/lettersPortalRoot"
import { Button } from "./ds"

/**
 * communities-dialogs (AC-C3): honest limitation sheet. Communities aren't a
 * letter thread — the row opens this, not a ChatView. Primary CTA opens
 * Telegram; a `CommunityForbidden` gets restricted-access copy. Read-only in v1
 * (local linked-peer list deferred).
 */
export function CommunityLimitationSheet({
  stub,
  onClose,
}: {
  stub: CommunityStub | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const panelRef = useDismissibleLayer(stub != null, onClose)

  if (!stub) {
    return null
  }

  const node = (
    <div className="letters-new-chat-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        className="letters-new-chat-sheet community-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t("letters.communities.sheetAria", { title: stub.title })}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="letters-new-chat-sheet__head">
          <span className="community-sheet__kicker">{t("letters.communities.badge")}</span>
          <Button
            variant="ghostIcon"
            type="button"
            className="letters-new-chat-sheet__close"
            aria-label={t("common.close")}
            title={t("common.close")}
            onClick={onClose}
          >
            ×
          </Button>
        </header>

        <h2 className="community-sheet__title">
          {stub.forbidden && stub.titleFromIdFallback
            ? t("letters.communities.unavailableTitle")
            : stub.title}
        </h2>

        <p className="letters-new-chat-sheet__hint muted small">
          {stub.forbidden
            ? t("letters.communities.bodyForbidden")
            : t("letters.communities.body")}
        </p>

        <footer className="letters-new-chat-sheet__foot letters-join-invite-sheet__foot">
          <Button variant="ghost" type="button" onClick={onClose}>
            {t("common.close")}
          </Button>
          <a
            className="btn letters-join-invite-sheet__cta"
            href="https://web.telegram.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("letters.communities.openTelegram")}
          </a>
        </footer>
      </div>
    </div>
  )

  return createPortal(node, getLettersPortalRoot())
}
