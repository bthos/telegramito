import { Api } from "teleproto"

/**
 * communities-dialogs (Layer 228): the server can send `DialogCommunity` rows
 * (community id + notify settings — **no** `peer` / `topMessage`) plus
 * `Community` / `CommunityForbidden` chat entities. teleproto's high-level
 * `client.getDialogs()` skips `DialogCommunity` (like `DialogFolder`), so the
 * app fetches them from a raw `messages.getDialogs` result and maps them to
 * honest stubs here — never a `Dialog` with a missing peer, never `getPeerId`
 * on a community row (D1 / AC-C1 / AC-C4).
 */

export type CommunityStub = {
  /** Stringified community id. */
  id: string
  /** `Community.title`, `CommunityForbidden.title`, or an id fallback. */
  title: string
  /** No resolvable `Community`/`CommunityForbidden` entity was present. */
  titleFromIdFallback: boolean
  /** `CommunityForbidden` — access may be restricted. */
  forbidden: boolean
  /** `DialogCommunity.pinned`. */
  pinned: boolean
  /** Derived from `DialogCommunity.notifySettings` (muted-until in the future). */
  muted: boolean
}

function isMuted(ns: unknown): boolean {
  const mu = (ns as { muteUntil?: unknown } | null | undefined)?.muteUntil
  if (typeof mu === "number") {
    return mu > Math.floor(Date.now() / 1000)
  }
  // teleproto may surface muteUntil as a Date or bigint-like
  const n = Number(mu)
  return Number.isFinite(n) && n > Math.floor(Date.now() / 1000)
}

/**
 * Pull community stubs out of a raw `messages.Dialogs` / `messages.DialogsSlice`
 * result. Returns `[]` for `DialogsNotModified` or a result with no communities
 * (the common, dormant case). Never throws on a malformed row.
 */
export function extractCommunityStubs(
  result: Api.messages.TypeDialogs | null | undefined,
): CommunityStub[] {
  const dialogs =
    result && "dialogs" in result && Array.isArray(result.dialogs)
      ? result.dialogs
      : []
  const chats =
    result && "chats" in result && Array.isArray(result.chats) ? result.chats : []
  if (dialogs.length === 0) {
    return []
  }

  const byId = new Map<string, Api.Community | Api.CommunityForbidden>()
  for (const c of chats) {
    if (c instanceof Api.Community || c instanceof Api.CommunityForbidden) {
      byId.set(String(c.id), c)
    }
  }

  const out: CommunityStub[] = []
  for (const d of dialogs) {
    if (!(d instanceof Api.DialogCommunity)) {
      continue
    }
    const id = String(d.communityId)
    const entity = byId.get(id)
    const forbidden = entity instanceof Api.CommunityForbidden
    const title =
      entity && typeof entity.title === "string" && entity.title.length > 0
        ? entity.title
        : ""
    out.push({
      id,
      title: title || `#${id}`,
      titleFromIdFallback: title.length === 0,
      forbidden,
      pinned: d.pinned === true,
      muted: isMuted(d.notifySettings),
    })
  }
  return out
}
