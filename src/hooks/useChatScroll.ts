import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import type { RefObject } from "react"
import { Api } from "telegram"
import type { ChatDatedItem } from "../ui/chatDatedItem"

type StickTailMarker = number | "empty" | null

export function useChatScroll(opts: {
  scrollRef: RefObject<HTMLDivElement | null>
  datedList: readonly ChatDatedItem[]
  list: readonly Api.Message[]
  loadingOlder: boolean
  hasMoreOlder: boolean
  loadOlder: () => Promise<void>
  convKey: string
  /**
   * True while opening this `convKey` is itself a jump to a specific old message
   * (e.g. a Passages search result, day-mail, or co-reading deep link) — read once
   * when `convKey` changes via a ref, not as a reactive dependency, so later
   * changes to this flag (the jump resolving) don't re-fire the reset effect.
   */
  hasPendingJump: boolean
  /**
   * True from the moment a jump-to-message starts resolving until its
   * `scrollIntoView` actually lands (see `useChatJumpNavigation`'s
   * `pendingScrollToMessageIdRef`) — a strict superset of `hasPendingJump`'s
   * lifetime, since landing the jump can take several frames (progressively
   * expanding the virtualized window toward the target). Read via a ref,
   * not as a render dependency.
   */
  jumpSettlingRef?: RefObject<boolean>
}): {
  scrollFabVisible: boolean
  stickyRowIndex: number
  onScroll: () => void
  scrollToLatestMessages: () => void
  notifyPrepend: (prevTop: number, prevHeight: number) => void
} {
  const {
    scrollRef,
    datedList,
    list,
    loadingOlder,
    hasMoreOlder,
    loadOlder,
    convKey,
    hasPendingJump,
    jumpSettlingRef,
  } = opts

  const stickToEndRef = useRef(true)
  const hasPendingJumpRef = useRef(hasPendingJump)
  hasPendingJumpRef.current = hasPendingJump
  /** `null` after thread switch: next layout should snap once real tail is known. */
  const lastStickTailIdRef = useRef<StickTailMarker>(null)
  const pendingScrollFixRef = useRef<{
    type: "prepend"
    prevTop: number
    prevHeight: number
    /**
     * Whether a jump-to-message was still resolving when this prepend was
     * queued. Captured at queue time, not re-read live at apply time: the
     * fetch this compensation waits on can settle well after the jump's own
     * `scrollIntoView` already landed (and cleared `jumpSettlingRef`), but
     * `scrollHeight` by then still carries growth from the jump's concurrent
     * loading that this compensation's baseline never accounted for.
     */
    queuedDuringJump: boolean
  } | null>(null)
  const olderLoadThrottleRef = useRef(0)

  const [scrollFabVisible, setScrollFabVisible] = useState(false)
  const [stickyRowIndex, setStickyRowIndex] = useState(0)

  useEffect(() => {
    // Opening this chat to jump to a specific old message: don't stick to the
    // tail — the forced `scrollTop = scrollHeight` snap below (plus its
    // follow-up rAF) would fire after `useChatJumpNavigation`'s own
    // `scrollIntoView` and yank the view back to the bottom, away from the
    // virtualized window the jump just centered on the target row.
    stickToEndRef.current = !hasPendingJumpRef.current
    lastStickTailIdRef.current = null
    queueMicrotask(() => {
      setStickyRowIndex(0)
      setScrollFabVisible(false)
    })
  }, [convKey])

  const syncStickyChatDateShortList = useCallback(() => {
    const el = scrollRef.current
    if (!el || datedList.length === 0) {
      return
    }
    const nodes = el.querySelectorAll<HTMLElement>("[data-chat-row-index]")
    if (nodes.length === 0) {
      setStickyRowIndex((prev) => (prev === 0 ? prev : 0))
      return
    }
    const rootRect = el.getBoundingClientRect()
    for (const node of nodes) {
      const r = node.getBoundingClientRect()
      if (r.bottom > rootRect.top + 2 && r.top < rootRect.bottom - 2) {
        const idx = Number(node.dataset.chatRowIndex)
        const next = Number.isFinite(idx) ? idx : 0
        setStickyRowIndex((prev) => (prev === next ? prev : next))
        return
      }
    }
    /* Viewport may sit entirely in a spacer: first mounted row is the transcript head. */
    const first = nodes[0]
    if (first) {
      const idx = Number(first.dataset.chatRowIndex)
      const next = Number.isFinite(idx) ? idx : 0
      setStickyRowIndex((prev) => (prev === next ? prev : next))
    }
  }, [datedList, scrollRef])

  const notifyPrepend = useCallback((prevTop: number, prevHeight: number) => {
    pendingScrollFixRef.current = {
      type: "prepend",
      prevTop,
      prevHeight,
      queuedDuringJump: jumpSettlingRef?.current ?? false,
    }
    stickToEndRef.current = false
  }, [jumpSettlingRef])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const p = pendingScrollFixRef.current
    if (p) {
      if (loadingOlder) {
        // Fetch still in flight: do NOT reapply the compensation against the
        // original baseline here. `list` (and this effect) can re-fire for
        // reasons unrelated to the pending prepend (e.g. an unrelated incoming
        // message) while `loadingOlder` is still true — recomputing against a
        // stale `prevHeight` on those firings snaps scrollTop back to
        // `prevTop`, which looks like the view being frozen/reset. Just wait.
        syncStickyChatDateShortList()
        return
      }
      if (p.queuedDuringJump) {
        // This prepend was triggered while a jump-to-message was resolving
        // for this convKey (see `notifyPrepend`) — `prevTop`/`prevHeight`
        // were captured before (or racing) the jump's own progressive
        // history loading, so by the time `loadOlder` settles, `scrollHeight`
        // can carry growth from that unrelated concurrent loading on top of
        // this tracked prepend. This holds even if the jump itself already
        // finished landing by now (`jumpSettlingRef.current` back to false) —
        // this specific fix's baseline was poisoned the moment it was
        // queued. Applying the old formula against a contaminated height
        // overcorrects scrollTop by however much extra the jump added,
        // landing outside the virtualized window entirely (blank viewport).
        // Discard the stale fix instead: the jump's own `scrollIntoView` is
        // (or already was) about to own the scroll position anyway.
        pendingScrollFixRef.current = null
        syncStickyChatDateShortList()
        return
      }
      // `loadOlder` has settled (success or failure — see withTransientRetry's
      // per-attempt timeout). `setList` (on success) and `setLoadingOlder(false)`
      // land in the same commit, so `scrollHeight` here already reflects any
      // prepended messages. Apply the compensation exactly once, then clear.
      const h = el.scrollHeight
      el.scrollTop = p.prevTop + (h - p.prevHeight)
      pendingScrollFixRef.current = null
      syncStickyChatDateShortList()
      return
    }
    if (stickToEndRef.current) {
      const tailMsg = list.length > 0 ? list[list.length - 1] : undefined
      const tailMarker: StickTailMarker =
        tailMsg && typeof tailMsg.id === "number" ? tailMsg.id : "empty"
      const prevMarker = lastStickTailIdRef.current
      const shouldSnapToEnd =
        prevMarker === null ||
        (typeof tailMarker === "number" &&
          (prevMarker === "empty" ||
            (typeof prevMarker === "number" && tailMarker !== prevMarker)))
      lastStickTailIdRef.current = tailMarker
      if (!shouldSnapToEnd) {
        syncStickyChatDateShortList()
        return
      }
      el.scrollTop = el.scrollHeight
      requestAnimationFrame(() => {
        const cur = scrollRef.current
        if (cur === el) {
          el.scrollTop = el.scrollHeight
        }
      })
    }
    syncStickyChatDateShortList()
  }, [list, loadingOlder, syncStickyChatDateShortList, scrollRef])

  const scrollToLatestMessages = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    stickToEndRef.current = true
    const tailMsg = list.length > 0 ? list[list.length - 1] : undefined
    lastStickTailIdRef.current =
      tailMsg && typeof tailMsg.id === "number" ? tailMsg.id : "empty"
    const snap = () => {
      el.scrollTop = el.scrollHeight
    }
    snap()
    requestAnimationFrame(() => {
      snap()
      requestAnimationFrame(snap)
    })
    setScrollFabVisible(false)
  }, [scrollRef, list])

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const { scrollTop, scrollHeight, clientHeight } = el
    const gap = scrollHeight - scrollTop - clientHeight
    const nearEnd = gap < 48
    // While a jump-to-message is still settling, `scrollIntoView` can land the
    // target very close to whatever's currently loaded above it (the target is
    // often the oldest thing in `list` right after the jump, disjoint from the
    // recent messages loaded for this chat) — well within the "near top" zone
    // below. Scroll events firing during this window don't reflect genuine
    // user position and must not arm auto-behavior: `nearEnd` re-arming
    // stick-to-bottom, or the near-top branch below re-triggering
    // `loadOlder()`, races the jump's own pagination and the resulting
    // `notifyPrepend` baseline gets applied against a `scrollHeight` that grew
    // from unrelated concurrent loads by the time it settles — overcorrecting
    // scrollTop by tens of thousands of pixels into an unmounted spacer.
    if (jumpSettlingRef?.current) {
      // Force (not just skip) — an even earlier scroll event, from before
      // `jumpSettlingRef` turned true (e.g. the initial skeleton mount,
      // where `scrollHeight` trivially equals `clientHeight` because
      // nothing has loaded yet), can have already armed `stickToEndRef` via
      // the branch below. Merely returning here would leave that stale
      // `true` in place for the rest of the settling window, and the main
      // stick-to-end effect acts on it the moment `list`'s tail changes —
      // snapping away from the jump target toward whatever's currently the
      // tail (see bug notes).
      stickToEndRef.current = false
      syncStickyChatDateShortList()
      return
    }
    stickToEndRef.current = nearEnd
    const canScrollMore = scrollHeight > clientHeight + 16
    setScrollFabVisible(canScrollMore && gap > 72)
    syncStickyChatDateShortList()
    if (scrollTop > 200 || !hasMoreOlder || loadingOlder) {
      return
    }
    const now = Date.now()
    if (now - olderLoadThrottleRef.current < 450) {
      return
    }
    olderLoadThrottleRef.current = now
    const prevTop = el.scrollTop
    const prevHeight = el.scrollHeight
    notifyPrepend(prevTop, prevHeight)
    void loadOlder()
  }, [
    hasMoreOlder,
    jumpSettlingRef,
    loadingOlder,
    loadOlder,
    syncStickyChatDateShortList,
    notifyPrepend,
    scrollRef,
  ])

  return {
    scrollFabVisible,
    stickyRowIndex,
    onScroll,
    scrollToLatestMessages,
    notifyPrepend,
  }
}
