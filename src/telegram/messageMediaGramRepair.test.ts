import { describe, expect, it } from "vitest"
import { Api } from "telegram"
import { repairMessageAfterGramJs } from "./messageMediaGramRepair"

describe("repairMessageAfterGramJs", () => {
  it("wraps top-level document into MessageMediaDocument when media is empty", () => {
    const doc = {
      className: "Document" as const,
      id: 99,
      mimeType: "application/pdf",
    } as unknown as Api.Document
    const m = {
      className: "Message" as const,
      id: 1,
      document: doc,
      media: { className: "MessageMediaEmpty" as const },
    } as unknown as Api.Message
    const r = repairMessageAfterGramJs(m)
    expect(r.media?.className).toBe("MessageMediaDocument")
    expect((r.media as Api.MessageMediaDocument).document).toBe(doc)
  })

  it("fills missing PollResults on MessageMediaPoll", () => {
    const poll = {
      className: "Poll" as const,
      id: 1,
      question: { className: "TextWithEntities" as const, text: "Q?", entities: [] },
      answers: [],
    } as unknown as Api.Poll
    const m = {
      className: "Message" as const,
      id: 2,
      media: { className: "MessageMediaPoll" as const, poll, results: undefined },
    } as unknown as Api.Message
    const r = repairMessageAfterGramJs(m)
    const med = r.media as Api.MessageMediaPoll
    expect(med.results?.className).toBe("PollResults")
  })

  it("does not replace non-empty media when document is present", () => {
    const doc = { className: "Document" as const, id: 1 } as unknown as Api.Document
    const photo = { className: "MessageMediaPhoto" as const, photo: {} }
    const m = {
      className: "Message" as const,
      id: 3,
      document: doc,
      media: photo,
    } as unknown as Api.Message
    const r = repairMessageAfterGramJs(m)
    expect(r.media).toBe(photo)
  })
})
