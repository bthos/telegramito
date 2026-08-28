import { sleep } from "teleproto/Helpers"
import type { TelegramClient } from "teleproto"

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
 * GramJS's own pending-request bookkeeping can orphan a request across a
 * disconnect/reconnect (data-center migration, socket teardown mid-flight):
 * the promise from `op()` then never settles. Without a deadline here,
 * `withTransientRetry`'s `await` — and every `finally` downstream of it —
 * hangs forever, which is how chat-history pagination and the stories feed
 * get stuck on "Loading…" permanently instead of failing and retrying.
 */
const DEFAULT_ATTEMPT_TIMEOUT_MS = 15_000

class TransientTimeoutError extends Error {
  constructor(ms: number) {
    super(`TIMEOUT_${ms}ms`)
    this.name = "TransientTimeoutError"
  }
}

function withDeadline<T>(op: () => Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TransientTimeoutError(ms))
    }, ms)
    op().then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

/**
 * Re-runs `op` after `client.connect()` + a short wait when the failure looks
 * like a connection drop. Runs up to (retries + 1) times (default: 3 attempts).
 * Each attempt is bounded by `timeoutMs` (default 15s) so a request orphaned
 * by a mid-flight disconnect fails instead of hanging forever.
 */
export async function withTransientRetry<T>(
  client: TelegramClient,
  op: () => Promise<T>,
  options?: { retries?: number; delayMs?: number; timeoutMs?: number }
): Promise<T> {
  const maxRetries = options?.retries ?? 2
  const delayMs = options?.delayMs ?? 450
  const timeoutMs = options?.timeoutMs ?? DEFAULT_ATTEMPT_TIMEOUT_MS
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
      return await withDeadline(op, timeoutMs)
    } catch (e) {
      last = e
      const transient = e instanceof TransientTimeoutError || isTransientConnectError(e)
      if (attempt < maxRetries && transient) {
        continue
      }
      throw e
    }
  }
  throw last
}
