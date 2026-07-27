/** Day-mail tab badge: count of dialogs with unread inbound today (capped). */

import type { Dialog } from "telegram/tl/custom/dialog"

const BADGE_CAP = 14

export function countDayMailBadge(dialogs: Dialog[]): number {
  let n = 0
  for (const d of dialogs) {
    const m = d.message
    const ts = m && typeof m.date === "number" ? m.date : 0
    if ((d.unreadCount ?? 0) >= 1 && ts > 0) {
      n++
      if (n >= BADGE_CAP) {
        break
      }
    }
  }
  return n
}
