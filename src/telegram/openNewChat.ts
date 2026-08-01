import { Api } from "telegram"
import { Dialog } from "telegram/tl/custom/dialog"
import type { TelegramClient } from "telegram"
import { getInputPeer, getPeerId } from "telegram/Utils"
import type { Dialog as DialogType } from "telegram/tl/custom/dialog"
import type { NewChatRecipient } from "./newChatRecipients"
import { withTransientRetry } from "./invokeWithTransientRetry"
import { getPeerInfo } from "./dialogUtils"

function dialogMessageKey(peer: Api.TypePeer, messageId: number): string {
  return `${peer instanceof Api.PeerChannel ? peer.channelId : undefined},${messageId}`
}

function buildEntityMap(
  users: readonly Api.TypeUser[],
  chats: readonly Api.TypeChat[],
): Map<string, Api.TypeUser | Api.TypeChat> {
  const entities = new Map<string, Api.TypeUser | Api.TypeChat>()
  for (const entity of [...users, ...chats]) {
    if (entity.className === "UserEmpty" || entity.className === "ChatEmpty") {
      continue
    }
    entities.set(getPeerId(entity), entity)
  }
  return entities
}

function dialogFromPeerDialogs(
  client: TelegramClient,
  res: Api.messages.PeerDialogs,
): DialogType | null {
  const tlDialog = res.dialogs.find((d) => d.className === "Dialog")
  if (!tlDialog || tlDialog.className !== "Dialog") {
    return null
  }
  const entities = buildEntityMap(res.users, res.chats)
  const messages = new Map<string, Api.Message>()
  for (const m of res.messages) {
    if (!m || typeof m !== "object" || !("peerId" in m) || !("id" in m)) {
      continue
    }
    const msg = m as Api.Message
    messages.set(dialogMessageKey(msg.peerId, msg.id), msg)
  }
  const message =
    messages.get(dialogMessageKey(tlDialog.peer, tlDialog.topMessage)) ??
    (res.messages[0] as Api.Message | undefined)
  try {
    return new Dialog(client, tlDialog, entities, message)
  } catch {
    return null
  }
}

export function findDialogForUser(
  dialogs: readonly DialogType[],
  userId: string,
): DialogType | null {
  return (
    dialogs.find((d) => d.isUser && getPeerInfo(d).key === userId) ?? null
  )
}

/**
 * Load a single `Dialog` for a peer that may not be in the locally paged dialog list
 * (global search hits, new chats). `entity` may be an already-resolved `InputPeer`.
 */
export async function fetchDialogForEntity(
  client: TelegramClient,
  entity: Api.TypeUser | Api.TypeChat | Api.Channel | Api.TypeInputPeer,
): Promise<DialogType> {
  const inputPeer = getInputPeer(entity)
  const res = (await withTransientRetry(client, () =>
    client.invoke(
      new Api.messages.GetPeerDialogs({
        peers: [new Api.InputDialogPeer({ peer: inputPeer })],
      }),
    ),
  )) as Api.messages.PeerDialogs
  const dialog = dialogFromPeerDialogs(client, res)
  if (dialog) {
    return dialog
  }
  throw new Error("peer dialog not found")
}

function chatFromUpdates(updates: Api.TypeUpdates): Api.TypeChat | null {
  if (!updates || typeof updates !== "object" || !("chats" in updates)) {
    return null
  }
  const chats = (updates as Api.Updates).chats
  for (const chat of chats) {
    if (chat.className === "Chat" || chat.className === "Channel") {
      return chat
    }
  }
  return null
}

async function createGroupChat(
  client: TelegramClient,
  recipients: readonly NewChatRecipient[],
  title: string,
): Promise<DialogType> {
  const users = recipients.map((r) => r.user)
  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    throw new Error("group title required")
  }

  const created = (await withTransientRetry(client, () =>
    client.invoke(
      new Api.channels.CreateChannel({
        title: trimmedTitle,
        about: "",
        megagroup: true,
      }),
    ),
  )) as Api.Updates

  const channel = chatFromUpdates(created)
  if (!channel) {
    throw new Error("group create failed")
  }

  if (users.length > 0) {
    await withTransientRetry(client, () =>
      client.invoke(
        new Api.channels.InviteToChannel({
          channel,
          users,
        }),
      ),
    )
  }

  return fetchDialogForEntity(client, channel as Api.Channel)
}

/** Open an existing or new dialog for the chosen recipients. */
export async function openChatForRecipients(opts: {
  client: TelegramClient
  dialogs: readonly DialogType[]
  recipients: readonly NewChatRecipient[]
  groupTitle?: string
  refreshDialogs: () => Promise<void>
}): Promise<DialogType> {
  const { client, dialogs, recipients, refreshDialogs } = opts
  if (recipients.length === 0) {
    throw new Error("no recipients")
  }

  if (recipients.length === 1) {
    const only = recipients[0]!
    const existing = findDialogForUser(dialogs, only.id)
    if (existing) {
      return existing
    }
    const dialog = await fetchDialogForEntity(client, only.user)
    await refreshDialogs()
    return dialog
  }

  const title = opts.groupTitle?.trim() ?? ""
  const dialog = await createGroupChat(client, recipients, title)
  await refreshDialogs()
  return dialog
}
