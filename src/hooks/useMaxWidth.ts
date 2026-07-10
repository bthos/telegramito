import { layoutMq } from "../layout/breakpoints"
import { useMediaQuery } from "./useMediaQuery"

/** `true` when viewport width ≤ `maxWidth` px (see `BP` / `layoutMq`). */
export function useMaxWidth(maxWidth: number): boolean {
  return useMediaQuery(layoutMq.maxWidth(maxWidth))
}
