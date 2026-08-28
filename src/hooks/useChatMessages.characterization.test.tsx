/**
 * Characterization tests for useChatMessages public contract + load/pagination (AC1, AC3).
 * Behavior freeze gate before ChatView / hook split.
 */
import { renderHook, waitFor } from "@testing-library/react"
import { Api } from "teleproto"
import type { TelegramClient } from "teleproto"
import type { Dialog } from "teleproto/tl/custom/dialog"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useChatMessages } from "./useChatMessages"

function baseMessage(id: number, date: number): Api.Message {
  return new Api.Message({
    id,
    message: `m${id}`,
    date,
  } as never)
}

function makeClient(getMessages: ReturnType<typeof vi.fn>): TelegramClient {
  return {
    connect: vi.fn(async () => {}),
    getMessages,
  } as unknown as TelegramClient
}

describe("useChatMessages — public return shape (AC3)", () => {
  const listForViewLengthRef: { current: number } = { current: 0 }

  beforeEach(() => {
    listForViewLengthRef.current = 0
  })

  it("exposes list, pagination flags, and refresh/load/patch APIs", async () => {
    const getMessages = vi.fn(async () => [
      baseMessage(3, 3),
      baseMessage(2, 2),
      baseMessage(1, 1),
    ])
    const { result } = renderHook(() =>
      useChatMessages({
        client: makeClient(getMessages),
        dialog: { entity: { className: "User" } } as unknown as Dialog,
        convKey: "u:1|direct",
        isForum: false,
        topicId: null,
        blocked: false,
        appMode: "adult",
        messagesUnreadOnly: false,
        listForViewLengthRef,
        lastMessageTick: 0,
      }),
    )

    expect(result.current).toEqual(
      expect.objectContaining({
        list: expect.any(Array),
        hasMoreOlder: expect.any(Boolean),
        loadingOlder: expect.any(Boolean),
        refreshHead: expect.any(Function),
        refreshMessagesById: expect.any(Function),
        loadOlder: expect.any(Function),
        patchMessageReactions: expect.any(Function),
      }),
    )

    await waitFor(() => {
      expect(result.current.list.length).toBeGreaterThan(0)
    })
  })
})

describe("useChatMessages — initial load + loadOlder (AC1)", () => {
  const listForViewLengthRef: { current: number } = { current: 0 }

  beforeEach(() => {
    listForViewLengthRef.current = 0
  })

  it("loads head page on mount for a direct chat", async () => {
    const getMessages = vi.fn(async () => [baseMessage(5, 5), baseMessage(4, 4)])

    const { result } = renderHook(() =>
      useChatMessages({
        client: makeClient(getMessages),
        dialog: { entity: { className: "User" } } as unknown as Dialog,
        convKey: "u:load|direct",
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
      expect(result.current.list.map((m) => Number(m.id))).toEqual([4, 5])
    })
    expect(getMessages).toHaveBeenCalled()
    expect(result.current.hasMoreOlder).toBe(true)
  })

  it("reports hasMoreOlder after a non-empty head page", async () => {
    const getMessages = vi.fn(async () => [baseMessage(10, 10), baseMessage(9, 9)])

    const { result } = renderHook(() =>
      useChatMessages({
        client: makeClient(getMessages),
        dialog: { entity: { className: "User" } } as unknown as Dialog,
        convKey: "u:older|direct",
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
      expect(result.current.list.map((m) => Number(m.id))).toEqual([9, 10])
    })
    expect(result.current.hasMoreOlder).toBe(true)
    expect(typeof result.current.loadOlder).toBe("function")
  })

  it("skips initial load when child-mode blocked", async () => {
    const getMessages = vi.fn(async () => [baseMessage(1, 1)])

    const { result } = renderHook(() =>
      useChatMessages({
        client: makeClient(getMessages),
        dialog: { entity: { className: "User" } } as unknown as Dialog,
        convKey: "u:blocked|direct",
        isForum: false,
        topicId: null,
        blocked: true,
        appMode: "child",
        messagesUnreadOnly: false,
        listForViewLengthRef,
        lastMessageTick: 0,
      }),
    )

    await new Promise((r) => setTimeout(r, 40))
    expect(getMessages).not.toHaveBeenCalled()
    expect(result.current.list).toEqual([])
  })
})
