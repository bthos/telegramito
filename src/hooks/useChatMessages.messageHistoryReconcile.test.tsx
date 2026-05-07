import { renderHook, waitFor } from "@testing-library/react"
import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  BULK_GET_MESSAGES_BY_IDS_CHUNK,
  chunkIdsForGetMessages,
} from "../telegram/messageHistoryReconcile"
import { useChatMessages } from "./useChatMessages"

const { getForumThreadMessagesMock } = vi.hoisted(() => ({
  getForumThreadMessagesMock: vi.fn(),
}))

vi.mock("../telegram/forum", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../telegram/forum")>()
  return {
    ...actual,
    getForumThreadMessages: getForumThreadMessagesMock,
  }
})

function topicReply(topId: number): Api.MessageReplyHeader {
  return new Api.MessageReplyHeader({
    replyToMsgId: 1,
    replyToTopId: topId,
  } as never)
}

function baseMessage(id: number, date: number, topId: number): Api.Message {
  return new Api.Message({
    id,
    message: "",
    date,
    replyTo: topicReply(topId),
  } as never)
}

describe("useChatMessages — sparse search history reconcile (mocked getMessages)", () => {
  const listForViewLengthRef: { current: number } = { current: 0 }
  const entity = { className: "Channel" } as never

  let getMessages: ReturnType<typeof vi.fn>
  let client: TelegramClient

  beforeEach(() => {
    vi.clearAllMocks()
    listForViewLengthRef.current = 0
    getMessages = vi.fn()
    client = {
      connect: vi.fn(async () => {}),
      getMessages,
    } as unknown as TelegramClient
    getForumThreadMessagesMock.mockReset()
  })

  it("reconcile issues one getMessages batch per chunkIdsForGetMessages slice", async () => {
    const lo = 10
    const hi = 14
    const gapIds = [11, 12, 13]
    const expectedSlices = chunkIdsForGetMessages(gapIds, BULK_GET_MESSAGES_BY_IDS_CHUNK)

    getForumThreadMessagesMock.mockResolvedValue([
      baseMessage(lo, 1, 7),
      baseMessage(hi, 2, 7),
    ])

    getMessages.mockImplementation(async (_entity: unknown, opts: { ids?: number[] }) => {
      const ids = opts.ids ?? []
      return ids.map((id) => baseMessage(id, 1, 7))
    })

    renderHook(() =>
      useChatMessages({
        client,
        dialog: { entity } as unknown as Dialog,
        convKey: "conv-gap",
        isForum: true,
        topicId: 7,
        blocked: false,
        appMode: "adult",
        messagesUnreadOnly: false,
        listForViewLengthRef,
        lastMessageTick: 0,
      }),
    )

    await waitFor(() => {
      const multiId = getMessages.mock.calls.filter((c) => {
        const ids = (c[1] as { ids?: number[] } | undefined)?.ids
        return Array.isArray(ids) && ids.length > 1
      })
      expect(multiId.length).toBe(expectedSlices.length)
    })

    const gapFillCalls = getMessages.mock.calls.filter((c) => {
      const ids = (c[1] as { ids?: number[] } | undefined)?.ids
      return Array.isArray(ids) && ids.length > 1
    })
    for (let i = 0; i < expectedSlices.length; i += 1) {
      expect((gapFillCalls[i][1] as { ids: number[] }).ids).toEqual(expectedSlices[i])
    }
  })

  it("media placeholder refetch uses single-id getMessages and merges resolved media", async () => {
    const unsupported = new Api.Message({
      id: 10,
      message: "",
      date: 1,
      replyTo: topicReply(7),
      media: new Api.MessageMediaUnsupported({} as never),
    } as never)
    const neighbor = baseMessage(11, 2, 7)

    getForumThreadMessagesMock.mockResolvedValue([unsupported, neighbor])

    getMessages.mockImplementation(async (_entity: unknown, opts: { ids?: number[] }) => {
      const ids = opts.ids ?? []
      if (ids.length === 1 && ids[0] === 10) {
        return [
          new Api.Message({
            id: 10,
            message: "ok",
            date: 1,
            replyTo: topicReply(7),
            media: new Api.MessageMediaEmpty({} as never),
          } as never),
        ]
      }
      return []
    })

    const { result } = renderHook(() =>
      useChatMessages({
        client,
        dialog: { entity } as unknown as Dialog,
        convKey: "conv-unsup",
        isForum: true,
        topicId: 7,
        blocked: false,
        appMode: "adult",
        messagesUnreadOnly: false,
        listForViewLengthRef,
        lastMessageTick: 0,
      }),
    )

    await waitFor(() => {
      const single = getMessages.mock.calls.filter((c) => {
        const ids = (c[1] as { ids?: number[] } | undefined)?.ids
        return Array.isArray(ids) && ids.length === 1 && ids[0] === 10
      })
      expect(single.length).toBeGreaterThanOrEqual(1)
    })

    await waitFor(() => {
      const m = result.current.list.find((x) => Number(x.id) === 10)
      expect(m?.media?.className).toBe("MessageMediaEmpty")
    })
  })
})
