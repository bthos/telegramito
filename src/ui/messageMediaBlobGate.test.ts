/**
 * Characterization for blob-fetch gate (useBlob entry predicate).
 * Feature: .tlk/features/2026-07-27-app-code-refactor-media/
 */
import { describe, expect, it } from "vitest"
import { mediaNeedsBlobFetch } from "./messageMediaBlobGate"

describe("mediaNeedsBlobFetch", () => {
  it("is false when media is undefined", () => {
    expect(mediaNeedsBlobFetch(undefined)).toBe(false)
  })

  it("is true for MessageMediaPhoto", () => {
    expect(
      mediaNeedsBlobFetch({ className: "MessageMediaPhoto" } as import("teleproto").Api.MessageMediaPhoto),
    ).toBe(true)
  })

  it("is true for MessageMediaDocument when doc is provided", () => {
    const doc = { className: "Document", id: BigInt(1) } as unknown as import("teleproto").Api.Document
    expect(
      mediaNeedsBlobFetch(
        { className: "MessageMediaDocument", document: doc } as import("teleproto").Api.MessageMediaDocument,
        doc,
      ),
    ).toBe(true)
  })

  it("is false for MessageMediaDocument without doc", () => {
    expect(
      mediaNeedsBlobFetch({ className: "MessageMediaDocument" } as import("teleproto").Api.MessageMediaDocument, null),
    ).toBe(false)
  })

  it("is false for non-blob media types", () => {
    expect(
      mediaNeedsBlobFetch({ className: "MessageMediaGeo" } as import("teleproto").Api.MessageMediaGeo),
    ).toBe(false)
    expect(
      mediaNeedsBlobFetch({ className: "MessageMediaWebPage" } as import("teleproto").Api.MessageMediaWebPage),
    ).toBe(false)
  })
})
