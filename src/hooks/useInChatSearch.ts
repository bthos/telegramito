import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { useEffect, useRef, useState } from "react"
import { toMessageList } from "../telegram/messageList"
import { withTransientRetry } from "../telegram/invokeWithTransientRetry"

const DEBOUNCE_MS = 400
const SEARCH_LIMIT = 40

export type UseInChatSearchArgs = {
  client: TelegramClient | null
  entity: unknown | null | undefined
  /** When true (e.g. forum topics), no requests are made. */
  disabled: boolean
}

/**
 * Debounced in-chat search via {@link TelegramClient.getMessages} with `search`
 * (GramJS equivalent to history search; see feature spec).
 */
export function useInChatSearch({
  client,
  entity,
  disabled,
}: UseInChatSearchArgs): {
  query: string
  setQuery: (q: string) => void
  results: Api.Message[]
  loading: boolean
  error: string | null
} {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Api.Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchGenRef = useRef(0)

  useEffect(() => {
    fetchGenRef.current += 1
  }, [entity])

  useEffect(() => {
    if (debounceTimerRef.current != null) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const q = query.trim()
    if (!client || entity == null || disabled) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      fetchGenRef.current += 1
      const runGen = fetchGenRef.current
      setLoading(true)
      setError(null)
      void (async () => {
        try {
          const raw = await withTransientRetry(client, () =>
            client.getMessages(entity as never, { search: q, limit: SEARCH_LIMIT }),
          )
          if (runGen !== fetchGenRef.current) {
            return
          }
          setResults(toMessageList(raw))
          setError(null)
        } catch {
          if (runGen !== fetchGenRef.current) {
            return
          }
          setResults([])
          setError("search_failed")
        } finally {
          if (runGen === fetchGenRef.current) {
            setLoading(false)
          }
        }
      })()
    }, DEBOUNCE_MS)

    return () => {
      if (debounceTimerRef.current != null) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [query, client, entity, disabled])

  return { query, setQuery, results, loading, error }
}
