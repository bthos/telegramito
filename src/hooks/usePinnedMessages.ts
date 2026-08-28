import type { Api } from "teleproto"
import type { TelegramClient } from "teleproto"
import { useCallback, useEffect, useRef, useState } from "react"
import { getPinnedMessages } from "../telegram/pinnedMessages"
import { withTransientRetry } from "../telegram/invokeWithTransientRetry"

export type UsePinnedMessagesArgs = {
  client: TelegramClient | null
  entity: unknown | null | undefined
  /** When set (an open forum topic), scopes the fetch to that topic via `topMsgId`. */
  topicId?: number
}

/**
 * Fetches the pinned messages for the open chat (or forum topic). Parallels
 * `useInChatSearch`'s fetch/invalidation idiom: a `fetchGenRef` stale-guard discards a
 * response from a superseded fetch (chat/topic switched mid-request). `refresh()` re-runs
 * the fetch (used after a local pin/unpin so the banner reflects the change).
 */
export function usePinnedMessages({ client, entity, topicId }: UsePinnedMessagesArgs): {
  pinned: Api.Message[]
  loading: boolean
  error: boolean
  refresh: () => void
} {
  const [pinned, setPinned] = useState<Api.Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [nonce, setNonce] = useState(0)
  const fetchGenRef = useRef(0)

  useEffect(() => {
    fetchGenRef.current += 1
    const runGen = fetchGenRef.current

    if (!client || entity == null) {
      queueMicrotask(() => {
        setPinned([])
        setLoading(false)
        setError(false)
      })
      return
    }

    setLoading(true)
    setError(false)
    void (async () => {
      try {
        const list = await withTransientRetry(client, () =>
          getPinnedMessages(client, entity as never, topicId),
        )
        if (runGen !== fetchGenRef.current) {
          return
        }
        setPinned(list)
        setError(false)
      } catch {
        if (runGen !== fetchGenRef.current) {
          return
        }
        setPinned([])
        setError(true)
      } finally {
        if (runGen === fetchGenRef.current) {
          setLoading(false)
        }
      }
    })()
  }, [client, entity, topicId, nonce])

  const refresh = useCallback(() => {
    setNonce((n) => n + 1)
  }, [])

  return { pinned, loading, error, refresh }
}
