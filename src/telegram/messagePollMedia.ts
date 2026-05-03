import { Api } from "telegram"
import { innerMediaFromExtendedMediaSlot } from "./messageMediaUnwrap"

function pollMediaFromExtendedSlot(
  em: Api.TypeMessageExtendedMedia | undefined | null,
): Api.MessageMediaPoll | null {
  const inner = innerMediaFromExtendedMediaSlot(em)
  return inner?.className === "MessageMediaPoll" ? (inner as Api.MessageMediaPoll) : null
}

/**
 * Poll payload may be top-level {@link Api.MessageMediaPoll} or nested inside
 * {@link Api.MessageMediaPaidMedia} → {@link Api.MessageExtendedMedia} (Stars),
 * or {@link Api.MessageMediaInvoice} → {@link Api.MessageExtendedMedia} (bots / extended media).
 */
export function getMessageMediaPollFromMessage(m: Api.Message): Api.MessageMediaPoll | null {
  const med = m.media
  if (!med) {
    return null
  }
  if (med.className === "MessageMediaPoll") {
    return med as Api.MessageMediaPoll
  }
  if (med.className === "MessageMediaPaidMedia") {
    const pm = med as Api.MessageMediaPaidMedia
    for (const em of pm.extendedMedia ?? []) {
      const p = pollMediaFromExtendedSlot(em)
      if (p) {
        return p
      }
    }
    return null
  }
  if (med.className === "MessageMediaInvoice") {
    return pollMediaFromExtendedSlot((med as Api.MessageMediaInvoice).extendedMedia)
  }
  return null
}
