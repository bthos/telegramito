import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Api } from "teleproto"
import bigInt from "big-integer"
import { useStoriesFeed } from "./useStoriesFeed"

// getPeerId (used by storyPeerDialogKey, exercised via the real getAllStories
// path here) checks constructor identity, so fixtures must be real Api.PeerUser
// instances, not className-tagged plain objects.
function peerUser(id: number): Api.TypePeer {
  return new Api.PeerUser({ userId: bigInt(id) })
}

// Anchored to real wall-clock time, not `id + 86400` (a tiny fixed epoch
// offset that reads as expired in 1970) — getAllStories now enforces AC1's
// expireDate-in-the-future predicate for real, so a default-constructed story
// must actually be active unless a test explicitly overrides expireDate.
function storyItem(id: number, opts: Partial<Api.StoryItem> = {}): Api.StoryItem {
  return {
    className: "StoryItem",
    id,
    date: id,
    expireDate: Math.floor(Date.now() / 1000) + 86400,
    media: { className: "MessageMediaPhoto" } as unknown as Api.TypeMessageMedia,
    ...opts,
  } as unknown as Api.StoryItem
}

function allStoriesResponse(peerStories: Api.PeerStories[]) {
  return {
    className: "stories.AllStories",
    hasMore: false,
    count: peerStories.length,
    state: "s1",
    peerStories,
    users: [
      new Api.User({ id: bigInt(1), firstName: "Anna" }),
      new Api.User({ id: bigInt(42), firstName: "Denied" }),
    ],
    chats: [],
    stealthMode: { className: "StoriesStealthMode" },
  }
}

function peerStories(userId: number, maxReadId: number, stories: Api.StoryItem[]): Api.PeerStories {
  return { className: "PeerStories", peer: peerUser(userId), maxReadId, stories } as unknown as Api.PeerStories
}

function makeClient(invoke: ReturnType<typeof vi.fn>) {
  return { invoke } as never
}

// Hoisted so the Set reference stays stable across re-renders — a fresh
// `new Set()` created inside the renderHook callback would change identity on
// every render, forever re-triggering the fetch effect.
const NO_DENIED = new Set<string>()

describe("useStoriesFeed", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("shows cold loading, then success once GetAllStories resolves", async () => {
    let resolveInvoke: (v: unknown) => void = () => {}
    const invoke = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveInvoke = resolve
      }),
    )
    const client = makeClient(invoke)
    const { result } = renderHook(() =>
      useStoriesFeed({ client, nightListHidden: false, appMode: "parent", deniedPeerIds: NO_DENIED }),
    )
    expect(result.current.state).toBe("loading")

    await act(async () => {
      resolveInvoke(allStoriesResponse([peerStories(1, 0, [storyItem(1)])]))
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.state).toBe("success")
    })
    expect(result.current.entries).toHaveLength(1)
  })

  it("resolves to empty when GetAllStories returns no peers", async () => {
    const invoke = vi.fn().mockResolvedValue(allStoriesResponse([]))
    const client = makeClient(invoke)
    const { result } = renderHook(() =>
      useStoriesFeed({ client, nightListHidden: false, appMode: "parent", deniedPeerIds: NO_DENIED }),
    )
    await waitFor(() => {
      expect(result.current.state).toBe("empty")
    })
  })

  it("resolves to empty when every peer's stories have all expired (AC1, ux-design.md:123)", async () => {
    const expiredAt = Math.floor(Date.now() / 1000) - 100
    const invoke = vi.fn().mockResolvedValue(
      allStoriesResponse([peerStories(1, 0, [storyItem(1, { expireDate: expiredAt })])]),
    )
    const client = makeClient(invoke)
    const { result } = renderHook(() =>
      useStoriesFeed({ client, nightListHidden: false, appMode: "parent", deniedPeerIds: NO_DENIED }),
    )
    await waitFor(() => {
      expect(result.current.state).toBe("empty")
    })
    expect(result.current.entries).toEqual([])
  })

  it("resolves to error and keeps entries empty when the fetch rejects", async () => {
    const invoke = vi.fn().mockRejectedValue(new Error("boom"))
    const client = makeClient(invoke)
    const { result } = renderHook(() =>
      useStoriesFeed({ client, nightListHidden: false, appMode: "parent", deniedPeerIds: NO_DENIED }),
    )
    await waitFor(() => {
      expect(result.current.state).toBe("error")
    })
    expect(result.current.entries).toEqual([])
  })

  it("never fetches while night-locked and reports locked immediately (OQ3)", () => {
    const invoke = vi.fn()
    const client = makeClient(invoke)
    const { result } = renderHook(() =>
      useStoriesFeed({ client, nightListHidden: true, appMode: "child", deniedPeerIds: NO_DENIED }),
    )
    expect(result.current.state).toBe("locked")
    expect(invoke).not.toHaveBeenCalled()
  })

  it("omits a denied private peer in child mode (OQ3) — falls through to empty when it was the only entry", async () => {
    const invoke = vi.fn().mockResolvedValue(allStoriesResponse([peerStories(42, 0, [storyItem(1)])]))
    const client = makeClient(invoke)
    const denied = new Set(["42"])
    const { result } = renderHook(() =>
      useStoriesFeed({
        client,
        nightListHidden: false,
        appMode: "child",
        deniedPeerIds: denied,
      }),
    )
    await waitFor(() => {
      expect(result.current.state).toBe("empty")
    })
  })

  it("keeps a denied peer visible in parent mode (deny-list only applies in child mode)", async () => {
    const invoke = vi.fn().mockResolvedValue(allStoriesResponse([peerStories(42, 0, [storyItem(1)])]))
    const client = makeClient(invoke)
    const denied = new Set(["42"])
    const { result } = renderHook(() =>
      useStoriesFeed({
        client,
        nightListHidden: false,
        appMode: "parent",
        deniedPeerIds: denied,
      }),
    )
    await waitFor(() => {
      expect(result.current.state).toBe("success")
    })
  })

  it("markPeerRead optimistically raises maxReadId without a refetch", async () => {
    const invoke = vi.fn().mockResolvedValue(allStoriesResponse([peerStories(1, 0, [storyItem(1)])]))
    const client = makeClient(invoke)
    const { result } = renderHook(() =>
      useStoriesFeed({ client, nightListHidden: false, appMode: "parent", deniedPeerIds: NO_DENIED }),
    )
    await waitFor(() => {
      expect(result.current.state).toBe("success")
    })
    act(() => {
      result.current.markPeerRead("1", 1)
    })
    expect(result.current.entries[0]!.maxReadId).toBe(1)
    expect(invoke).toHaveBeenCalledTimes(1)
  })

  it("refresh() re-invokes GetAllStories without resetting to the cold loading state (rings never blank on reopen)", async () => {
    const invoke = vi.fn().mockResolvedValue(allStoriesResponse([peerStories(1, 0, [storyItem(1)])]))
    const client = makeClient(invoke)
    const { result } = renderHook(() =>
      useStoriesFeed({ client, nightListHidden: false, appMode: "parent", deniedPeerIds: NO_DENIED }),
    )
    await waitFor(() => {
      expect(result.current.state).toBe("success")
    })
    act(() => {
      result.current.refresh()
    })
    expect(result.current.state).toBe("refreshing")
    expect(result.current.entries).toHaveLength(1)
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledTimes(2)
    })
  })
})
