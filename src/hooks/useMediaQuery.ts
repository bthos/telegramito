import { useCallback, useSyncExternalStore } from "react"

/**
 * Subscribes to `window.matchMedia(query)`. SSR / prerender default: `serverMatches`.
 */
export function useMediaQuery(query: string, serverMatches = false): boolean {
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
  return useSyncExternalStore(subscribe, getSnapshot, () => serverMatches)
}
