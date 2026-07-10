import type { Api } from "telegram"
import type { TelegramClient } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"
import { useCallback, useEffect, useState } from "react"
import { useHardwareBackLayer } from "../hooks/useHardwareBack"
import { useInChatSearch } from "../hooks/useInChatSearch"
import { ChatSearchBar } from "./ChatSearchBar"

type Props = {
  client: TelegramClient | null
  entity: Dialog["entity"]
  forumDisabled: boolean
  peerDisplayName: string
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
  peerDisplayName,
  onClose,
  onPickMessage,
}: Props) {
  useHardwareBackLayer(true, onClose)
  const {
    query,
    setQuery,
    results,
    loading,
  } = useInChatSearch({
    client,
    entity,
    disabled: forumDisabled,
  })

  const [resultIndex, setResultIndex] = useState(0)

  useEffect(() => {
    queueMicrotask(() => {
      setResultIndex((i) => {
        const n = results.length
        if (n === 0) {
          return 0
        }
        return Math.min(i, n - 1)
      })
    })
  }, [results.length])

  const navigate = useCallback((dir: "up" | "down") => {
    setResultIndex((i) => {
      const n = results.length
      if (n === 0) {
        return 0
      }
      if (dir === "down") {
        return Math.min(n - 1, i + 1)
      }
      return Math.max(0, i - 1)
    })
  }, [results.length])

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
    />
  )
}
