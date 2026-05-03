import { Api } from "telegram"
import { describe, expect, it } from "vitest"
import {
  coerceMessageId,
  getTickState,
  isBroadcastChannelEntity,
  readOutboxMaxIdFromDialog,
} from "./messageTickState"

function msg(partial: Partial<Api.Message> & { id: number }): Api.Message {
  return {
    className: "Message",
    out: true,
    mediaUnread: false,
    ...partial,
  } as Api.Message
}

describe("messageTickState", () => {
  it("readOutboxMaxIdFromDialog coerces dialog cursor", () => {
    const dialog = { dialog: { readOutboxMaxId: 42 } } as never
    expect(readOutboxMaxIdFromDialog(dialog)).toBe(42)
  })

  it("coerceMessageId handles bigint-like objects", () => {
    expect(coerceMessageId({ toString: () => "7" })).toBe(7)
  })

  it("isBroadcastChannelEntity is true for broadcast non-megagroup Channel", () => {
    const ch = {
      className: "Channel" as const,
      broadcast: true,
      megagroup: false,
    } as Api.Channel
    expect(isBroadcastChannelEntity(ch)).toBe(true)
    expect(
      isBroadcastChannelEntity({
        className: "Channel",
        broadcast: true,
        megagroup: true,
      } as Api.Channel),
    ).toBe(false)
  })

  it("returns null for inbound", () => {
    const m = msg({ id: 1, out: false })
    expect(getTickState(m, 99)).toBeNull()
  })

  it("returns null for non-Message", () => {
    const m = { className: "MessageService", id: 1, out: true } as unknown as Api.Message
    expect(getTickState(m, 0)).toBeNull()
  })

  it("broadcast channel outbound is always sent", () => {
    const m = msg({ id: 100, mediaUnread: true })
    expect(getTickState(m, 200, { isBroadcastChannel: true })).toBe("sent")
  })

  it("read when id <= readOutboxMaxId", () => {
    expect(getTickState(msg({ id: 10, mediaUnread: true }), 10)).toBe("read")
    expect(getTickState(msg({ id: 10, mediaUnread: false }), 11)).toBe("read")
  })

  it("delivered when id > readOutboxMaxId and !mediaUnread", () => {
    expect(getTickState(msg({ id: 11, mediaUnread: false }), 10)).toBe("delivered")
  })

  it("sent when id > readOutboxMaxId and mediaUnread", () => {
    expect(getTickState(msg({ id: 11, mediaUnread: true }), 10)).toBe("sent")
  })

  it("boundary: id === readOutboxMaxId + 1 with mediaUnread true → sent", () => {
    expect(getTickState(msg({ id: 11, mediaUnread: true }), 10)).toBe("sent")
  })
})
