import { useTranslation } from "react-i18next"
import type { CommunityStub } from "../telegram/communityDialogs"

/**
 * communities-dialogs (AC-C2): honest stub row for a `DialogCommunity`.
 * Static community glyph (no PeerAvatar fetch on a missing peer), a text
 * "Community" badge (not colour-only), an optional mute glyph, and a fixed
 * secondary line — never a fake last-message excerpt. Tapping opens the
 * limitation sheet, never a ChatView.
 */
export function CommunityRow({
  stub,
  onOpen,
}: {
  stub: CommunityStub
  onOpen: (stub: CommunityStub) => void
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      className="community-row"
      onClick={() => onOpen(stub)}
      aria-label={t("letters.communities.rowAria", { title: stub.title })}
    >
      <span className="community-row__glyph" aria-hidden="true">
        ⌂
      </span>
      <span className="community-row__body">
        <span className="community-row__title">
          {stub.title}
          {stub.muted ? (
            <span className="community-row__mute" aria-label={t("letters.communities.muted")}>
              🔇
            </span>
          ) : null}
        </span>
        <span className="community-row__sub muted small">
          {stub.forbidden
            ? t("letters.communities.subForbidden")
            : t("letters.communities.sub")}
        </span>
      </span>
      <span className="community-row__badge">{t("letters.communities.badge")}</span>
    </button>
  )
}
