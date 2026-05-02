import { renderHook, act, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import type { TelegramClient } from "telegram"

// Prevent loading the full GramJS library (~400MB) in the test worker.
vi.mock("telegram/events", () => ({
  Raw: class MockRaw {
    constructor(_opts: unknown) {}
  },
}))
vi.mock("telegram", async () => ({
  Api: {
    UpdateUserTyping: class {},
    UpdateChatUserTyping: class {},
    PeerUser: class MockPeerUser { userId: bigint; constructor({ userId }: { userId: bigint }) { this.userId = userId } },
    messages: {
      SetTyping: class { constructor(_opts: unknown) {} },
    },
    SendMessageTypingAction: class {},
  },
}))

import { useTypingIndicators } from "./useTypingIndicators"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type UpdateUserTyping = {
  className: "UpdateUserTyping"
  userId: bigint
  action: { className: string }
}

type UpdateChatUserTyping = {
  className: "UpdateChatUserTyping"
  chatId: bigint
  fromId: { className: "PeerUser"; userId: bigint }
  action: { className: string }
}

function makeUserEntity(id: bigint, firstName = "Alice") {
  return { className: "User", id, firstName } as unknown as import("telegram").Api.User
}

function makeChatEntity(id: bigint) {
  return { className: "Chat", id } as unknown as import("telegram").Api.Chat
}

function makeClient(opts: { meId?: bigint; resolvedName?: string; shouldThrow?: boolean } = {}) {
  let capturedHandler: ((update: unknown) => void) | null = null

  const client = {
    addEventHandler: vi.fn((handler: (u: unknown) => void) => {
      capturedHandler = handler
    }),
    removeEventHandler: vi.fn(),
    getMe: vi.fn().mockResolvedValue({ id: opts.meId ?? BigInt(999) }),
    getEntity: opts.shouldThrow
      ? vi.fn().mockRejectedValue(new Error("network"))
      : vi.fn().mockResolvedValue({ className: "User", firstName: opts.resolvedName ?? "Alice" }),
    invoke: vi.fn().mockResolvedValue(null),
  } as unknown as TelegramClient

  function fire(update: UpdateUserTyping | UpdateChatUserTyping) {
    capturedHandler?.(update)
  }

  return { client, fire }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useTypingIndicators", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns empty typers initially", () => {
    const { client } = makeClient()
    const { result } = renderHook(() => useTypingIndicators(makeUserEntity(BigInt(1)), client))
    expect(result.current.typers).toEqual([])
  })

  it("returns empty typers when client is null", () => {
    const { result } = renderHook(() => useTypingIndicators(makeUserEntity(BigInt(1)), null))
    expect(result.current.typers).toEqual([])
  })

  it("adds typer name for UpdateUserTyping on DM peer (AC1)", async () => {
    const entity = makeUserEntity(BigInt(42))
    const { client, fire } = makeClient({ resolvedName: "Alice" })
    const { result } = renderHook(() => useTypingIndicators(entity, client))

    act(() => {
      fire({ className: "UpdateUserTyping", userId: BigInt(42), action: { className: "SendMessageTypingAction" } })
    })

    await waitFor(() => expect(result.current.typers).toEqual(["Alice"]))
  })

  it("accumulates two typer names for group chat (AC2)", async () => {
    const entity = makeChatEntity(BigInt(100))
    const { client, fire } = makeClient()
    ;(client.getEntity as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ className: "User", firstName: "Alice" })
      .mockResolvedValueOnce({ className: "User", firstName: "Bob" })

    const { result } = renderHook(() => useTypingIndicators(entity, client))

    act(() => {
      fire({ className: "UpdateChatUserTyping", chatId: BigInt(100), fromId: { className: "PeerUser", userId: BigInt(1) }, action: { className: "SendMessageTypingAction" } })
    })
    act(() => {
      fire({ className: "UpdateChatUserTyping", chatId: BigInt(100), fromId: { className: "PeerUser", userId: BigInt(2) }, action: { className: "SendMessageTypingAction" } })
    })

    await waitFor(() => {
      expect(result.current.typers).toHaveLength(2)
      expect(result.current.typers).toContain("Alice")
      expect(result.current.typers).toContain("Bob")
    })
  })

  it("ignores UpdateUserTyping from own userId (AC4)", async () => {
    const ownId = BigInt(999)
    const entity = makeUserEntity(BigInt(42))
    const { client, fire } = makeClient({ meId: ownId })
    const { result } = renderHook(() => useTypingIndicators(entity, client))

    await waitFor(() => expect(client.getMe).toHaveBeenCalled())

    act(() => {
      fire({ className: "UpdateUserTyping", userId: ownId, action: { className: "SendMessageTypingAction" } })
    })

    await act(async () => { await Promise.resolve() })
    expect(result.current.typers).toEqual([])
  })

  it("removes typer after 5 000 ms timeout", async () => {
    const entity = makeUserEntity(BigInt(42))
    const { client, fire } = makeClient({ resolvedName: "Alice" })
    const { result } = renderHook(() => useTypingIndicators(entity, client))

    act(() => {
      fire({ className: "UpdateUserTyping", userId: BigInt(42), action: { className: "SendMessageTypingAction" } })
    })
    await waitFor(() => expect(result.current.typers).toEqual(["Alice"]))

    act(() => { vi.advanceTimersByTime(5_001) })

    expect(result.current.typers).toEqual([])
  })

  it("removes typer immediately on SendMessageCancelAction", async () => {
    const entity = makeUserEntity(BigInt(42))
    const { client, fire } = makeClient({ resolvedName: "Alice" })
    const { result } = renderHook(() => useTypingIndicators(entity, client))

    act(() => {
      fire({ className: "UpdateUserTyping", userId: BigInt(42), action: { className: "SendMessageTypingAction" } })
    })
    await waitFor(() => expect(result.current.typers).toEqual(["Alice"]))

    act(() => {
      fire({ className: "UpdateUserTyping", userId: BigInt(42), action: { className: "SendMessageCancelAction" } })
    })

    expect(result.current.typers).toEqual([])
  })

  it("clears typers when entity changes (AC5)", async () => {
    const entityA = makeUserEntity(BigInt(42))
    const entityB = makeUserEntity(BigInt(77))
    const { client, fire } = makeClient({ resolvedName: "Alice" })
    const { result, rerender } = renderHook(
      ({ entity }) => useTypingIndicators(entity, client),
      { initialProps: { entity: entityA as import("telegram").Api.User | import("telegram").Api.Chat } },
    )

    act(() => {
      fire({ className: "UpdateUserTyping", userId: BigInt(42), action: { className: "SendMessageTypingAction" } })
    })
    await waitFor(() => expect(result.current.typers).toEqual(["Alice"]))

    act(() => { rerender({ entity: entityB }) })

    expect(result.current.typers).toEqual([])
  })

  it("ignores events for a different peer", async () => {
    const entity = makeUserEntity(BigInt(42))
    const { client, fire } = makeClient()
    const { result } = renderHook(() => useTypingIndicators(entity, client))

    act(() => {
      fire({ className: "UpdateUserTyping", userId: BigInt(77), action: { className: "SendMessageTypingAction" } })
    })

    await act(async () => { await Promise.resolve() })
    expect(result.current.typers).toEqual([])
  })

  it("calls removeEventHandler on unmount", () => {
    const { client } = makeClient()
    const { unmount } = renderHook(() => useTypingIndicators(makeUserEntity(BigInt(1)), client))
    unmount()
    expect(client.removeEventHandler).toHaveBeenCalledTimes(1)
  })

  it("resets 5 s timer on repeated event from same typer", async () => {
    const entity = makeUserEntity(BigInt(42))
    const { client, fire } = makeClient({ resolvedName: "Alice" })
    const { result } = renderHook(() => useTypingIndicators(entity, client))

    act(() => {
      fire({ className: "UpdateUserTyping", userId: BigInt(42), action: { className: "SendMessageTypingAction" } })
    })
    await waitFor(() => expect(result.current.typers).toEqual(["Alice"]))

    act(() => { vi.advanceTimersByTime(4_000) })
    act(() => {
      fire({ className: "UpdateUserTyping", userId: BigInt(42), action: { className: "SendMessageTypingAction" } })
    })

    // 4 s after reset — still within 5 s window, typer must remain
    act(() => { vi.advanceTimersByTime(4_000) })
    expect(result.current.typers).toEqual(["Alice"])

    // another 1.1 s takes us past the reset timer
    act(() => { vi.advanceTimersByTime(1_100) })
    expect(result.current.typers).toEqual([])
  })

  it("falls back to userId string when getEntity throws", async () => {
    const entity = makeUserEntity(BigInt(42))
    const { client, fire } = makeClient({ shouldThrow: true })
    const { result } = renderHook(() => useTypingIndicators(entity, client))

    act(() => {
      fire({ className: "UpdateUserTyping", userId: BigInt(42), action: { className: "SendMessageTypingAction" } })
    })

    await waitFor(() => expect(result.current.typers).toHaveLength(1))
    expect(typeof result.current.typers[0]).toBe("string")
  })
})
