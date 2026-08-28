import { Api } from "teleproto"
import { getMessageDocument } from "../telegram/documentFile"

/** True when blob fetch would run for photo/document media (not async fall-through → z). */
export function mediaNeedsBlobFetch(
  media: Api.TypeMessageMedia | undefined,
  doc: Api.Document | null = media ? getMessageDocument({ media } as Api.Message) : null,
): boolean {
  if (!media) {
    return false
  }
  if (media.className === "MessageMediaPhoto") {
    return true
  }
  return media.className === "MessageMediaDocument" && doc != null
}
