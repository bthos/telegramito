import { sleep } from "telegram/Helpers"
import type { TelegramClient } from "telegram"

/**
 * Heuristic for common GramJS/transport errors during reconnect, socket close,
 * or in-flight work while the connection is torn down.
 */
export function isTransientConnectError(e: unknown): boolean {
  if (e == null) {
    return false
  }
  const msg = e instanceof Error ? e.message : String(e)
  if (!msg) {
    return false
  }
  if (msg === "Not connected") {
    return true
  }
  if (/^RPCError.*TIMEOUT|TIMEOUT_|-503|NETWORK/i.test(msg)) {
    return true
  }
  if (/ETIMEDOUT|ECONNRESET|EPIPE|socket|closed|disconnect|Not connected|receiving data/i.test(msg)) {
    return true
  }
  return false
}

/**
 * Re-runs `op` after `client.connect()` + a short wait when the failure looks
 * like a connection drop. Runs up to (retries + 1) times (default: 3 attempts).
 */
export async function withTransientRetry<T>(
  client: TelegramClient,
  op: () => Promise<T>,
  options?: { retries?: number; delayMs?: number }
): Promise<T> {
  const maxRetries = options?.retries ?? 2
  const delayMs = options?.delayMs ?? 450
  let last: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        try {
          await client.connect()
        } catch {
          /* next attempt or surface on throw */
        }
        await sleep(delayMs * attempt)
      }
      return await op()
    } catch (e) {
      last = e
      if (attempt < maxRetries && isTransientConnectError(e)) {
        continue
      }
      throw e
    }
  }
  throw last
}
