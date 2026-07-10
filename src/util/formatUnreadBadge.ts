/** Caps scroll-FAB / tab badges at `999+` per mobile shell AC-M6. */
export function formatUnreadBadge(count: number): string {
  if (count <= 0) return ""
  if (count > 999) return "999+"
  return String(count)
}
