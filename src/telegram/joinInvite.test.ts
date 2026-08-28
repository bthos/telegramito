import { describe, expect, it, vi } from "vitest"
import { Api } from "teleproto"
import bigInt from "big-integer"
import type { TelegramClient } from "teleproto"
import { checkInvite, joinByInviteHash, joinByUsername } from "./joinInvite"

function clientReturning(result: unknown) {
  const invoke = vi.fn((_req: unknown) => Promise.resolve(result))
  return { client: { invoke } as unknown as TelegramClient, invoke }
}

describe("checkInvite", () => {
  it("ChatInvite → normalised preview", async () => {
    const { client } = clientReturning(
      new Api.ChatInvite({
        title: "Cool Channel",
        about: "about text",
        participantsCount: 1234,
        channel: true,
        photo: new Api.PhotoEmpty({ id: bigInt(0) }),
        color: 0,
      } as never),
    )
    await expect(checkInvite(client, "HASH")).resolves.toEqual({
      kind: "invite",
      title: "Cool Channel",
      about: "about text",
      participantsCount: 1234,
      isChannel: true,
      requestNeeded: false,
      hash: "HASH",
    })
  })

  it("ChatInviteAlready → { kind: 'already' }", async () => {
    const { client } = clientReturning(
      new Api.ChatInviteAlready({
        chat: new Api.Chat({ id: bigInt(42), title: "x" } as never),
      } as never),
    )
    const out = await checkInvite(client, "HASH")
    expect(out.kind).toBe("already")
  })
})

describe("join calls route through the result unwrapper (AC-J2)", () => {
  it("joinByInviteHash: Ok result → { kind: 'ok' }", async () => {
    const updates = new Api.Updates({ updates: [], users: [], chats: [], date: 0, seq: 0 } as never)
    const { client, invoke } = clientReturning(
      new Api.messages.ChatInviteJoinResultOk({ updates } as never),
    )
    const out = await joinByInviteHash(client, "HASH")
    expect(out).toEqual({ kind: "ok", updates })
    expect((invoke.mock.calls[0][0] as { className?: string }).className).toBe(
      "messages.ImportChatInvite",
    )
  })

  it("joinByUsername: WebView result → { kind: 'webview' } with no url", async () => {
    const { client, invoke } = clientReturning(
      new Api.messages.ChatInviteJoinResultWebView({
        botId: bigInt(1),
        queryId: bigInt(2),
        users: [],
      } as never),
    )
    const out = await joinByUsername(client, "durov")
    expect(out.kind).toBe("webview")
    expect("url" in out).toBe(false)
    expect((invoke.mock.calls[0][0] as { className?: string }).className).toBe(
      "channels.JoinChannel",
    )
  })
})
