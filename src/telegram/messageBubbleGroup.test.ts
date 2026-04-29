import bigInt from "big-integer"
import { Api } from "telegram"
import { describe, expect, it } from "vitest"
import {
  canGroupMessages,
  computeMessageClusterRoles,
  MESSAGE_GROUP_MAX_GAP_SEC,
} from "./messageBubbleGroup"

function msg(partial: Partial<Api.Message> & { id: number; date: number }): Api.Message {
  return {
    className: "Message",
    ...partial,
  } as Api.Message
}

describe("messageBubbleGroup", () => {
  it("groups outgoing within gap", () => {
    const a = msg({ id: 1, date: 100, out: true })
    const b = msg({ id: 2, date: 100 + MESSAGE_GROUP_MAX_GAP_SEC, out: true })
    expect(canGroupMessages(a, b)).toBe(true)
    expect(computeMessageClusterRoles([a, b])).toEqual(["first", "last"])
  })

  it("does not group across gap", () => {
    const a = msg({ id: 1, date: 100, out: true })
    const b = msg({ id: 2, date: 100 + MESSAGE_GROUP_MAX_GAP_SEC + 1, out: true })
    expect(canGroupMessages(a, b)).toBe(false)
    expect(computeMessageClusterRoles([a, b])).toEqual(["single", "single"])
  })

  it("requires same incoming sender when fromId set", () => {
    const u1 = new Api.PeerUser({ userId: bigInt(1) })
    const u2 = new Api.PeerUser({ userId: bigInt(2) })
    const a = msg({ id: 1, date: 100, out: false, fromId: u1 })
    const b = msg({ id: 2, date: 150, out: false, fromId: u2 })
    expect(canGroupMessages(a, b)).toBe(false)
  })
})
