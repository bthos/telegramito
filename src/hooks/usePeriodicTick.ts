import { useEffect, useState } from "react"

/**
 * Bumps internal state every `intervalMs` so descendants can refresh
 * time-sensitive UI (e.g. dialog list timestamps) without reading the tick.
 */
export function usePeriodicTick(intervalMs: number): void {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => {
      setTick((k) => k + 1)
    }, intervalMs)
    return () => {
      clearInterval(id)
    }
  }, [intervalMs])
}
