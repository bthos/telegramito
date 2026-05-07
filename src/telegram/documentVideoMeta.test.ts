import { describe, expect, it } from "vitest"
import type { Api } from "telegram"
import { formatVideoDuration, getVideoDurationSeconds } from "./documentVideoMeta"

describe("documentVideoMeta", () => {
  it("getVideoDurationSeconds reads attribute", () => {
    const d = {
      className: "Document" as const,
      attributes: [
        {
          className: "DocumentAttributeVideo" as const,
          duration: 83,
          w: 1,
          h: 1,
          roundMessage: false,
        },
      ],
    } as unknown as Api.Document
    expect(getVideoDurationSeconds(d)).toBe(83)
  })

  it("getVideoDurationSeconds returns null when missing", () => {
    const d = {
      className: "Document" as const,
      attributes: [],
    } as unknown as Api.Document
    expect(getVideoDurationSeconds(d)).toBeNull()
  })

  it("formatVideoDuration formats m:ss", () => {
    expect(formatVideoDuration(65)).toBe("1:05")
    expect(formatVideoDuration(0)).toBe("0:00")
  })
})
