import { useTranslation } from "react-i18next"
import { useTelegram } from "../context/TelegramContext"
import { DayMailRail } from "./DayMailRail"
import { useLettersChatRail } from "./LettersChatRailContext"

/**
 * Letters desktop third column: "The day's mail" digest, replaced by chat info + calendar slot when opened.
 */
export function LettersRightRailColumn() {
  const { t } = useTranslation()
  const { client } = useTelegram()
  const {
    digest,
    lettersInfoOpen,
    setLettersInfoOpen,
    lettersInfoSlot,
  } = useLettersChatRail()

  if (!lettersInfoOpen) {
    return (
      <DayMailRail
        dialogs={digest.dialogs}
        selectedKey={digest.selectedKey}
        onSelect={digest.onSelect}
        client={client}
      />
    )
  }

  return (
    <div className="letters-rail-info">
      <div className="letters-rail-info__toolbar">
        <button
          type="button"
          className="letters-rail-info__back"
          onClick={() => {
            setLettersInfoOpen(false)
          }}
        >
          {t("letters.railBackToDayMail")}
        </button>
      </div>
      <div className="letters-rail-info__body">{lettersInfoSlot}</div>
    </div>
  )
}
