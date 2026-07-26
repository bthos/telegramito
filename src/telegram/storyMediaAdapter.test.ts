import { Api } from "telegram"
import { describe, expect, it } from "vitest"
import { buildStoryMediaMessage } from "./storyMediaAdapter"

describe("buildStoryMediaMessage", () => {
  it("wraps a story's media/id/date/peer into an Api.Message-shaped adapter (AC12)", () => {
    const peer = { className: "PeerUser", userId: 42 } as unknown as Api.TypePeer
    const media = { className: "MessageMediaPhoto" } as unknown as Api.TypeMessageMedia
    const story = {
      className: "StoryItem",
      id: 7,
      date: 1_700_000_000,
      expireDate: 1_700_086_400,
      media,
      out: true,
    } as unknown as Api.StoryItem

    const msg = buildStoryMediaMessage(story, peer)

    expect(msg.id).toBe(7)
    expect(msg.media).toBe(media)
    expect(msg.peerId).toBe(peer)
    expect(msg.date).toBe(1_700_000_000)
    expect(msg.out).toBe(true)
    expect(msg instanceof Api.Message).toBe(true)
  })

  it("defaults out to false when the story wasn't posted by the viewer", () => {
    const peer = { className: "PeerUser", userId: 1 } as unknown as Api.TypePeer
    const story = {
      className: "StoryItem",
      id: 1,
      date: 1,
      expireDate: 2,
      media: { className: "MessageMediaPhoto" } as unknown as Api.TypeMessageMedia,
    } as unknown as Api.StoryItem

    const msg = buildStoryMediaMessage(story, peer)
    expect(msg.out).toBe(false)
  })
})
