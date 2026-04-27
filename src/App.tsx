import { useTranslation } from "react-i18next"
import { useTelegram } from "./context/TelegramContext"
import { LoginView } from "./ui/LoginView"
import { MainShell } from "./ui/MainShell"

export default function App() {
  const { t } = useTranslation()
  const { isReady, authorized } = useTelegram()
  if (!isReady) {
    return (
      <div className="app-root--main app-boot" role="status" aria-live="polite">
        {t("loading")}
      </div>
    )
  }
  if (!authorized) {
    return <LoginView />
  }
  return <MainShell />
}
