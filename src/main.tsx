// `util` and friends touch `process` at module load; must be first.
import "./process-polyfill"
// GramJS reads global Buffer at module init; Vite rewrites the `buffer` spec.
import "./buffer-polyfill"
import "./util-polyfill"
import { installDisconnectNoiseSuppression } from "./telegram/suppressDisconnectNoise"

installDisconnectNoiseSuppression()
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./i18n/config"
import { ParentalProvider } from "./context/ParentalContext"
import { ThemeProvider } from "./context/ThemeContext"
import { TelegramProvider } from "./context/TelegramContext"
import App from "./App"
import "./index.css"
import faviconUrl from "./assets/brand-mark.svg?url"

{
  const link = document.createElement("link")
  link.rel = "icon"
  link.type = "image/svg+xml"
  link.href = faviconUrl
  document.head.appendChild(link)
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <ParentalProvider>
        <TelegramProvider>
          <App />
        </TelegramProvider>
      </ParentalProvider>
    </ThemeProvider>
  </StrictMode>
)
