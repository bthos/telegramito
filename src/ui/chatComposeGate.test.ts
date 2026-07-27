/**
 * Characterization of ChatView composer enablement gates (AC1 / AC3 adjacent).
 *
 * Mirrors ChatView.tsx derivations:
 *   canCompose = !isForum || (!topicsLoading && topicsErr == null && topicId != null && topicsLength > 0)
 *   canSendNow = canCompose && !isUploading && (draftNonempty || pendingAttachmentCount > 0)
 *
 * Kept as pure mirrors in this file so the gate stays green before Cmok extracts
 * `chatComposeGate.ts` (or equivalent) during the Phase 1 split.
 */
import { describe, expect, it } from "vitest"

function deriveCanCompose(opts: {
  isForum: boolean
  topicsLoading: boolean
  topicsErr: string | null
  topicId: number | null
  topicsLength: number
}): boolean {
  return (
    !opts.isForum ||
    (!opts.topicsLoading &&
      opts.topicsErr == null &&
      opts.topicId != null &&
      opts.topicsLength > 0)
  )
}

function deriveCanSendNow(opts: {
  canCompose: boolean
  isUploading: boolean
  draftNonempty: boolean
  pendingAttachmentCount: number
}): boolean {
  return (
    opts.canCompose &&
    !opts.isUploading &&
    (opts.draftNonempty || opts.pendingAttachmentCount > 0)
  )
}

describe("ChatView canCompose derivation", () => {
  it("is true for non-forum chats regardless of topic state", () => {
    expect(
      deriveCanCompose({
        isForum: false,
        topicsLoading: true,
        topicsErr: "x",
        topicId: null,
        topicsLength: 0,
      }),
    ).toBe(true)
  })

  it("is false for forum while topics are loading", () => {
    expect(
      deriveCanCompose({
        isForum: true,
        topicsLoading: true,
        topicsErr: null,
        topicId: 1,
        topicsLength: 2,
      }),
    ).toBe(false)
  })

  it("is false for forum when topicId is null or topics empty", () => {
    expect(
      deriveCanCompose({
        isForum: true,
        topicsLoading: false,
        topicsErr: null,
        topicId: null,
        topicsLength: 3,
      }),
    ).toBe(false)
    expect(
      deriveCanCompose({
        isForum: true,
        topicsLoading: false,
        topicsErr: null,
        topicId: 7,
        topicsLength: 0,
      }),
    ).toBe(false)
  })

  it("is true for forum when a topic is selected and topics are ready", () => {
    expect(
      deriveCanCompose({
        isForum: true,
        topicsLoading: false,
        topicsErr: null,
        topicId: 7,
        topicsLength: 2,
      }),
    ).toBe(true)
  })

  it("is false for forum when topicsErr is set", () => {
    expect(
      deriveCanCompose({
        isForum: true,
        topicsLoading: false,
        topicsErr: "failed",
        topicId: 7,
        topicsLength: 2,
      }),
    ).toBe(false)
  })
})

describe("ChatView canSendNow derivation", () => {
  it("requires compose enabled and not uploading", () => {
    expect(
      deriveCanSendNow({
        canCompose: false,
        isUploading: false,
        draftNonempty: true,
        pendingAttachmentCount: 0,
      }),
    ).toBe(false)
    expect(
      deriveCanSendNow({
        canCompose: true,
        isUploading: true,
        draftNonempty: true,
        pendingAttachmentCount: 0,
      }),
    ).toBe(false)
  })

  it("is true with nonempty draft or pending attachments", () => {
    expect(
      deriveCanSendNow({
        canCompose: true,
        isUploading: false,
        draftNonempty: true,
        pendingAttachmentCount: 0,
      }),
    ).toBe(true)
    expect(
      deriveCanSendNow({
        canCompose: true,
        isUploading: false,
        draftNonempty: false,
        pendingAttachmentCount: 1,
      }),
    ).toBe(true)
  })

  it("is false when draft empty and no pending attachments", () => {
    expect(
      deriveCanSendNow({
        canCompose: true,
        isUploading: false,
        draftNonempty: false,
        pendingAttachmentCount: 0,
      }),
    ).toBe(false)
  })
})
