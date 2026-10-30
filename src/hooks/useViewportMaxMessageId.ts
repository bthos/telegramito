import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"
import type { ChatDatedItem } from "../ui/chatDatedItem"

/** A row whose top is within this many px of the bottom edge is not yet "seen". */
const BOTTOM_SEEN_INSET_PX = 8

/**
 * Highest message id currently on screen in the transcript scroller (what Telegram
 * treats as read), not the highest id merely loaded. `measure()` is rAF-coalesced for
 * scroll handlers; the value also re-measures synchronously whenever the rows change.
 * The result is scoped to `convKey`, so a topic switch never reports the old topic's id.
 */
export function useViewportMaxMessageId(opts: {
  scrollRef: RefObject<HTMLDivElement | null>
  datedList: readonly ChatDatedItem[]
  convKey: string
}): { viewportMaxId: number | null; measure: () => void } {
  const { scrollRef, datedList, convKey } = opts
  const [seen, setSeen] = useState<{ convKey: string; id: number | null }>({
    convKey,
    id: null,
  })
  const rafRef = useRef(0)

  const measureNow = useCallback(() => {
    const root = scrollRef.current
    if (root == null) {
      return
    }
    const rootRect = root.getBoundingClientRect()
    let max: number | null = null
    for (const el of root.querySelectorAll<HTMLElement>("[data-chat-message-id]")) {
      const r = el.getBoundingClientRect()
      if (r.bottom <= rootRect.top || r.top >= rootRect.bottom - BOTTOM_SEEN_INSET_PX) {
        continue
      }
      const id = Number(el.dataset.chatMessageId)
      if (Number.isFinite(id) && (max == null || id > max)) {
        max = id
      }
    }
    setSeen((prev) => (prev.convKey === convKey && prev.id === max ? prev : { convKey, id: max }))
  }, [convKey, scrollRef])

  const measure = useCallback(() => {
    if (rafRef.current !== 0) {
      return
    }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      measureNow()
    })
  }, [measureNow])

  useLayoutEffect(() => {
    measureNow()
  }, [datedList, measureNow])

  useEffect(() => {
    return () => {
      if (rafRef.current !== 0) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
    }
  }, [])

  return { viewportMaxId: seen.convKey === convKey ? seen.id : null, measure }
}
