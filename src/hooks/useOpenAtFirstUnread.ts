import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"
import type { ChatDatedItem } from "../ui/chatDatedItem"
import { alignRowInScroller } from "../util/scrollerAlign"
import { findFirstUnreadRowIndex } from "../util/threadCatchUp"

/** Frames to wait for the target row to mount (slice expansion) before giving up. */
const MAX_MOUNT_RETRY_FRAMES = 30
/** Safety net: never leave scroll handling suppressed if the transcript never lands. */
const GIVE_UP_MS = 8000

export type OpenLanding = "unread" | "bottom"

/**
 * Row to land on when a thread opens with unread messages: the read/unread divider
 * (so it sits at the top with the first unread message right below, like Telegram),
 * falling back to the first unread message itself.
 */
export function findOpenLandingRowIndex(
  datedList: readonly ChatDatedItem[],
  readMax: number,
): number {
  const ribbon = datedList.findIndex((row) => row.kind === "catchup")
  return ribbon >= 0 ? ribbon : findFirstUnreadRowIndex(datedList, readMax)
}

/**
 * Lands the first scroll position of a thread that opened with unread messages on the
 * first unread message instead of the bottom. While `awaiting`, `jumpSettlingRef` is held
 * so `useChatScroll` neither sticks to the tail nor paginates; it is released at landing.
 *
 * `onLanded("bottom")` means nothing unread was found in the loaded window — the caller
 * should fall back to the normal snap-to-latest.
 */
export function useOpenAtFirstUnread(opts: {
  /** True from the moment the thread opened with unread until the first position lands. */
  awaiting: boolean
  readMax: number | null
  convKey: string
  /** `convKey` whose initial page is in `datedList` (guards stale rows after a topic switch). */
  loadedConvKey: string | null
  scrollRef: RefObject<HTMLDivElement | null>
  datedList: readonly ChatDatedItem[]
  expandToRowIndex: (idx: number) => void
  jumpSettlingRef?: RefObject<boolean>
  onLanded: (where: OpenLanding) => void
}): void {
  const {
    awaiting,
    readMax,
    convKey,
    loadedConvKey,
    scrollRef,
    datedList,
    expandToRowIndex,
    jumpSettlingRef,
    onLanded,
  } = opts

  const [retryBump, setRetryBump] = useState(0)
  const retryFramesRef = useRef(0)
  const onLandedRef = useRef(onLanded)
  onLandedRef.current = onLanded

  useLayoutEffect(() => {
    retryFramesRef.current = 0
    if (awaiting && jumpSettlingRef) {
      jumpSettlingRef.current = true
    }
  }, [awaiting, convKey, jumpSettlingRef])

  useEffect(() => {
    if (!awaiting) {
      return
    }
    const timer = window.setTimeout(() => {
      if (jumpSettlingRef) {
        jumpSettlingRef.current = false
      }
      onLandedRef.current("bottom")
    }, GIVE_UP_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [awaiting, convKey, jumpSettlingRef])

  useLayoutEffect(() => {
    if (!awaiting || readMax == null || loadedConvKey !== convKey) {
      return
    }
    const release = () => {
      if (jumpSettlingRef) {
        jumpSettlingRef.current = false
      }
    }
    const idx = findOpenLandingRowIndex(datedList, readMax)
    if (idx < 0) {
      release()
      onLandedRef.current("bottom")
      return
    }
    expandToRowIndex(idx)
    const root = scrollRef.current
    const selector = `[data-chat-row-index="${idx}"]`
    const node = root?.querySelector<HTMLElement>(selector) ?? null
    if (root == null || node == null) {
      if (retryFramesRef.current >= MAX_MOUNT_RETRY_FRAMES) {
        release()
        onLandedRef.current("bottom")
        return
      }
      retryFramesRef.current += 1
      requestAnimationFrame(() => {
        setRetryBump((b) => b + 1)
      })
      return
    }
    alignRowInScroller(root, node, { align: "start" })
    // Rows above settle late (images, markdown, custom emoji) and shift the divider;
    // re-pin for two frames so the landing position survives that first layout.
    requestAnimationFrame(() => {
      const row = root.querySelector<HTMLElement>(selector)
      if (row != null) {
        alignRowInScroller(root, row, { align: "start" })
      }
      requestAnimationFrame(() => {
        const row2 = root.querySelector<HTMLElement>(selector)
        if (row2 != null) {
          alignRowInScroller(root, row2, { align: "start" })
        }
      })
    })
    release()
    onLandedRef.current("unread")
  }, [awaiting, readMax, convKey, loadedConvKey, datedList, expandToRowIndex, scrollRef, jumpSettlingRef, retryBump])
}
