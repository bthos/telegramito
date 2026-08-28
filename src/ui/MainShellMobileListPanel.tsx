import type { ComponentProps, RefObject } from "react"
import type { TelegramClient } from "teleproto"
import type { Dialog } from "teleproto/tl/custom/dialog"
import type { ParentalSettings } from "../parental/types"
import type { CorrespondenceTab } from "../util/correspondenceFilter"
import { ChatsListPanel } from "./ChatsListPanel"
import { DayMailRail } from "./DayMailRail"
import { LettersCorrespondenceSeg } from "./LettersCorrespondenceSeg"
import { LettersWriteFab } from "./LettersWriteFab"
import { StoriesRailStrip } from "./StoriesRailStrip"
import type { MobileShellTab } from "./LettersMobileTabBar"

export type MainShellMobileListPanelProps = {
  panelRef: RefObject<HTMLDivElement | null>
  mobileTab: MobileShellTab
  correspondenceTab: CorrespondenceTab
  onCorrespondenceTab: (tab: CorrespondenceTab) => void
  listPanelCommon: Omit<ComponentProps<typeof ChatsListPanel>, "dialogs">
  childListDialogs: Dialog[]
  lettersRailSelectedKey: string | null
  onDayMailSelect: (d: Dialog, opts?: { focusMessageId?: number }) => void
  client: TelegramClient | null
  settings: ParentalSettings
  nightHidden: boolean
  nightWindow: { start: string; end: string } | undefined
  deniedPeerIds: ReadonlySet<string>
  onWrite: () => void
}

export function MainShellMobileListPanel({
  panelRef,
  mobileTab,
  correspondenceTab,
  onCorrespondenceTab,
  listPanelCommon,
  childListDialogs,
  lettersRailSelectedKey,
  onDayMailSelect,
  client,
  settings,
  nightHidden,
  nightWindow,
  deniedPeerIds,
  onWrite,
}: MainShellMobileListPanelProps) {
  return (
    <div
      ref={panelRef}
      className="letters-mobile-panel"
      role="tabpanel"
      id={`letters-mobile-panel-${mobileTab}`}
      aria-labelledby={`letters-mobile-tab-${mobileTab}`}
    >
      {mobileTab === "letters" ? (
        <>
          <LettersCorrespondenceSeg value={correspondenceTab} onChange={onCorrespondenceTab} />
          <div className="letters-mobile-panel-scroll chats-narrow-list">
            <ChatsListPanel {...listPanelCommon} dialogs={childListDialogs} />
          </div>
          <LettersWriteFab onClick={onWrite} />
        </>
      ) : null}
      {mobileTab === "dayMail" ? (
        <div className="letters-mobile-panel-scroll letters-mobile-day-mail">
          <DayMailRail
            dialogs={childListDialogs}
            selectedKey={lettersRailSelectedKey}
            onSelect={onDayMailSelect}
            client={client}
          />
        </div>
      ) : null}
      {mobileTab === "circles" ? (
        <div className="letters-mobile-panel-scroll letters-mobile-circles">
          <StoriesRailStrip
            client={client}
            appMode={settings.appMode}
            nightListHidden={nightHidden}
            nightWindow={nightWindow}
            deniedPeerIds={deniedPeerIds}
          />
        </div>
      ) : null}
    </div>
  )
}
