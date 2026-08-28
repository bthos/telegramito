import { TelegramClient } from "teleproto"
import { StringSession } from "teleproto/sessions"
import { PromisedWebSockets } from "teleproto/extensions"

import { getApiCredentials } from "./credentials"

/**
 * Unlike GramJS (which auto-detects Node vs browser via `platform.isNode` and
 * defaults to `PromisedWebSockets` outside Node), teleproto's default
 * `networkSocket` is unconditionally `PromisedNetSockets` (Node `net.Socket`).
 * Telegramito is browser-only, so every `TelegramClient` construction must
 * pass this explicitly — otherwise `client.connect()` throws
 * `TypeError: net.Socket is not a constructor` (confirmed via the AC-T1
 * browser spike). Spread this into every `new TelegramClient(..., {...})`
 * options object.
 */
export const browserClientOptions = {
  networkSocket: PromisedWebSockets,
} as const

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
      ...browserClientOptions,
    }
  )
  return { ok: true, client }
}
