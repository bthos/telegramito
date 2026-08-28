import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import type { Api } from "teleproto"
import { StoriesRailStrip } from "./StoriesRailStrip"
import { useStoriesFeed } from "../hooks/useStoriesFeed"
import type { StoryPeerEntry } from "../telegram/storiesFeed"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key),
  }),
}))

vi.mock("../hooks/useStoriesFeed")
const mockedUseStoriesFeed = vi.mocked(useStoriesFeed)

vi.mock("./StoryViewer", () => ({
  StoryViewer: ({ startIndex }: { startIndex: number }) => (
    <div data-testid="story-viewer" data-start-index={startIndex} />
  ),
}))

function entry(overrides: Partial<StoryPeerEntry> & { peerKey: string }): StoryPeerEntry {
  return {
    peer: { className: "PeerUser", userId: 1 } as unknown as Api.TypePeer,
    name: "Anna",
    isOwn: false,
    maxReadId: 0,
    stories: [
      { className: "StoryItem", id: 1, date: 1, expireDate: 2, media: {} as never } as unknown as Api.StoryItem,
    ],
    ...overrides,
  }
}

function feedResult(overrides: Partial<ReturnType<typeof useStoriesFeed>>): ReturnType<typeof useStoriesFeed> {
  return {
    state: "success",
    entries: [],
    refresh: vi.fn(),
    markPeerRead: vi.fn(),
    ...overrides,
  }
}

describe("StoriesRailStrip", () => {
  it("renders a shimmer placeholder grid while loading (cold)", () => {
    mockedUseStoriesFeed.mockReturnValue(feedResult({ state: "loading", entries: [] }))
    render(
      <StoriesRailStrip client={null} appMode="parent" nightListHidden={false} deniedPeerIds={new Set()} />,
    )
    expect(screen.getByRole("status", { name: /railAria/ })).toBeTruthy()
  })

  it("shows the night-lock notice and no postcards when locked (OQ3)", () => {
    mockedUseStoriesFeed.mockReturnValue(feedResult({ state: "locked", entries: [] }))
    render(
      <StoriesRailStrip
        client={null}
        appMode="child"
        nightListHidden
        nightWindow={{ start: "22:00", end: "07:00" }}
        deniedPeerIds={new Set()}
      />,
    )
    expect(screen.getByText(/lockedNotice/)).toBeTruthy()
    expect(screen.queryByRole("list")).toBeNull()
  })

  it("shows the empty-state placeholder (AC8)", () => {
    mockedUseStoriesFeed.mockReturnValue(feedResult({ state: "empty", entries: [] }))
    render(<StoriesRailStrip client={null} appMode="parent" nightListHidden={false} deniedPeerIds={new Set()} />)
    expect(screen.getByText("letters.stories.empty")).toBeTruthy()
  })

  it("shows an error message with a retry action that calls refresh()", () => {
    const refresh = vi.fn()
    mockedUseStoriesFeed.mockReturnValue(feedResult({ state: "error", entries: [], refresh }))
    render(<StoriesRailStrip client={null} appMode="parent" nightListHidden={false} deniedPeerIds={new Set()} />)
    fireEvent.click(screen.getByText("letters.stories.retry"))
    expect(refresh).toHaveBeenCalledOnce()
  })

  it("gives unread and read postcards distinct accessible names, never color-only (AC2)", () => {
    mockedUseStoriesFeed.mockReturnValue(
      feedResult({
        state: "success",
        entries: [
          entry({ peerKey: "1", name: "Anna", maxReadId: 0 }),
          entry({ peerKey: "2", name: "Marco", maxReadId: 99 }),
        ],
      }),
    )
    render(<StoriesRailStrip client={null} appMode="parent" nightListHidden={false} deniedPeerIds={new Set()} />)
    const buttons = screen.getAllByRole("listitem")
    expect(buttons[0]!.getAttribute("aria-label")).toContain("ringAriaUnread")
    expect(buttons[1]!.getAttribute("aria-label")).toContain("ringAriaRead")
  })

  it("opens the StoryViewer at the tapped peer's index", () => {
    mockedUseStoriesFeed.mockReturnValue(
      feedResult({
        state: "success",
        entries: [entry({ peerKey: "1", name: "Anna" }), entry({ peerKey: "2", name: "Marco" })],
      }),
    )
    render(<StoriesRailStrip client={null} appMode="parent" nightListHidden={false} deniedPeerIds={new Set()} />)
    expect(screen.queryByTestId("story-viewer")).toBeNull()
    fireEvent.click(screen.getAllByRole("listitem")[1]!)
    const viewer = screen.getByTestId("story-viewer")
    expect(viewer.getAttribute("data-start-index")).toBe("1")
  })
})
