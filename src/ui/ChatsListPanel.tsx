import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import type { TelegramClient } from "teleproto"
import type { Dialog } from "teleproto/tl/custom/dialog"
import type { ParentalSettings } from "../parental/types"
import {
  getPeerInfo,
  isLettersCirclesDialog,
  isLettersSidebarChannelListDialog,
  isLettersSidebarGroupDialog,
  isPrivateUserDialog,
} from "../telegram/dialogUtils"
import { ChevronDownIcon } from "./ChatChromeIcons"
import { ChannelsBulletinTiles, type ChannelStripPeer } from "./ChannelsBulletinsStrip"
import { ChatList } from "./ChatList"
import { SearchResultRow, searchResultSenderLabel } from "./SearchResultRow"
import { TextField } from "./ds"
import type { CorrespondenceTab } from "../util/correspondenceFilter"
import {
  groupGlobalSearchHits,
  type GlobalSearchCluster,
  type GlobalSearchHit,
} from "../util/groupGlobalSearchHits"
import {
  buildLettersSidebarSectionsOrdered,
  cycleNextSection,
  nextOpenSectionOnQueryChange,
  sidebarEmptyKind,
  type LettersSidebarSection,
} from "../util/lettersSidebarSections"

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
  /** Letters: private dialogs only — correspondents accordion ChatList (defaults from `dialogs` if omitted). */
  correspondentsDialogs?: Dialog[]
  /** Letters: groups + channels except broadcasts — split into group / channel accordions (defaults derived if omitted). */
  circlesDialogs?: Dialog[]
  /** Letters v2: channel bulletins FM tiles inside channels accordion */
  bulletinChannelPeers?: ChannelStripPeer[]
  onSelectBulletinPeer?: (peerKey: string) => void
  /** Active correspondence chip — drives drafts empty state and row layout. */
  correspondenceTab?: CorrespondenceTab
  /** Global message-history hits for the Passages section (see `useGlobalMessageSearch`). */
  passagesResults?: GlobalSearchHit[]
  passagesLoading?: boolean
  /** Opaque error token from the global search hook; renders the error + Retry state. */
  passagesError?: string | null
  onPassagesRetry?: () => void
  onPassageSelect?: (hit: GlobalSearchHit) => void
  onPassagesSeeAll?: (cluster: GlobalSearchCluster) => void
  /** The passage whose chat could not be opened — renders the inline jump error. */
  passagesJumpError?: { peerKey: string; messageId: number } | null
  /** Circles dialogs before the search filter — picks between the AC6 empty-state copies. */
  unfilteredCirclesDialogs?: Dialog[]
}

const NO_PASSAGE_HITS: GlobalSearchHit[] = []

function clusterInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "§"
}

