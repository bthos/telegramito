/**
 * AC9 regression (letters-circles-stories-tab): once `MainShell`'s Circles tab
 * stops rendering `ChatsListPanel circlesOnly` (replaced by `StoriesRailStrip`),
 * the Letters tab's own groups/channels accordion (`showLettersCirclesStack`)
 * must keep firing exactly as before. That gate never depended on the
 * `circlesOnly` prop (confirmed by reading the source before this feature
 * removed the prop entirely) — this test locks that in.
 */
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import type { Dialog } from "teleproto/tl/custom/dialog"
import type { Api } from "teleproto"
import { ChatsListPanel } from "./ChatsListPanel"
import type { ParentalSettings } from "../parental/types"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const settings: ParentalSettings = {
  version: 1,
  appMode: "parent",
  blockUnknownPrivate: false,
  hideLinkPreviews: false,
  filterGifs: false,
  allowOutgoingMedia: true,
  nightMode: { enabled: false, start: "22:00", end: "07:00" },
  allowlistIds: [],
  pinHash: null,
  pinSalt: null,
  locale: null,
  logLevel: "warn",
  showMessageIds: false,
  morningDayMailEnabled: true,
  waxSealSendEnabled: false,
  eveningSummaryPreciseEnabled: false,
}

function groupDialog(): Dialog {
  return {
    id: { toString: () => "1" },
    name: "Group A",
    entity: { className: "Chat", id: 1 } as unknown as Api.Chat,
  } as unknown as Dialog
}

describe("ChatsListPanel — AC9 regression (groups/channels accordion survives circlesOnly removal)", () => {
  it("still renders the Letters-tab groups accordion when lettersMode is on and night isn't locked", () => {
    render(
      <ChatsListPanel
        search=""
        onSearchChange={() => {}}
        nightListHidden={false}
        dialogs={[]}
        selected={null}
        onSelect={() => {}}
        onRequestForHidden={() => {}}
        settings={settings}
        lettersMode
        circlesDialogs={[groupDialog()]}
      />,
    )
    expect(screen.getByText("letters.sidebarGroupsTitle")).toBeTruthy()
  })

  it("still hides the accordion when night-lock is active, same as before this feature", () => {
    render(
      <ChatsListPanel
        search=""
        onSearchChange={() => {}}
        nightListHidden
        dialogs={[]}
        selected={null}
        onSelect={() => {}}
        onRequestForHidden={() => {}}
        settings={settings}
        lettersMode
        circlesDialogs={[groupDialog()]}
      />,
    )
    expect(screen.queryByText("letters.sidebarGroupsTitle")).toBeNull()
  })
})
