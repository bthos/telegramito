import { Api } from "telegram"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react"
import { flushSync } from "react-dom"
import type { Dialog } from "telegram/tl/custom/dialog"
import type { TelegramClient } from "telegram"
import { toMessageList } from "../telegram/messageList"
import { resolveForumTopicIdFromMessage } from "../telegram/forum"
import { withTransientRetry } from "../telegram/invokeWithTransientRetry"
import { appLog } from "../util/appLogger"
import type { ChatDatedItem } from "../ui/chatDatedItem"

type ForumTopic = Api.TypeForumTopic

type JumpNavOpts = {
  scrollRef: RefObject<HTMLDivElement | null>
  datedList: readonly ChatDatedItem[]
  expandToRowIndex: (idx: number) => void
  client: TelegramClient | null
  dialog: Dialog
  convKey: string
  isForum: boolean
  topicsLoading: boolean
  topics: ForumTopic[]
  topicId: number | null
  setTopicId: (id: number) => void
  refreshMessagesById: (ids: readonly number[]) => Promise<void>
  setMessagesUnreadOnly: (value: boolean | ((prev: boolean) => boolean)) => void
  setPanelOpen: (next: boolean | ((prev: boolean) => boolean)) => void
  lettersJumpToMessageId?: number | null
  onLettersJumpToMessageConsumed?: () => void
  /** True once the target conversation's initial history page has settled — `refreshMessagesById` no-ops before this. */
  initialLoadDone: boolean
}

