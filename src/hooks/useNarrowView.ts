import { layoutMq } from "../layout/breakpoints"
import { useMediaQuery } from "./useMediaQuery"

/** `true` when viewport width ≤ `maxWidth` px (see `BP` / `layoutMq`). */
export function useNarrowView(maxWidth = 700): boolean {
  return useMediaQuery(layoutMq.maxWidth(maxWidth))
}
