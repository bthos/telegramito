import type { Api } from "telegram"
import { describe, expect, it } from "vitest"
import { getMessageMediaPollFromMessage } from "./messagePollMedia"

describe("getMessageMediaPollFromMessage", () => {
  it("reads top-level MessageMediaPoll", () => {
    const pollWrap = {
      className: "MessageMediaPoll" as const,
      poll: { className: "Poll" as const },
      results: { className: "PollResults" as const },
    }
    const m = {
      className: "Message" as const,
      id: 1,
      media: pollWrap,
    } as unknown as Api.Message
    expect(getMessageMediaPollFromMessage(m)).toBe(pollWrap)
  })

  it("reads poll nested in MessageMediaPaidMedia", () => {
    const pollWrap = {
      className: "MessageMediaPoll" as const,
      poll: { className: "Poll" as const },
      results: { className: "PollResults" as const },
    }
    const paid = {
      className: "MessageMediaPaidMedia" as const,
      starsAmount: { toString: () => "1" },
      extendedMedia: [
        {
          className: "MessageExtendedMedia" as const,
          media: pollWrap,
        },
      ],
    }
    const m = {
      className: "Message" as const,
      id: 2,
      media: paid,
    } as unknown as Api.Message
    expect(getMessageMediaPollFromMessage(m)).toBe(pollWrap)
  })

  it("returns null when no poll", () => {
    const m = {
      className: "Message" as const,
      id: 3,
      media: null,
    } as unknown as Api.Message
    expect(getMessageMediaPollFromMessage(m)).toBeNull()
  })
})
