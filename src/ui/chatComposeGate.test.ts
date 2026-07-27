/**
 * Characterization of ChatView composer enablement gates (AC1 / AC3 adjacent).
 */
import { describe, expect, it } from "vitest"
import { canCompose, canSendNow } from "./chatComposeGate"

describe("ChatView canCompose derivation", () => {
  it("is true for non-forum chats regardless of topic state", () => {
    expect(
      canCompose({
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
      canCompose({
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
      canCompose({
        isForum: true,
        topicsLoading: false,
        topicsErr: null,
        topicId: null,
        topicsLength: 3,
      }),
    ).toBe(false)
    expect(
      canCompose({
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
      canCompose({
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
      canCompose({
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
      canSendNow({
        canCompose: false,
        isUploading: false,
        draftNonempty: true,
        pendingAttachmentCount: 0,
      }),
    ).toBe(false)
    expect(
      canSendNow({
        canCompose: true,
        isUploading: true,
        draftNonempty: true,
        pendingAttachmentCount: 0,
      }),
    ).toBe(false)
  })

  it("is true with nonempty draft or pending attachments", () => {
    expect(
      canSendNow({
        canCompose: true,
        isUploading: false,
        draftNonempty: true,
        pendingAttachmentCount: 0,
      }),
    ).toBe(true)
    expect(
      canSendNow({
        canCompose: true,
        isUploading: false,
        draftNonempty: false,
        pendingAttachmentCount: 1,
      }),
    ).toBe(true)
  })

  it("is false when draft empty and no pending attachments", () => {
    expect(
      canSendNow({
        canCompose: true,
        isUploading: false,
        draftNonempty: false,
        pendingAttachmentCount: 0,
      }),
    ).toBe(false)
  })
})
