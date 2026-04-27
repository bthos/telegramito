import { Api } from "telegram"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useLayoutEffect, type ReactNode, type RefObject } from "react"

export type ChatDatedItem =
  | { kind: "sep"; dayKey: string; ts: number }
  | { kind: "msg"; message: Api.Message }

type Props = {
  scrollRef: RefObject<HTMLDivElement | null>
  datedList: readonly ChatDatedItem[]
  loadingOlder: boolean
  loadingLabel: string
  renderRow: (item: ChatDatedItem) => ReactNode
}

/**
 * Windowed message list for long threads; keeps the scroll parent as the measurement element.
 */
export function ChatMessagesVirtualList({
  scrollRef,
  datedList,
  loadingOlder,
  loadingLabel,
  renderRow,
}: Props) {
  const rowVirtualizer = useVirtualizer({
    count: datedList.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 56,
    overscan: 12,
  })

  useLayoutEffect(() => {
    rowVirtualizer.measure()
  }, [datedList, rowVirtualizer])

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
              {renderRow(item)}
            </div>
          )
        })}
      </div>
    </>
  )
}
