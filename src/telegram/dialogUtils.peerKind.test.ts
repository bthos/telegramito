import { describe, expect, it } from "vitest"
import { Api } from "teleproto"
import type { Dialog } from "teleproto/tl/custom/dialog"
import {
  isBroadcastChannelDialog,
  isLettersSidebarChannelListDialog,
  isLettersSidebarGroupDialog,
  isPrivateUserDialog,
} from "./dialogUtils"

function dlg(
  isUser: boolean,
  entity: Dialog["entity"],
): Dialog {
  return {
    isUser,
    name: "?",
    entity,
    dialog: {
      className: "Dialog",
      peer: {} as Api.TypePeer,
      topMessage: 0,
      readInboxMaxId: 0,
      readOutboxMaxId: 0,
      unreadCount: 0,
    } as Api.Dialog,
  } as unknown as Dialog
}

describe("dialogUtils peer buckets (Letters sidebar)", () => {
  it("private user dialogs are not broadcast channels", () => {
    const u = dlg(true, {
      className: "User",
      id: 1n,
      accessHash: 1n,
      firstName: "A",
    } as unknown as Api.User)
    expect(isPrivateUserDialog(u)).toBe(true)
    expect(isBroadcastChannelDialog(u)).toBe(false)
  })

  it("broadcast channel is broadcast, not private", () => {
    const ch = dlg(false, {
      className: "Channel",
      id: 2n,
      accessHash: 1n,
      title: "News",
      broadcast: true,
      megagroup: false,
    } as unknown as Api.Channel)
    expect(isPrivateUserDialog(ch)).toBe(false)
    expect(isBroadcastChannelDialog(ch)).toBe(true)
  })

  it("megagroup is not broadcast", () => {
    const g = dlg(false, {
      className: "Channel",
      id: 3n,
      accessHash: 1n,
      title: "Group",
      broadcast: false,
      megagroup: true,
    } as unknown as Api.Channel)
    expect(isBroadcastChannelDialog(g)).toBe(false)
  })

  it("basic Chat is not broadcast", () => {
    const c = dlg(false, {
      className: "Chat",
      id: 4n,
      title: "Old",
    } as unknown as Api.Chat)
    expect(isBroadcastChannelDialog(c)).toBe(false)
  })

  it("letters sidebar: mega channel and Chat are groups", () => {
    const g = dlg(false, {
      className: "Channel",
      id: 3n,
      accessHash: 1n,
      title: "Group",
      broadcast: false,
      megagroup: true,
    } as unknown as Api.Channel)
    const ch = dlg(false, {
      className: "Chat",
      id: 4n,
      title: "Old",
    } as unknown as Api.Chat)
    expect(isLettersSidebarGroupDialog(g)).toBe(true)
    expect(isLettersSidebarGroupDialog(ch)).toBe(true)
    expect(isLettersSidebarChannelListDialog(g)).toBe(false)
    expect(isLettersSidebarChannelListDialog(ch)).toBe(false)
  })

  it("letters sidebar: broadcast and non-mega non-broadcast channel classification", () => {
    const bc = dlg(false, {
      className: "Channel",
      id: 2n,
      accessHash: 1n,
      title: "News",
      broadcast: true,
      megagroup: false,
    } as unknown as Api.Channel)
    const discussion = dlg(false, {
      className: "Channel",
      id: 5n,
      accessHash: 1n,
      title: "Discussion",
      broadcast: false,
      megagroup: false,
    } as unknown as Api.Channel)
    expect(isLettersSidebarGroupDialog(bc)).toBe(false)
    expect(isLettersSidebarChannelListDialog(bc)).toBe(false)
    expect(isLettersSidebarGroupDialog(discussion)).toBe(false)
    expect(isLettersSidebarChannelListDialog(discussion)).toBe(true)
  })
})
