import { describe, expect, it, vi } from "vitest"
import type { Api } from "teleproto"
import type { ParentalSettings } from "../parental/types"

// Plain objects stand in for TL types, so mark ids by className like the real `getPeerId` does.
vi.mock("teleproto/Utils", () => ({
  getPeerId: (p: { className: string; id?: number; userId?: number; channelId?: number }) => {
    if (p.className === "PeerUser") return String(p.userId)
    if (p.className === "PeerChannel") return `-100${String(p.channelId)}`
    if (p.className === "Channel") return `-100${String(p.id)}`
    return String(p.id)
  },
}))

import { globalPeerHitsFromFound } from "./globalPeerSearch"

const parent = { appMode: "parent", allowlistIds: [], blockUnknownPrivate: false } as unknown as ParentalSettings
const child = { appMode: "child", allowlistIds: [], blockUnknownPrivate: true } as unknown as ParentalSettings

function user(id: number, extra: Record<string, unknown> = {}) {
  return { className: "User", id, firstName: `U${id}`, ...extra }
}
function channel(id: number, extra: Record<string, unknown> = {}) {
  return { className: "Channel", id, title: `C${id}`, ...extra }
}

function found(
  my: unknown[],
  pub: unknown[],
  users: unknown[],
  chats: unknown[],
): Pick<Api.contacts.Found, "myResults" | "results" | "users" | "chats"> {
  return { myResults: my, results: pub, users, chats } as never
}

const peerUser = (id: number) => ({ className: "PeerUser", userId: id })
const peerChannel = (id: number) => ({ className: "PeerChannel", channelId: id })

describe("globalPeerHitsFromFound", () => {
  it("keeps contacts before public hits and drops duplicates, self and deleted users", () => {
    const hits = globalPeerHitsFromFound(
      found(
        [peerUser(1)],
        [peerUser(1), peerUser(2), peerUser(3), peerUser(4), peerChannel(9)],
        [user(1), user(2, { self: true }), user(3, { deleted: true }), user(4, { username: "four" })],
        [channel(9, { broadcast: true, username: "news" })],
      ),
      parent,
      new Set(),
    )
    expect(hits.map((h) => [h.kind, h.name])).toEqual([
      ["user", "U1"],
      ["user", "U4"],
      ["channel", "C9"],
    ])
    expect(hits[1]!.username).toBe("four")
  })

  it("lists megagroups as groups", () => {
    const hits = globalPeerHitsFromFound(
      found([], [peerChannel(5)], [], [channel(5, { megagroup: true })]),
      parent,
      new Set(),
    )
    expect(hits[0]!.kind).toBe("group")
  })

  it("child mode hides groups/channels and users blocked by the new-chat rules", () => {
    const hits = globalPeerHitsFromFound(
      found(
        [peerUser(1)],
        [peerUser(2), peerChannel(9)],
        [user(1, { contact: true }), user(2)],
        [channel(9, { broadcast: true })],
      ),
      child,
      new Set(),
    )
    expect(hits.map((h) => h.key)).toEqual(["1"])
  })
})
