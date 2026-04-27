import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useParentalSettings } from "../context/ParentalContext"
import { verifyPin } from "../parental/pin"
import { Button, TextField } from "./ds"

type Props = {
  onSuccess: () => void
  onClose: () => void
  open: boolean
}

export function PinDialog({ open, onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const { settings } = useParentalSettings()
  const [pin, setPin] = useState("")
  const [bad, setBad] = useState(false)

  if (!open) {
    return null
  }

  const go = () => {
    void (async () => {
      if (!settings.pinHash || !settings.pinSalt) {
        onSuccess()
        onClose()
        return
      }
      const ok = await verifyPin(pin, settings.pinSalt, settings.pinHash)
      if (!ok) {
        setBad(true)
        return
      }
      onSuccess()
      onClose()
      setPin("")
      setBad(false)
    })()
  }

  return (
    <div className="modal-back" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>{t("pin.title")}</h2>
        {bad ? <p className="err">{t("pin.wrong")}</p> : null}
        <TextField
          name="p"
          type="password"
          value={pin}
          onChange={(e) => {
            setBad(false)
            setPin(e.target.value)
          }}
        />
        <div className="form-inline">
          <Button type="button" onClick={go}>
            {t("pin.unlock")}
          </Button>
          <Button variant="ghost" type="button" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </div>
  )
}
