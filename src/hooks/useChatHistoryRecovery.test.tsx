/**
 * AC-T19 (migrate-teleproto, Cycle A): the windowed-history epoch guard.
 *
 * `useChatHistoryRecovery` runs two async `setList` paths — forum sparse-gap
 * reconcile and single-id media-placeholder refetch. Both must discard their
 * fetched rows if the transcript was *replaced in place* (a jump / return-to-
 * live-tail bumps `transcriptEpochRef`) while the fetch was in flight, exactly
 * like `useChatMessages` `loadOlder` / `loadNewer` already do. Without the
 * guard, a forum jump racing an in-flight reconcile splices old-window rows
 * into the new window (Bagnik code-QA finding #1 on commit `cd3d1f3`).
 */
import { renderHook, waitFor } from "@testing-library/react"
import { Api } from "teleproto"
import type { TelegramClient } from "teleproto"
import type { Dialog } from "teleproto/tl/custom/dialog"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useChatHistoryRecovery } from "./useChatHistoryRecovery"

function msg(id: number): Api.Message {
  return new Api.Message({ id, message: `m${id}`, date: id } as never)
}

/** A promise whose resolution the test controls, to open a race window. */
function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

type Opts = Parameters<typeof useChatHistoryRecovery>[0]

function baseOpts(over: Partial<Opts>): Opts {
  return {
    client: null,
    dialog: { entity: { className: "Channel" } } as unknown as Dialog,
    convKey: "c1",
    isForum: false,
    topicId: null,
    blocked: false,
    appMode: "adult",
    list: [],
    setList: vi.fn(),
    loadedConvKeyRef: { current: "c1" },
    transcriptEpochRef: { current: 0 },
    historyReconcileAttemptedRef: { current: new Set<string>() },
    mediaPlaceholderRefetchAttemptsRef: { current: new Map<number, number>() },
    ...over,
  } as Opts
}

describe("useChatHistoryRecovery — forum gap reconcile epoch guard (AC-T19)", () => {
  let getMessages: ReturnType<typeof vi.fn>
  let gate: ReturnType<typeof deferred<Api.Message[]>>
  let client: TelegramClient
  const epochRef = { current: 0 }
  const setList = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    epochRef.current = 0
    gate = deferred<Api.Message[]>()
    getMessages = vi.fn(() => gate.promise)
    client = { connect: vi.fn(async () => {}), getMessages } as unknown as TelegramClient
  })

  // list has ids 1 and 4 => a 2-id sequential gap (2,3), span 2 <= 32 => reconcile fires.
  const forumOpts = () =>
    baseOpts({
      client,
      isForum: true,
      topicId: 100,
      convKey: "forum:100",
      loadedConvKeyRef: { current: "forum:100" },
      transcriptEpochRef: epochRef,
      list: [msg(1), msg(4)],
      setList,
    })

  it("discards the reconcile result when transcriptEpoch advanced mid-fetch", async () => {
    renderHook(() => useChatHistoryRecovery(forumOpts()))

    await waitFor(() => expect(getMessages).toHaveBeenCalled())

    // A jump replaced the transcript while getMessages was pending.
    epochRef.current += 1
    gate.resolve([msg(2), msg(3)])
    await new Promise((r) => setTimeout(r, 0))

    expect(setList).not.toHaveBeenCalled()
  })

  it("applies the reconcile result when the epoch is unchanged", async () => {
    renderHook(() => useChatHistoryRecovery(forumOpts()))

    await waitFor(() => expect(getMessages).toHaveBeenCalled())

    gate.resolve([msg(2), msg(3)])
    await waitFor(() => expect(setList).toHaveBeenCalledTimes(1))
  })
})

describe("useChatHistoryRecovery — media-placeholder refetch epoch guard (AC-T19)", () => {
  let getMessages: ReturnType<typeof vi.fn>
  let gate: ReturnType<typeof deferred<Api.Message[]>>
  let client: TelegramClient
  const epochRef = { current: 0 }
  const setList = vi.fn()

  function unsupported(id: number): Api.Message {
    return new Api.Message({
      id,
      message: "",
      date: id,
      media: new Api.MessageMediaUnsupported(),
    } as never)
  }

  function repaired(id: number): Api.Message {
    return new Api.Message({ id, message: `fixed${id}`, date: id } as never)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    epochRef.current = 0
    gate = deferred<Api.Message[]>()
    getMessages = vi.fn(() => gate.promise)
    client = { connect: vi.fn(async () => {}), getMessages } as unknown as TelegramClient
  })

  const mediaOpts = () =>
    baseOpts({
      client,
      convKey: "u:1",
      loadedConvKeyRef: { current: "u:1" },
      transcriptEpochRef: epochRef,
      list: [unsupported(50)],
      setList,
    })

  it("discards the refetch result when transcriptEpoch advanced mid-fetch", async () => {
    renderHook(() => useChatHistoryRecovery(mediaOpts()))

    await waitFor(() => expect(getMessages).toHaveBeenCalled())

    epochRef.current += 1
    gate.resolve([repaired(50)])
    await new Promise((r) => setTimeout(r, 0))

    expect(setList).not.toHaveBeenCalled()
  })

  it("applies the refetch result when the epoch is unchanged", async () => {
    renderHook(() => useChatHistoryRecovery(mediaOpts()))

    await waitFor(() => expect(getMessages).toHaveBeenCalled())

    gate.resolve([repaired(50)])
    await waitFor(() => expect(setList).toHaveBeenCalledTimes(1))
  })
})
