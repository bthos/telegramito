import bigInt from "big-integer"
import { Api } from "teleproto"
import { describe, expect, it } from "vitest"

import { peerKeyToEntityLike } from "./peerKeyToEntityLike"

describe("peerKeyToEntityLike", () => {
  it("parses u:/c:/h: prefixes", () => {
    expect(peerKeyToEntityLike("u:42")).toEqual(
      new Api.PeerUser({ userId: bigInt(42) }),
    )
    expect(peerKeyToEntityLike("c:99")).toEqual(
      new Api.PeerChannel({ channelId: bigInt(99) }),
    )
    expect(peerKeyToEntityLike("h:7")).toEqual(
      new Api.PeerChat({ chatId: bigInt(7) }),
    )
  })

  it("accepts signed decimal dialog-style ids", () => {
    expect(peerKeyToEntityLike("-1001234567890")).toEqual(
      bigInt("-1001234567890"),
    )
  })

  it("returns null for invalid keys", () => {
    expect(peerKeyToEntityLike("")).toBeNull()
    expect(peerKeyToEntityLike("u:abc")).toBeNull()
    expect(peerKeyToEntityLike("display-name-only")).toBeNull()
  })
})
