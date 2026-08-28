import { Api } from "teleproto"
import { isInboundUnreadForThread } from "../telegram/messageUnread"

/** Unread-only filter applied to the raw hook list before dated rows are built. */
export function filterListForView(
  list: Api.Message[],
  messagesUnreadOnly: boolean,
  readInboxMaxId: number,
): Api.Message[] {
  if (!messagesUnreadOnly) {
    return list
  }
  return list.filter((m) => isInboundUnreadForThread(m, readInboxMaxId))
}
