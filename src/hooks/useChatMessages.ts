import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"
import {
  CHAT_PAGE_SIZE,
  mergeHeadWithTail,
  minMessageId,
  toMessageList,
  uniqueMessagesSort,
} from "../telegram/messageList"
import {
  getForumThreadMessages,
} from "../telegram/forum"
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
  listRef.current = list

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
          CHAT_PAGE_SIZE,
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
            CHAT_PAGE_SIZE,
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
    setList([])
    setHasMoreOlder(true)
    setLoadingOlder(false)
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
              CHAT_PAGE_SIZE,
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
