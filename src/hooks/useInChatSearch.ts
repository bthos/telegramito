import { Api } from "teleproto"
import type { TelegramClient } from "teleproto"
import { generateRandomBigInt } from "teleproto/Helpers"
import { useEffect, useRef, useState } from "react"
import { toMessageList } from "../telegram/messageList"
import { withTransientRetry } from "../telegram/invokeWithTransientRetry"

const DEBOUNCE_MS = 400
const SEARCH_LIMIT = 40

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
      offsetId: 0,
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
} {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Api.Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchGenRef = useRef(0)

  useEffect(() => {
    fetchGenRef.current += 1
  }, [entity, topicId])

  useEffect(() => {
    if (debounceTimerRef.current != null) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const q = query.trim()
    if (!client || entity == null || disabled) {
      queueMicrotask(() => {
        setResults([])
        setLoading(false)
        setError(null)
      })
      return
    }
    if (q.length < 2) {
      queueMicrotask(() => {
        setResults([])
        setLoading(false)
        setError(null)
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
          if (topicId != null) {
            const list = await withTransientRetry(client, () =>
              searchTopicMessages(client, entity, q, topicId, SEARCH_LIMIT),
            )
            if (runGen !== fetchGenRef.current) {
              return
            }
            setResults(list)
          } else {
            const raw = await withTransientRetry(client, () =>
              client.getMessages(entity as never, { search: q, limit: SEARCH_LIMIT }),
            )
            if (runGen !== fetchGenRef.current) {
              return
            }
            setResults(toMessageList(raw))
          }
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
  }, [query, client, entity, disabled, topicId])

  return { query, setQuery, results, loading, error }
}
