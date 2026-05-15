import { useCallback, useSyncExternalStore } from "react"

/** `true` when viewport width is at least `minWidth` px. */
export function useMinWidth(minWidth: number): boolean {
  const query = `(min-width: ${minWidth}px)`
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query)
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    },
    [query],
  )
  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  )
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
