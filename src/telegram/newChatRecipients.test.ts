import { describe, expect, it } from "vitest"
import { Api } from "teleproto"
import {
  defaultGroupTitleFromRecipients,
  filterUsersForNewChat,
  isUserSelectableForNewChat,
  toNewChatRecipient,
} from "../telegram/newChatRecipients"
import { defaultParentalSettings } from "../parental/types"

function user(id: number, opts: Partial<Api.User> = {}): Api.User {
  return new Api.User({
    id: BigInt(id) as never,
    accessHash: BigInt(1) as never,
    firstName: `User${id}`,
    ...opts,
  })
}

describe("newChatRecipients", () => {
  it("filters bots, self, and duplicates", () => {
    const users = [
      user(1),
      user(1, { firstName: "Dup" }),
      user(2, { bot: true }),
      user(3, { self: true }),
    ]
    const recipients = filterUsersForNewChat(users, defaultParentalSettings(), new Set())
    expect(recipients).toHaveLength(1)
    expect(recipients[0]?.id).toBe("1")
  })

  it("blocks denied private peers in child mode", () => {
    const u = user(9)
    const selectable = isUserSelectableForNewChat({
      user: u,
      appMode: "child",
      allowlistIds: [],
      deniedPeerIds: new Set(["9"]),
      blockUnknownPrivate: true,
    })
    expect(selectable).toBe(false)
  })

  it("builds a default group title from first names", () => {
    const title = defaultGroupTitleFromRecipients([
      toNewChatRecipient(user(1, { firstName: "Anna" })),
      toNewChatRecipient(user(2, { firstName: "Kate" })),
      toNewChatRecipient(user(3, { firstName: "Mama" })),
    ])
    expect(title).toBe("Anna, Kate +1")
  })
})
