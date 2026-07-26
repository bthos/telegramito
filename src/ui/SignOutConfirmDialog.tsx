import { useRef } from "react"
import { useTranslation } from "react-i18next"
import { useBodyScrollLockAndEscape } from "../hooks/useBodyScrollLockAndEscape"
import { useFocusTrap } from "../hooks/useFocusTrap"
import { Button } from "./ds"

type Props = {
  open: boolean
  onConfirm: () => void
  onClose: () => void
}

export function SignOutConfirmDialog({ open, onConfirm, onClose }: Props) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap(panelRef, open)
  useBodyScrollLockAndEscape(open, onClose)

  if (!open) {
    return null
  }

  return (
    <div
      className="modal-back"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose()
        }
      }}
    >
      <div
        ref={panelRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("signOutConfirmTitle")}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{t("signOutConfirmTitle")}</h2>
        <p>{t("signOutConfirmBody")}</p>
        <div className="form-inline">
          <Button type="button" className="sign-out-confirm__danger" onClick={onConfirm}>
            {t("signOut")}
          </Button>
          <Button variant="ghost" type="button" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </div>
  )
}
