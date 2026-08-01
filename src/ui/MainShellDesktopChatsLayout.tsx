import type { ComponentProps } from "react"
import type { Dialog } from "telegram/tl/custom/dialog"
import type { ParentalSettings } from "../parental/types"
import { getPeerInfo } from "../telegram/dialogUtils"
import { ChatView } from "./ChatView"
import { ChatsListPanel } from "./ChatsListPanel"
import { LettersChatRailProvider } from "./LettersChatRailContext"
import { LettersRightRailColumn } from "./LettersRightRailColumn"

export type MainShellDesktopChatsLayoutProps = {
  lettersThreeCol: boolean
  correspondentsAria: string
  railAsideAria: string
  noChatLabel: string
  emptyHint: string
  listPanelCommon: Omit<ComponentProps<typeof ChatsListPanel>, "dialogs">
  childListDialogs: Dialog[]
  selected: Dialog | null
  settings: ParentalSettings
  /** Focus id from any jump source (day mail, co-reading, Passages). */
  lettersFocusMessageId: number | null
  onLettersJumpConsumed: () => void
  onCoReadingBookmarked: () => void
  lettersInChatSearchSeed: string | null
  onLettersInChatSearchSeedConsumed: () => void
  lettersRailDigest: {
    dialogs: Dialog[]
    selectedKey: string | null
    onSelect: (d: Dialog, opts?: { focusMessageId?: number }) => void
  }
  lettersRailSelectedKey: string | null
}

export function MainShellDesktopChatsLayout({
  lettersThreeCol,
  correspondentsAria,
  railAsideAria,
  noChatLabel,
  emptyHint,
  listPanelCommon,
  childListDialogs,
  selected,
  settings,
  lettersFocusMessageId,
  onLettersJumpConsumed,
  onCoReadingBookmarked,
  lettersInChatSearchSeed,
  onLettersInChatSearchSeedConsumed,
  lettersRailDigest,
  lettersRailSelectedKey,
}: MainShellDesktopChatsLayoutProps) {
  return (
    <LettersChatRailProvider digest={lettersRailDigest} selectedKey={lettersRailSelectedKey}>
      <div className={`chats-layout${lettersThreeCol ? " chats-layout--letters-three" : ""}`}>
        <aside className="chat-aside letters-correspondents-aside" aria-label={correspondentsAria}>
          <ChatsListPanel {...listPanelCommon} dialogs={childListDialogs} showSearch={false} />
        </aside>
        <div className="chat-main chat-main--letters">
          {selected ? (
            <ChatView
              key={getPeerInfo(selected).key}
              dialog={selected}
              settings={settings}
              lettersLayout
              lettersThreePane={lettersThreeCol}
              lettersJumpToMessageId={lettersFocusMessageId}
              onLettersJumpToMessageConsumed={onLettersJumpConsumed}
              onCoReadingBookmarked={onCoReadingBookmarked}
              lettersInChatSearchSeed={lettersInChatSearchSeed}
              onLettersInChatSearchSeedConsumed={onLettersInChatSearchSeedConsumed}
            />
          ) : (
            <div className="empty-chat" role="status">
              <div className="empty-chat__icon" aria-hidden />
              <p className="empty-chat__t">{noChatLabel}</p>
              <p className="empty-chat__d muted small">{emptyHint}</p>
            </div>
          )}
        </div>
        {lettersThreeCol ? (
          <aside className="letters-day-mail-aside" aria-label={railAsideAria}>
            <LettersRightRailColumn />
          </aside>
        ) : null}
      </div>
    </LettersChatRailProvider>
  )
}
