import { useCallback, useSyncExternalStore } from "react"

/** `true` when viewport width &lt; `maxWidth` (typical: mobile / narrow). */
export function useNarrowView(maxWidth = 700): boolean {
  const query = `(max-width: ${maxWidth}px)`
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query)
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    },
    [query]
  )
  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query]
  )
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
