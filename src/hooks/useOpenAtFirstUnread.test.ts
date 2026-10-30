import { describe, expect, it } from "vitest"
import type { Api } from "teleproto"
import type { ChatDatedItem } from "../ui/chatDatedItem"
import { insertCatchUpRibbon } from "../util/threadCatchUp"
import { findOpenLandingRowIndex } from "./useOpenAtFirstUnread"

function msg(id: number, out = false): ChatDatedItem {
  return { kind: "msg", message: { className: "Message", id, out, date: 1_700_000_000 } as Api.Message }
}

describe("findOpenLandingRowIndex", () => {
  it("lands on the read/unread divider so it sits above the first unread message", () => {
    const rows = insertCatchUpRibbon([msg(10), msg(20), msg(30), msg(40)], 20)
    expect(rows[2]?.kind).toBe("catchup")
    expect(findOpenLandingRowIndex(rows, 20)).toBe(2)
  })

  it("falls back to the first inbound unread row when there is no divider", () => {
    expect(findOpenLandingRowIndex([msg(10), msg(20, true), msg(30)], 10)).toBe(2)
  })

  it("returns -1 when nothing unread is loaded", () => {
    expect(findOpenLandingRowIndex([msg(10), msg(20)], 20)).toBe(-1)
  })
})
