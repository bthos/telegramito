/**
 * Scroll a row into view by moving ONLY the given scroll container.
 *
 * `Element.scrollIntoView` walks every scrollable ancestor (including the
 * page), so a jump inside the transcript could also nudge outer layout —
 * these helpers compute the container-relative delta and touch nothing else.
 */
export function alignRowInScroller(
  scroller: HTMLElement,
  node: HTMLElement,
  opts?: { align?: "center" | "start"; smooth?: boolean },
): void {
  const align = opts?.align ?? "center"
  const sRect = scroller.getBoundingClientRect()
  const nRect = node.getBoundingClientRect()
  const delta =
    align === "center"
      ? nRect.top + nRect.height / 2 - (sRect.top + sRect.height / 2)
      : nRect.top - sRect.top - 8
  const top = scroller.scrollTop + delta
  if (opts?.smooth) {
    scroller.scrollTo({ top, behavior: "smooth" })
  } else {
    scroller.scrollTop = top
  }
}
