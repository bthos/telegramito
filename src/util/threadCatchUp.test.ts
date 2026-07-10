import { describe, expect, it } from "vitest"
import { Api } from "telegram"
import type { ChatDatedItem } from "../ui/chatDatedItem"
import {
  findCatchUpBoundary,
  findFirstUnreadRowIndex,
  insertCatchUpRibbon,
  countInboundUnreadInMessages,
} from "./threadCatchUp"

function msg(id: number, out = false, date = 1_700_000_000): Api.Message {
  return { className: "Message" as const, id, out, date } as Api.Message
}

function dated(...rows: ChatDatedItem[]): ChatDatedItem[] {
  return rows
}

describe("threadCatchUp", () => {
  const base = dated(
    { kind: "msg", message: msg(10) },
    { kind: "msg", message: msg(20) },
    { kind: "msg", message: msg(30) },
    { kind: "msg", message: msg(40) },
    { kind: "msg", message: msg(50) },
  )

  it("findCatchUpBoundary returns insert index before first inbound unread (AC-C1)", () => {
    const b = findCatchUpBoundary(base, 30)
    expect(b).not.toBeNull()
    expect(b!.insertIndex).toBe(3)
    expect(b!.readInboxMaxId).toBe(30)
  })

  it("omits boundary when read horizon is zero (AC-C2)", () => {
    expect(findCatchUpBoundary(base, 0)).toBeNull()
    expect(insertCatchUpRibbon(base, 0)).toEqual(base)
  })

  it("omits boundary when nothing is unread after horizon", () => {
    expect(findCatchUpBoundary(base, 50)).toBeNull()
  })

  it("insertCatchUpRibbon places catchup row at boundary", () => {
    const out = insertCatchUpRibbon(base, 30)
    expect(out[3]?.kind).toBe("catchup")
    expect(out[4]?.kind).toBe("msg")
    expect((out[4] as { message: Api.Message }).message.id).toBe(40)
  })

  it("findFirstUnreadRowIndex targets first unread row", () => {
    const withRibbon = insertCatchUpRibbon(base, 30)
    expect(findFirstUnreadRowIndex(withRibbon, 30)).toBe(4)
  })

  it("countInboundUnreadInMessages matches inbound ids above horizon", () => {
    const messages = base.filter((r): r is Extract<ChatDatedItem, { kind: "msg" }> => r.kind === "msg").map((r) => r.message)
    expect(countInboundUnreadInMessages(messages, 30)).toBe(2)
    expect(countInboundUnreadInMessages(messages, 0)).toBe(5)
  })

  it("does not count outbound messages as unread after horizon", () => {
    const mixed = dated(
      { kind: "msg", message: msg(10) },
      { kind: "msg", message: msg(20, true) },
      { kind: "msg", message: msg(30) },
    )
    const messages = mixed
      .filter((r): r is Extract<ChatDatedItem, { kind: "msg" }> => r.kind === "msg")
      .map((r) => r.message)
    expect(countInboundUnreadInMessages(messages, 10)).toBe(1)
    expect(findCatchUpBoundary(mixed, 10)?.insertIndex).toBe(2)
  })
})
