import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import {
  TELEGRAM_MAX_UPLOAD_BYTES,
  useDraftAttachments,
} from "./useDraftAttachments"

describe("useDraftAttachments", () => {
  beforeEach(() => {
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("addFiles queues small files and returns rejectedCount 0", () => {
    const { result } = renderHook(() => useDraftAttachments())
    const f = new File(["x"], "a.txt", { type: "text/plain" })
    let rej = 0
    act(() => {
      const r = result.current.addFiles([f])
      rej = r.rejectedCount
    })
    expect(rej).toBe(0)
    expect(result.current.attachments).toHaveLength(1)
    expect(result.current.attachments[0]?.kind).toBe("document")
  })

  it("rejects files over Telegram limit", () => {
    const { result } = renderHook(() => useDraftAttachments())
    const big = new File([new Uint8Array(100)], "big.bin")
    Object.defineProperty(big, "size", {
      value: TELEGRAM_MAX_UPLOAD_BYTES + 1,
      configurable: true,
    })
    let rej = 0
    act(() => {
      const r = result.current.addFiles([big])
      rej = r.rejectedCount
    })
    expect(rej).toBe(1)
    expect(result.current.attachments).toHaveLength(0)
  })

  it("removeAttachment revokes object URL", () => {
    const { result } = renderHook(() => useDraftAttachments())
    const f = new File(["x"], "a.txt", { type: "text/plain" })
    act(() => {
      result.current.addFiles([f])
    })
    const id = result.current.attachments[0]!.id
    act(() => {
      result.current.removeAttachment(id)
    })
    expect(URL.revokeObjectURL).toHaveBeenCalled()
    expect(result.current.attachments).toHaveLength(0)
  })

  it("clearAttachments revokes all URLs", () => {
    const { result } = renderHook(() => useDraftAttachments())
    act(() => {
      result.current.addFiles([
        new File(["a"], "a.txt"),
        new File(["b"], "b.txt"),
      ])
    })
    act(() => {
      result.current.clearAttachments()
    })
    expect(URL.revokeObjectURL).toHaveBeenCalled()
    expect(result.current.attachments).toHaveLength(0)
  })
})
