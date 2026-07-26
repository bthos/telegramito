import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"
import type { Api } from "telegram"
import { StoryViewer } from "./StoryViewer"
import type { StoryPeerEntry } from "../telegram/storiesFeed"
import { incrementStoryViews, readStoriesForPeer } from "../telegram/storiesFeed"
import { __resetHardwareBackForTests } from "../hooks/useHardwareBack"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key),
  }),
}))

vi.mock("./MessageMediaView", () => ({
  MessageMediaView: () => <div data-testid="story-media" />,
}))

vi.mock("../telegram/storiesFeed", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../telegram/storiesFeed")>()
  return {
    ...actual,
    readStoriesForPeer: vi.fn().mockResolvedValue(undefined),
    incrementStoryViews: vi.fn().mockResolvedValue(undefined),
  }
})

function peerUser(id: number): Api.TypePeer {
  return { className: "PeerUser", userId: id } as unknown as Api.TypePeer
}

function s(id: number): Api.StoryItem {
  return {
    className: "StoryItem",
    id,
    date: 1000 + id,
    expireDate: 999999,
    media: { className: "MessageMediaPhoto" } as unknown as Api.TypeMessageMedia,
  } as unknown as Api.StoryItem
}

function makeEntries(): StoryPeerEntry[] {
  return [
    {
      peer: peerUser(1),
      peerKey: "1",
      name: "Anna",
      isOwn: false,
      maxReadId: 1,
      stories: [s(1), s(2)],
    },
    {
      peer: peerUser(2),
      peerKey: "2",
      name: "Marco",
      isOwn: false,
      maxReadId: 0,
      stories: [s(10)],
    },
  ]
}

