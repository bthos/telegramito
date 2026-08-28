import { describe, expect, it } from "vitest"
import { parseJoinInviteInput } from "./joinInviteInput"

describe("parseJoinInviteInput (UX input contract)", () => {
  it("private invite links → { kind: 'invite', hash }", () => {
    for (const input of [
      "https://t.me/+AbCd1234efGH",
      "t.me/+AbCd1234efGH",
      "tg://join?invite=AbCd1234efGH",
      "https://t.me/joinchat/AbCd1234efGH",
      "joinchat/AbCd1234efGH",
    ]) {
      expect(parseJoinInviteInput(input)).toEqual({
        kind: "invite",
        hash: "AbCd1234efGH",
      })
    }
  })

  it("public username forms → { kind: 'username', username }", () => {
    for (const input of ["@durov", "t.me/durov", "https://t.me/durov", "durov"]) {
      expect(parseJoinInviteInput(input)).toEqual({
        kind: "username",
        username: "durov",
      })
    }
  })

  it("private invite wins over username when both markers present", () => {
    expect(parseJoinInviteInput("https://t.me/+joinchat")).toEqual({
      kind: "invite",
      hash: "joinchat",
    })
  })

  it("bare token with a '-' (invalid in usernames) parses as an invite hash", () => {
    expect(parseJoinInviteInput("AbCd-1234_efGH")).toEqual({
      kind: "invite",
      hash: "AbCd-1234_efGH",
    })
  })

  it("bare username-shaped token parses as a username", () => {
    expect(parseJoinInviteInput("telegram")).toEqual({
      kind: "username",
      username: "telegram",
    })
  })

  it("empty / clearly invalid → null", () => {
    expect(parseJoinInviteInput("")).toBeNull()
    expect(parseJoinInviteInput("   ")).toBeNull()
    expect(parseJoinInviteInput("@x")).toBeNull() // too short for a username
    expect(parseJoinInviteInput("https://example.com/foo")).toBeNull()
  })
})
