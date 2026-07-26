import { Api } from "telegram"
import bigInt from "big-integer"
import { describe, expect, it, vi } from "vitest"
import {
  formatStoryAge,
  getAllStories,
  incrementStoryViews,
  isPeerEntryUnread,
  isStoryActive,
  orderStoryEntries,
  readStoriesForPeer,
  storyPeerDialogKey,
  type StoryPeerEntry,
} from "./storiesFeed"

// getPeerId (used by storyPeerDialogKey) checks constructor identity, so
// fixtures must be real Api.PeerUser/PeerChannel instances, not className-tagged
// plain objects (those only satisfy duck-typed helpers like peerKeyFromPeer).
function peer(userId: number): Api.TypePeer {
  return new Api.PeerUser({ userId: bigInt(userId) })
}

function story(id: number, opts: Partial<Api.StoryItem> = {}): Api.StoryItem {
  return {
    className: "StoryItem",
    id,
    date: id,
    expireDate: id + 86400,
    media: { className: "MessageMediaPhoto" } as unknown as Api.TypeMessageMedia,
    ...opts,
  } as unknown as Api.StoryItem
}

function entry(overrides: Partial<StoryPeerEntry> & { peerKey: string }): StoryPeerEntry {
  return {
    peer: peer(1),
    name: "Anna",
    isOwn: false,
    maxReadId: 0,
    stories: [story(1)],
    ...overrides,
  }
}

describe("storyPeerDialogKey", () => {
  it("returns the marked peer id (dialogPeerKey convention), not the u:/c:/h:-prefixed peerKeyFromPeer format", () => {
    const key = storyPeerDialogKey(peer(555))
    expect(key).not.toMatch(/^u:/)
    expect(key).toBe("555")
  })

  it("marks channel ids distinctly from user ids (no collision across peer types)", () => {
    const userKey = storyPeerDialogKey(peer(100))
    const channelKey = storyPeerDialogKey(new Api.PeerChannel({ channelId: bigInt(100) }))
    expect(userKey).not.toBe(channelKey)
  })
})

describe("isStoryActive", () => {
  it("is active before expireDate and inactive at/after it", () => {
    const s = story(1, { expireDate: 1000 })
    expect(isStoryActive(s, 999)).toBe(true)
    expect(isStoryActive(s, 1000)).toBe(false)
    expect(isStoryActive(s, 1001)).toBe(false)
  })
})

describe("isPeerEntryUnread", () => {
  it("is unread when any story id exceeds maxReadId", () => {
    const e = entry({ peerKey: "1", maxReadId: 2, stories: [story(1), story(3)] })
    expect(isPeerEntryUnread(e)).toBe(true)
  })

  it("is read when every story id is <= maxReadId", () => {
    const e = entry({ peerKey: "1", maxReadId: 5, stories: [story(1), story(3)] })
    expect(isPeerEntryUnread(e)).toBe(false)
  })
})

describe("orderStoryEntries", () => {
  it("orders own first, then unread (newest first), then read (newest first)", () => {
    const own = entry({ peerKey: "me", isOwn: true, stories: [story(1)] })
    const unreadOld = entry({ peerKey: "u-old", maxReadId: 0, stories: [story(10)] })
    const unreadNew = entry({ peerKey: "u-new", maxReadId: 0, stories: [story(20)] })
    const readNew = entry({ peerKey: "r-new", maxReadId: 99, stories: [story(15)] })
    const readOld = entry({ peerKey: "r-old", maxReadId: 99, stories: [story(5)] })

    const ordered = orderStoryEntries([readOld, unreadOld, own, readNew, unreadNew])
    expect(ordered.map((e) => e.peerKey)).toEqual(["me", "u-new", "u-old", "r-new", "r-old"])
  })
})

describe("formatStoryAge", () => {
  it("renders now/minutes/hours/days buckets", () => {
    expect(formatStoryAge(1000, 1000)).toBe("now")
    expect(formatStoryAge(1000, 1000 + 5 * 60)).toBe("5m")
    expect(formatStoryAge(1000, 1000 + 3 * 3600)).toBe("3h")
    expect(formatStoryAge(1000, 1000 + 2 * 86400)).toBe("2d")
  })
})

