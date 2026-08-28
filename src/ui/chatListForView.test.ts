/**
 * Characterization of ChatView unread-only list filtering (AC1).
 */
import { Api } from "teleproto"
import { describe, expect, it } from "vitest"
import { filterListForView } from "./chatListForView"

function msg(id: number, out: boolean): Api.Message {
  return new Api.Message({
    id,
    message: "",
    date: id,
    out,
  } as never)
}

describe("ChatView listForView unread filter", () => {
  const list = [msg(1, false), msg(2, true), msg(5, false), msg(8, false)]

  it("returns full list when unread-only is off", () => {
    expect(filterListForView(list, false, 3)).toEqual(list)
  })

  it("keeps only inbound messages above readInboxMaxId when unread-only is on", () => {
    const filtered = filterListForView(list, true, 3)
    expect(filtered.map((m) => Number(m.id))).toEqual([5, 8])
  })

  it("drops outbound even when id is above read max", () => {
    const filtered = filterListForView([msg(9, true), msg(10, false)], true, 0)
    expect(filtered.map((m) => Number(m.id))).toEqual([10])
  })
})
