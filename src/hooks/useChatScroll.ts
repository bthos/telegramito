import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import type { RefObject } from "react"
import { Api } from "telegram"
import type { ChatDatedItem } from "../ui/ChatMessagesVirtualList"

const VIRTUAL_MSG_THRESHOLD_FOR_SCROLL = 48

export function useChatScroll(opts: {
  scrollRef: RefObject<HTMLDivElement | null>
  datedList: readonly ChatDatedItem[]
  list: readonly Api.Message[]
  loadingOlder: boolean
  hasMoreOlder: boolean
  loadOlder: () => Promise<void>
  convKey: string
}): {
  scrollFabVisible: boolean
  stickyRowIndex: number
  onScroll: () => void
  onVirtualStickyRow: (idx: number) => void
  scrollToLatestMessages: () => void
  notifyPrepend: (prevTop: number, prevHeight: number) => void
} {
  const { scrollRef, datedList, list, loadingOlder, hasMoreOlder, loadOlder, convKey } = opts

  const stickToEndRef = useRef(true)
  const pendingScrollFixRef = useRef<{
    type: "prepend"
    prevTop: number
    prevHeight: number
  } | null>(null)
  const olderLoadThrottleRef = useRef(0)

  const [scrollFabVisible, setScrollFabVisible] = useState(false)
  const [stickyRowIndex, setStickyRowIndex] = useState(0)

  useEffect(() => {
    setStickyRowIndex(0)
    setScrollFabVisible(false)
    stickToEndRef.current = true
  }, [convKey])

  const syncStickyChatDateShortList = useCallback(() => {
    const el = scrollRef.current
    if (!el || datedList.length === 0) {
      return
    }
    if (datedList.length > VIRTUAL_MSG_THRESHOLD_FOR_SCROLL) {
      return
    }
    const nodes = el.querySelectorAll<HTMLElement>("[data-chat-row-index]")
    if (nodes.length === 0) {
      setStickyRowIndex((prev) => (prev === 0 ? prev : 0))
      return
    }
    const rootTop = el.getBoundingClientRect().top
    for (const node of nodes) {
      const r = node.getBoundingClientRect()
      if (r.bottom > rootTop + 2) {
        const idx = Number(node.dataset.chatRowIndex)
        const next = Number.isFinite(idx) ? idx : 0
        setStickyRowIndex((prev) => (prev === next ? prev : next))
        return
      }
    }
    const last = nodes[nodes.length - 1]
    const idx = Number(last.dataset.chatRowIndex)
    const next = Number.isFinite(idx) ? idx : 0
    setStickyRowIndex((prev) => (prev === next ? prev : next))
  }, [datedList, scrollRef])

  const onVirtualStickyRow = useCallback((idx: number) => {
    setStickyRowIndex((prev) => (prev === idx ? prev : idx))
  }, [])

  const notifyPrepend = useCallback((prevTop: number, prevHeight: number) => {
    pendingScrollFixRef.current = { type: "prepend", prevTop, prevHeight }
    stickToEndRef.current = false
  }, [])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const p = pendingScrollFixRef.current
    if (p) {
      const h = el.scrollHeight
      el.scrollTop = p.prevTop + (h - p.prevHeight)
      pendingScrollFixRef.current = null
      syncStickyChatDateShortList()
      return
    }
    if (stickToEndRef.current) {
      const snap = () => {
        el.scrollTop = el.scrollHeight
      }
      snap()
      requestAnimationFrame(() => {
        snap()
        requestAnimationFrame(snap)
      })
    }
    syncStickyChatDateShortList()
  }, [list, syncStickyChatDateShortList, scrollRef])

  const scrollToLatestMessages = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    stickToEndRef.current = true
    const snap = () => {
      el.scrollTop = el.scrollHeight
    }
    snap()
    requestAnimationFrame(() => {
      snap()
      requestAnimationFrame(snap)
    })
    setScrollFabVisible(false)
  }, [scrollRef])

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const { scrollTop, scrollHeight, clientHeight } = el
    const gap = scrollHeight - scrollTop - clientHeight
    const nearEnd = gap < 48
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
  }, [datedList.length, hasMoreOlder, loadingOlder, loadOlder, syncStickyChatDateShortList, notifyPrepend, scrollRef])

  return {
    scrollFabVisible,
    stickyRowIndex,
    onScroll,
    onVirtualStickyRow,
    scrollToLatestMessages,
    notifyPrepend,
  }
}
