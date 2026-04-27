import { TelegramClient } from "telegram"
import { StringSession } from "telegram/sessions"

import { getApiCredentials } from "./credentials"

export function createClientFromStringSession(
  sessionString: string
): { ok: true; client: TelegramClient } | { ok: false; reason: "missing" } {
  const creds = getApiCredentials()
  if (!creds.ok) return creds
  const session = new StringSession(sessionString)
  const client = new TelegramClient(
    session,
    creds.apiId,
    creds.apiHash,
    {
      connectionRetries: 5,
    }
  )
  return { ok: true, client }
}
