import { describe, expect, it } from "vitest"
import { Api } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"
import { resolveLettersWriteAction } from "./lettersWriteAction"

function stubDialog(opts: {
  folderId?: number
  date?: number
  draft?: Api.TypeDraftMessage
}): Dialog {
  const dr = {
    className: "Dialog" as const,
    peer: {} as Api.TypePeer,
    topMessage: 0,
    readInboxMaxId: 0,
    readOutboxMaxId: 0,
    unreadCount: 0,
    unreadMentionsCount: 0,
    unreadReactionsCount: 0,
    unreadPollVotesCount: 0,
    folderId: opts.folderId,
    draft: opts.draft,
  } as Api.Dialog
  return {
    isUser: true,
    name: "T",
    date: opts.date,
    dialog: dr,
  } as unknown as Dialog
}

describe("resolveLettersWriteAction", () => {
  it("focuses when a chat is already open", () => {
    const selected = stubDialog({ date: 1 })
    expect(resolveLettersWriteAction({ selected, dialogs: [selected] })).toEqual({
      kind: "focus",
    })
  })

  it("prefers the most recent draft", () => {
    const older = stubDialog({
      date: 1,
      draft: new Api.DraftMessage({ message: "old", date: 10 }),
    })
    const newer = stubDialog({
      date: 2,
      draft: new Api.DraftMessage({ message: "new", date: 20 }),
    })
    const action = resolveLettersWriteAction({ selected: null, dialogs: [older, newer] })
    expect(action).toEqual({
      kind: "select",
      dialog: newer,
      correspondenceTab: "drafts",
    })
  })

  it("opens the most recent letter when no drafts exist", () => {
    const older = stubDialog({ date: 10 })
    const newer = stubDialog({ date: 20 })
    const action = resolveLettersWriteAction({ selected: null, dialogs: [older, newer] })
    expect(action).toEqual({
      kind: "select",
      dialog: newer,
      correspondenceTab: "letters",
    })
  })

  it("falls back to search when there are no dialogs", () => {
    expect(resolveLettersWriteAction({ selected: null, dialogs: [] })).toEqual({
      kind: "search",
    })
  })
})