export function useChatJumpNavigation(opts: JumpNavOpts) {
  const {
    scrollRef,
    datedList,
    expandToRowIndex,
    client,
    dialog,
    convKey,
    isForum,
    topicsLoading,
    topics,
    topicId,
    setTopicId,
    refreshMessagesById,
    setMessagesUnreadOnly,
    setPanelOpen,
    lettersJumpToMessageId = null,
    onLettersJumpToMessageConsumed,
    initialLoadDone,
  } = opts

  const [searchMode, setSearchMode] = useState(false)
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null)
  const [scrollLayoutBump, setScrollLayoutBump] = useState(0)
  const messageScrollTopBeforeSearchRef = useRef(0)
  const highlightTimerRef = useRef<number | null>(null)
  const pendingScrollToMessageIdRef = useRef<number | null>(null)
  /** Gives up a pending jump if the target message never lands in `datedList`
   * (e.g. the fetch failed) instead of leaving it dangling forever. */
  const pendingScrollGiveUpTimerRef = useRef<number | null>(null)
  const lettersJumpRunSeq = useRef(0)

  const clearPendingScrollGiveUpTimer = useCallback(() => {
    if (pendingScrollGiveUpTimerRef.current != null) {
      clearTimeout(pendingScrollGiveUpTimerRef.current)
      pendingScrollGiveUpTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current != null) {
        clearTimeout(highlightTimerRef.current)
      }
      clearPendingScrollGiveUpTimer()
    }
  }, [clearPendingScrollGiveUpTimer])

  useEffect(() => {
    pendingScrollToMessageIdRef.current = null
    clearPendingScrollGiveUpTimer()
    queueMicrotask(() => {
      setSearchMode(false)
    })
  }, [convKey, clearPendingScrollGiveUpTimer])

  const openSearchMode = useCallback(() => {
    const el = scrollRef.current
    if (el) {
      messageScrollTopBeforeSearchRef.current = el.scrollTop
    }
    setSearchMode(true)
    setPanelOpen(false)
  }, [scrollRef, setPanelOpen])

  const closeSearchMode = useCallback(() => {
    setSearchMode(false)
    window.setTimeout(() => {
      const el = scrollRef.current
      if (el) {
        el.scrollTop = messageScrollTopBeforeSearchRef.current
      }
    }, 0)
  }, [scrollRef])

  const jumpToMessageById = useCallback(
    async (id: number) => {
      if (typeof id !== "number" || id <= 0) {
        return
      }
      setMessagesUnreadOnly(false)
      closeSearchMode()
      setPanelOpen(false)
      if (highlightTimerRef.current != null) {
        clearTimeout(highlightTimerRef.current)
      }
      setHighlightedMessageId(id)
      highlightTimerRef.current = window.setTimeout(() => {
        setHighlightedMessageId(null)
        highlightTimerRef.current = null
      }, 1500)
      await refreshMessagesById([id])
      pendingScrollToMessageIdRef.current = id
      setScrollLayoutBump((b) => b + 1)
      clearPendingScrollGiveUpTimer()
      pendingScrollGiveUpTimerRef.current = window.setTimeout(() => {
        pendingScrollGiveUpTimerRef.current = null
        if (pendingScrollToMessageIdRef.current === id) {
          // The fetch above already ran; the target still never showed up in
          // the rendered transcript (e.g. it's outside any window we can
          // reach, or the fetch failed). Stop waiting on a `datedList` change
          // that may never come instead of leaving this dangling forever.
          pendingScrollToMessageIdRef.current = null
          appLog.warn("jumpToMessageById: target message never resolved", { id })
        }
      }, 4000)
    },
    [
      clearPendingScrollGiveUpTimer,
      closeSearchMode,
      refreshMessagesById,
      setMessagesUnreadOnly,
      setPanelOpen,
    ],
  )

  const jumpToMessageFromSearch = useCallback(
    async (m: Api.Message) => {
      const id = m.id
      if (typeof id !== "number") {
        return
      }
      try {
        await jumpToMessageById(id)
      } catch {
        appLog.warn("jumpToMessageFromSearch failed", { id })
      }
    },
    [jumpToMessageById],
  )

  const goToQuotedMessage = useCallback(
    async (quotedId: number) => {
      if (typeof quotedId !== "number" || quotedId <= 0) {
        return
      }
      try {
        await jumpToMessageById(quotedId)
      } catch {
        appLog.warn("goToQuotedMessage failed", { id: quotedId })
      }
    },
    [jumpToMessageById],
  )

  useEffect(() => {
    const id = lettersJumpToMessageId
    if (id == null || id <= 0) {
      return
    }
    const seq = ++lettersJumpRunSeq.current
    let cancelled = false
    void (async () => {
      try {
        if (!client || !dialog.entity) {
          if (!cancelled && seq === lettersJumpRunSeq.current) {
            onLettersJumpToMessageConsumed?.()
          }
          return
        }
        if (!initialLoadDone) {
          // Initial history page for this convKey hasn't settled yet — `refreshMessagesById`
          // silently no-ops until it does. Wait for `initialLoadDone` to flip and retry
          // (it's a dep below) instead of losing the jump.
          return
        }
        if (isForum && topicsLoading) {
          return
        }
        if (isForum) {
          const fetched = await withTransientRetry(client, () =>
            client.getMessages(dialog.entity as never, { ids: [id] }),
          )
          if (cancelled || seq !== lettersJumpRunSeq.current) {
            return
          }
          const full = toMessageList(fetched)[0]
          const forumTopics = topics.filter((x): x is Api.ForumTopic => x.className === "ForumTopic")
          if (full?.className === "Message" && forumTopics.length > 0) {
            const tNext = resolveForumTopicIdFromMessage(full as Api.Message, forumTopics)
            if (tNext != null && tNext !== topicId) {
              setTopicId(tNext)
              return
            }
          }
        }
        await jumpToMessageById(id)
      } catch {
        appLog.warn("lettersJumpToMessage failed", { id })
      }
      if (cancelled || seq !== lettersJumpRunSeq.current) {
        return
      }
      onLettersJumpToMessageConsumed?.()
    })()
    return () => {
      cancelled = true
    }
  }, [
    lettersJumpToMessageId,
    convKey,
    jumpToMessageById,
    onLettersJumpToMessageConsumed,
    isForum,
    topicsLoading,
    topics,
    topicId,
    setTopicId,
    client,
    dialog.entity,
    initialLoadDone,
  ])

  useLayoutEffect(() => {
    const id = pendingScrollToMessageIdRef.current
    if (id == null) {
      return
    }
    const idx = datedList.findIndex(
      (row) => row.kind === "msg" && row.message.id === id,
    )
    if (idx < 0) {
      return
    }
    flushSync(() => {
      expandToRowIndex(idx)
    })
    pendingScrollToMessageIdRef.current = null
    clearPendingScrollGiveUpTimer()
    const root = scrollRef.current
    const node = root?.querySelector(
      `[data-chat-message-id="${CSS.escape(String(id))}"]`,
    ) as HTMLElement | null
    node?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [clearPendingScrollGiveUpTimer, datedList, expandToRowIndex, scrollLayoutBump, scrollRef])

  return {
    searchMode,
    highlightedMessageId,
    openSearchMode,
    closeSearchMode,
    jumpToMessageById,
    jumpToMessageFromSearch,
    goToQuotedMessage,
  }
}
