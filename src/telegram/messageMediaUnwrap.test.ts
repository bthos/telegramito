import { describe, expect, it } from "vitest"
import { Api } from "telegram"
import {
  collectPaidInnerMedias,
  getMessageDocumentResolved,
  isNonBlobVisualMedia,
  mapsUrlFromGeoPoint,
  resolveMessageMediaForDisplay,
} from "./messageMediaUnwrap"
import { getMessageDocument } from "./documentFile"
import { getMessageMediaTypeLabel } from "./dialogPreview"

describe("messageMediaUnwrap", () => {
  it("collectPaidInnerMedias flattens extended media", () => {
    const photo = { className: "MessageMediaPhoto" as const, photo: {} }
    const paid = {
      className: "MessageMediaPaidMedia" as const,
      extendedMedia: [
        { className: "MessageExtendedMedia" as const, media: photo },
      ],
    } as unknown as Api.MessageMediaPaidMedia
    expect(collectPaidInnerMedias(paid)).toEqual([photo])
  })

  it("collectPaidInnerMedias returns empty for undefined", () => {
    expect(collectPaidInnerMedias(undefined)).toEqual([])
  })

  it("collectPaidInnerMedias skips preview rows and MessageMediaEmpty", () => {
    const paid = {
      className: "MessageMediaPaidMedia" as const,
      extendedMedia: [
        { className: "MessageExtendedMediaPreview" as const },
        {
          className: "MessageExtendedMedia" as const,
          media: { className: "MessageMediaEmpty" as const },
        },
      ],
    } as unknown as Api.MessageMediaPaidMedia
    expect(collectPaidInnerMedias(paid)).toEqual([])
  })

  it("resolveMessageMediaForDisplay passes through non-paid message unchanged", () => {
    const m = {
      className: "Message" as const,
      id: 0,
      media: { className: "MessageMediaDocument" as const },
    } as unknown as Api.Message
    expect(resolveMessageMediaForDisplay(m)).toBe(m)
  })

  it("resolveMessageMediaForDisplay returns original when paid bundle is empty", () => {
    const m = {
      className: "Message" as const,
      id: 0,
      media: { className: "MessageMediaPaidMedia" as const, extendedMedia: [] },
    } as unknown as Api.Message
    expect(resolveMessageMediaForDisplay(m)).toBe(m)
  })

  it("resolveMessageMediaForDisplay falls back to first inner when no poll present", () => {
    const doc = { className: "MessageMediaDocument" as const }
    const m = {
      className: "Message" as const,
      id: 0,
      media: {
        className: "MessageMediaPaidMedia" as const,
        extendedMedia: [{ className: "MessageExtendedMedia" as const, media: doc }],
      },
    } as unknown as Api.Message
    expect(resolveMessageMediaForDisplay(m).media).toBe(doc)
  })

  it("resolveMessageMediaForDisplay prefers poll in paid bundle", () => {
    const pollWrap = {
      className: "MessageMediaPoll" as const,
      poll: { className: "Poll" as const },
      results: { className: "PollResults" as const },
    }
    const photo = { className: "MessageMediaPhoto" as const, photo: {} }
    const paid = {
      className: "MessageMediaPaidMedia" as const,
      extendedMedia: [
        { className: "MessageExtendedMedia" as const, media: photo },
        { className: "MessageExtendedMedia" as const, media: pollWrap },
      ],
    }
    const m = { className: "Message" as const, id: 1, media: paid } as unknown as Api.Message
    const r = resolveMessageMediaForDisplay(m)
    expect(r.media).toBe(pollWrap)
  })

  it("getMessageDocumentResolved reads document inside paid", () => {
    const doc = { className: "Document" as const, id: 1, mimeType: "video/mp4" } as unknown as Api.Document
    const docMedia = { className: "MessageMediaDocument" as const, document: doc }
    const paid = {
      className: "MessageMediaPaidMedia" as const,
      extendedMedia: [{ className: "MessageExtendedMedia" as const, media: docMedia }],
    }
    const m = { className: "Message" as const, id: 1, media: paid } as unknown as Api.Message
    expect(getMessageDocument(m)).toBeNull()
    expect(getMessageDocumentResolved(m)).toBe(doc)
  })

  it("mapsUrlFromGeoPoint builds openstreetmap link", () => {
    const g = { className: "GeoPoint" as const, long: 30.5, lat: 50.4 } as unknown as Api.GeoPoint
    const u = mapsUrlFromGeoPoint(g)
    expect(u).toContain("50.4")
    expect(u).toContain("30.5")
  })

  it("mapsUrlFromGeoPoint returns null for GeoPointEmpty", () => {
    const g = { className: "GeoPointEmpty" as const } as unknown as Api.TypeGeoPoint
    expect(mapsUrlFromGeoPoint(g)).toBeNull()
  })

  it("isNonBlobVisualMedia flags geo and invoice", () => {
    expect(isNonBlobVisualMedia({ className: "MessageMediaGeo" } as Api.TypeMessageMedia)).toBe(true)
    expect(isNonBlobVisualMedia({ className: "MessageMediaPhoto" } as Api.TypeMessageMedia)).toBe(false)
  })

  it("isNonBlobVisualMedia returns false for null/undefined", () => {
    expect(isNonBlobVisualMedia(null)).toBe(false)
    expect(isNonBlobVisualMedia(undefined)).toBe(false)
  })

  it("isNonBlobVisualMedia true for all card-rendered types", () => {
    const cards = [
      "MessageMediaVenue", "MessageMediaGeoLive",
      "MessageMediaContact", "MessageMediaGame", "MessageMediaInvoice",
      "MessageMediaDice", "MessageMediaStory", "MessageMediaGiveaway",
      "MessageMediaGiveawayResults", "MessageMediaUnsupported", "MessageMediaEmpty",
    ]
    for (const cn of cards) {
      expect(
        isNonBlobVisualMedia({ className: cn } as unknown as Api.TypeMessageMedia),
        cn,
      ).toBe(true)
    }
  })
})

describe("getMessageMediaTypeLabel paid + inner", () => {
  const t2 = (k: string) => k
  it("uses inner photo label for paid+photo", () => {
    const photo = { className: "MessageMediaPhoto" as const, photo: {} }
    const m = {
      className: "Message" as const,
      id: 1,
      media: {
        className: "MessageMediaPaidMedia" as const,
        extendedMedia: [
          { className: "MessageExtendedMedia" as const, media: photo },
        ],
      },
    } as unknown as Api.Message
    expect(getMessageMediaTypeLabel(m, t2)).toBe("chat.previewPhoto")
  })
})
