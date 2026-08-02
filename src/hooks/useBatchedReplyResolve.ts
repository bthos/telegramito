import { useCallback, useEffect, useRef } from "react"

/**
 * Batches reply-target ids that `MessageReplyView` rows report as unresolved
 * (see its `onNeedsResolve`) into one `refreshMessagesById([...])` call per
 * microtask tick instead of one per row.
 *
 * Jumping into old history (or any burst of newly-mounted rows) can mount
 * dozens of reply stubs at once; without batching, each row independently
 * called `refreshMessagesById([id])`, and each of those becomes its own
 * `channels.GetMessages` RPC — a burst of ~70+ concurrent single-id calls
 * hits Telegram's flood-wait limit on that method almost immediately.
 *
 * `requestedRef` remembers every id ever queued for the lifetime of the
 * current `refreshMessagesById` identity (i.e. the current chat/topic) so a
 * later row referencing the same still-unresolved id doesn't re-request it.
 */
export function useBatchedReplyResolve(
  refreshMessagesById: (ids: readonly number[]) => void | Promise<void>,
): (replyToMsgId: number) => void {
  const pendingRef = useRef<Set<number> | null>(null)
  const requestedRef = useRef<Set<number>>(new Set())
  const refreshRef = useRef(refreshMessagesById)
  refreshRef.current = refreshMessagesById

  useEffect(() => {
    requestedRef.current.clear()
  }, [refreshMessagesById])

  return useCallback((replyToMsgId: number) => {
    if (requestedRef.current.has(replyToMsgId)) {
      return
    }
    requestedRef.current.add(replyToMsgId)
    if (!pendingRef.current) {
      pendingRef.current = new Set()
      queueMicrotask(() => {
        const ids = pendingRef.current
        pendingRef.current = null
        if (ids && ids.size > 0) {
          void refreshRef.current([...ids])
        }
      })
    }
    pendingRef.current.add(replyToMsgId)
  }, [])
}
