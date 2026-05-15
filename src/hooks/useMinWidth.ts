import { layoutMq } from "../layout/breakpoints"
import { useMediaQuery } from "./useMediaQuery"

/** `true` when viewport width is at least `minWidth` px (see `BP` / `layoutMq`). */
export function useMinWidth(minWidth: number): boolean {
  return useMediaQuery(layoutMq.minWidth(minWidth))
}
