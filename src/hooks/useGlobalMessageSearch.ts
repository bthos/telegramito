import { Api } from "teleproto"
import type { TelegramClient } from "teleproto"
import { getPeerId } from "teleproto/Utils"
import { useCallback, useEffect, useRef, useState } from "react"
import { withTransientRetry } from "../telegram/invokeWithTransientRetry"
import { globalHitPeerKey, type GlobalSearchHit } from "../util/groupGlobalSearchHits"

const DEBOUNCE_MS = 400
/** Max hits requested; a result list this long may be truncated (UI shows «40+»). */
export const GLOBAL_SEARCH_LIMIT = 40

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

type SearchPage = {
  q: string
  offsetRate: number
  /** Last raw message of the previous page: its peer + id are the next page's offset. */
  last: Api.Message | Api.MessageService
}

function nextPageFrom(q: string, res: Api.messages.TypeMessages): SearchPage | null {
  if (res.className === "messages.MessagesNotModified" || !("messages" in res)) {
    return null
  }
  const last = res.messages[res.messages.length - 1]
  // A short page is the end of the history; only a full page can have a successor.
  // Service messages carry id + peerId too, so any trailing message works as the offset.
  if (res.messages.length < GLOBAL_SEARCH_LIMIT || last == null || last.className === "MessageEmpty") {
    return null
  }
  const offsetRate = "nextRate" in res && typeof res.nextRate === "number" ? res.nextRate : 0
  return { q, offsetRate, last }
}

function searchGlobalRequest(page: Pick<SearchPage, "q" | "offsetRate"> & { offsetPeer: Api.TypeInputPeer; offsetId: number }) {
  return new Api.messages.SearchGlobal({
    q: page.q,
    filter: new Api.InputMessagesFilterEmpty(),
    minDate: 0,
    maxDate: 0,
    offsetRate: page.offsetRate,
    offsetPeer: page.offsetPeer,
    offsetId: page.offsetId,
    limit: GLOBAL_SEARCH_LIMIT,
  })
}

/**
 * Debounced global message history search via {@link Api.messages.SearchGlobal}.
 * Parallel channel to the masthead dialog-name filter — see feature tech-plan.md.
 * Pages with `offset_rate` / `offset_peer` / `offset_id` of the previous page's last hit
 * (what Telegram Web K does) via {@link loadMore}.
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
  /** A full page came back, so older hits may exist. */
  hasMore: boolean
  loadingMore: boolean
  loadMore: () => void
} {
  const [results, setResults] = useState<GlobalSearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchGenRef = useRef(0)
  const pageRef = useRef<SearchPage | null>(null)
  const loadingMoreRef = useRef(false)

  const retry = useCallback(() => {
    setRetryToken((n) => n + 1)
  }, [])

  const loadMore = useCallback(() => {
    const page = pageRef.current
    if (!client || page == null || loadingMoreRef.current) {
      return
    }
    const gen = fetchGenRef.current
    loadingMoreRef.current = true
    setLoadingMore(true)
    void (async () => {
      try {
        const offsetPeer = await client.getInputEntity(page.last.peerId as never)
        const res = (await withTransientRetry(client, () =>
          client.invoke(searchGlobalRequest({ ...page, offsetPeer, offsetId: page.last.id })),
        )) as Api.messages.TypeMessages
        if (gen !== fetchGenRef.current) {
          return
        }
        const more = hitsFromSearchGlobal(res)
        setResults((prev) => {
          const seen = new Set(prev.map((h) => `${h.peerKey}_${h.message.id}`))
          return [...prev, ...more.filter((h) => !seen.has(`${h.peerKey}_${h.message.id}`))]
        })
        const next = nextPageFrom(page.q, res)
        pageRef.current = next
        setHasMore(next != null)
      } catch {
        // Keep the current page and the button: the user can simply try again.
      } finally {
        loadingMoreRef.current = false
        setLoadingMore(false)
      }
    })()
  }, [client])

  useEffect(() => {
    if (debounceTimerRef.current != null) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const q = query.trim()
    if (!client || disabled || q.length < 2) {
      pageRef.current = null
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
          const res = (await withTransientRetry(client, () =>
            client.invoke(
              searchGlobalRequest({
                q,
                offsetRate: 0,
                offsetPeer: new Api.InputPeerEmpty(),
                offsetId: 0,
              }),
            ),
          )) as Api.messages.TypeMessages
          if (runGen !== fetchGenRef.current) {
            return
          }
          const next = nextPageFrom(q, res)
          pageRef.current = next
          setHasMore(next != null)
          setResults(hitsFromSearchGlobal(res))
          setError(null)
        } catch {
          if (runGen !== fetchGenRef.current) {
            return
          }
          pageRef.current = null
          setHasMore(false)
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

  return { results, loading, error, retry, hasMore, loadingMore, loadMore }
}
