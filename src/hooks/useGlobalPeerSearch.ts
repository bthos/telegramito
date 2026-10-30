import { Api } from "teleproto"
import type { TelegramClient } from "teleproto"
import { useCallback, useEffect, useRef, useState } from "react"
import { withTransientRetry } from "../telegram/invokeWithTransientRetry"
import { globalPeerHitsFromFound, type GlobalPeerHit } from "../telegram/globalPeerSearch"
import type { ParentalSettings } from "../parental/types"

const DEBOUNCE_MS = 300
const PEER_SEARCH_LIMIT = 25

export type UseGlobalPeerSearchArgs = {
  client: TelegramClient | null
  /** Masthead search string; hook trims and debounces. */
  query: string
  /** When true, no requests are made (e.g. night lock). */
  disabled?: boolean
  settings: ParentalSettings
  deniedPeerIds: ReadonlySet<string>
}

/**
 * Debounced public people/channels search via {@link Api.contacts.Search}: the «Global search»
 * section Telegram Web K shows between local chats and message hits.
 */
export function useGlobalPeerSearch({
  client,
  query,
  disabled = false,
  settings,
  deniedPeerIds,
}: UseGlobalPeerSearchArgs): {
  results: GlobalPeerHit[]
  loading: boolean
  error: string | null
  retry: () => void
} {
  const [results, setResults] = useState<GlobalPeerHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const genRef = useRef(0)
  // The parental inputs are read at response time; they must not restart the request.
  const gateRef = useRef({ settings, deniedPeerIds })
  useEffect(() => {
    gateRef.current = { settings, deniedPeerIds }
  }, [settings, deniedPeerIds])

  const retry = useCallback(() => {
    setRetryToken((n) => n + 1)
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (!client || disabled || q.length < 2) {
      genRef.current += 1
      queueMicrotask(() => {
        setResults([])
        setLoading(false)
        setError(null)
      })
      return
    }

    const timer = setTimeout(() => {
      genRef.current += 1
      const runGen = genRef.current
      setLoading(true)
      setError(null)
      void (async () => {
        try {
          const found = (await withTransientRetry(client, () =>
            client.invoke(new Api.contacts.Search({ q, limit: PEER_SEARCH_LIMIT })),
          )) as Api.contacts.Found
          if (runGen !== genRef.current) {
            return
          }
          setResults(
            globalPeerHitsFromFound(found, gateRef.current.settings, gateRef.current.deniedPeerIds),
          )
        } catch {
          if (runGen !== genRef.current) {
            return
          }
          setResults([])
          setError("search_failed")
        } finally {
          if (runGen === genRef.current) {
            setLoading(false)
          }
        }
      })()
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
    }
  }, [query, client, disabled, retryToken])

  return { results, loading, error, retry }
}
