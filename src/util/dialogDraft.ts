import { Api } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"
import { getDialogRecord } from "./correspondenceFilter"

type Tr = (key: string, options?: Record<string, string | number | undefined>) => string

/** Non-empty draft body from the dialog TL record, if any. */
export function getDialogDraftText(d: Dialog): string | null {
  const r = getDialogRecord(d)
  const dr = r?.draft
  if (dr == null || dr.className === "DraftMessageEmpty") {
    return null
  }
  if (dr.className !== "DraftMessage") {
    return null
  }
  const msg = (dr as Api.DraftMessage).message
  if (typeof msg !== "string") {
    return null
  }
  const trimmed = msg.trim()
  return trimmed.length > 0 ? msg : null
}

/** First line of draft for list preview; falls back to attachment label when empty. */
export function getDialogDraftPreviewLine(
  d: Dialog,
  t: Tr,
  maxLen = 120,
): string {
  const text = getDialogDraftText(d)
  if (text) {
    const line = text.split(/\r?\n/)[0] ?? text
    if (line.length <= maxLen) {
      return line
    }
    return `${line.slice(0, maxLen - 1)}…`
  }
  return t("letters.draftsPreviewAttachment")
}
