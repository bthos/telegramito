import type { AppMode } from "../parental/types"
import type { CorrespondenceTab } from "../util/correspondenceFilter"
import { LettersMasthead } from "./LettersMasthead"
import type { MainShellTab } from "./useMainShellMobileChrome"

export type MainShellMastheadSectionProps = {
  compactMasthead: boolean
  showDesktopMasthead: boolean
  literaryDateLine: string
  correspondenceTab: CorrespondenceTab
  onCorrespondenceTab: (tab: CorrespondenceTab) => void
  search: string
  onSearchChange: (q: string) => void
  onWrite: () => void
  shellTab: MainShellTab
  onShellTab: (tab: MainShellTab) => void
  showParentShellNav: boolean
  appMode: AppMode
  onAppMode: (mode: AppMode) => void
  onSignOut: () => void
  searchExpanded: boolean
  onSearchExpandedChange: (open: boolean) => void
  chromeHidden: boolean
  showTabletDayMailBtn: boolean
  onOpenDayMail: () => void
}

export function MainShellMastheadSection({
  compactMasthead,
  showDesktopMasthead,
  literaryDateLine,
  correspondenceTab,
  onCorrespondenceTab,
  search,
  onSearchChange,
  onWrite,
  shellTab,
  onShellTab,
  showParentShellNav,
  appMode,
  onAppMode,
  onSignOut,
  searchExpanded,
  onSearchExpandedChange,
  chromeHidden,
  showTabletDayMailBtn,
  onOpenDayMail,
}: MainShellMastheadSectionProps) {
  if (compactMasthead) {
    return (
      <LettersMasthead
        dateLine={literaryDateLine}
        correspondenceTab={correspondenceTab}
        onCorrespondenceTab={onCorrespondenceTab}
        search={search}
        onSearchChange={onSearchChange}
        onWrite={onWrite}
        shellTab={shellTab}
        onShellTab={onShellTab}
        showParentShellNav={showParentShellNav}
        appMode={appMode}
        onAppMode={onAppMode}
        onSignOut={onSignOut}
        compact
        searchExpanded={searchExpanded}
        onSearchExpandedChange={onSearchExpandedChange}
        chromeHidden={chromeHidden}
      />
    )
  }
  if (!showDesktopMasthead) {
    return null
  }
  return (
    <LettersMasthead
      dateLine={literaryDateLine}
      correspondenceTab={correspondenceTab}
      onCorrespondenceTab={onCorrespondenceTab}
      search={search}
      onSearchChange={onSearchChange}
      onWrite={onWrite}
      shellTab={shellTab}
      onShellTab={onShellTab}
      showParentShellNav={showParentShellNav}
      appMode={appMode}
      onAppMode={onAppMode}
      onSignOut={onSignOut}
      showDayMailButton={showTabletDayMailBtn}
      onOpenDayMail={onOpenDayMail}
    />
  )
}
