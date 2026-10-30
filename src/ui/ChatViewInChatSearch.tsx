import type { Api } from "teleproto"
import type { TelegramClient } from "teleproto"
import type { Dialog } from "teleproto/tl/custom/dialog"
import { useCallback, useEffect, useRef, useState } from "react"
import { useHardwareBackLayer } from "../hooks/useHardwareBack"
import { useInChatSearch } from "../hooks/useInChatSearch"
import { ChatSearchBar } from "./ChatSearchBar"

type Props = {
  client: TelegramClient | null
  entity: Dialog["entity"]
  forumDisabled: boolean
  /** Open forum topic id; scopes search to that topic (see {@link useInChatSearch}). */
  topicId?: number
  peerDisplayName: string
  /** Query to pre-fill once, e.g. from a Passages "see all in this chat" hand-off. */
  seedQuery?: string | null
  onClose: () => void
  onPickMessage: (msg: Api.Message) => void | Promise<void>
}

/**
 * Owns {@link useInChatSearch} so typing in the search box does not re-render the entire {@link ChatView} tree.
 */
export function ChatViewInChatSearch({
  client,
  entity,
  forumDisabled,
  topicId,
  peerDisplayName,
  seedQuery = null,
  onClose,
  onPickMessage,
}: Props) {
  useHardwareBackLayer(true, onClose)
  const {
    query,
    setQuery,
    results,
    loading,
    hasMore,
    loadingMore,
    loadMore,
  } = useInChatSearch({
    client,
    entity,
    disabled: forumDisabled,
    topicId,
  })

  const [resultIndex, setResultIndex] = useState(0)

  const appliedSeedRef = useRef<string | null>(null)
  useEffect(() => {
    if (seedQuery == null || seedQuery === appliedSeedRef.current) {
      return
    }
    appliedSeedRef.current = seedQuery
    setQuery(seedQuery)
  }, [seedQuery, setQuery])

  // «Next» on the last loaded hit asks for the next page and steps onto its first hit.
  const advanceFromRef = useRef<number | null>(null)

  useEffect(() => {
    queueMicrotask(() => {
      const from = advanceFromRef.current
      if (from != null && results.length > from) {
        advanceFromRef.current = null
        setResultIndex(from)
        return
      }
      setResultIndex((i) => {
        const n = results.length
        if (n === 0) {
          return 0
        }
        return Math.min(i, n - 1)
      })
    })
  }, [results.length])

  // A failed page load must not leave a marker that a later, unrelated result change would obey.
  useEffect(() => {
    if (!loadingMore) {
      // Queued after the results effect's microtask, so a successful page advances first.
      queueMicrotask(() => {
        advanceFromRef.current = null
      })
    }
  }, [loadingMore])

  const navigate = useCallback(
    (dir: "up" | "down") => {
      const n = results.length
      if (n === 0) {
        return
      }
      if (dir === "down" && resultIndex === n - 1 && hasMore) {
        advanceFromRef.current = n
        loadMore()
        return
      }
      setResultIndex(dir === "down" ? Math.min(n - 1, resultIndex + 1) : Math.max(0, resultIndex - 1))
    },
    [results.length, resultIndex, hasMore, loadMore],
  )

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  return (
    <ChatSearchBar
      query={query}
      onQueryChange={setQuery}
      onClose={handleClose}
      results={results}
      currentIndex={resultIndex}
      loading={loading}
      onNavigate={navigate}
      onSelect={(msg) => {
        void onPickMessage(msg)
      }}
      peerDisplayName={peerDisplayName}
      forumDisabled={forumDisabled}
      hasMore={hasMore}
      loadingMore={loadingMore}
      onLoadMore={loadMore}
    />
  )
}
