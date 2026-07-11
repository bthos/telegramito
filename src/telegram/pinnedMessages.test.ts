import { describe, expect, it, vi } from "vitest"
import { Api } from "telegram"
import { getPinnedMessages, nextPinnedIndex } from "./pinnedMessages"

const entity = { className: "User" } as never
const inputPeer = { className: "InputPeerUser" }

function pinnedMessage(id: number, date = id): Api.Message {
  return { className: "Message", id, message: `msg ${id}`, date, out: false } as Api.Message
}

function makeClient(invokeResult?: unknown) {
  return {
    getInputEntity: vi.fn().mockResolvedValue(inputPeer),
    invoke: vi.fn().mockResolvedValue(
      invokeResult ?? {
        className: "messages.Messages",
        messages: [],
        users: [],
        chats: [],
      },
    ),
  } as never
}

describe("getPinnedMessages", () => {
  it("searches via messages.Search with InputMessagesFilterPinned and no topMsgId for a plain chat", async () => {
    const client = makeClient()
    await getPinnedMessages(client, entity)
    const c = client as { invoke: ReturnType<typeof vi.fn> }
    expect(c.invoke).toHaveBeenCalledTimes(1)
    const req = c.invoke.mock.calls[0][0] as Api.messages.Search
    expect(req.className).toBe("messages.Search")
    expect(req.filter.className).toBe("InputMessagesFilterPinned")
    expect(req.q).toBe("")
    expect(req.topMsgId).toBeUndefined()
    expect(req.offsetId).toBe(0)
    expect(req.addOffset).toBe(0)
    expect(req.minId).toBe(0)
    expect(req.maxId).toBe(0)
  })

  it("scopes to a forum topic via topMsgId when a topicId is passed", async () => {
    const client = makeClient()
    await getPinnedMessages(client, entity, 42)
    const c = client as { invoke: ReturnType<typeof vi.fn> }
    const req = c.invoke.mock.calls[0][0] as Api.messages.Search
    expect(req.filter.className).toBe("InputMessagesFilterPinned")
    expect(req.topMsgId).toBe(42)
  })

  it("returns only Message items, normalized newest-first", async () => {
    const client = makeClient({
      className: "messages.Messages",
      messages: [
        pinnedMessage(10, 100),
        { className: "MessageService", id: 11, date: 110 },
        pinnedMessage(12, 120),
      ],
      users: [],
      chats: [],
    })
    const out = await getPinnedMessages(client, entity)
    expect(out.map((m) => m.id)).toEqual([12, 10])
  })

  it("returns [] on messages.MessagesNotModified", async () => {
    const client = makeClient({ className: "messages.MessagesNotModified" })
    const out = await getPinnedMessages(client, entity)
    expect(out).toEqual([])
  })
})

describe("nextPinnedIndex", () => {
  it("advances and wraps", () => {
    expect(nextPinnedIndex(0, 3)).toBe(1)
    expect(nextPinnedIndex(1, 3)).toBe(2)
    expect(nextPinnedIndex(2, 3)).toBe(0)
  })
  it("is safe for length 0 and 1", () => {
    expect(nextPinnedIndex(0, 0)).toBe(0)
    expect(nextPinnedIndex(5, 0)).toBe(0)
    expect(nextPinnedIndex(0, 1)).toBe(0)
  })
})
