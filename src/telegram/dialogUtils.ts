import { Api } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"

import { dialogPeerKey } from "./resolvePeerKey"
import { isBroadcastChannelEntity } from "./messageTickState"

export function isPrivateUserDialog(d: Dialog): boolean {
  return d.isUser === true
}

/** Broadcast channel row (shown in bulletin tiles, not the circles ChatList). */
export function isBroadcastChannelDialog(d: Dialog): boolean {
  return isBroadcastChannelEntity(d.entity)
}

/**
 * Basic (`Chat`) and megagroup (`Channel` + megagroup) dialogs — multi-member chats.
 */
export function dialogIsMultiMemberChat(d: Dialog): boolean {
  const e = d.entity
  if (e == null) {
    return false
  }
  if (e.className === "Chat") {
    return true
  }
  if (e.className === "Channel") {
    return (e as Api.Channel).megagroup === true
  }
  return false
}

/**
 * Letters sidebar — "Groups": basic chats and megagroups (multi-member channels).
 */
export function isLettersSidebarGroupDialog(d: Dialog): boolean {
  const e = d.entity
  if (e == null) {
    return true
  }
  if (e.className === "Chat") {
    return true
  }
  if (e.className === "Channel") {
    const c = e as Api.Channel
    return Boolean(c.megagroup)
  }
  return true
}

/**
 * Letters sidebar — "Channels" list: {@link Api.Channel} that is neither a supergroup nor a broadcast feed.
 * (Broadcast channels use the bulletin strip; megagroups use the groups list.)
 */
export function isLettersSidebarChannelListDialog(d: Dialog): boolean {
  const e = d.entity
  if (e == null || e.className !== "Channel") {
    return false
  }
  const c = e as Api.Channel
  if (c.broadcast || c.megagroup) {
    return false
  }
  return true
}

export function entityAsUser(
  entity: unknown
): Api.User | null {
  if (entity == null) return null
  if (typeof entity === "object" && "className" in entity) {
    const c = (entity as { className: string }).className
    if (c === "User") {
      return entity as Api.User
    }
  }
  return null
}

export function isUserContactForPolicy(d: Dialog): boolean {
  if (!d.isUser) return true
  const u = entityAsUser(d.entity)
  if (!u) return false
  return (
    Boolean(u.contact) || Boolean(u.mutualContact) || Boolean(u.self)
  )
}

export function getPeerInfo(d: Dialog): { key: string; name: string } {
  return {
    key: dialogPeerKey(d),
    name: d.name ?? d.title ?? d.entity?.className ?? d.id?.toString() ?? "?",
  }
}
