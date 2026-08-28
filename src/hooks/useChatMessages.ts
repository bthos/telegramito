import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { Api } from "teleproto"
import type { TelegramClient } from "teleproto"
import type { Dialog } from "teleproto/tl/custom/dialog"
import {
  CHAT_PAGE_SIZE,
  FORUM_THREAD_PAGE_SIZE,
  maxMessageId,
  mergeHeadWithTail,
  minMessageId,
  toMessageList,
  uniqueMessagesSort,
} from "../telegram/messageList"
import { getForumThreadMessages, getForumThreadMessagesPage } from "../telegram/forum"
import { rememberEveningThreadMessages } from "../util/eveningThreadCache"
import { withTransientRetry } from "../telegram/invokeWithTransientRetry"
import { useChatHistoryRecovery } from "./useChatHistoryRecovery"

/** Max extra history pages when unread-only filter matches nothing (after refreshing head). */
const UNREAD_SEEK_MAX_OLDER_PAGES = 40

/**
 * Jump-to-message context window: `offsetId: target, addOffset: -⌊n/2⌋` fetches
 * ~half a page of *newer* history plus the target plus ~half a page of *older*
 * history in one RPC — the target lands with real neighbours instead of alone.
 */
const AROUND_PAGE_SIZE = 50

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
  /**
   * When the chat is being opened *because of* a jump to a specific message
   * (day mail, Passages, co-reading), the initial page loads a window around
   * that message instead of the tail — the first paint already shows the jump
   * target, so there is no tail flash followed by a second teleport. Read once
   * per initial load; the parent mirrors its live jump-request prop here.
   */
  pendingOpenJumpIdRef?: RefObject<number | null>
}): {
  list: Api.Message[]
  hasMoreOlder: boolean
  loadingOlder: boolean
  /** True while the transcript tail is NOT the live tail (jumped into history). */
  hasMoreNewer: boolean
  loadingNewer: boolean
  refreshHead: () => Promise<void>
  refreshMessagesById: (ids: readonly number[]) => Promise<void>
  loadOlder: () => Promise<void>
  loadNewer: () => Promise<void>
  /**
   * Replace the transcript with a context window around `id` (jump-to-message).
   * Falls back to inserting the lone message when the window fetch misses the
   * target. Returns false when the message cannot be materialized at all.
   */
  loadAroundMessageId: (id: number) => Promise<boolean>
  /** Windowed mode exit: reload the live tail page and drop the window. */
  returnToLiveTail: () => Promise<void>
  /**
   * Bumped every time the transcript is *replaced* (not merged) within one
   * `convKey` — scroll/slice bookkeeping must reset exactly like a chat switch.
   */
  transcriptEpoch: number
  /** Messages fetched by id for previews (reply quotes) — never transcript rows. */
  auxMessagesById: ReadonlyMap<number, Api.Message>
  patchMessageReactions: (messageId: number, next: Api.MessageReactions) => void
  /** True once the initial history page for the current `convKey` has settled (success or error). */
  initialLoadDone: boolean
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
    pendingOpenJumpIdRef,
  } = opts

  const [list, setList] = useState<Api.Message[]>([])
  const [hasMoreOlder, setHasMoreOlder] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMoreNewer, setHasMoreNewer] = useState(false)
  const [loadingNewer, setLoadingNewer] = useState(false)
  const [transcriptEpoch, setTranscriptEpoch] = useState(0)
  const [auxMessagesById, setAuxMessagesById] = useState<ReadonlyMap<number, Api.Message>>(
    () => new Map(),
  )
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  const loadGenRef = useRef(0)
  const loadedConvKeyRef = useRef<string | null>(null)
  const lastTickSyncedRef = useRef<number | null>(null)
  /** convKey whose open-jump target the initial load already consumed — a
   * re-fired initial load for the same conversation must load the plain tail,
   * not re-install the around-window (which would resurrect windowed mode). */
  const openJumpHandledConvKeyRef = useRef<string | null>(null)
  /** Entity identity churns on every dialog-list refresh; effects must key on
   * `convKey` (stable per conversation) and read the live entity through here,
   * otherwise a background dialogs refresh re-runs the initial load mid-session. */
  const entityRef = useRef(dialog.entity)
  entityRef.current = dialog.entity
  const listRef = useRef(list)
  /** Mirrors `transcriptEpoch` (and advances on conv switch) so in-flight loads from before a replace can discard themselves. */
  const transcriptEpochRef = useRef(0)
  const hasMoreNewerRef = useRef(false)
  hasMoreNewerRef.current = hasMoreNewer
  const historyReconcileAttemptedRef = useRef<Set<string>>(new Set())
  const mediaPlaceholderRefetchAttemptsRef = useRef<Map<number, number>>(new Map())

  useEffect(() => {
    listRef.current = list
  }, [list])

  useEffect(() => {
    if (hasMoreNewerRef.current) {
      // Windowed transcript is old history — not what the evening cache wants.
      return
    }
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
    if (hasMoreNewerRef.current) {
      // Windowed mode (jumped into history): merging the live tail page into a
      // transcript whose newest loaded message is far behind it would create a
      // silent hole. The tail is reconciled by `loadNewer` catching up or by
      // `returnToLiveTail`.
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
        if (loadedConvKeyRef.current !== convKey) {
          return
        }
        // In-place refresh only: an id already in the transcript gets its row
        // updated; anything else (reply-quote resolution) goes to the aux
        // cache. Inserting foreign ids as rows used to fabricate a fake
        // history head with silent holes and broke `loadOlder` anchoring.
        const transcriptIds = new Set(
          listRef.current.map((m) => m.id).filter((x): x is number => x != null),
        )
        const updates = msgs.filter((m) => m.id != null && transcriptIds.has(m.id))
        const aux = msgs.filter((m) => m.id != null && !transcriptIds.has(m.id))
        if (updates.length > 0) {
          const byId = new Map(updates.map((m) => [m.id as number, m]))
          setList((prev) =>
            prev.map((m) => (m.id != null && byId.has(m.id) ? byId.get(m.id)! : m)),
          )
        }
        if (aux.length > 0) {
          setAuxMessagesById((prev) => {
            const next = new Map(prev)
            for (const m of aux) {
              next.set(Number(m.id), m)
            }
            return next
          })
        }
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
    const epochAtStart = transcriptEpochRef.current
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
      if (transcriptEpochRef.current !== epochAtStart) {
        // Transcript was replaced (jump / return-to-tail / chat switch) while
        // this page was in flight — its anchor belongs to the old transcript.
        return
      }
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

  const fetchWindowAround = useCallback(
    async (id: number): Promise<Api.Message[]> => {
      if (!client || !dialog.entity) {
        return []
      }
      const entity = dialog.entity
      const backHalf = Math.floor(AROUND_PAGE_SIZE / 2)
      if (isForum) {
        if (topicId == null) {
          return []
        }
        return getForumThreadMessagesPage(client, entity, topicId, AROUND_PAGE_SIZE, {
          offsetId: id,
          addOffset: -backHalf,
        })
      }
      const r = await client.getMessages(entity, {
        limit: AROUND_PAGE_SIZE,
        offsetId: id,
        addOffset: -backHalf,
      })
      return toMessageList(r)
    },
    [client, dialog.entity, isForum, topicId],
  )

  /**
   * Whether an around-window already touches the live tail. Errs toward
   * `false` (→ `hasMoreNewer: true`): a spurious "more newer" self-corrects on
   * the first `loadNewer` (no progress → flag drops), while a spurious
   * "reached tail" would let `refreshHead` merge a disjoint tail page.
   */
  const windowReachesLiveTail = useCallback(
    (around: Api.Message[], targetId: number): boolean => {
      const newerCount = around.filter(
        (m) => typeof m.id === "number" && m.id > targetId,
      ).length
      if (newerCount === 0) {
        return true
      }
      const dialogTop = dialog.message?.id
      const maxFetched = maxMessageId(around)
      return (
        typeof dialogTop === "number" &&
        maxFetched != null &&
        maxFetched >= dialogTop
      )
    },
    [dialog.message?.id],
  )

  const loadNewer = useCallback(async () => {
    if (!client || !dialog.entity || loadingNewer || !hasMoreNewer) {
      return
    }
    if (isForum && topicId == null) {
      return
    }
    const cur = listRef.current
    if (cur.length === 0) {
      return
    }
    const maxId = maxMessageId(cur)
    if (maxId == null) {
      return
    }
    const entity = dialog.entity
    const pageSize = isForum ? FORUM_THREAD_PAGE_SIZE : CHAT_PAGE_SIZE
    const epochAtStart = transcriptEpochRef.current
    setLoadingNewer(true)
    try {
      const newer: Api.Message[] = await withTransientRetry(client, async () => {
        if (isForum) {
          return getForumThreadMessagesPage(client, entity, topicId!, pageSize, {
            offsetId: maxId,
            addOffset: -pageSize,
          })
        }
        const r = await client.getMessages(entity, {
          limit: pageSize,
          offsetId: maxId,
          addOffset: -pageSize,
        })
        return toMessageList(r)
      })
      if (transcriptEpochRef.current !== epochAtStart) {
        return
      }
      const progressed = newer.some((m) => typeof m.id === "number" && m.id > maxId)
      if (!progressed || newer.length < pageSize) {
        // Partial page (or no progress at all) ⇒ the live tail is reached.
        // The tick-sync effect un-gates on this flip and reconciles any
        // messages that arrived while the transcript was windowed.
        setHasMoreNewer(false)
      }
      if (progressed) {
        setList((prev) => uniqueMessagesSort([...prev, ...newer]))
      }
    } catch {
      /* retried on the next near-bottom scroll */
    } finally {
      setLoadingNewer(false)
    }
  }, [client, dialog.entity, hasMoreNewer, isForum, loadingNewer, topicId])

  const loadAroundMessageId = useCallback(
    async (id: number): Promise<boolean> => {
      if (!client || !dialog.entity || typeof id !== "number" || id <= 0) {
        return false
      }
      if (blocked && appMode === "child") {
        return false
      }
      if (isForum && topicId == null) {
        return false
      }
      if (loadedConvKeyRef.current !== convKey) {
        return false
      }
      const entity = dialog.entity
      const epochAtStart = transcriptEpochRef.current
      try {
        const around = await withTransientRetry(client, () => fetchWindowAround(id))
        if (
          transcriptEpochRef.current !== epochAtStart ||
          loadedConvKeyRef.current !== convKey
        ) {
          return false
        }
        if (!around.some((m) => m.id === id)) {
          // Window fetch missed the target (holes, filters, deleted neighbors)
          // — degrade to inserting the lone message so the jump still lands.
          const fetched = await withTransientRetry(client, () =>
            client.getMessages(entity as never, { ids: [id] }),
          )
          const one = toMessageList(fetched).filter((m) => m.id === id)
          if (one.length === 0) {
            return false
          }
          if (
            transcriptEpochRef.current !== epochAtStart ||
            loadedConvKeyRef.current !== convKey
          ) {
            return false
          }
          setList((prev) => uniqueMessagesSort([...prev, ...one]))
          return true
        }
        transcriptEpochRef.current += 1
        setTranscriptEpoch(transcriptEpochRef.current)
        setList(uniqueMessagesSort(around))
        setHasMoreOlder(true)
        setHasMoreNewer(!windowReachesLiveTail(around, id))
        setLoadingOlder(false)
        setLoadingNewer(false)
        return true
      } catch {
        return false
      }
    },
    [
      appMode,
      blocked,
      client,
      convKey,
      dialog.entity,
      fetchWindowAround,
      isForum,
      topicId,
      windowReachesLiveTail,
    ],
  )

  const returnToLiveTail = useCallback(async () => {
    if (!client || !dialog.entity) {
      return
    }
    if (isForum && topicId == null) {
      return
    }
    if (loadedConvKeyRef.current !== convKey) {
      return
    }
    const epochAtStart = transcriptEpochRef.current
    try {
      const head = await fetchHeadPage()
      if (
        transcriptEpochRef.current !== epochAtStart ||
        loadedConvKeyRef.current !== convKey
      ) {
        return
      }
      transcriptEpochRef.current += 1
      setTranscriptEpoch(transcriptEpochRef.current)
      setList(uniqueMessagesSort(head))
      setHasMoreOlder(head.length > 0)
      setHasMoreNewer(false)
      setLoadingOlder(false)
      setLoadingNewer(false)
    } catch {
      /* stay windowed; the FAB press can retry */
    }
  }, [client, convKey, dialog.entity, fetchHeadPage, isForum, topicId])

  const unreadSeekHeadIssuedRef = useRef(false)
  const unreadSeekOlderLoadsRef = useRef(0)

  useEffect(() => {
    unreadSeekHeadIssuedRef.current = false
    unreadSeekOlderLoadsRef.current = 0
  }, [convKey])

  /** Entity presence as a boolean: the initial load must re-run when the
   * entity first becomes available, but NOT when a background dialogs refresh
   * swaps in a fresh object for the same conversation (identity churn used to
   * re-run the whole initial load mid-session — a visible transcript replace). */
  const entityAvailable = dialog.entity != null

  // Initial load effect keyed on convKey
  useEffect(() => {
    if (blocked && appMode === "child") {
      return
    }
    if (!client || !entityAvailable) {
      return
    }
    if (isForum && topicId == null) {
      return
    }
    loadGenRef.current += 1
    const gen = loadGenRef.current
    loadedConvKeyRef.current = null
    lastTickSyncedRef.current = null
    transcriptEpochRef.current += 1
    historyReconcileAttemptedRef.current.clear()
    mediaPlaceholderRefetchAttemptsRef.current.clear()
    setInitialLoadDone(false)
    queueMicrotask(() => {
      setList([])
      setHasMoreOlder(true)
      setLoadingOlder(false)
      setHasMoreNewer(false)
      setLoadingNewer(false)
      setAuxMessagesById(new Map())
    })
    const openJumpTarget =
      openJumpHandledConvKeyRef.current === convKey
        ? null
        : (pendingOpenJumpIdRef?.current ?? null)
    void (async () => {
      try {
        if (!client || !entityRef.current) {
          return
        }
        const entity = entityRef.current
        if (typeof openJumpTarget === "number" && openJumpTarget > 0) {
          // Opening straight into a jump: land the first page around the
          // target. On any miss, fall through to the regular tail page.
          try {
            const around = await withTransientRetry(client, () =>
              fetchWindowAround(openJumpTarget),
            )
            if (loadGenRef.current !== gen) {
              return
            }
            if (around.some((m) => m.id === openJumpTarget)) {
              // Mark one-shot only on actual install (and only for the run
              // that survived the gen check): a later re-run of this effect
              // for the same conversation must not re-install the
              // around-window after the user has moved on.
              openJumpHandledConvKeyRef.current = convKey
              setList(uniqueMessagesSort(around))
              setHasMoreOlder(true)
              setHasMoreNewer(!windowReachesLiveTail(around, openJumpTarget))
              loadedConvKeyRef.current = convKey
              lastTickSyncedRef.current = lastMessageTickRef.current
              setInitialLoadDone(true)
              return
            }
          } catch {
            /* fall through to the tail page */
          }
        }
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
        setInitialLoadDone(true)
      } catch {
        if (loadGenRef.current !== gen) {
          return
        }
        setList([])
        setHasMoreOlder(true)
        loadedConvKeyRef.current = convKey
        lastTickSyncedRef.current = lastMessageTickRef.current
        setInitialLoadDone(true)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- entity is read via entityRef (identity churn must not re-fire); fetchWindowAround/windowReachesLiveTail track deps already listed; pendingOpenJumpIdRef is a stable ref read once per load
  }, [client, convKey, entityAvailable, isForum, topicId, blocked, appMode])

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
    if (hasMoreNewer) {
      // Windowed: don't consume the tick — when `loadNewer` catches up (or
      // `returnToLiveTail` lands) this effect re-runs and reconciles the head.
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
    hasMoreNewer,
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

  useChatHistoryRecovery({
    client,
    dialog,
    convKey,
    isForum,
    topicId,
    blocked,
    appMode,
    list,
    setList,
    loadedConvKeyRef,
    historyReconcileAttemptedRef,
    mediaPlaceholderRefetchAttemptsRef,
  })

  return {
    list,
    hasMoreOlder,
    loadingOlder,
    hasMoreNewer,
    loadingNewer,
    refreshHead,
    refreshMessagesById,
    loadOlder,
    loadNewer,
    loadAroundMessageId,
    returnToLiveTail,
    transcriptEpoch,
    auxMessagesById,
    patchMessageReactions,
    initialLoadDone,
  }
}
