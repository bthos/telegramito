import { Api } from "teleproto"
import type { TelegramClient } from "teleproto"
import {
  unwrapChatInviteJoinResult,
  type ChatInviteJoinOutcome,
} from "./chatInviteJoinResult"

/**
 * join-invite-chat-result: the invoke wrappers the Join sheet calls. Every join
 * path returns through {@link unwrapChatInviteJoinResult} so a `webview` outcome
 * is handled rather than mistaken for `Updates` (AC-J2).
 */

export type InvitePreview =
  | {
      kind: "invite"
      title: string
      about: string
      participantsCount: number
      isChannel: boolean
      requestNeeded: boolean
      hash: string
    }
  | { kind: "already"; chatId: string }

/** `messages.checkChatInvite(hash)` → a normalised preview or an "already a member" marker. */
export async function checkInvite(
  client: TelegramClient,
  hash: string,
): Promise<InvitePreview> {
  const res = await client.invoke(new Api.messages.CheckChatInvite({ hash }))
  if (
    res instanceof Api.ChatInviteAlready ||
    res instanceof Api.ChatInvitePeek
  ) {
    const chat = res.chat as { id?: unknown } | undefined
    return { kind: "already", chatId: chat?.id != null ? String(chat.id) : "" }
  }
  if (res instanceof Api.ChatInvite) {
    return {
      kind: "invite",
      title: typeof res.title === "string" ? res.title : "",
      about: typeof res.about === "string" ? res.about : "",
      participantsCount:
        typeof res.participantsCount === "number" ? res.participantsCount : 0,
      isChannel: res.channel === true || res.broadcast === true,
      requestNeeded: res.requestNeeded === true,
      hash,
    }
  }
  throw new Error(`unexpected checkChatInvite result: ${(res as { className?: string })?.className}`)
}

/** Join a private invite by hash. */
export async function joinByInviteHash(
  client: TelegramClient,
  hash: string,
): Promise<ChatInviteJoinOutcome> {
  const res = await client.invoke(new Api.messages.ImportChatInvite({ hash }))
  return unwrapChatInviteJoinResult(res)
}

/** Join a public channel/group by `@username` (no leading `@`). */
export async function joinByUsername(
  client: TelegramClient,
  username: string,
): Promise<ChatInviteJoinOutcome> {
  const res = await client.invoke(
    new Api.channels.JoinChannel({ channel: username as never }),
  )
  return unwrapChatInviteJoinResult(res)
}

/**
 * Best-effort external URL for the webview / guard confirmation, via
 * `messages.requestChatJoinWebView`. Returns `null` when the client cannot
 * resolve one — the caller then keeps only the "Open in Telegram" CTA.
 */
export async function requestChatJoinWebViewUrl(
  client: TelegramClient,
  hash: string,
): Promise<string | null> {
  try {
    const res = await client.invoke(
      new Api.messages.RequestChatJoinWebView({
        hash,
        platform: "web",
      } as never),
    )
    const url = (res as { url?: unknown })?.url
    return typeof url === "string" && url.length > 0 ? url : null
  } catch {
    return null
  }
}
