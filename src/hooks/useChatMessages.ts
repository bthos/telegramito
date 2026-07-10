import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"
import {
  CHAT_PAGE_SIZE,
  FORUM_THREAD_PAGE_SIZE,
  mergeHeadWithTail,
  minMessageId,
  toMessageList,
  uniqueMessagesSort,
  compareMessagesChronological,
} from "../telegram/messageList"
import {
  getForumThreadMessages,
  getForumReplyToTopId,
} from "../telegram/forum"
import {
  BULK_GET_MESSAGES_BY_IDS_CHUNK,
  MESSAGE_HISTORY_RECONCILE_POLICY,
  SEQUENTIAL_ID_GAP_MAX_SPAN,
  chunkIdsForGetMessages,
  findSequentialIdGapsInSortedMessages,
  historyReconcileAttemptKey,
  mediaPlaceholderRefetchIds,
  messageAllowedForGapFetch,
  messageInActiveThread,
} from "../telegram/messageHistoryReconcile"
import { rememberEveningThreadMessages } from "../util/eveningThreadCache"
import { withTransientRetry } from "../telegram/invokeWithTransientRetry"

/** Max extra history pages when unread-only filter matches nothing (after refreshing head). */
const UNREAD_SEEK_MAX_OLDER_PAGES = 40

