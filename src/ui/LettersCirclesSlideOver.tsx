import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import type { TelegramClient } from "teleproto"
import type { AppMode } from "../parental/types"
import { useDismissibleLayer } from "../hooks/useDismissibleLayer"
import { getLettersPortalRoot } from "../util/lettersPortalRoot"
import { StoriesRailStrip } from "./StoriesRailStrip"
import { Button } from "./ds"
import { ShellCloseIcon } from "./ShellIcons"

type Props = {
  open: boolean
  onClose: () => void
  client: TelegramClient | null
  appMode: AppMode
  nightListHidden: boolean
  nightWindow?: { start: string; end: string }
  deniedPeerIds: ReadonlySet<string>
}

/** Tablet / desktop: Circles (stories corkboard) via masthead Circles icon → slide-over panel. */
export function LettersCirclesSlideOver({
  open,
  onClose,
  client,
  appMode,
  nightListHidden,
  nightWindow,
  deniedPeerIds,
}: Props) {
  const { t } = useTranslation()
  const panelRef = useDismissibleLayer(open, onClose)

  if (!open) {
    return null
  }

  const node = (
    <div
      className="letters-day-mail-slide-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose()
        }
      }}
    >
      <aside
        ref={panelRef}
        className="letters-day-mail-slide letters-circles-slide"
        role="dialog"
        aria-modal="true"
        aria-label={t("letters.mobileTab.circles")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="letters-day-mail-slide__head">
          <h2 className="letters-day-mail-slide__title">{t("letters.mobileTab.circles")}</h2>
          <Button
            variant="ghostIcon"
            type="button"
            className="letters-day-mail-slide__close"
            aria-label={t("common.close")}
            title={t("common.close")}
            onClick={onClose}
          >
            <ShellCloseIcon />
          </Button>
        </div>
        <StoriesRailStrip
          client={client}
          appMode={appMode}
          nightListHidden={nightListHidden}
          nightWindow={nightWindow}
          deniedPeerIds={deniedPeerIds}
        />
      </aside>
    </div>
  )

  return createPortal(node, getLettersPortalRoot())
}
