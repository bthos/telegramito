import { describe, expect, it, vi } from "vitest"
import { Api } from "teleproto"
import bigInt from "big-integer"
import { markChatReadUpTo, maxMessageIdInBatch, readMaxIdForMarkRead } from "./markChatRead"

describe("maxMessageIdInBatch", () => {
  it("returns undefined for empty list", () => {
    expect(maxMessageIdInBatch([])).toBeUndefined()
  })

  it("returns max id", () => {
    const a = { className: "Message" as const, id: 10 } as Api.Message
    const b = { className: "Message" as const, id: 30 } as Api.Message
    const c = { className: "Message" as const, id: 20 } as Api.Message
    expect(maxMessageIdInBatch([a, b, c])).toBe(30)
  })
})

describe("readMaxIdForMarkRead", () => {
  it("uses forum topic topMessage when higher than loaded batch max", () => {
    const msg = { className: "Message" as const, id: 40 } as Api.Message
    const topic = {
      className: "ForumTopic" as const,
      topMessage: 999,
    } as Api.ForumTopic
    expect(readMaxIdForMarkRead([msg], { isForum: true, topic })).toBe(999)
  })

  it("uses list max when forum topMessage is absent", () => {
    const msg = { className: "Message" as const, id: 55 } as Api.Message
    const topic = { className: "ForumTopic" as const, topMessage: 0 } as Api.ForumTopic
    expect(readMaxIdForMarkRead([msg], { isForum: true, topic })).toBe(55)
  })

  it("ignores topic merge when not forum", () => {
    const msg = { className: "Message" as const, id: 12 } as Api.Message
    const topic = {
      className: "ForumTopic" as const,
      topMessage: 9000,
    } as Api.ForumTopic
    expect(readMaxIdForMarkRead([msg], { isForum: false, topic })).toBe(12)
  })
})

function clientFor(peer: Api.TypeInputPeer) {
  const invoke = vi.fn(async (_req: unknown) => true)
  const client = { getInputEntity: vi.fn(async () => peer), invoke } as never
  return { client, invoke }
}

describe("markChatReadUpTo", () => {
  it("uses channels.ReadHistory for channels and supergroups (messages.ReadHistory rejects them)", async () => {
    const { client, invoke } = clientFor(
      new Api.InputPeerChannel({ channelId: bigInt(1371514299), accessHash: bigInt(77) }),
    )
    await markChatReadUpTo(client, {} as never, 980001, { isForum: false, topicId: null })
    expect(invoke).toHaveBeenCalledTimes(1)
    const req = invoke.mock.calls[0]![0] as Api.channels.ReadHistory
    expect(req).toBeInstanceOf(Api.channels.ReadHistory)
    expect(req.maxId).toBe(980001)
    expect((req.channel as Api.InputChannel).className).toBe("InputChannel")
  })

  it("uses messages.ReadHistory for users and basic groups", async () => {
    const { client, invoke } = clientFor(
      new Api.InputPeerUser({ userId: bigInt(5), accessHash: bigInt(9) }),
    )
    await markChatReadUpTo(client, {} as never, 12, { isForum: false, topicId: null })
    expect(invoke.mock.calls[0]![0]).toBeInstanceOf(Api.messages.ReadHistory)
  })

  it("reads a forum topic through messages.ReadDiscussion", async () => {
    const { client, invoke } = clientFor(
      new Api.InputPeerChannel({ channelId: bigInt(1), accessHash: bigInt(2) }),
    )
    await markChatReadUpTo(client, {} as never, 40, { isForum: true, topicId: 7 })
    expect(invoke.mock.calls[0]![0]).toBeInstanceOf(Api.messages.ReadDiscussion)
  })
})
