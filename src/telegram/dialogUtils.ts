import { Api } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"

import { dialogPeerKey } from "./resolvePeerKey"

export function isPrivateUserDialog(d: Dialog): boolean {
  return d.isUser === true
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
