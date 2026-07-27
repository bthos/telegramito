import { Api } from "telegram"
import type { AppMode, ParentalSettings } from "../parental/types"
import { isPrivateOmittedInChildListForDeny } from "../parental/policy"
import { telegramEntityDisplayName } from "../util/telegramEntityDisplayName"

export type NewChatRecipient = {
  id: string
  user: Api.User
  name: string
}

export function userPeerIdString(user: Api.User): string {
  return user.id?.toString(10) ?? ""
}

export function isSelectableTelegramUser(u: Api.TypeUser): u is Api.User {
  if (u.className !== "User") {
    return false
  }
  if (u.self || u.deleted || u.bot) {
    return false
  }
  return true
}

export function toNewChatRecipient(user: Api.User): NewChatRecipient {
  const name = telegramEntityDisplayName(user)
  return {
    id: userPeerIdString(user),
    user,
    name: name || user.username || user.id?.toString(10) || "?",
  }
}

/** Child-mode gates for picking someone in the new-chat composer. */
export function isUserSelectableForNewChat(opts: {
  user: Api.User
  appMode: AppMode
  allowlistIds: readonly string[]
  deniedPeerIds: ReadonlySet<string>
  blockUnknownPrivate: boolean
}): boolean {
  const key = userPeerIdString(opts.user)
  if (
    isPrivateOmittedInChildListForDeny(opts.appMode, true, key, opts.deniedPeerIds)
  ) {
    return false
  }
  if (opts.appMode === "parent" || !opts.blockUnknownPrivate) {
    return true
  }
  if (opts.allowlistIds.includes(key)) {
    return true
  }
  if (opts.user.contact || opts.user.mutualContact) {
    return true
  }
  return false
}

export function filterUsersForNewChat(
  users: readonly Api.TypeUser[],
  settings: ParentalSettings,
  deniedPeerIds: ReadonlySet<string>,
): NewChatRecipient[] {
  const seen = new Set<string>()
  const out: NewChatRecipient[] = []
  for (const u of users) {
    if (!isSelectableTelegramUser(u)) {
      continue
    }
    if (
      !isUserSelectableForNewChat({
        user: u,
        appMode: settings.appMode,
        allowlistIds: settings.allowlistIds,
        deniedPeerIds,
        blockUnknownPrivate: settings.blockUnknownPrivate,
      })
    ) {
      continue
    }
    const id = userPeerIdString(u)
    if (!id || seen.has(id)) {
      continue
    }
    seen.add(id)
    out.push(toNewChatRecipient(u))
  }
  return out
}

/** Default megagroup title from participant first names. */
export function defaultGroupTitleFromRecipients(recipients: readonly NewChatRecipient[]): string {
  const names = recipients.map((r) => r.name.split(/\s+/)[0] ?? r.name).filter(Boolean)
  if (names.length === 0) {
    return ""
  }
  if (names.length === 1) {
    return names[0]!
  }
  if (names.length === 2) {
    return `${names[0]} & ${names[1]}`
  }
  return `${names[0]}, ${names[1]} +${names.length - 2}`
}
