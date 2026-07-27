import type { CorrespondenceTab } from "../util/correspondenceFilter"
import { LettersMasthead } from "./LettersMasthead"
export type MainShellMastheadSectionProps = {
  compactMasthead: boolean
  showDesktopMasthead: boolean
  literaryDateLine: string
  correspondenceTab: CorrespondenceTab
  onCorrespondenceTab: (tab: CorrespondenceTab) => void
  search: string
  onSearchChange: (q: string) => void
  onWrite: () => void
  searchExpanded: boolean
  onSearchExpandedChange: (open: boolean) => void
  chromeHidden: boolean
  showTabletDayMailBtn: boolean
  onOpenDayMail: () => void
  onOpenDesk: () => void
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
  searchExpanded,
  onSearchExpandedChange,
  chromeHidden,
  showTabletDayMailBtn,
  onOpenDayMail,
  onOpenDesk,
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
      showDayMailButton={showTabletDayMailBtn}
      onOpenDayMail={onOpenDayMail}
      onOpenDesk={onOpenDesk}
    />
  )
}
