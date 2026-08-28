import { describe, expect, it } from "vitest"
import { Api } from "teleproto"
import bigInt from "big-integer"
import { extractCommunityStubs } from "./communityDialogs"

function dialogsResult(dialogs: unknown[], chats: unknown[]) {
  return new Api.messages.Dialogs({
    dialogs: dialogs as never,
    messages: [],
    chats: chats as never,
    users: [],
  } as never)
}

const futureTs = Math.floor(Date.now() / 1000) + 3600

describe("extractCommunityStubs (AC-C2 / AC-C5)", () => {
  it("maps a DialogCommunity + resolvable Community to a titled stub", () => {
    const res = dialogsResult(
      [
        new Api.DialogCommunity({
          communityId: bigInt(1842),
          notifySettings: new Api.PeerNotifySettings({} as never),
        } as never),
      ],
      [
        new Api.Community({
          id: bigInt(1842),
          title: "Neighborhood Hub",
          photo: new Api.ChatPhotoEmpty(),
        } as never),
      ],
    )
    expect(extractCommunityStubs(res)).toEqual([
      {
        id: "1842",
        title: "Neighborhood Hub",
        titleFromIdFallback: false,
        forbidden: false,
        pinned: false,
        muted: false,
      },
    ])
  })

  it("uses an id fallback title when no Community entity resolves", () => {
    const res = dialogsResult(
      [
        new Api.DialogCommunity({
          communityId: bigInt(99),
          notifySettings: new Api.PeerNotifySettings({} as never),
        } as never),
      ],
      [],
    )
    const [stub] = extractCommunityStubs(res)
    expect(stub.title).toBe("#99")
    expect(stub.titleFromIdFallback).toBe(true)
  })

  it("flags CommunityForbidden and reads pinned + muted", () => {
    const res = dialogsResult(
      [
        new Api.DialogCommunity({
          pinned: true,
          communityId: bigInt(7),
          notifySettings: new Api.PeerNotifySettings({ muteUntil: futureTs } as never),
        } as never),
      ],
      [new Api.CommunityForbidden({ id: bigInt(7), title: "Locked" } as never)],
    )
    expect(extractCommunityStubs(res)).toEqual([
      { id: "7", title: "Locked", titleFromIdFallback: false, forbidden: true, pinned: true, muted: true },
    ])
  })

  it("returns [] for a dialogs page with no communities (the dormant case) and for null", () => {
    const res = dialogsResult(
      [new Api.Dialog({ peer: new Api.PeerUser({ userId: bigInt(1) }), topMessage: 1, notifySettings: new Api.PeerNotifySettings({} as never) } as never)],
      [],
    )
    expect(extractCommunityStubs(res)).toEqual([])
    expect(extractCommunityStubs(null)).toEqual([])
    expect(extractCommunityStubs(undefined)).toEqual([])
  })
})
