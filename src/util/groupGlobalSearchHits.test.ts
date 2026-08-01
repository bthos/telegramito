import { Api } from "telegram"
import { describe, expect, it, vi } from "vitest"
import { groupGlobalSearchHits, type GlobalSearchHit } from "./groupGlobalSearchHits"

vi.mock("telegram/Utils", () => ({
  getPeerId: (peer: { userId?: number; channelId?: number }) => {
    if (peer && typeof peer === "object" && "userId" in peer && peer.userId != null) {
      return String(peer.userId)
    }
    if (peer && typeof peer === "object" && "channelId" in peer && peer.channelId != null) {
      return String(-(peer.channelId as number))
    }
    return "0"
  },
}))

function hit(peerKey: string, id: number, name: string): GlobalSearchHit {
  return {
    peerKey,
    peerDisplayName: name,
    message: {
      className: "Message",
      id,
      message: `msg ${id}`,
      date: 0,
      out: false,
      peerId: { className: "PeerUser", userId: Number(peerKey) || 1 },
    } as unknown as Api.Message,
  }
}

describe("groupGlobalSearchHits", () => {
  it("groups by peerKey preserving first-seen peer order", () => {
    const hits = [
      hit("10", 1, "Mira"),
      hit("20", 2, "Team"),
      hit("10", 3, "Mira"),
      hit("20", 4, "Team"),
      hit("20", 5, "Team"),
    ]
    const clusters = groupGlobalSearchHits(hits, 3)
    expect(clusters.map((c) => c.peerKey)).toEqual(["10", "20"])
    expect(clusters[0]!.totalCount).toBe(2)
    expect(clusters[1]!.totalCount).toBe(3)
  })

  it("caps previewHits at previewCap while keeping full hits", () => {
    const hits = [hit("1", 1, "A"), hit("1", 2, "A"), hit("1", 3, "A"), hit("1", 4, "A")]
    const [cluster] = groupGlobalSearchHits(hits, 3)
    expect(cluster!.previewHits.map((h) => h.message.id)).toEqual([1, 2, 3])
    expect(cluster!.hits).toHaveLength(4)
    expect(cluster!.totalCount).toBe(4)
  })

  it("returns an empty list for no hits", () => {
    expect(groupGlobalSearchHits([])).toEqual([])
  })
})
