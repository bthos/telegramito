import { useCallback, useState } from "react"
import { useTelegram } from "../context/TelegramContext"

/**
 * ephemeral-messages (AC-E2): whether to show the "ephemeral messages aren't
 * shown here" ribbon for the open chat. `TelegramContext` records which peers
 * have received ephemeral traffic this session; the ribbon shows once per
 * session per peer — a dismiss sticks for the rest of the session.
 */
const dismissedThisSession = new Set<string>()

export function useEphemeralNotice(peerKey: string | null | undefined): {
  show: boolean
  dismiss: () => void
} {
  const { ephemeralPeerKeys, ephemeralTick } = useTelegram()
  const [, force] = useState(0)
  // `ephemeralTick` re-renders us when a new ephemeral update lands.
  void ephemeralTick

  const key = peerKey && peerKey.length > 0 ? peerKey : null
  const show =
    key != null && ephemeralPeerKeys.has(key) && !dismissedThisSession.has(key)

  const dismiss = useCallback(() => {
    if (key != null) {
      dismissedThisSession.add(key)
      force((n) => n + 1)
    }
  }, [key])

  return { show, dismiss }
}
