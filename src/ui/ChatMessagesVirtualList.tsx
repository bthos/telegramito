import { Api } from "telegram"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react"

export type ChatDatedItem =
  | { kind: "sep"; dayKey: string; ts: number }
  | { kind: "msg"; message: Api.Message }

export type ChatMessagesVirtualListHandle = {
  scrollToRowIndex: (
    index: number,
    options?: { align?: "auto" | "start" | "center" | "end"; behavior?: ScrollBehavior },
  ) => void
}

type Props = {
  scrollRef: RefObject<HTMLDivElement | null>
  /** Bump when the chat/thread changes so internal sticky bookkeeping resets. */
  listEpoch?: string
  datedList: readonly ChatDatedItem[]
  loadingOlder: boolean
  loadingLabel: string
  renderRow: (item: ChatDatedItem, index: number) => ReactNode
  onFirstVisibleRowIndexChange?: (index: number) => void
}

/**
 * Windowed message list for long threads; keeps the scroll parent as the measurement element.
 */
export const ChatMessagesVirtualList = forwardRef<
  ChatMessagesVirtualListHandle,
  Props
>(function ChatMessagesVirtualList(
  {
    scrollRef,
    listEpoch = "",
    datedList,
    loadingOlder,
    loadingLabel,
    renderRow,
    onFirstVisibleRowIndexChange,
  },
  ref,
) {
  const lastStickyReportRef = useRef<number>(-1)

  const rowVirtualizer = useVirtualizer({
    count: datedList.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => (datedList[index]?.kind === "sep" ? 38 : 58),
    overscan: 8,
  })

  useImperativeHandle(
    ref,
    () => ({
      scrollToRowIndex: (index, options) => {
        rowVirtualizer.scrollToIndex(index, {
          align: options?.align ?? "start",
          behavior: options?.behavior ?? "smooth",
        })
      },
    }),
    [rowVirtualizer],
  )

  useEffect(() => {
    lastStickyReportRef.current = -1
  }, [listEpoch])

  useLayoutEffect(() => {
    if (!onFirstVisibleRowIndexChange) {
      return
    }
    const idx = (() => {
      const r = rowVirtualizer.range
      if (r != null) return r.startIndex
      const vis = rowVirtualizer.getVirtualItems()
      return vis.length > 0 ? vis[0].index : null
    })()
    if (idx == null) {
      return
    }
    if (lastStickyReportRef.current !== idx) {
      lastStickyReportRef.current = idx
      onFirstVisibleRowIndexChange(idx)
    }
  }, [datedList, loadingOlder, rowVirtualizer, onFirstVisibleRowIndexChange])

  useEffect(() => {
    if (!onFirstVisibleRowIndexChange) {
      return
    }
    const el = scrollRef.current
    const run = () => {
      const idx = (() => {
        const r = rowVirtualizer.range
        if (r != null) return r.startIndex
        const vis = rowVirtualizer.getVirtualItems()
        return vis.length > 0 ? vis[0].index : null
      })()
      if (idx == null) {
        return
      }
      if (lastStickyReportRef.current === idx) {
        return
      }
      lastStickyReportRef.current = idx
      onFirstVisibleRowIndexChange(idx)
    }
    run()
    if (el) {
      el.addEventListener("scroll", run, { passive: true })
    }
    return () => {
      if (el) {
        el.removeEventListener("scroll", run)
      }
    }
  }, [scrollRef, rowVirtualizer, onFirstVisibleRowIndexChange])

  return (
    <>
      {loadingOlder ? (
        <div className="msg-load-hint" aria-live="polite">
          {loadingLabel}
        </div>
      ) : null}
      <div
        className="msg-list msg-list--virtual"
        role="list"
        style={{
          height: rowVirtualizer.getTotalSize(),
          position: "relative",
          width: "100%",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((vi) => {
          const item = datedList[vi.index]
          return (
            <div
              key={vi.key}
              data-index={vi.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vi.start}px)`,
              }}
              role={item.kind === "sep" ? "presentation" : "listitem"}
            >
              {renderRow(item, vi.index)}
            </div>
          )
        })}
      </div>
    </>
  )
})

ChatMessagesVirtualList.displayName = "ChatMessagesVirtualList"
