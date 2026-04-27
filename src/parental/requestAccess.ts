import type { Dialog } from "telegram/tl/custom/dialog"
import { getPeerInfo } from "../telegram/dialogUtils"
import { randomId } from "../util/id"
import { addPendingRequest } from "./storage"

/** Queue a child request to open a private chat (parent approves/denies in Requests). */
export async function requestChatAccessForDialog(dialog: Dialog): Promise<void> {
  const p = getPeerInfo(dialog)
  await addPendingRequest({
    id: randomId(),
    kind: "chat",
    targetId: p.key,
    title: p.name,
    status: "pending",
    createdAt: Date.now(),
  })
}
