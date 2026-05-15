import { describe, expect, it } from "vitest"
import { Api } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"
import {
  dialogHasDraft,
  dialogIsArchived,
  filterDialogsByCorrespondenceTab,
} from "./correspondenceFilter"

function stubDialog(opts: { folderId?: number; draft?: Api.TypeDraftMessage }): Dialog {
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
  return { isUser: true, name: "T", dialog: dr } as unknown as Dialog
}

describe("correspondenceFilter", () => {
  it("archives live in Returned tab", () => {
    const a = stubDialog({ folderId: 1 })
    const b = stubDialog({})
    expect(dialogIsArchived(a)).toBe(true)
    expect(dialogIsArchived(b)).toBe(false)
    expect(filterDialogsByCorrespondenceTab([a, b], "returned")).toEqual([a])
    expect(filterDialogsByCorrespondenceTab([a, b], "letters")).toEqual([b])
  })

  it("drafts tab filters DraftMessage", () => {
    const withDraft = stubDialog({
      draft: new Api.DraftMessage({
        message: "hi",
        date: 1,
      }),
    })
    const empty = stubDialog({
      draft: new Api.DraftMessageEmpty({}),
    })
    expect(dialogHasDraft(withDraft)).toBe(true)
    expect(dialogHasDraft(empty)).toBe(false)
    expect(filterDialogsByCorrespondenceTab([withDraft, empty], "drafts")).toEqual([
      withDraft,
    ])
  })
})
