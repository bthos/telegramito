import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import type { TelegramClient } from "teleproto"
import type { Dialog } from "teleproto/tl/custom/dialog"
import { useDismissibleLayer } from "../hooks/useDismissibleLayer"
import { getLettersPortalRoot } from "../util/lettersPortalRoot"
import { DayMailRail } from "./DayMailRail"
import { Button } from "./ds"
import { ShellCloseIcon } from "./ShellIcons"
import type { CorrespondenceTab } from "../util/correspondenceFilter"

type Props = {
  open: boolean
  onClose: () => void
  dialogs: Dialog[]
  selectedKey: string | null
  correspondenceTab?: CorrespondenceTab
  onSelect: (dialog: Dialog, opts?: { focusMessageId?: number }) => void
  client?: TelegramClient | null
}

/** Tablet band (701–1279px): day mail via masthead day-mail icon → slide-over panel. */
export function LettersDayMailSlideOver({
  open,
  onClose,
  dialogs,
  selectedKey,
  correspondenceTab = "letters",
  onSelect,
  client = null,
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
        className="letters-day-mail-slide"
        role="dialog"
        aria-modal="true"
        aria-label={t("letters.dayMailAria")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="letters-day-mail-slide__head letters-day-mail-slide__head--end">
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
        <DayMailRail
          dialogs={dialogs}
          selectedKey={selectedKey}
          correspondenceTab={correspondenceTab}
          onSelect={(d, opts) => {
            onSelect(d, opts)
            onClose()
          }}
          client={client}
        />
      </aside>
    </div>
  )

  return createPortal(node, getLettersPortalRoot())
}
