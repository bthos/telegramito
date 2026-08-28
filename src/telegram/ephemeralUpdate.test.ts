import { describe, expect, it } from "vitest"
import { Api } from "teleproto"
import bigInt from "big-integer"
import { getEphemeralUpdatePeerKey, isEphemeralUpdate } from "./ephemeralUpdate"

function ephMsg(channelId: number): Api.EphemeralMessage {
  return new Api.EphemeralMessage({
    id: 1,
    fromId: new Api.PeerUser({ userId: bigInt(9) }),
    peerId: new Api.PeerChannel({ channelId: bigInt(channelId) }),
    receiverId: bigInt(0),
  } as never)
}

describe("ephemeral update detection (AC-E1 / AC-E4)", () => {
  it("recognises the three ephemeral update constructors and nothing else", () => {
    expect(isEphemeralUpdate(new Api.UpdateNewEphemeralMessage({ message: ephMsg(1) } as never))).toBe(true)
    expect(isEphemeralUpdate(new Api.UpdateEditEphemeralMessage({ message: ephMsg(1) } as never))).toBe(true)
    expect(
      isEphemeralUpdate(
        new Api.UpdateDeleteEphemeralMessages({
          peer: new Api.PeerChannel({ channelId: bigInt(1) }),
          ids: [1, 2],
        } as never),
      ),
    ).toBe(true)
    expect(isEphemeralUpdate(new Api.UpdateUserTyping({ userId: bigInt(1), action: new Api.SendMessageTypingAction() } as never))).toBe(false)
    expect(isEphemeralUpdate(undefined)).toBe(false)
  })

  it("extracts the peer key from new / edit / delete", () => {
    expect(
      getEphemeralUpdatePeerKey(new Api.UpdateNewEphemeralMessage({ message: ephMsg(555) } as never)),
    ).toBe("c:555")
    expect(
      getEphemeralUpdatePeerKey(new Api.UpdateEditEphemeralMessage({ message: ephMsg(555) } as never)),
    ).toBe("c:555")
    expect(
      getEphemeralUpdatePeerKey(
        new Api.UpdateDeleteEphemeralMessages({
          peer: new Api.PeerChannel({ channelId: bigInt(777) }),
          ids: [3],
        } as never),
      ),
    ).toBe("c:777")
  })

  it("returns null for non-ephemeral updates and for a missing peer", () => {
    expect(getEphemeralUpdatePeerKey(new Api.UpdateReadHistoryInbox({} as never))).toBeNull()
    expect(getEphemeralUpdatePeerKey(new Api.UpdateNewEphemeralMessage({ message: {} } as never))).toBeNull()
  })
})
