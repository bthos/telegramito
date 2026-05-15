import { useTelegram } from "./context/TelegramContext"
import { BootLoading } from "./ui/BootLoading"
import { LoginView } from "./ui/LoginView"
import { MainShell } from "./ui/MainShell"

export default function App() {
  const { isReady, authorized } = useTelegram()
  if (!isReady) {
    return <BootLoading className="app-root--main app-boot" />
  }
  if (!authorized) {
    return <LoginView />
  }
  return <MainShell />
}
