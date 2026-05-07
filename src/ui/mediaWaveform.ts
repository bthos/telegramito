/** Deterministic pseudo-random waveform bar heights (px) for voice UI mocks. */
export function waveformHeights(count: number, seed: number): number[] {
  const out: number[] = []
  let r = Math.abs(seed) % 233280 || 1
  for (let i = 0; i < count; i++) {
    r = (r * 9301 + 49297) % 233280
    const h = 4 + (r / 233280) * 18
    out.push(Math.round(h * 10) / 10)
  }
  return out
}
