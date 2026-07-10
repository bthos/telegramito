import { useCallback, useEffect, useId, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { TelegramClient } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"
import type { ParentalSettings } from "../parental/types"
import {
  getPeerInfo,
  isBroadcastChannelDialog,
  isLettersSidebarChannelListDialog,
  isLettersSidebarGroupDialog,
  isPrivateUserDialog,
} from "../telegram/dialogUtils"
import { ChevronDownIcon } from "./ChatChromeIcons"
import { ChannelsBulletinTiles, type ChannelStripPeer } from "./ChannelsBulletinsStrip"
import { ChatList } from "./ChatList"
import { TextField } from "./ds"
import type { CorrespondenceTab } from "../util/correspondenceFilter"

type Props = {
  search: string
  onSearchChange: (value: string) => void
  nightListHidden: boolean
  nightWindow?: { start: string; end: string }
  dialogs: Dialog[]
  selected: Dialog | null
  onSelect: (d: Dialog) => void
  onRequestForHidden: (d: Dialog) => void
  settings: ParentalSettings
  hasMoreDialogs?: boolean
  loadMoreDialogs?: () => void
  dialogsLoadingMore?: boolean
  /** Total dialogs loaded in session (for list footnote). */
  loadedDialogCount?: number
  client?: TelegramClient | null
  /** Letters v2: show correspondents heading. */
  lettersMode?: boolean
  /** When false, omit list search field (search lives in masthead). */
  showSearch?: boolean
  /** Mobile circles tab: groups + channels only (no correspondents accordion). */
  circlesOnly?: boolean
  /** Letters: private dialogs only — correspondents accordion ChatList (defaults from `dialogs` if omitted). */
  correspondentsDialogs?: Dialog[]
  /** Letters: groups + channels except broadcasts — split into group / channel accordions (defaults derived if omitted). */
  circlesDialogs?: Dialog[]
  /** Letters v2: channel bulletins FM tiles inside channels accordion */
  bulletinChannelPeers?: ChannelStripPeer[]
  onSelectBulletinPeer?: (peerKey: string) => void
  /** Active correspondence chip — drives drafts empty state and row layout. */
  correspondenceTab?: CorrespondenceTab
}

/** Letters sidebar accordion: exactly one section expanded; collapsing cycles to the next. */
export type LettersSidebarSection = "correspondents" | "groups" | "channels"

function cycleNextSection(
  current: LettersSidebarSection,
  available: readonly LettersSidebarSection[],
): LettersSidebarSection {
  const idx = available.indexOf(current)
  if (idx < 0 || available.length === 0) {
    return available[0] ?? "correspondents"
  }
  return available[(idx + 1) % available.length]!
}

export function ChatsListPanel({
  search,
  onSearchChange,
  nightListHidden,
  nightWindow,
  dialogs,
  selected,
  onSelect,
  onRequestForHidden,
  settings,
  hasMoreDialogs,
  loadMoreDialogs,
  dialogsLoadingMore,
  loadedDialogCount,
  client,
  lettersMode = false,
  showSearch = true,
  circlesOnly = false,
  correspondentsDialogs: correspondentsDialogsProp,
  circlesDialogs: circlesDialogsProp,
  bulletinChannelPeers,
  onSelectBulletinPeer,
  correspondenceTab = "letters",
}: Props) {
  const { t } = useTranslation()
  const corrUid = useId()
  const corrHeadId = `${corrUid}-corr-h`
  const corrPanelId = `${corrUid}-corr-panel`

  const grpUid = useId()
  const grpHeadId = `${grpUid}-grp-h`
  const grpPanelId = `${grpUid}-grp-panel`

  const chUid = useId()
  const chHeadId = `${chUid}-ch-h`
  const chPanelId = `${chUid}-ch-panel`

  const [openSection, setOpenSection] = useState<LettersSidebarSection>("correspondents")

  const peopleDialogs = useMemo(() => {
    if (!lettersMode) {
      return dialogs
    }
    if (correspondentsDialogsProp != null) {
      return correspondentsDialogsProp
    }
    return dialogs.filter(isPrivateUserDialog)
  }, [lettersMode, dialogs, correspondentsDialogsProp])

  const circlesDialogs = useMemo(() => {
    if (!lettersMode) {
      return []
    }
    if (circlesDialogsProp != null) {
      return circlesDialogsProp
    }
    return dialogs.filter(
      (d) =>
        !isPrivateUserDialog(d) && !isBroadcastChannelDialog(d),
    )
  }, [lettersMode, dialogs, circlesDialogsProp])

  const groupDialogs = useMemo(
    () => circlesDialogs.filter(isLettersSidebarGroupDialog),
    [circlesDialogs],
  )

  const channelListDialogs = useMemo(
    () => circlesDialogs.filter(isLettersSidebarChannelListDialog),
    [circlesDialogs],
  )

  const hasBulletinStrip =
    bulletinChannelPeers != null &&
    bulletinChannelPeers.length > 0 &&
    onSelectBulletinPeer != null

  const hasLettersGroupsSection = groupDialogs.length > 0
  const hasLettersChannelsSection =
    channelListDialogs.length > 0 || hasBulletinStrip

  const showLettersCirclesStack =
    lettersMode &&
    !nightListHidden &&
    (hasLettersGroupsSection || hasLettersChannelsSection)

  const showCorrespondentsSection = lettersMode && !circlesOnly

  const sidebarSectionsOrdered = useMemo((): LettersSidebarSection[] => {
    const list: LettersSidebarSection[] = []
    if (showCorrespondentsSection) list.push("correspondents")
    if (hasLettersGroupsSection) list.push("groups")
    if (hasLettersChannelsSection) list.push("channels")
    return list.length > 0 ? list : ["correspondents"]
  }, [showCorrespondentsSection, hasLettersGroupsSection, hasLettersChannelsSection])

  useEffect(() => {
    if (!lettersMode) {
      return
    }
    if (!sidebarSectionsOrdered.includes(openSection)) {
      setOpenSection(sidebarSectionsOrdered[0] ?? "correspondents")
    }
    if (circlesOnly && openSection === "correspondents") {
      setOpenSection(sidebarSectionsOrdered.find((s) => s !== "correspondents") ?? "groups")
    }
  }, [lettersMode, openSection, sidebarSectionsOrdered, circlesOnly])

  const onLettersSectionHeaderClick = useCallback((section: LettersSidebarSection) => {
    if (!sidebarSectionsOrdered.includes(section)) {
      return
    }
    if (openSection === section) {
      setOpenSection(cycleNextSection(section, sidebarSectionsOrdered))
    } else {
      setOpenSection(section)
    }
  }, [openSection, sidebarSectionsOrdered])

  const correspondentsChatList = (
    <>
      {correspondenceTab === "drafts" && peopleDialogs.length === 0 ? (
        <div className="letters-drafts-empty" role="status">
          <p className="letters-drafts-empty__mark" aria-hidden>
            ✎
          </p>
          <p className="letters-drafts-empty__title">{t("letters.draftsEmptyTitle")}</p>
          <p className="letters-drafts-empty__sub muted small">{t("letters.draftsEmptySub")}</p>
        </div>
      ) : (
        <ChatList
          nightListHidden={nightListHidden}
          nightWindow={nightWindow}
          dialogs={lettersMode ? peopleDialogs : dialogs}
          onSelect={onSelect}
          selectedKey={selected ? getPeerInfo(selected).key : null}
          onRequestForHidden={onRequestForHidden}
          settings={settings}
          hasMoreDialogs={hasMoreDialogs}
          loadMoreDialogs={loadMoreDialogs}
          dialogsLoadingMore={dialogsLoadingMore}
          loadedDialogCount={loadedDialogCount}
          client={client}
          draftsMode={correspondenceTab === "drafts"}
        />
      )}
    </>
  )

  const circlesChatListShared = {
    nightListHidden,
    nightWindow,
    onSelect,
    selectedKey: selected ? getPeerInfo(selected).key : null,
    onRequestForHidden,
    settings,
    hasMoreDialogs: false as const,
    loadMoreDialogs: undefined,
    dialogsLoadingMore: false,
    loadedDialogCount: undefined,
    client,
  }

  return (
    <>
      {lettersMode ? (
        <div className="letters-sidebar-accordions">
          {showCorrespondentsSection ? (
            <>
              <button
                type="button"
                id={corrHeadId}
                className="letters-aside-accordion__trigger letters-aside-accordion__trigger--correspondents"
                aria-expanded={openSection === "correspondents"}
                aria-controls={corrPanelId}
                onClick={() => {
                  onLettersSectionHeaderClick("correspondents")
                }}
              >
                <span className="letters-correspondents-h">{t("letters.correspondents")}</span>
                <ChevronDownIcon
                  className={`letters-aside-accordion__chev${openSection === "correspondents" ? " is-expanded" : ""}`}
                  aria-hidden
                />
              </button>
              <div
                id={corrPanelId}
                role="region"
                aria-labelledby={corrHeadId}
                className="letters-aside-accordion__panel"
                hidden={openSection !== "correspondents"}
              >
                {showSearch ? (
                  <div className="chat-list-toolbar">
                    <TextField
                      type="search"
                      variant="search"
                      name="q"
                      value={search}
                      onChange={(e) => {
                        onSearchChange(e.target.value)
                      }}
                      placeholder={t("chat.search")}
                      aria-label={t("chat.search")}
                      autoComplete="off"
                    />
                  </div>
                ) : null}
                {correspondentsChatList}
              </div>
            </>
          ) : null}
          {showLettersCirclesStack && hasLettersGroupsSection ? (
            <>
              <button
                type="button"
                id={grpHeadId}
                className="letters-aside-accordion__trigger letters-aside-accordion__trigger--groups letters-channels-strip__label-btn"
                aria-expanded={openSection === "groups"}
                aria-controls={grpPanelId}
                onClick={() => {
                  onLettersSectionHeaderClick("groups")
                }}
              >
                <span className="letters-channels-strip__label-text">
                  {t("letters.sidebarGroupsTitle")}
                </span>
                <ChevronDownIcon
                  className={`letters-aside-accordion__chev${openSection === "groups" ? " is-expanded" : ""}`}
                  aria-hidden
                />
              </button>
              <div
                id={grpPanelId}
                role="region"
                aria-labelledby={grpHeadId}
                className="letters-aside-accordion__panel"
                hidden={openSection !== "groups"}
              >
                <ChatList
                  {...circlesChatListShared}
                  dialogs={groupDialogs}
                />
              </div>
            </>
          ) : null}
          {showLettersCirclesStack && hasLettersChannelsSection ? (
            <>
              <button
                type="button"
                id={chHeadId}
                className="letters-aside-accordion__trigger letters-aside-accordion__trigger--channels letters-channels-strip__label-btn"
                aria-expanded={openSection === "channels"}
                aria-controls={chPanelId}
                onClick={() => {
                  onLettersSectionHeaderClick("channels")
                }}
              >
                <span className="letters-channels-strip__label-text">
                  {t("letters.sidebarChannelsTitle")}
                </span>
                <ChevronDownIcon
                  className={`letters-aside-accordion__chev${openSection === "channels" ? " is-expanded" : ""}`}
                  aria-hidden
                />
              </button>
              <div
                id={chPanelId}
                role="region"
                aria-labelledby={chHeadId}
                className="letters-aside-accordion__panel letters-aside-accordion__panel--channels"
                hidden={openSection !== "channels"}
              >
                <div className="letters-aside-accordion__channels-scroll">
                  {channelListDialogs.length > 0 ? (
                    <ChatList
                      {...circlesChatListShared}
                      dialogs={channelListDialogs}
                    />
                  ) : null}
                  {hasBulletinStrip ? (
                    <ChannelsBulletinTiles
                      peers={bulletinChannelPeers}
                      selectedKey={selected ? getPeerInfo(selected).key : null}
                      onSelect={onSelectBulletinPeer}
                      client={client}
                    />
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : (
        <>
          {showSearch ? (
            <div className="chat-list-toolbar">
              <TextField
                type="search"
                variant="search"
                name="q"
                value={search}
                onChange={(e) => {
                  onSearchChange(e.target.value)
                }}
                placeholder={t("chat.search")}
                aria-label={t("chat.search")}
                autoComplete="off"
              />
            </div>
          ) : null}
          <ChatList
            nightListHidden={nightListHidden}
            nightWindow={nightWindow}
            dialogs={dialogs}
            onSelect={onSelect}
            selectedKey={selected ? getPeerInfo(selected).key : null}
            onRequestForHidden={onRequestForHidden}
            settings={settings}
            hasMoreDialogs={hasMoreDialogs}
            loadMoreDialogs={loadMoreDialogs}
            dialogsLoadingMore={dialogsLoadingMore}
            loadedDialogCount={loadedDialogCount}
            client={client}
          />
        </>
      )}
    </>
  )
}
