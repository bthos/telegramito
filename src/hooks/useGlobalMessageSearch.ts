import { Api } from "teleproto"
import type { TelegramClient } from "teleproto"
import { getPeerId } from "teleproto/Utils"
import { useCallback, useEffect, useRef, useState } from "react"
import { withTransientRetry } from "../telegram/invokeWithTransientRetry"
import { globalHitPeerKey, type GlobalSearchHit } from "../util/groupGlobalSearchHits"

const DEBOUNCE_MS = 400
const SEARCH_LIMIT = 40

export type UseGlobalMessageSearchArgs = {
  client: TelegramClient | null
  /** Masthead search string; hook trims and debounces. */
  query: string
  /** When true, no requests are made (e.g. night lock). */
  disabled?: boolean
}

function entityDisplayName(entity: Api.TypeUser | Api.TypeChat): string {
  if (entity.className === "User") {
    const parts = [entity.firstName, entity.lastName].filter(Boolean)
    const name = parts.join(" ").trim()
    if (name) return name
    if (entity.username) return entity.username
    return entity.id?.toString() ?? "?"
  }
  if (entity.className === "Chat" || entity.className === "Channel") {
    return entity.title?.trim() || entity.id?.toString() || "?"
  }
  return "?"
}

function buildEntityNameMap(
  users: readonly Api.TypeUser[],
  chats: readonly Api.TypeChat[],
): Map<string, string> {
  const map = new Map<string, string>()
  for (const entity of [...users, ...chats]) {
    if (entity.className === "UserEmpty" || entity.className === "ChatEmpty") {
      continue
    }
    try {
      map.set(getPeerId(entity, true), entityDisplayName(entity))
    } catch {
      /* ignore entities GramJS cannot id */
    }
  }
  return map
}

function hitsFromSearchGlobal(res: Api.messages.TypeMessages): GlobalSearchHit[] {
  if (res.className === "messages.MessagesNotModified" || !("messages" in res)) {
    return []
  }
  const nameByPeer = buildEntityNameMap(res.users ?? [], res.chats ?? [])
  const out: GlobalSearchHit[] = []
  for (const m of res.messages) {
    if (m.className !== "Message") {
      continue
    }
    let peerKey: string
    try {
      peerKey = globalHitPeerKey(m)
    } catch {
      continue
    }
    out.push({
      message: m,
      peerKey,
      peerDisplayName: nameByPeer.get(peerKey) ?? peerKey,
    })
  }
  return out
}

/**
 * Debounced global message history search via {@link Api.messages.SearchGlobal}.
 * Parallel channel to the masthead dialog-name filter — see feature tech-plan.md.
 */
export function useGlobalMessageSearch({
  client,
  query,
  disabled = false,
}: UseGlobalMessageSearchArgs): {
  results: GlobalSearchHit[]
  loading: boolean
  error: string | null
  retry: () => void
} {
  const [results, setResults] = useState<GlobalSearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchGenRef = useRef(0)

  const retry = useCallback(() => {
    setRetryToken((n) => n + 1)
  }, [])

  useEffect(() => {
    if (debounceTimerRef.current != null) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const q = query.trim()
    if (!client || disabled) {
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
          const res = await withTransientRetry(client, () =>
            client.invoke(
              new Api.messages.SearchGlobal({
                q,
                filter: new Api.InputMessagesFilterEmpty(),
                minDate: 0,
                maxDate: 0,
                offsetRate: 0,
                offsetPeer: new Api.InputPeerEmpty(),
                offsetId: 0,
                limit: SEARCH_LIMIT,
              }),
            ),
          )
          if (runGen !== fetchGenRef.current) {
            return
          }
          setResults(hitsFromSearchGlobal(res as Api.messages.TypeMessages))
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
  }, [query, client, disabled, retryToken])

  return { results, loading, error, retry }
}
