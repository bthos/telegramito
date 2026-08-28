/**
 * AC-T18 (migrate-teleproto, Cycle A): outbound markdown is threaded from the
 * compose box into the send calls.
 *
 * `parseComposeMarkdown` itself is unit-tested in
 * `src/telegram/composeMarkdown.test.ts`; here we prove `onSend` wires its
 * output into `client.sendMessage`, `sendInForumThread` and `client.sendFile`,
 * and sends verbatim (no `formattingEntities`) when the parse is not lossless.
 */
import { renderHook, act } from "@testing-library/react"
import { Api } from "teleproto"
import type { TelegramClient } from "teleproto"
import type { Dialog } from "teleproto/tl/custom/dialog"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import type { ParentalSettings } from "../parental/types"
import { sendInForumThread } from "../telegram/forum"
import { useChatCompose, type UseChatComposeOpts } from "./useChatCompose"

vi.mock("../telegram/forum", async (orig) => ({
  ...(await orig<typeof import("../telegram/forum")>()),
  sendInForumThread: vi.fn(async () => ({}) as Api.TypeUpdates),
}))

beforeAll(() => {
  // useDraftAttachments -> makeDraft() calls these; jsdom lacks createObjectURL.
  globalThis.URL.createObjectURL ??= () => "blob:mock"
  globalThis.URL.revokeObjectURL ??= () => {}
  // useChatCompose reads window.matchMedia for reduced-motion; jsdom lacks it.
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  }
})

function makeClient() {
  const sendMessage = vi.fn(
    (_entity: unknown, _params: unknown): Promise<Api.Message> =>
      Promise.resolve({} as Api.Message),
  )
  const sendFile = vi.fn(
    (_entity: unknown, _params: unknown): Promise<Api.Message> =>
      Promise.resolve({} as Api.Message),
  )
  const client = {
    sendMessage,
    sendFile,
    getInputEntity: vi.fn(async () => ({ className: "InputPeerUser" })),
  } as unknown as TelegramClient
  return { client, sendMessage, sendFile }
}

function makeOpts(over: Partial<UseChatComposeOpts>): UseChatComposeOpts {
  return {
    client: makeClient().client,
    dialog: { entity: { className: "User" } } as unknown as Dialog,
    settings: { appMode: "adult" } as unknown as ParentalSettings,
    lettersLayout: true,
    lettersSendIconOnly: false,
    isForum: false,
    topicId: null,
    topicsLoading: false,
    topicsErr: null,
    topicsLength: 0,
    replyingTo: null,
    setReplyingTo: vi.fn(),
    messageActionError: null,
    setMessageActionError: vi.fn(),
    scrollToLatestMessages: vi.fn(),
    refreshHead: vi.fn(async () => {}),
    onFreshMailDismissed: vi.fn(),
    notifyTyping: vi.fn(),
    dialogPeerKey: "u:1",
    convKey: "u:1|direct",
    ...over,
  }
}

/** Mount the hook and put `value` in its textarea ref (what `onSend` reads). */
function mountWith(value: string, opts: UseChatComposeOpts) {
  const hook = renderHook(() => useChatCompose(opts))
  const ta = document.createElement("textarea")
  ta.value = value
  hook.result.current.textareaRef.current = ta
  return hook
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("useChatCompose onSend — direct chat markdown (AC-T18)", () => {
  it("passes stripped text + formattingEntities for well-formed markdown", async () => {
    const { client, sendMessage } = makeClient()
    const opts = makeOpts({ client })
    const { result } = mountWith("**bold**", opts)

    await act(async () => {
      await result.current.onSend()
    })

    expect(sendMessage).toHaveBeenCalledTimes(1)
    const [, params] = sendMessage.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(params.message).toBe("bold")
    expect(Array.isArray(params.formattingEntities)).toBe(true)
    expect((params.formattingEntities as Api.TypeMessageEntity[])[0]).toBeInstanceOf(
      Api.MessageEntityBold,
    )
  })

  it("sends verbatim with no formattingEntities when delimiters are unmatched", async () => {
    const { client, sendMessage } = makeClient()
    const { result } = mountWith("a**b", makeOpts({ client }))

    await act(async () => {
      await result.current.onSend()
    })

    const [, params] = sendMessage.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(params.message).toBe("a**b")
    expect(params.formattingEntities).toBeUndefined()
  })

  it("sends plain text unchanged", async () => {
    const { client, sendMessage } = makeClient()
    const { result } = mountWith("just text", makeOpts({ client }))

    await act(async () => {
      await result.current.onSend()
    })

    const [, params] = sendMessage.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(params.message).toBe("just text")
    expect(params.formattingEntities).toBeUndefined()
  })
})

describe("useChatCompose onSend — forum thread markdown (AC-T18)", () => {
  it("threads stripped text + entities into sendInForumThread", async () => {
    const { client } = makeClient()
    const opts = makeOpts({
      client,
      isForum: true,
      topicId: 42,
      topicsLength: 1,
      convKey: "forum:42",
      dialogPeerKey: "forum",
    })
    const { result } = mountWith("__it__", opts)

    await act(async () => {
      await result.current.onSend()
    })

    expect(sendInForumThread).toHaveBeenCalledTimes(1)
    const call = (sendInForumThread as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    // (client, entity, text, topicId, replyToId, formattingEntities)
    expect(call[2]).toBe("it")
    expect(call[3]).toBe(42)
    expect(Array.isArray(call[5])).toBe(true)
    expect((call[5] as Api.TypeMessageEntity[])[0]).toBeInstanceOf(Api.MessageEntityItalic)
  })
})

describe("useChatCompose onSend — media caption markdown (AC-T18)", () => {
  it("passes stripped caption + formattingEntities to sendFile for the first item", async () => {
    const { client, sendFile } = makeClient()
    const opts = makeOpts({ client })
    const { result } = mountWith("**cap**", opts)

    await act(async () => {
      result.current.addFiles([new File(["x"], "a.png", { type: "image/png" })])
    })
    await act(async () => {
      await result.current.onSend()
    })

    expect(sendFile).toHaveBeenCalledTimes(1)
    const [, params] = sendFile.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(params.caption).toBe("cap")
    expect((params.formattingEntities as Api.TypeMessageEntity[])[0]).toBeInstanceOf(
      Api.MessageEntityBold,
    )
  })
})
