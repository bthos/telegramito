import { describe, expect, it } from "vitest"
import { Api } from "teleproto"
import bigInt from "big-integer"
import {
  UnknownChatInviteJoinResultError,
  unwrapChatInviteJoinResult,
} from "./chatInviteJoinResult"

describe("unwrapChatInviteJoinResult (AC-J1 / AC-J4)", () => {
  it("Ok → { kind: 'ok', updates }", () => {
    const updates = new Api.Updates({
      updates: [],
      users: [],
      chats: [],
      date: 0,
      seq: 0,
    } as never)
    const out = unwrapChatInviteJoinResult(
      new Api.messages.ChatInviteJoinResultOk({ updates } as never),
    )
    expect(out).toEqual({ kind: "ok", updates })
  })

  it("WebView → structured shape with NO invented `url` (D6)", () => {
    const out = unwrapChatInviteJoinResult(
      new Api.messages.ChatInviteJoinResultWebView({
        botId: bigInt(555),
        queryId: bigInt(999),
        users: [],
      } as never),
    )
    expect(out.kind).toBe("webview")
    expect(out).toEqual({ kind: "webview", botId: "555", queryId: "999", users: [] })
    expect("url" in out).toBe(false)
  })

  it("unknown / future variant → typed error, never a silent no-op", () => {
    const bogus = { className: "messages.ChatInviteJoinResultSomethingNew" }
    expect(() =>
      unwrapChatInviteJoinResult(bogus as never),
    ).toThrowError(UnknownChatInviteJoinResultError)
    try {
      unwrapChatInviteJoinResult(bogus as never)
    } catch (e) {
      expect((e as UnknownChatInviteJoinResultError).resultClassName).toBe(
        "messages.ChatInviteJoinResultSomethingNew",
      )
    }
  })
})
