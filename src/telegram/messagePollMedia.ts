import { Api } from "telegram"

/**
 * Poll payload may be top-level {@link Api.MessageMediaPoll} or nested inside
 * {@link Api.MessageMediaPaidMedia} → {@link Api.MessageExtendedMedia} (stars / paid flows).
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
      if (em.className === "MessageExtendedMedia") {
        const inner = (em as Api.MessageExtendedMedia).media
        if (inner?.className === "MessageMediaPoll") {
          return inner as Api.MessageMediaPoll
        }
      }
    }
  }
  return null
}
