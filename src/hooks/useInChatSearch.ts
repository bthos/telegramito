import { Api } from "teleproto"
import type { TelegramClient } from "teleproto"
import { generateRandomBigInt } from "teleproto/Helpers"
import { useCallback, useEffect, useRef, useState } from "react"
import { toMessageList } from "../telegram/messageList"
import { withTransientRetry } from "../telegram/invokeWithTransientRetry"

const DEBOUNCE_MS = 400
/** Page size; a full page means older hits may exist and «Show more» loads the next one. */
export const IN_CHAT_SEARCH_PAGE = 40

export type UseInChatSearchArgs = {
  client: TelegramClient | null
  entity: unknown | null | undefined
  /** When true (e.g. forum topic list with no topic open), no requests are made. */
  disabled: boolean
  /**
   * When set (an open forum topic), scopes the search to that topic via the raw
   * `Api.messages.Search` + `topMsgId` primitive instead of {@link TelegramClient.getMessages}.
   * See {@link searchTopicMessages}.
   */
  topicId?: number
}

/**
 * Topic-scoped search request, mirroring the request shape already in production use in
 * `src/telegram/forum.ts:getForumThreadMessages` (peer / q / filter / topMsgId). Unlike that
 * function, results are **not** hydrated via `_finishInit`/`repairMessageAfterGramJs`:
 * `SearchResultRow` only reads scalar fields that survive unhydrated, and jump-to-message
 * re-fetches and repairs the target message anyway via the existing `refreshMessagesById` path
 * (see feature tech-plan.md decision record 2).
 */
async function searchTopicMessages(
  client: TelegramClient,
  entity: unknown,
  q: string,
  topicId: number,
  limit: number,
  offsetId: number,
): Promise<Api.Message[]> {
  const peer = await client.getInputEntity(entity as never)
  const res = await client.invoke(
    new Api.messages.Search({
      peer,
      q,
      filter: new Api.InputMessagesFilterEmpty(),
      topMsgId: topicId,
      minDate: 0,
      maxDate: 0,
      offsetId,
      addOffset: 0,
      limit,
      maxId: 0,
      minId: 0,
      hash: generateRandomBigInt(),
    }),
  )
  if (res.className === "messages.MessagesNotModified" || !("messages" in res)) {
    return []
  }
  return res.messages.filter((m): m is Api.Message => m.className === "Message")
}

/**
 * Debounced in-chat search via {@link TelegramClient.getMessages} with `search`
 * (GramJS equivalent to history search; see feature spec). When `topicId` is set (an open
 * forum topic), scopes the search to that topic via {@link searchTopicMessages} instead.
 */
export function useInChatSearch({
  client,
  entity,
  disabled,
  topicId,
}: UseInChatSearchArgs): {
  query: string
  setQuery: (q: string) => void
  results: Api.Message[]
  loading: boolean
  error: string | null
  /** A full page came back, so older hits may exist. */
  hasMore: boolean
  loadingMore: boolean
  loadMore: () => void
} {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Api.Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchGenRef = useRef(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const loadingMoreRef = useRef(false)
  const resultsRef = useRef<Api.Message[]>([])
  const searchRef = useRef<{ q: string } | null>(null)

  useEffect(() => {
    resultsRef.current = results
  }, [results])

  /** One page of hits, newest first, strictly older than `offsetId` (0 = from the newest). */
  const fetchPage = useCallback(
    async (c: TelegramClient, q: string, offsetId: number): Promise<Api.Message[]> => {
      if (topicId != null) {
        return withTransientRetry(c, () =>
          searchTopicMessages(c, entity, q, topicId, IN_CHAT_SEARCH_PAGE, offsetId),
        )
      }
      const raw = await withTransientRetry(c, () =>
        c.getMessages(entity as never, { search: q, limit: IN_CHAT_SEARCH_PAGE, offsetId }),
      )
      // toMessageList sorts oldest→newest; search lists newest first (Telegram / topic branch
      // order), so «1 / N» is the latest hit rather than the oldest.
      return toMessageList(raw).reverse()
    },
    [entity, topicId],
  )

  const loadMore = useCallback(() => {
    const search = searchRef.current
    const last = resultsRef.current[resultsRef.current.length - 1]
    if (!client || search == null || last == null || loadingMoreRef.current) {
      return
    }
    const gen = fetchGenRef.current
    loadingMoreRef.current = true
    setLoadingMore(true)
    void (async () => {
      try {
        const page = await fetchPage(client, search.q, last.id)
        if (gen !== fetchGenRef.current) {
          return
        }
        setResults((prev) => {
          const seen = new Set(prev.map((m) => m.id))
          return [...prev, ...page.filter((m) => !seen.has(m.id))]
        })
        setHasMore(page.length >= IN_CHAT_SEARCH_PAGE)
      } catch {
        // Keep the loaded hits and the button: the user can simply try again.
      } finally {
        loadingMoreRef.current = false
        setLoadingMore(false)
      }
    })()
  }, [client, fetchPage])

  useEffect(() => {
    fetchGenRef.current += 1
  }, [entity, topicId])

  useEffect(() => {
    if (debounceTimerRef.current != null) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const q = query.trim()
    if (!client || entity == null || disabled || q.length < 2) {
      searchRef.current = null
      queueMicrotask(() => {
        setResults([])
        setLoading(false)
        setError(null)
        setHasMore(false)
      })
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
          const list = await fetchPage(client, q, 0)
          if (runGen !== fetchGenRef.current) {
            return
          }
          searchRef.current = { q }
          setResults(list)
          setHasMore(list.length >= IN_CHAT_SEARCH_PAGE)
          setError(null)
        } catch {
          if (runGen !== fetchGenRef.current) {
            return
          }
          searchRef.current = null
          setResults([])
          setHasMore(false)
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
  }, [query, client, entity, disabled, fetchPage])

  return { query, setQuery, results, loading, error, hasMore, loadingMore, loadMore }
}
