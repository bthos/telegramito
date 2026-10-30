import type { Api } from "teleproto"
import { getPeerId } from "teleproto/Utils"
import type { ParentalSettings } from "../parental/types"
import { isPeerOmittedInChildListForDeny } from "../parental/policy"
import { telegramEntityDisplayName } from "../util/telegramEntityDisplayName"
import { isUserSelectableForNewChat } from "./newChatRecipients"

export type GlobalPeerKind = "user" | "group" | "channel"

/** One `contacts.Search` hit for the «Global search» sidebar section. */
export type GlobalPeerHit = {
  /** Marked peer id: the same convention as the dialog list keys. */
  key: string
  name: string
  username: string | null
  kind: GlobalPeerKind
  entity: Api.User | Api.Chat | Api.Channel
}

type SearchableEntity = Api.User | Api.Chat | Api.Channel

function isSearchableEntity(e: Api.TypeUser | Api.TypeChat): e is SearchableEntity {
  return e.className === "User" || e.className === "Chat" || e.className === "Channel"
}

function kindOf(entity: SearchableEntity): GlobalPeerKind {
  if (entity.className === "User") {
    return "user"
  }
  if (entity.className === "Channel" && entity.broadcast) {
    return "channel"
  }
  return "group"
}

/**
 * `contacts.Search` returns two peer lists: `myResults` (contacts and recents) and `results`
 * (public usernames). Both are kept, in that order, deduplicated; Telegram Web K shows the
 * public ones under «Global search».
 *
 * Parental gate: child mode never lists groups/channels (joining is not covered by the
 * allowlist) and lists users only under the new-chat rules.
 */
export function globalPeerHitsFromFound(
  found: Pick<Api.contacts.Found, "myResults" | "results" | "users" | "chats">,
  settings: ParentalSettings,
  deniedPeerIds: ReadonlySet<string>,
): GlobalPeerHit[] {
  const entities = new Map<string, SearchableEntity>()
  for (const e of [...found.users, ...found.chats]) {
    if (!isSearchableEntity(e)) {
      continue
    }
    try {
      entities.set(getPeerId(e, true), e)
    } catch {
      /* entity the TL layer cannot id */
    }
  }

  const seen = new Set<string>()
  const out: GlobalPeerHit[] = []
  for (const peer of [...found.myResults, ...found.results]) {
    let key: string
    try {
      key = getPeerId(peer, true)
    } catch {
      continue
    }
    const entity = entities.get(key)
    if (!entity || seen.has(key)) {
      continue
    }
    seen.add(key)

    if (entity.className === "User" && (entity.self || entity.deleted)) {
      continue
    }
    // Restricted channels cannot be opened anyway.
    if (entity.className === "Channel" && entity.restricted) {
      continue
    }
    if (isPeerOmittedInChildListForDeny(settings.appMode, key, deniedPeerIds)) {
      continue
    }
    const kind = kindOf(entity)
    if (settings.appMode === "child") {
      if (kind !== "user") {
        continue
      }
      if (
        !isUserSelectableForNewChat({
          user: entity as Api.User,
          appMode: settings.appMode,
          allowlistIds: settings.allowlistIds,
          deniedPeerIds,
          blockUnknownPrivate: settings.blockUnknownPrivate,
        })
      ) {
        continue
      }
    }
    const username = "username" in entity && entity.username ? entity.username : null
    const name = telegramEntityDisplayName(entity) || (username ?? key)
    out.push({ key, name, username, kind, entity })
  }
  return out
}
