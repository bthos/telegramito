import { Api } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"

function dialogRaw(d: Dialog): Api.Dialog | undefined {
  const dr = (d as unknown as { dialog?: Api.Dialog }).dialog
  return dr?.className === "Dialog" ? dr : undefined
}

/**
 * Read horizon for the current thread: forum topic uses {@link Api.ForumTopic.readInboxMaxId};
 * otherwise {@link Api.Dialog.readInboxMaxId} from the chat list dialog.
 */
export function readInboxMaxIdForThread(
  dialog: Dialog,
  isForum: boolean,
  topicId: number | null,
  topics: readonly Api.ForumTopic[],
): number {
  if (isForum && topicId != null) {
    const tp = topics.find((x) => x.id === topicId && x.className === "ForumTopic") as
      | Api.ForumTopic
      | undefined
    if (tp != null && typeof tp.readInboxMaxId === "number") {
      return Math.max(0, tp.readInboxMaxId)
    }
    return 0
  }
  const raw = dialogRaw(dialog)
  if (raw != null && typeof raw.readInboxMaxId === "number") {
    return Math.max(0, raw.readInboxMaxId)
  }
  return 0
}

/** Incoming messages with id greater than the thread read horizon count as unread for this filter. */
export function isInboundUnreadForThread(m: Api.Message, readInboxMaxId: number): boolean {
  if (m.className !== "Message" || m.id == null) {
    return false
  }
  if (m.out) {
    return false
  }
  const id = typeof m.id === "number" ? m.id : Number(m.id)
  if (!Number.isFinite(id) || id <= 0) {
    return false
  }
  return id > readInboxMaxId
}