/** Accordion-scale empty state: same mark/title/sub shape as `.letters-drafts-empty`. */
function CompactEmpty({
  mark,
  title,
  sub,
  action,
}: {
  mark: string
  title: string
  sub?: string | null
  action?: ReactNode
}) {
  return (
    <div className="letters-compact-empty" role="status">
      <p className="letters-compact-empty__mark" aria-hidden>
        {mark}
      </p>
      <p className="letters-compact-empty__title">{title}</p>
      {sub != null ? <p className="letters-compact-empty__sub muted small">{sub}</p> : null}
      {action}
    </div>
  )
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
  correspondentsDialogs: correspondentsDialogsProp,
  circlesDialogs: circlesDialogsProp,
  bulletinChannelPeers,
  onSelectBulletinPeer,
  correspondenceTab = "letters",
  passagesResults = NO_PASSAGE_HITS,
  passagesLoading = false,
  passagesError = null,
  onPassagesRetry,
  onPassageSelect,
  onPassagesSeeAll,
  passagesJumpError = null,
  unfilteredCirclesDialogs,
}: Props) {
  const { t, i18n } = useTranslation()
  const corrUid = useId()
  const corrHeadId = `${corrUid}-corr-h`
  const corrPanelId = `${corrUid}-corr-panel`

  const grpUid = useId()
  const grpHeadId = `${grpUid}-grp-h`
  const grpPanelId = `${grpUid}-grp-panel`

  const chUid = useId()
  const chHeadId = `${chUid}-ch-h`
  const chPanelId = `${chUid}-ch-panel`

  const msgUid = useId()
  const msgHeadId = `${msgUid}-msg-h`
  const msgPanelId = `${msgUid}-msg-panel`

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
    return dialogs.filter(isLettersCirclesDialog)
  }, [lettersMode, dialogs, circlesDialogsProp])

  const groupDialogs = useMemo(
    () => circlesDialogs.filter(isLettersSidebarGroupDialog),
    [circlesDialogs],
  )

  const channelListDialogs = useMemo(
    () => circlesDialogs.filter(isLettersSidebarChannelListDialog),
    [circlesDialogs],
  )

  const unfilteredGroupCount = useMemo(
    () => (unfilteredCirclesDialogs ?? circlesDialogs).filter(isLettersSidebarGroupDialog).length,
    [unfilteredCirclesDialogs, circlesDialogs],
  )
  const unfilteredChannelCount = useMemo(
    () =>
      (unfilteredCirclesDialogs ?? circlesDialogs).filter(isLettersSidebarChannelListDialog)
        .length,
    [unfilteredCirclesDialogs, circlesDialogs],
  )

  const hasBulletinStrip =
    bulletinChannelPeers != null &&
    bulletinChannelPeers.length > 0 &&
    onSelectBulletinPeer != null

  const searchActive = search.trim().length > 0

  /** AC6: sections stay in the accordion; these only pick which empty copy renders. */
  const groupsEmptyKind = sidebarEmptyKind({
    searchActive,
    unfilteredCount: unfilteredGroupCount,
    filteredCount: groupDialogs.length,
  })
  const channelsEmptyKind = sidebarEmptyKind({
    searchActive,
    // The bulletin strip survives the search filter, so it counts on both sides —
    // otherwise a bulletin-only section reads as "never had any" instead of "none match".
    unfilteredCount: unfilteredChannelCount + (hasBulletinStrip ? 1 : 0),
    filteredCount: channelListDialogs.length + (hasBulletinStrip ? 1 : 0),
  })

  const showLettersCirclesStack = lettersMode && !nightListHidden

  const showCorrespondentsSection = lettersMode

  const sidebarSectionsOrdered = useMemo((): LettersSidebarSection[] => {
    const ordered = buildLettersSidebarSectionsOrdered({ lettersMode, query: search })
    // Night lock hides the circles stack and global search, as it did before Passages.
    return nightListHidden ? ordered.filter((s) => s === "correspondents") : ordered
  }, [lettersMode, search, nightListHidden])

  const showPassagesSection = sidebarSectionsOrdered.includes("messages")

  const prevPassagesEligibleRef = useRef(showPassagesSection)

  useEffect(() => {
    if (!lettersMode) {
      return
    }
    const prevEligible = prevPassagesEligibleRef.current
    prevPassagesEligibleRef.current = showPassagesSection
    const next = nextOpenSectionOnQueryChange({
      prevEligible,
      nextEligible: showPassagesSection,
      current: openSection,
      ordered: sidebarSectionsOrdered,
    })
    if (next !== openSection) {
      setOpenSection(next)
    }
  }, [lettersMode, openSection, showPassagesSection, sidebarSectionsOrdered])

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

  const passagesClusters = useMemo(
    () => groupGlobalSearchHits(passagesResults),
    [passagesResults],
  )

  const passagesBody = (() => {
    if (passagesError != null) {
      return (
        <CompactEmpty
          mark="§"
          title={t("chat.passagesError")}
          sub={t("chat.passagesErrorSub")}
          action={
            onPassagesRetry != null ? (
              <button
                type="button"
                className="letters-compact-empty__action"
                onClick={onPassagesRetry}
              >
                {t("common.retry")}
              </button>
            ) : null
          }
        />
      )
    }
    if (passagesClusters.length === 0) {
      return passagesLoading ? null : (
        <CompactEmpty
          mark="§"
          title={t("chat.passagesNoResults", { query: search.trim() })}
          sub={t("chat.passagesNoResultsSub")}
        />
      )
    }
    return passagesClusters.map((cluster) => {
      const clusterHasJumpError = passagesJumpError?.peerKey === cluster.peerKey
      return (
        <div className="letters-passages__cluster" key={cluster.peerKey}>
          <div className="letters-passages__cluster-head">
            <span className="letters-passages__ava" aria-hidden>
              {clusterInitial(cluster.peerDisplayName)}
            </span>
            <span className="letters-passages__cluster-name">{cluster.peerDisplayName}</span>
            <span className="letters-passages__cluster-count">
              {t("chat.passagesClusterCount", { n: cluster.totalCount })}
            </span>
          </div>
          <ul
            className="letters-passages__hits"
            role="listbox"
            aria-label={cluster.peerDisplayName}
          >
            {cluster.previewHits.map((hit) => {
              const rowHasJumpError =
                clusterHasJumpError && passagesJumpError?.messageId === hit.message.id
              return (
                <SearchResultRow
                  key={`${hit.peerKey}:${String(hit.message.id)}`}
                  message={hit.message}
                  query={search}
                  senderLabel={searchResultSenderLabel(hit.message, cluster.peerDisplayName, t)}
                  locale={i18n.language}
                  noTextLabel={t("chat.searchHitNoText")}
                  optionProps={{
                    role: "option",
                    className: rowHasJumpError
                      ? "letters-passages__hit is-jump-error"
                      : "letters-passages__hit",
                    tabIndex: 0,
                    onClick: () => {
                      onPassageSelect?.(hit)
                    },
                    onKeyDown: (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onPassageSelect?.(hit)
                      }
                    },
                  }}
                />
              )
            })}
          </ul>
          {clusterHasJumpError ? (
            <p className="letters-passages__jump-error small" role="alert">
              {t("chat.passagesJumpError")}
            </p>
          ) : null}
          {onPassagesSeeAll != null ? (
            <button
              type="button"
              className="letters-passages__see-all"
              onClick={() => {
                onPassagesSeeAll(cluster)
              }}
            >
              {t("chat.passagesSeeAll")}
            </button>
          ) : null}
        </div>
      )
    })
  })()

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
      ) : correspondenceTab === "returned" && (lettersMode ? peopleDialogs : dialogs).length === 0 ? (
        <div className="letters-drafts-empty" role="status">
          <p className="letters-drafts-empty__mark" aria-hidden>
            ✎
          </p>
          <p className="letters-drafts-empty__title">{t("letters.returnedEmptyTitle")}</p>
          <p className="letters-drafts-empty__sub muted small">{t("letters.returnedEmptySub")}</p>
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
          {showPassagesSection ? (
            <>
              <button
                type="button"
                id={msgHeadId}
                className="letters-aside-accordion__trigger letters-aside-accordion__trigger--passages"
                aria-expanded={openSection === "messages"}
                aria-controls={msgPanelId}
                onClick={() => {
                  onLettersSectionHeaderClick("messages")
                }}
              >
                <span className="letters-passages__label">
                  <span className="letters-passages__glyph" aria-hidden>
                    §
                  </span>
                  {t("chat.passagesSectionLabel")}
                </span>
                {passagesLoading ? (
                  <span className="chat-search-bar__spinner" aria-hidden />
                ) : null}
                <ChevronDownIcon
                  className={`letters-aside-accordion__chev${openSection === "messages" ? " is-expanded" : ""}`}
                  aria-hidden
                />
              </button>
              <div
                id={msgPanelId}
                role="region"
                aria-label={t("chat.passagesSectionAriaLabel")}
                className="letters-aside-accordion__panel letters-aside-accordion__panel--passages"
                hidden={openSection !== "messages"}
              >
                <p className="letters-passages__live muted small" aria-live="polite">
                  {passagesLoading
                    ? t("chat.passagesLoading")
                    : passagesError != null
                      ? t("chat.passagesError")
                      : t("chat.passagesClusterCount", { n: passagesResults.length })}
                </p>
                {passagesBody}
              </div>
            </>
          ) : null}
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
          {showLettersCirclesStack ? (
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
                {groupsEmptyKind === "none" ? (
                  <ChatList
                    {...circlesChatListShared}
                    dialogs={groupDialogs}
                  />
                ) : groupsEmptyKind === "filtered" ? (
                  <CompactEmpty
                    mark="⌾"
                    title={t("chat.groupsNoResults", { query: search.trim() })}
                  />
                ) : (
                  <CompactEmpty
                    mark="⌾"
                    title={t("chat.groupsEmpty")}
                    sub={t("chat.groupsEmptySub")}
                  />
                )}
              </div>
            </>
          ) : null}
          {showLettersCirclesStack ? (
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
                  {channelsEmptyKind === "filtered" ? (
                    <CompactEmpty
                      mark="⌾"
                      title={t("chat.channelsNoResults", { query: search.trim() })}
                    />
                  ) : channelsEmptyKind === "neverHad" ? (
                    <CompactEmpty
                      mark="⌾"
                      title={t("chat.channelsEmpty")}
                      sub={t("chat.channelsEmptySub")}
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
