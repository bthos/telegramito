import type { Api } from "telegram"
import type { ChatDatedItem } from "../ui/chatDatedItem"

/** Fallback row height when the bubble has never been measured (viewport slice spacers). */
export function estimateChatRowHeight(row: ChatDatedItem | undefined): number {
  if (!row || row.kind === "sep") {
    return 40
  }
  const m = row.message
  let base = 112
  const replyTo = (m as Api.Message & { replyTo?: { replyToMsgId?: number } }).replyTo
  if (replyTo != null && typeof replyTo.replyToMsgId === "number") {
    base += 58
  }
  const media = m.media
  if (!media || media.className === "MessageMediaEmpty") {
    const txt =
      typeof (m as Api.Message & { message?: string }).message === "string"
        ? (m as Api.Message & { message: string }).message
        : ""
    const approxLines = Math.min(16, Math.max(1, Math.ceil(txt.length / 38)))
    return Math.min(580, base + approxLines * 26)
  }
  if (media.className === "MessageMediaPoll") {
    const mp = media as Api.MessageMediaPoll
    const poll = mp.poll
    let n = 2
    if (poll?.className === "Poll") {
      const answers = (poll as Api.Poll).answers
      n = Math.max(2, Array.isArray(answers) ? answers.length : 2)
    }
    return Math.min(880, base + 300 + n * 72)
  }
  if (
    media.className === "MessageMediaPhoto"
    || media.className === "MessageMediaDocument"
    || media.className === "MessageMediaWebPage"
  ) {
    return Math.min(620, base + 288)
  }
  return Math.min(560, base + 188)
}
