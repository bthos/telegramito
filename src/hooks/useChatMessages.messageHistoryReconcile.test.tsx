/**
 * Hook-level history edges that do not require mocking `../telegram/forum`.
 * Sparse-gap / media-placeholder algorithms: `src/telegram/messageHistoryReconcile.test.ts`.
 */
import { renderHook, waitFor } from "@testing-library/react"
import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useChatMessages } from "./useChatMessages"

function baseMessage(id: number, date: number): Api.Message {
  return new Api.Message({
    id,
    message: `m${id}`,
    date,
  } as never)
}

describe("useChatMessages — history edges without forum mock (AC1)", () => {
  const listForViewLengthRef: { current: number } = { current: 0 }
  let getMessages: ReturnType<typeof vi.fn>
  let client: TelegramClient

  beforeEach(() => {
    vi.clearAllMocks()
    listForViewLengthRef.current = 0
    getMessages = vi.fn(async () => [baseMessage(2, 2), baseMessage(1, 1)])
    client = {
      connect: vi.fn(async () => {}),
      getMessages,
    } as unknown as TelegramClient
  })

  it("does not load forum history when topicId is null", async () => {
    const { result } = renderHook(() =>
      useChatMessages({
        client,
        dialog: { entity: { className: "Channel" } } as unknown as Dialog,
        convKey: "forum|null",
        isForum: true,
        topicId: null,
        blocked: false,
        appMode: "adult",
        messagesUnreadOnly: false,
        listForViewLengthRef,
        lastMessageTick: 0,
      }),
    )

    await new Promise((r) => setTimeout(r, 40))
    expect(getMessages).not.toHaveBeenCalled()
    expect(result.current.list).toEqual([])
  })

  it("exposes refreshMessagesById after a successful direct-chat head load", async () => {
    const { result } = renderHook(() =>
      useChatMessages({
        client,
        dialog: { entity: { className: "User" } } as unknown as Dialog,
        convKey: "u:refresh|direct",
        isForum: false,
        topicId: null,
        blocked: false,
        appMode: "adult",
        messagesUnreadOnly: false,
        listForViewLengthRef,
        lastMessageTick: 0,
      }),
    )

    await waitFor(() => {
      expect(result.current.list.length).toBe(2)
    })
    expect(typeof result.current.refreshMessagesById).toBe("function")
    await expect(result.current.refreshMessagesById([2])).resolves.toBeUndefined()
  })
})
