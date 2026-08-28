import type { Api, TelegramClient } from "teleproto"
import type { Dialog } from "teleproto/tl/custom/dialog"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AppMode } from "../parental/types"
import type { GlobalSearchCluster, GlobalSearchHit } from "../util/groupGlobalSearchHits"
import { useMainShellPassages } from "./useMainShellPassages"

const mocks = vi.hoisted(() => ({
  results: [] as unknown[],
  fetchDialogForEntity: vi.fn(),
}))

vi.mock("../hooks/useGlobalMessageSearch", () => ({
  useGlobalMessageSearch: () => ({
    results: mocks.results,
    loading: false,
    error: null,
    retry: vi.fn(),
  }),
}))

vi.mock("../telegram/openNewChat", () => ({
  fetchDialogForEntity: (...args: unknown[]) => mocks.fetchDialogForEntity(...args),
}))

const DENIED_PEER = "-100777"
const ALLOWED_PEER = "42"

function makeHit(peerKey: string, id: number): GlobalSearchHit {
  return {
    message: {
      className: "Message",
      id,
      message: "brunch sunday",
      peerId: { className: "PeerChannel", channelId: 777 },
    } as unknown as Api.Message,
    peerKey,
    peerDisplayName: `peer ${peerKey}`,
  }
}

function makeCluster(hit: GlobalSearchHit): GlobalSearchCluster {
  return {
    peerKey: hit.peerKey,
    peerDisplayName: hit.peerDisplayName,
    hits: [hit],
    totalCount: 1,
    previewHits: [hit],
  }
}

function renderPassages(appMode: AppMode) {
  const getInputEntity = vi.fn().mockResolvedValue({ className: "InputPeerChannel" })
  const client = { getInputEntity } as unknown as TelegramClient
  const onJumpToDialogMessage = vi.fn()
  const refreshDialogs = vi.fn().mockResolvedValue(undefined)
  const rendered = renderHook(() =>
    useMainShellPassages({
      client,
      query: "brunch",
      disabled: false,
      appMode,
      deniedPeerIds: new Set([DENIED_PEER]),
      dialogs: [],
      refreshDialogs,
      onJumpToDialogMessage,
    }),
  )
  return { ...rendered, getInputEntity, onJumpToDialogMessage }
}

describe("useMainShellPassages parental deny-list", () => {
  beforeEach(() => {
    mocks.results = [makeHit(DENIED_PEER, 11), makeHit(ALLOWED_PEER, 12)]
    mocks.fetchDialogForEntity.mockReset()
    mocks.fetchDialogForEntity.mockResolvedValue({} as Dialog)
  })

  it("omits hits from parent-denied peers in child mode", () => {
    const { result } = renderPassages("child")
    expect(
      result.current.passagesPanelProps.passagesResults.map((h) => h.peerKey),
    ).toEqual([ALLOWED_PEER])
  })

  it("keeps the same hits in parent mode", () => {
    const { result } = renderPassages("parent")
    expect(
      result.current.passagesPanelProps.passagesResults.map((h) => h.peerKey),
    ).toEqual([DENIED_PEER, ALLOWED_PEER])
  })

  it("ignores selecting a denied hit without any peer lookup in child mode", async () => {
    const { result, getInputEntity, onJumpToDialogMessage } = renderPassages("child")
    await act(async () => {
      result.current.passagesPanelProps.onPassageSelect(makeHit(DENIED_PEER, 11))
      await Promise.resolve()
    })
    expect(getInputEntity).not.toHaveBeenCalled()
    expect(mocks.fetchDialogForEntity).not.toHaveBeenCalled()
    expect(onJumpToDialogMessage).not.toHaveBeenCalled()
    expect(result.current.passagesPanelProps.passagesJumpError).toBeNull()
  })

  it("ignores see-all for a denied cluster without any peer lookup in child mode", async () => {
    const { result, getInputEntity, onJumpToDialogMessage } = renderPassages("child")
    await act(async () => {
      result.current.passagesPanelProps.onPassagesSeeAll(makeCluster(makeHit(DENIED_PEER, 11)))
      await Promise.resolve()
    })
    expect(getInputEntity).not.toHaveBeenCalled()
    expect(mocks.fetchDialogForEntity).not.toHaveBeenCalled()
    expect(onJumpToDialogMessage).not.toHaveBeenCalled()
    expect(result.current.lettersInChatSearchSeed).toBeNull()
  })

  it("still resolves and jumps to an allowed hit in child mode", async () => {
    const { result, getInputEntity, onJumpToDialogMessage } = renderPassages("child")
    await act(async () => {
      result.current.passagesPanelProps.onPassageSelect(makeHit(ALLOWED_PEER, 12))
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(getInputEntity).toHaveBeenCalledTimes(1)
    expect(mocks.fetchDialogForEntity).toHaveBeenCalledTimes(1)
    expect(onJumpToDialogMessage).toHaveBeenCalledWith(expect.anything(), {
      focusMessageId: 12,
    })
  })
})
