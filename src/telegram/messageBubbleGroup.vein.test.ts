/**
 * Tests for the vein class derivation logic and sender attribution conditions
 * that will live in ChatView / InboundClusterRow.
 *
 * These tests document the pure boolean derivations so that the ChatView
 * implementation can be verified without rendering the full component.
 */
import bigInt from "big-integer"
import { Api } from "telegram"
import { describe, expect, it } from "vitest"
import { computeMessageClusterRoles, type MessageClusterRole } from "./messageBubbleGroup"

function msg(
  partial: Partial<Api.Message> & { id: number; date: number },
): Api.Message {
  return { className: "Message", ...partial } as Api.Message
}

/**
 * Mirrors the vein-class logic that will live in ChatView / InboundClusterRow:
 * vein is present iff role is "single" or "last".
 */
function hasVein(role: MessageClusterRole): boolean {
  return role === "single" || role === "last"
}

// ── Vein class derivation ─────────────────────────────────────────────────────

describe("messageBubbleGroup — vein class derivation", () => {
  it("single role → vein present", () => {
    const m = msg({ id: 1, date: 100, out: false })
    const [role] = computeMessageClusterRoles([m])
    expect(role).toBe("single")
    expect(hasVein(role)).toBe(true)
  })

  it("last role → vein present", () => {
    const u1 = new Api.PeerUser({ userId: bigInt(1) })
    const a = msg({ id: 1, date: 100, out: false, fromId: u1 })
    const b = msg({ id: 2, date: 150, out: false, fromId: u1 })
    const roles = computeMessageClusterRoles([a, b])
    expect(roles[1]).toBe("last")
    expect(hasVein(roles[1])).toBe(true)
  })

  it("first role → no vein", () => {
    const u1 = new Api.PeerUser({ userId: bigInt(1) })
    const a = msg({ id: 1, date: 100, out: false, fromId: u1 })
    const b = msg({ id: 2, date: 150, out: false, fromId: u1 })
    const roles = computeMessageClusterRoles([a, b])
    expect(roles[0]).toBe("first")
    expect(hasVein(roles[0])).toBe(false)
  })

  it("middle role → no vein", () => {
    const u1 = new Api.PeerUser({ userId: bigInt(1) })
    const a = msg({ id: 1, date: 100, out: false, fromId: u1 })
    const b = msg({ id: 2, date: 150, out: false, fromId: u1 })
    const c = msg({ id: 3, date: 200, out: false, fromId: u1 })
    const roles = computeMessageClusterRoles([a, b, c])
    expect(roles[1]).toBe("middle")
    expect(hasVein(roles[1])).toBe(false)
  })

  it("outbound single role → right vein class", () => {
    const m = msg({ id: 1, date: 100, out: true })
    const [role] = computeMessageClusterRoles([m])
    expect(role).toBe("single")
    const isOut = m.out === true
    const veinClass = hasVein(role)
      ? isOut
        ? "msg-bubble--vein-out"
        : "msg-bubble--vein-in"
      : null
    expect(veinClass).toBe("msg-bubble--vein-out")
  })

  it("outbound last role → right vein class", () => {
    const a = msg({ id: 1, date: 100, out: true })
    const b = msg({ id: 2, date: 150, out: true })
    const roles = computeMessageClusterRoles([a, b])
    expect(roles[1]).toBe("last")
    expect(hasVein(roles[1])).toBe(true)
    expect(b.out).toBe(true)
  })
})

// ── Sender name attribution conditions ───────────────────────────────────────

describe("messageBubbleGroup — sender name attribution conditions", () => {
  /**
   * Mirrors showSenderName from ChatView/InboundClusterRow:
   *   isGroup && !isOut && (role === "single" || role === "first")
   */
  function showSenderName(
    role: MessageClusterRole,
    isOut: boolean,
    isGroup: boolean,
  ): boolean {
    return isGroup && !isOut && (role === "single" || role === "first")
  }

  it("inbound single in group → show sender name", () => {
    expect(showSenderName("single", false, true)).toBe(true)
  })

  it("inbound first in group → show sender name", () => {
    expect(showSenderName("first", false, true)).toBe(true)
  })

  it("inbound last in group → no sender name (not first)", () => {
    expect(showSenderName("last", false, true)).toBe(false)
  })

  it("inbound middle in group → no sender name", () => {
    expect(showSenderName("middle", false, true)).toBe(false)
  })

  it("inbound single in private chat → no sender name (AC5)", () => {
    expect(showSenderName("single", false, false)).toBe(false)
  })

  it("outbound single in group → no sender name", () => {
    expect(showSenderName("single", true, true)).toBe(false)
  })
})

// ── Avatar / spacer conditions ────────────────────────────────────────────────

describe("messageBubbleGroup — avatar / spacer conditions", () => {
  function showAvatar(
    role: MessageClusterRole,
    isOut: boolean,
    isGroup: boolean,
  ): boolean {
    return isGroup && !isOut && (role === "single" || role === "last")
  }

  function showSpacer(
    role: MessageClusterRole,
    isOut: boolean,
    isGroup: boolean,
  ): boolean {
    return isGroup && !isOut && (role === "first" || role === "middle")
  }

  it("inbound single in group → avatar shown", () => {
    expect(showAvatar("single", false, true)).toBe(true)
  })

  it("inbound last in group → avatar shown", () => {
    expect(showAvatar("last", false, true)).toBe(true)
  })

  it("inbound first in group → spacer shown, no avatar", () => {
    expect(showAvatar("first", false, true)).toBe(false)
    expect(showSpacer("first", false, true)).toBe(true)
  })

  it("inbound middle in group → spacer shown, no avatar", () => {
    expect(showAvatar("middle", false, true)).toBe(false)
    expect(showSpacer("middle", false, true)).toBe(true)
  })

  it("inbound single in private chat → no avatar, no spacer (AC5)", () => {
    expect(showAvatar("single", false, false)).toBe(false)
    expect(showSpacer("single", false, false)).toBe(false)
  })
})
