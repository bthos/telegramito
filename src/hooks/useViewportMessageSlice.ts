import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"
import type { ChatDatedItem } from "../ui/chatDatedItem"
import { chatDatedRowKey } from "../ui/chatDatedItem"
import { estimateChatRowHeight } from "../util/chatRowHeightEstimate"

/** ~`gap: 0.2rem` on `.msg-list` — included in spacer math so scroll length stays stable. */
const MSG_LIST_GAP_PX = 4

/** Only enable DOM eviction for long transcripts (Telegram Web–style slice). */
const SLICE_MIN_ROWS = 96

const INITIAL_TAIL_ROWS = 88
const OVERSCAN_ROWS = 14
/** When this many mounted rows sit outside the viewport band, trim toward it. */
const EVICT_MARGIN_ROWS = 42
const MIN_WINDOW_ROWS = 32

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

function headRowKey(list: readonly ChatDatedItem[]): string {
  return list.length === 0 ? "" : chatDatedRowKey(list[0])
}

export function useViewportMessageSlice(opts: {
  scrollRef: RefObject<HTMLDivElement | null>
  datedList: readonly ChatDatedItem[]
  convKey: string
  /** Bumped when the transcript is replaced within one `convKey` (jump / return-to-tail) — window resets like a chat switch. */
  transcriptEpoch: number
  loadingOlder: boolean
}): {
  sliceActive: boolean
  sliceStart: number
  sliceEnd: number
  topSpacerPx: number
  bottomSpacerPx: number
  onViewportSliceScroll: () => void
  expandToRowIndex: (idx: number) => void
} {
  const { scrollRef, datedList, convKey, transcriptEpoch, loadingOlder } = opts

  const sliceActive = datedList.length >= SLICE_MIN_ROWS

  const [sliceStart, setSliceStart] = useState(0)
  const [sliceEnd, setSliceEnd] = useState(-1)

  const sliceRef = useRef({ start: 0, end: -1 })
  useEffect(() => {
    sliceRef.current = { start: sliceStart, end: sliceEnd }
  }, [sliceStart, sliceEnd])

  const heightByKeyRef = useRef<Map<string, number>>(new Map())
  const convKeyRef = useRef(convKey)
  const epochRef = useRef(transcriptEpoch)
  const prevLenRef = useRef(0)
  const prevHeadKeyRef = useRef("")

  const rafRef = useRef<number | null>(null)

  /** Measure mounted rows into cache (real heights beat estimates for spacers). */
  useLayoutEffect(() => {
    if (!sliceActive) {
      return
    }
    const scroll = scrollRef.current
    const ul = scroll?.querySelector("ul.msg-list")
    if (!ul) {
      return
    }
    for (const li of ul.querySelectorAll<HTMLElement>("li[data-chat-row-index]")) {
      const idx = Number(li.dataset.chatRowIndex)
      if (!Number.isFinite(idx) || idx < 0 || idx >= datedList.length) {
        continue
      }
      const row = datedList[idx]
      heightByKeyRef.current.set(chatDatedRowKey(row), Math.ceil(li.offsetHeight))
    }
  }, [datedList, sliceActive, sliceStart, sliceEnd, loadingOlder, scrollRef])

  const rowHeight = useCallback(
    (index: number): number => {
      const row = datedList[index]
      if (!row) {
        return 48
      }
      const k = chatDatedRowKey(row)
      return heightByKeyRef.current.get(k) ?? estimateChatRowHeight(row)
    },
    [datedList],
  )

  const len = datedList.length
  const safeSliceEnd =
    len === 0 ? -1 : sliceEnd < 0 ? len - 1 : clamp(sliceEnd, 0, len - 1)
  const safeSliceStart =
    len === 0 || !sliceActive ? 0 : clamp(sliceStart, 0, Math.max(0, safeSliceEnd))

  const topSpacerPx =
    sliceActive && safeSliceStart > 0
      ? Math.ceil(
          Array.from({ length: safeSliceStart }, (_, i) => rowHeight(i)).reduce((a, h) => a + h, 0)
            + safeSliceStart * MSG_LIST_GAP_PX,
        )
      : 0

  const bottomSpacerPx =
    sliceActive && safeSliceEnd >= 0 && safeSliceEnd < len - 1
      ? Math.ceil(
          Array.from({ length: len - 1 - safeSliceEnd }, (_, j) =>
            rowHeight(safeSliceEnd + 1 + j),
          ).reduce((a, h) => a + h, 0)
            + (len - 1 - safeSliceEnd) * MSG_LIST_GAP_PX,
        )
      : 0

  /** Conversation / list bookkeeping: reset window, shift indices on prepend. */
  useEffect(() => {
    const len = datedList.length
    if (len === 0) {
      setSliceStart(0)
      setSliceEnd(-1)
      prevLenRef.current = 0
      prevHeadKeyRef.current = ""
      heightByKeyRef.current.clear()
      return
    }

    const hk = headRowKey(datedList)

    if (convKey !== convKeyRef.current || transcriptEpoch !== epochRef.current) {
      // Chat switch — or the same chat's transcript replaced in place by a
      // jump / return-to-tail. Either way the old window indices point into a
      // list that no longer exists. Height cache survives an in-chat replace
      // (row keys are message ids and stay valid).
      if (convKey !== convKeyRef.current) {
        heightByKeyRef.current.clear()
      }
      convKeyRef.current = convKey
      epochRef.current = transcriptEpoch
      prevLenRef.current = len
      prevHeadKeyRef.current = hk
      if (len < SLICE_MIN_ROWS) {
        setSliceStart(0)
        setSliceEnd(len - 1)
      } else {
        const initial = Math.min(INITIAL_TAIL_ROWS, len)
        setSliceStart(Math.max(0, len - initial))
        setSliceEnd(len - 1)
      }
      return
    }

    const prevLen = prevLenRef.current
    const delta = len - prevLen
    if (delta > 0) {
      const prevHk = prevHeadKeyRef.current
      if (prevLen > 0 && hk !== prevHk) {
        // Prepending shifts every existing index forward by `delta` — keep
        // pointing at the same mounted rows by shifting the window too. Also
        // pull `sliceStart` back by an overscan buffer (clamped into the
        // newly prepended range) so some of what was just prepended stays
        // mounted: `useChatScroll`'s prepend-compensation repositions
        // scrollTop using total (estimate-inclusive) `scrollHeight`, which
        // can land a few rows short of this shifted boundary once estimated
        // spacer heights are replaced by real measured ones. Landing in a
        // pure spacer leaves `updateSliceBounds` with no mounted row to
        // anchor off (it only adjusts relative to rows currently in view),
        // permanently stranding the viewport instead of self-correcting.
        setSliceStart((s) => clamp(s + delta - OVERSCAN_ROWS, 0, len - 1))
        setSliceEnd((e) => clamp(e + delta, 0, len - 1))
      } else if (prevLen > 0 && hk === prevHk) {
        setSliceEnd(len - 1)
      } else {
        setSliceEnd(len - 1)
        if (len >= SLICE_MIN_ROWS) {
          const initial = Math.min(INITIAL_TAIL_ROWS, len)
          setSliceStart(Math.max(0, len - initial))
        } else {
          setSliceStart(0)
        }
      }
    }

    if (len < SLICE_MIN_ROWS) {
      setSliceStart(0)
      setSliceEnd(len - 1)
    }

    prevLenRef.current = len
    prevHeadKeyRef.current = hk
  }, [datedList, convKey, transcriptEpoch])

  const updateSliceBounds = useCallback(() => {
    if (!sliceActive || datedList.length === 0) {
      return
    }
    const len = datedList.length
    const scroll = scrollRef.current
    const ul = scroll?.querySelector("ul.msg-list")
    if (!scroll || !ul) {
      return
    }

    const { start: prevStart, end: prevEnd } = sliceRef.current
    let nextStart = prevStart
    let nextEnd = prevEnd

    const { scrollTop, scrollHeight, clientHeight } = scroll
    const gap = scrollHeight - scrollTop - clientHeight
    const atBottom = gap < 88

    if (atBottom) {
      nextEnd = len - 1
    }

    const rect = scroll.getBoundingClientRect()
    let minV = Number.POSITIVE_INFINITY
    let maxV = Number.NEGATIVE_INFINITY

    for (const n of ul.querySelectorAll<HTMLElement>("li[data-chat-row-index]")) {
      const r = n.getBoundingClientRect()
      if (r.bottom > rect.top + 2 && r.top < rect.bottom - 2) {
        const idx = Number(n.dataset.chatRowIndex)
        if (Number.isFinite(idx)) {
          minV = Math.min(minV, idx)
          maxV = Math.max(maxV, idx)
        }
      }
    }

    if (Number.isFinite(minV) && Number.isFinite(maxV)) {
      if (minV - prevStart < OVERSCAN_ROWS) {
        nextStart = Math.max(0, minV - OVERSCAN_ROWS)
      }
      if (prevEnd - maxV < OVERSCAN_ROWS) {
        nextEnd = Math.min(len - 1, maxV + OVERSCAN_ROWS)
      }
      if (minV - prevStart > EVICT_MARGIN_ROWS) {
        nextStart = Math.max(0, minV - OVERSCAN_ROWS * 2)
      }
      if (!atBottom && prevEnd - maxV > EVICT_MARGIN_ROWS) {
        nextEnd = Math.min(len - 1, maxV + OVERSCAN_ROWS * 2)
      }
    }

    const win = nextEnd - nextStart + 1
    if (win < MIN_WINDOW_ROWS && len >= MIN_WINDOW_ROWS) {
      const mid = Math.floor((nextStart + nextEnd) / 2)
      nextStart = Math.max(0, mid - Math.floor(MIN_WINDOW_ROWS / 2))
      nextEnd = Math.min(len - 1, nextStart + MIN_WINDOW_ROWS - 1)
    }

    nextStart = clamp(nextStart, 0, len - 1)
    nextEnd = clamp(nextEnd, 0, len - 1)
    if (nextEnd < nextStart) {
      nextEnd = nextStart
    }

    if (nextStart !== prevStart) {
      setSliceStart(nextStart)
    }
    if (nextEnd !== prevEnd) {
      setSliceEnd(nextEnd)
    }
  }, [datedList.length, scrollRef, sliceActive])

  const onViewportSliceScroll = useCallback(() => {
    if (!sliceActive) {
      return
    }
    if (rafRef.current != null) {
      return
    }
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null
      updateSliceBounds()
    })
  }, [sliceActive, updateSliceBounds])

  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  const expandToRowIndex = useCallback(
    (idx: number) => {
      if (!sliceActive || datedList.length === 0) {
        return
      }
      const len = datedList.length
      const i = clamp(Math.floor(idx), 0, len - 1)
      const ns = Math.max(0, i - OVERSCAN_ROWS)
      const ne = Math.min(len - 1, i + OVERSCAN_ROWS)
      // When the target lies outside the mounted window, recenter around it
      // instead of only expanding (avoids keeping a huge stale tail mounted).
      const outside = i < sliceStart || (sliceEnd >= 0 && i > sliceEnd)
      if (outside) {
        setSliceStart(ns)
        setSliceEnd(ne)
      } else {
        setSliceStart((s) => Math.min(s, ns))
        setSliceEnd((e) => Math.max(e, ne))
      }
    },
    [datedList.length, sliceActive, sliceStart, sliceEnd],
  )

  return {
    sliceActive,
    sliceStart: safeSliceStart,
    sliceEnd: safeSliceEnd,
    topSpacerPx,
    bottomSpacerPx,
    onViewportSliceScroll,
    expandToRowIndex,
  }
}