describe("StoryViewer", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    __resetHardwareBackForTests()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    __resetHardwareBackForTests()
  })

  it("resumes an unread peer at the first story past maxReadId (AC2/AC6 semantics)", () => {
    const entries = makeEntries()
    render(<StoryViewer client={null} entries={entries} startIndex={0} onMarkPeerRead={vi.fn()} onClose={vi.fn()} />)
    // maxReadId=1 → story id 1 is read, story id 2 (index 1) is the resume point → 1 "done" segment.
    const segs = document.querySelectorAll(".letters-story-viewer__seg")
    expect(segs[0]!.className).toContain("done")
    expect(segs[1]!.className).toContain("active")
  })

  it("tap-right advances within a peer's stack, tap-left goes back", () => {
    const entries = [
      { peer: peerUser(1), peerKey: "1", name: "Anna", isOwn: false, maxReadId: 0, stories: [s(1), s(2)] },
    ]
    render(<StoryViewer client={null} entries={entries} startIndex={0} onMarkPeerRead={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByLabelText("letters.stories.next"))
    expect(document.querySelectorAll(".letters-story-viewer__seg")[0]!.className).toContain("done")
    fireEvent.click(screen.getByLabelText("letters.stories.prev"))
    expect(document.querySelectorAll(".letters-story-viewer__seg")[0]!.className).toContain("active")
  })

  it("tap-left at the first story of the first peer is a no-op (does not close)", () => {
    const onClose = vi.fn()
    const entries = [{ peer: peerUser(1), peerKey: "1", name: "Anna", isOwn: false, maxReadId: 0, stories: [s(1)] }]
    render(<StoryViewer client={null} entries={entries} startIndex={0} onMarkPeerRead={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText("letters.stories.prev"))
    expect(onClose).not.toHaveBeenCalled()
  })

  it("tap-right at the last story of the last peer closes and commits reads (AC6)", () => {
    const onClose = vi.fn()
    const onMarkPeerRead = vi.fn()
    const entries = [{ peer: peerUser(1), peerKey: "1", name: "Anna", isOwn: false, maxReadId: 0, stories: [s(5)] }]
    render(
      <StoryViewer client={{} as never} entries={entries} startIndex={0} onMarkPeerRead={onMarkPeerRead} onClose={onClose} />,
    )
    fireEvent.click(screen.getByLabelText("letters.stories.next"))
    expect(onClose).toHaveBeenCalledOnce()
    expect(onMarkPeerRead).toHaveBeenCalledWith("1", 5)
    expect(vi.mocked(readStoriesForPeer)).toHaveBeenCalledWith({}, entries[0]!.peer, 5)
    expect(vi.mocked(incrementStoryViews)).toHaveBeenCalledWith({}, entries[0]!.peer, [5])
  })

  it("advancing past a peer's last story moves to the next peer's first story", () => {
    const entries = [
      { peer: peerUser(1), peerKey: "1", name: "Anna", isOwn: false, maxReadId: 1, stories: [s(1), s(2)] },
      // Marco has 2 stories here (not 1, as in makeEntries()) so landing on
      // segs[0] active below proves an unconditional index-0 landing (AC4/DR9
      // node R) rather than a coincidence of a single-story stack — the
      // forward-cascade mirror of the backward-cascade test below.
      { peer: peerUser(2), peerKey: "2", name: "Marco", isOwn: false, maxReadId: 0, stories: [s(10), s(11)] },
    ]
    render(<StoryViewer client={null} entries={entries} startIndex={0} onMarkPeerRead={vi.fn()} onClose={vi.fn()} />)
    // entries[0]'s resume point (maxReadId=1, stories [1,2]) is already its last story (index 1),
    // so a single tap-right advances straight to the next peer.
    fireEvent.click(screen.getByLabelText("letters.stories.next"))
    expect(screen.getByText("Marco")).toBeTruthy()
    const segs = document.querySelectorAll(".letters-story-viewer__seg")
    expect(segs).toHaveLength(2)
    expect(segs[0]!.className).toContain("active")
  })

  it("tap-left at the first story of a later peer jumps to the previous peer's LAST story, not a resume point (AC4 backward cascade)", () => {
    const entries = [
      // Fully read (maxReadId 99 >= every story id) — if the viewer wrongly
      // re-applied resume-point logic on this cascade, it would land on
      // index 0 instead of the last story. ux-design.md's flow diagram (U)
      // says "previous peer, their last story" unconditionally.
      { peer: peerUser(1), peerKey: "1", name: "Anna", isOwn: false, maxReadId: 99, stories: [s(1), s(2)] },
      { peer: peerUser(2), peerKey: "2", name: "Marco", isOwn: false, maxReadId: 0, stories: [s(10)] },
    ]
    render(<StoryViewer client={null} entries={entries} startIndex={1} onMarkPeerRead={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText("Marco")).toBeTruthy()

    fireEvent.click(screen.getByLabelText("letters.stories.prev"))

    expect(screen.getByText("Anna")).toBeTruthy()
    const segs = document.querySelectorAll(".letters-story-viewer__seg")
    expect(segs).toHaveLength(2)
    expect(segs[0]!.className).toContain("done")
    expect(segs[1]!.className).toContain("active")
  })

  it("renders viewer chrome — avatar, peer name, relative age, and a working close button that commits reads (AC3/AC6)", () => {
    const onClose = vi.fn()
    const onMarkPeerRead = vi.fn()
    const entries = [{ peer: peerUser(1), peerKey: "1", name: "Anna", isOwn: false, maxReadId: 0, stories: [s(1)] }]
    render(
      <StoryViewer client={{} as never} entries={entries} startIndex={0} onMarkPeerRead={onMarkPeerRead} onClose={onClose} />,
    )

    // AC3 leads with "full-bleed photo/video media" — assert the adapter's
    // output actually reaches the media pipeline, not just the chrome around it.
    expect(screen.getByTestId("story-media")).toBeTruthy()
    expect(document.querySelector(".letters-story-viewer__top .peer-avatar")).toBeTruthy()
    expect(screen.getByText("Anna")).toBeTruthy()
    const when = document.querySelector(".letters-story-viewer__when")
    expect(when?.textContent).toMatch(/^(now|\d+[mhd])$/)

    const closeBtn = screen.getByLabelText("letters.stories.close")
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledOnce()
    expect(onMarkPeerRead).toHaveBeenCalledWith("1", 1)
    expect(vi.mocked(readStoriesForPeer)).toHaveBeenCalledWith({}, entries[0]!.peer, 1)
  })

  it("never emits ReadStories/IncrementStoryViews for the viewer's own story (Key Decision)", () => {
    const onClose = vi.fn()
    const entries = [{ peer: peerUser(1), peerKey: "me", name: "You", isOwn: true, maxReadId: 0, stories: [s(1)] }]
    render(<StoryViewer client={{} as never} entries={entries} startIndex={0} onMarkPeerRead={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText("letters.stories.next"))
    expect(onClose).toHaveBeenCalledOnce()
    expect(vi.mocked(readStoriesForPeer)).not.toHaveBeenCalled()
    expect(vi.mocked(incrementStoryViews)).not.toHaveBeenCalled()
  })

  it("ArrowRight/ArrowLeft keyboard mirror the tap zones", () => {
    const entries = [
      { peer: peerUser(1), peerKey: "1", name: "Anna", isOwn: false, maxReadId: 0, stories: [s(1), s(2)] },
    ]
    render(<StoryViewer client={null} entries={entries} startIndex={0} onMarkPeerRead={vi.fn()} onClose={vi.fn()} />)
    fireEvent.keyDown(window, { key: "ArrowRight" })
    expect(document.querySelectorAll(".letters-story-viewer__seg")[0]!.className).toContain("done")
    fireEvent.keyDown(window, { key: "ArrowLeft" })
    expect(document.querySelectorAll(".letters-story-viewer__seg")[0]!.className).toContain("active")
  })

  it("auto-advances after the fixed story duration (AC5)", () => {
    const entries = [
      { peer: peerUser(1), peerKey: "1", name: "Anna", isOwn: false, maxReadId: 0, stories: [s(1), s(2)] },
    ]
    render(<StoryViewer client={null} entries={entries} startIndex={0} onMarkPeerRead={vi.fn()} onClose={vi.fn()} />)
    expect(document.querySelectorAll(".letters-story-viewer__seg")[0]!.className).toContain("active")
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(document.querySelectorAll(".letters-story-viewer__seg")[0]!.className).toContain("done")
  })

  it("closes on Escape (self-contained portal convention, AC7)", () => {
    const onClose = vi.fn()
    const entries = [{ peer: peerUser(1), peerKey: "1", name: "Anna", isOwn: false, maxReadId: 0, stories: [s(1)] }]
    render(<StoryViewer client={null} entries={entries} startIndex={0} onMarkPeerRead={vi.fn()} onClose={onClose} />)
    fireEvent.keyDown(document, { key: "Escape" })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("renders the dialog role, with the close button first in DOM/tab order (AC7 — useFocusTrap.test.ts covers the trap mechanism itself)", () => {
    const entries = makeEntries()
    render(<StoryViewer client={null} entries={entries} startIndex={0} onMarkPeerRead={vi.fn()} onClose={vi.fn()} />)
    const dialog = screen.getByRole("dialog")
    expect(dialog.getAttribute("aria-modal")).toBe("true")

    const focusable = dialog.querySelectorAll("button")
    expect(focusable[0]!.getAttribute("aria-label")).toBe("letters.stories.close")
  })
})
