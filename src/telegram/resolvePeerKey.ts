import type { Dialog } from "telegram/tl/custom/dialog"

/**
 * Stable id for allowlist. Uses GramJS `Dialog#id` when set.
 */
export function dialogPeerKey(d: Dialog): string {
  if (d.id) return d.id.toString(10)
  if (d.entity) {
    const e = d.entity as { id?: { toString: (b: number) => string } } | { id: unknown }
    if ("id" in e && e.id != null) {
      if (typeof e.id === "object" && e.id !== null && "toString" in e.id) {
        return (e.id as { toString: (b: number) => string }).toString(10)
      }
      return String(e.id)
    }
  }
  if (d.name) return d.name
  if (d.title) return d.title
  return "peer"
}
