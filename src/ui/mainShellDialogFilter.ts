/** Search filter for MainShell dialog lists. */

import type { Dialog } from "teleproto/tl/custom/dialog"
import { getDialogPreviewText } from "../telegram/dialogPreview"
import { getPeerInfo } from "../telegram/dialogUtils"

export function filterDialogsBySearch(
  dialogs: Dialog[],
  query: string,
  tr: (k: string) => string,
): Dialog[] {
  const s = query.trim().toLowerCase()
  if (s.length === 0) {
    return dialogs
  }
  return dialogs.filter((d) => {
    const { name } = getPeerInfo(d)
    if (name.toLowerCase().includes(s)) {
      return true
    }
    return getDialogPreviewText(d, tr).toLowerCase().includes(s)
  })
}