describe("getAllStories", () => {
  it("classifies own peers via StoryItem.out and hydrates names from users/chats", () => {
    const res = {
      className: "stories.AllStories",
      hasMore: false,
      count: 2,
      state: "s1",
      peerStories: [
        {
          className: "PeerStories",
          peer: peer(1),
          maxReadId: 0,
          stories: [story(1, { out: true })],
        },
        {
          className: "PeerStories",
          peer: peer(2),
          maxReadId: 1,
          stories: [story(2)],
        },
      ],
      users: [
        new Api.User({ id: bigInt(1), firstName: "Me" }),
        new Api.User({ id: bigInt(2), firstName: "Anna" }),
      ],
      chats: [],
      stealthMode: { className: "StoriesStealthMode" },
    }
    const client = { invoke: vi.fn().mockResolvedValue(res) } as never

    return getAllStories(client).then(({ entries }) => {
      expect(entries).toHaveLength(2)
      expect(entries.find((e) => e.peerKey === "1")?.isOwn).toBe(true)
      expect(entries.find((e) => e.peerKey === "1")?.name).toBe("Me")
      expect(entries.find((e) => e.peerKey === "2")?.isOwn).toBe(false)
      expect(entries.find((e) => e.peerKey === "2")?.name).toBe("Anna")
    })
  })

  it("passes hidden: false and never pages via state/next (OQ4 default)", async () => {
    const invoke = vi.fn().mockResolvedValue({
      className: "stories.AllStories",
      count: 0,
      state: "s",
      peerStories: [],
      chats: [],
      users: [],
      stealthMode: { className: "StoriesStealthMode" },
    })
    const client = { invoke } as never
    await getAllStories(client)
    const req = invoke.mock.calls[0]![0] as Api.stories.GetAllStories
    expect(req.hidden).toBe(false)
    expect(req.state).toBeUndefined()
    expect(req.next).toBeUndefined()
  })

  it("returns an empty result for stories.AllStoriesNotModified", async () => {
    const client = {
      invoke: vi.fn().mockResolvedValue({ className: "stories.AllStoriesNotModified" }),
    } as never
    const { entries } = await getAllStories(client)
    expect(entries).toEqual([])
  })
})

describe("readStoriesForPeer / incrementStoryViews", () => {
  it("resolves the peer via getInputEntity before invoking ReadStories", async () => {
    const inputPeer = { className: "InputPeerUser" }
    const invoke = vi.fn().mockResolvedValue([])
    const client = {
      getInputEntity: vi.fn().mockResolvedValue(inputPeer),
      invoke,
    } as never
    await readStoriesForPeer(client, peer(1), 5)
    expect(invoke).toHaveBeenCalledTimes(1)
    const req = invoke.mock.calls[0]![0] as Api.stories.ReadStories
    expect(req.peer).toBe(inputPeer)
    expect(req.maxId).toBe(5)
  })

  it("no-ops for an empty id list instead of invoking IncrementStoryViews", async () => {
    const invoke = vi.fn()
    const client = { getInputEntity: vi.fn(), invoke } as never
    await incrementStoryViews(client, peer(1), [])
    expect(invoke).not.toHaveBeenCalled()
  })

  it("invokes IncrementStoryViews with the resolved peer and id list", async () => {
    const inputPeer = { className: "InputPeerUser" }
    const invoke = vi.fn().mockResolvedValue(true)
    const client = {
      getInputEntity: vi.fn().mockResolvedValue(inputPeer),
      invoke,
    } as never
    await incrementStoryViews(client, peer(1), [1, 2])
    const req = invoke.mock.calls[0]![0] as Api.stories.IncrementStoryViews
    expect(req.peer).toBe(inputPeer)
    expect(req.id).toEqual([1, 2])
  })
})
