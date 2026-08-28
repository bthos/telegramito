import { useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from "react"
import { Api } from "teleproto"
import type { TelegramClient } from "teleproto"
import type { Dialog } from "teleproto/tl/custom/dialog"
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
import { getForumReplyToTopId } from "../telegram/forum"
import { compareMessagesChronological, toMessageList, uniqueMessagesSort } from "../telegram/messageList"
import { withTransientRetry } from "../telegram/invokeWithTransientRetry"

type RecoveryOpts = {
  client: TelegramClient | null
  dialog: Dialog
  convKey: string
  isForum: boolean
  topicId: number | null
  blocked: boolean
  appMode: string
  list: Api.Message[]
  setList: Dispatch<SetStateAction<Api.Message[]>>
  loadedConvKeyRef: RefObject<string | null>
  /**
   * Transcript-generation counter from `useChatMessages`. Bumped on every
   * in-place transcript replace (jump / return-to-live-tail / initial load).
   * An in-flight recovery fetch whose `transcriptEpochRef.current` moved while
   * it was awaiting belongs to a transcript that no longer exists — its result
   * is discarded rather than spliced into the new window (mirrors the guard in
   * `useChatMessages` `loadOlder` / `loadNewer`). Closes Bagnik code-QA
   * finding #1 on commit `cd3d1f3` (AC-T19).
   */
  transcriptEpochRef: RefObject<number>
  historyReconcileAttemptedRef: RefObject<Set<string>>
  mediaPlaceholderRefetchAttemptsRef: RefObject<Map<number, number>>
}

/**
 * Forum sparse-history reconcile + media-placeholder single-id refetch.
 * Owned by `useChatMessages`; extracted here for boundary clarity (AC3).
 */
export function useChatHistoryRecovery(opts: RecoveryOpts): void {
  const {
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
    transcriptEpochRef,
    historyReconcileAttemptedRef,
    mediaPlaceholderRefetchAttemptsRef,
  } = opts

  const mediaPlaceholderRefetchInFlightRef = useRef(false)

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
    const epochAtStart = transcriptEpochRef.current
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
        if (
          loadedConvKeyRef.current !== convKey
          || transcriptEpochRef.current !== epochAtStart
        ) {
          // Conversation switched, or the transcript was replaced (jump /
          // return-to-tail) while this reconcile was in flight — its rows
          // belong to a window that no longer exists.
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
  }, [
    list,
    isForum,
    topicId,
    client,
    dialog.entity,
    convKey,
    blocked,
    appMode,
    setList,
    loadedConvKeyRef,
    transcriptEpochRef,
    historyReconcileAttemptedRef,
  ])

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
    const epochAtStart = transcriptEpochRef.current
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
              if (!u || (isForum && topicId != null && !messageInActiveThread(u, topicId))) {
                return null
              }
              if (u.media?.className === "MessageMediaUnsupported") {
                return null
              }
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
        if (
          loadedConvKeyRef.current !== convKey
          || transcriptEpochRef.current !== epochAtStart
        ) {
          // Transcript replaced (jump / return-to-tail) or conversation switched
          // while the refetch was in flight — do not insert into the new window.
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
  }, [
    list,
    isForum,
    topicId,
    client,
    dialog.entity,
    convKey,
    blocked,
    appMode,
    setList,
    loadedConvKeyRef,
    transcriptEpochRef,
    mediaPlaceholderRefetchAttemptsRef,
  ])
}