export function useChatMessages(opts: {
  client: TelegramClient | null
  dialog: Dialog
  convKey: string
  isForum: boolean
  topicId: number | null
  blocked: boolean
  appMode: string
  messagesUnreadOnly: boolean
  listForViewLengthRef: RefObject<number>
  lastMessageTick: number
}): {
  list: Api.Message[]
  hasMoreOlder: boolean
  loadingOlder: boolean
  refreshHead: () => Promise<void>
  refreshMessagesById: (ids: readonly number[]) => Promise<void>
  loadOlder: () => Promise<void>
  patchMessageReactions: (messageId: number, next: Api.MessageReactions) => void
} {
  const {
    client,
    dialog,
    convKey,
    isForum,
    topicId,
    blocked,
    appMode,
    messagesUnreadOnly,
    listForViewLengthRef,
    lastMessageTick,
  } = opts

  const [list, setList] = useState<Api.Message[]>([])
  const [hasMoreOlder, setHasMoreOlder] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)

  const loadGenRef = useRef(0)
  const loadedConvKeyRef = useRef<string | null>(null)
  const lastTickSyncedRef = useRef<number | null>(null)
  const listRef = useRef(list)
  const historyReconcileAttemptedRef = useRef<Set<string>>(new Set())
  const mediaPlaceholderRefetchAttemptsRef = useRef<Map<number, number>>(new Map())
  const mediaPlaceholderRefetchInFlightRef = useRef(false)

  useEffect(() => {
    listRef.current = list
  }, [list])

  useEffect(() => {
    const peerKey = convKey.split("|")[0] ?? ""
    if (peerKey && list.length > 0) {
      rememberEveningThreadMessages(peerKey, list)
    }
  }, [convKey, list])

  const lastMessageTickRef = useRef(lastMessageTick)
  useEffect(() => {
    lastMessageTickRef.current = lastMessageTick
  }, [lastMessageTick])

  const fetchHeadPage = useCallback(async (): Promise<Api.Message[]> => {
    if (!client || !dialog.entity) {
      return []
    }
    const entity = dialog.entity
    if (isForum) {
      if (topicId == null) {
        return []
      }
      return withTransientRetry(client, () =>
        getForumThreadMessages(
          client,
          entity,
          topicId,
          FORUM_THREAD_PAGE_SIZE,
          0
        )
      )
    }
    return withTransientRetry(client, async () => {
      const r = await client.getMessages(entity, { limit: CHAT_PAGE_SIZE })
      return toMessageList(r)
    })
  }, [client, dialog.entity, isForum, topicId])

  const refreshHead = useCallback(async () => {
    if (!client || !dialog.entity) {
      return
    }
    if (blocked && appMode === "child") {
      return
    }
    if (isForum && topicId == null) {
      return
    }
    if (loadedConvKeyRef.current !== convKey) {
      return
    }
    try {
      const head = await fetchHeadPage()
      setList((prev) => mergeHeadWithTail(prev, head))
    } catch {
      /* keep existing list */
    }
  }, [
    client,
    dialog.entity,
    isForum,
    topicId,
    blocked,
    appMode,
    convKey,
    fetchHeadPage,
  ])

  const patchMessageReactions = useCallback((messageId: number, next: Api.MessageReactions) => {
    setList((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) {
          return m
        }
        const copy = Object.assign(Object.create(Object.getPrototypeOf(m)), m) as Api.Message
        copy.reactions = next
        return copy
      }),
    )
  }, [])

  const refreshMessagesById = useCallback(
    async (ids: readonly number[]) => {
      if (!client || !dialog.entity) {
        return
      }
      if (blocked && appMode === "child") {
        return
      }
      if (loadedConvKeyRef.current !== convKey) {
        return
      }
      const uniq = [...new Set(ids.filter((id): id is number => typeof id === "number"))]
      if (uniq.length === 0) {
        return
      }
      try {
        const fetched = await withTransientRetry(client, () =>
          client.getMessages(dialog.entity as never, { ids: uniq })
        )
        const msgs = toMessageList(fetched)
        if (msgs.length === 0) {
          return
        }
        setList((prev) => {
          const byId = new Map<number, Api.Message>()
          for (const m of prev) {
            if (m.id != null) {
              byId.set(m.id, m)
            }
          }
          for (const u of msgs) {
            if (u.id != null) {
              byId.set(u.id, u)
            }
          }
          return uniqueMessagesSort([...byId.values()])
        })
      } catch {
        void refreshHead()
      }
    },
    [blocked, client, convKey, dialog.entity, refreshHead, appMode],
  )

  const loadOlder = useCallback(async () => {
    if (!client || !dialog.entity || loadingOlder || !hasMoreOlder) {
      return
    }
    if (isForum && topicId == null) {
      return
    }
    const cur = listRef.current
    if (cur.length === 0) {
      return
    }
    const minId = minMessageId(cur)
    if (minId == null) {
      return
    }
    const entity = dialog.entity
    setLoadingOlder(true)
    try {
      const older: Api.Message[] = await withTransientRetry(client, async () => {
        if (isForum) {
          return getForumThreadMessages(
            client,
            entity,
            topicId!,
            FORUM_THREAD_PAGE_SIZE,
            minId
          )
        }
        const r = await client.getMessages(entity, {
          limit: CHAT_PAGE_SIZE,
          offsetId: minId,
        })
        return toMessageList(r)
      })
      if (older.length === 0) {
        setHasMoreOlder(false)
      }
      setList((prev) => uniqueMessagesSort([...older, ...prev]))
    } catch {
      /* scroll fix cleared by caller */
    } finally {
      setLoadingOlder(false)
    }
  }, [
    client,
    dialog.entity,
    hasMoreOlder,
    isForum,
    loadingOlder,
    topicId,
  ])

  const unreadSeekHeadIssuedRef = useRef(false)
  const unreadSeekOlderLoadsRef = useRef(0)

  useEffect(() => {
    unreadSeekHeadIssuedRef.current = false
    unreadSeekOlderLoadsRef.current = 0
  }, [convKey])

  // Initial load effect keyed on convKey
  useEffect(() => {
    if (blocked && appMode === "child") {
      return
    }
    if (!client || !dialog.entity) {
      return
    }
    if (isForum && topicId == null) {
      return
    }
    loadGenRef.current += 1
    const gen = loadGenRef.current
    loadedConvKeyRef.current = null
    lastTickSyncedRef.current = null
    historyReconcileAttemptedRef.current.clear()
    mediaPlaceholderRefetchAttemptsRef.current.clear()
    queueMicrotask(() => {
      setList([])
      setHasMoreOlder(true)
      setLoadingOlder(false)
    })
    void (async () => {
      try {
        if (!client || !dialog.entity) {
          return
        }
        const entity = dialog.entity
        const head: Api.Message[] = await withTransientRetry(client, async () => {
          if (isForum && topicId != null) {
            return getForumThreadMessages(
              client,
              entity,
              topicId,
              FORUM_THREAD_PAGE_SIZE,
              0
            )
          }
          const r = await client.getMessages(entity, { limit: CHAT_PAGE_SIZE })
          return toMessageList(r)
        })
        if (loadGenRef.current !== gen) {
          return
        }
        setList(mergeHeadWithTail([], head))
        setHasMoreOlder(head.length > 0)
        loadedConvKeyRef.current = convKey
        lastTickSyncedRef.current = lastMessageTickRef.current
      } catch {
        if (loadGenRef.current !== gen) {
          return
        }
        setList([])
        setHasMoreOlder(true)
        loadedConvKeyRef.current = convKey
        lastTickSyncedRef.current = lastMessageTickRef.current
      }
    })()
  }, [client, convKey, dialog.entity, isForum, topicId, blocked, appMode])

  // Tick-sync refresh effect
  useEffect(() => {
    if (blocked && appMode === "child") {
      return
    }
    if (!client || !dialog.entity) {
      return
    }
    if (isForum && topicId == null) {
      return
    }
    if (loadedConvKeyRef.current !== convKey) {
      return
    }
    if (lastTickSyncedRef.current === lastMessageTick) {
      return
    }
    lastTickSyncedRef.current = lastMessageTick
    void refreshHead()
  }, [
    lastMessageTick,
    convKey,
    client,
    dialog.entity,
    isForum,
    topicId,
    blocked,
    appMode,
    refreshHead,
  ])

  // Unread-seek effect
  useEffect(() => {
    if (!messagesUnreadOnly) {
      unreadSeekHeadIssuedRef.current = false
      unreadSeekOlderLoadsRef.current = 0
      return
    }
    if (blocked && appMode === "child") {
      return
    }
    if (!client || !dialog.entity) {
      return
    }
    if (isForum && topicId == null) {
      return
    }
    if (list.length === 0 || listForViewLengthRef.current > 0) {
      return
    }

    if (!unreadSeekHeadIssuedRef.current) {
      unreadSeekHeadIssuedRef.current = true
      void refreshHead()
      return
    }

    if (!hasMoreOlder || loadingOlder) {
      return
    }
    if (unreadSeekOlderLoadsRef.current >= UNREAD_SEEK_MAX_OLDER_PAGES) {
      return
    }

    unreadSeekOlderLoadsRef.current += 1
    void loadOlder()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listForViewLengthRef.current omitted intentionally (stable ref)
  }, [
    messagesUnreadOnly,
    blocked,
    appMode,
    client,
    dialog.entity,
    isForum,
    topicId,
    list.length,
    hasMoreOlder,
    loadingOlder,
    refreshHead,
    loadOlder,
  ])

  /**
   * Search-based thread history (`messages.search` + `topMsgId`) can omit message ids.
   * Reconcile small sequential holes with chunked `getMessages({ ids })` (same pattern would
   * apply to any sparse search-driven list; forum threads are the only such source today).
   */
  useEffect(() => {
    if (!client || dialog.entity == null) {
      return
    }
    if (!isForum || topicId == null) {
      return
    }
    if (blocked && appMode === "child") {
      return
    }
    if (loadedConvKeyRef.current !== convKey) {
      return
    }
    if (list.length < 2) {
      return
    }
    const sorted = [...list].filter((m) => m.id != null).sort(compareMessagesChronological)
    const candidateGaps = findSequentialIdGapsInSortedMessages(
      sorted,
      SEQUENTIAL_ID_GAP_MAX_SPAN,
      getForumReplyToTopId,
    )
    const gaps = candidateGaps.filter(
      (g) =>
        !historyReconcileAttemptedRef.current.has(
          historyReconcileAttemptKey(MESSAGE_HISTORY_RECONCILE_POLICY, g.lo, g.hi),
        ),
    )
    if (gaps.length === 0) {
      return
    }
    const allIds = [...new Set(gaps.flatMap((g) => g.ids))]
    for (const g of gaps) {
      historyReconcileAttemptedRef.current.add(
        historyReconcileAttemptKey(MESSAGE_HISTORY_RECONCILE_POLICY, g.lo, g.hi),
      )
    }
    void (async () => {
      try {
        const mergedById = new Map<number, Api.Message>()
        for (const slice of chunkIdsForGetMessages(allIds, BULK_GET_MESSAGES_BY_IDS_CHUNK)) {
          const fetched = await withTransientRetry(client, () =>
            client.getMessages(dialog.entity as never, { ids: slice }),
          )
          const msgs = toMessageList(fetched)
          for (const m of msgs) {
            if (!messageAllowedForGapFetch(m, gaps, topicId)) {
              continue
            }
            if (m.id != null) {
              mergedById.set(Number(m.id), m)
            }
          }
        }
        const allowed = [...mergedById.values()]
        if (allowed.length === 0) {
          return
        }
        if (loadedConvKeyRef.current !== convKey) {
          return
        }
        setList((prev) => uniqueMessagesSort([...allowed, ...prev]))
      } catch {
        for (const g of gaps) {
          historyReconcileAttemptedRef.current.delete(
            historyReconcileAttemptKey(MESSAGE_HISTORY_RECONCILE_POLICY, g.lo, g.hi),
          )
        }
      }
    })()
  }, [list, isForum, topicId, client, dialog.entity, convKey, blocked, appMode])

  /**
   * Batch `getMessages` by id sometimes yields {@link Api.MessageMediaUnsupported} placeholders;
   * single-id refetch often returns full media (MTProto quirk). Forum `messages.search` hits it
   * most; the same recovery helps regular chats after chunked id fetches.
   */
  useEffect(() => {
    if (!client || dialog.entity == null) {
      return
    }
    if (isForum && topicId == null) {
      return
    }
    if (blocked && appMode === "child") {
      return
    }
    if (loadedConvKeyRef.current !== convKey) {
      return
    }
    if (mediaPlaceholderRefetchInFlightRef.current) {
      return
    }

    const unsupportedIdsInListOrder = list
      .filter(
        (m) =>
          m.className === "Message"
          && m.id != null
          && m.media?.className === "MessageMediaUnsupported",
      )
      .map((m) => Number(m.id))
    const targets = mediaPlaceholderRefetchIds(
      unsupportedIdsInListOrder,
      mediaPlaceholderRefetchAttemptsRef.current,
    )

    if (targets.length === 0) {
      return
    }

    mediaPlaceholderRefetchInFlightRef.current = true
    void (async () => {
      try {
        const results = await Promise.all(
          targets.map(async (id) => {
            mediaPlaceholderRefetchAttemptsRef.current.set(
              id,
              (mediaPlaceholderRefetchAttemptsRef.current.get(id) ?? 0) + 1,
            )
            try {
              const fetched = await withTransientRetry(client, () =>
                client.getMessages(dialog.entity as never, { ids: [id] }),
              )
              const msgs = toMessageList(fetched)
              const u = msgs.find((x) => Number(x.id) === id)
              if (!u || (isForum && topicId != null && !messageInActiveThread(u, topicId))) return null
              if (u.media?.className === "MessageMediaUnsupported") return null
              return [id, u] as [number, Api.Message]
            } catch {
              return null
            }
          }),
        )
        const collected = new Map<number, Api.Message>(
          results.filter((r): r is [number, Api.Message] => r !== null),
        )
        if (collected.size === 0) {
          return
        }
        if (loadedConvKeyRef.current !== convKey) {
          return
        }
        setList((prev) => {
          const byId = new Map<number, Api.Message>()
          for (const p of prev) {
            if (p.id != null) {
              byId.set(Number(p.id), p)
            }
          }
          for (const [id, u] of collected) {
            byId.set(id, u)
          }
          return uniqueMessagesSort([...byId.values()])
        })
      } finally {
        mediaPlaceholderRefetchInFlightRef.current = false
      }
    })()
  }, [list, isForum, topicId, client, dialog.entity, convKey, blocked, appMode])

  return {
    list,
    hasMoreOlder,
    loadingOlder,
    refreshHead,
    refreshMessagesById,
    loadOlder,
    patchMessageReactions,
  }
}
