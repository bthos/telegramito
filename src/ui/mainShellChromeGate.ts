/** Pure chrome visibility predicates for MainShell (mobile compact / tablet / desktop). */

export type MainShellTab = "chats" | "settings" | "requests"

export type MobileShellTab = "letters" | "dayMail" | "circles" | "desk"

/** Bottom tab bar: compact chats list only, no open chat, desk sheet closed. */
export function showMobileTabBar(opts: {
  mobileCompact: boolean
  tab: MainShellTab
  hasSelectedChat: boolean
  deskSheetOpen: boolean
}): boolean {
  return (
    opts.mobileCompact &&
    opts.tab === "chats" &&
    !opts.hasSelectedChat &&
    !opts.deskSheetOpen
  )
}

/** Single-row compact masthead on mobile chats list (chat open uses thread header). */
export function showCompactMasthead(opts: {
  mobileCompact: boolean
  tab: MainShellTab
  hasSelectedChat: boolean
}): boolean {
  return opts.mobileCompact && opts.tab === "chats" && !opts.hasSelectedChat
}

/** Scroll-driven masthead hide applies on letters + dayMail mobile panels only. */
export function mastheadChromeHideEnabled(opts: {
  showCompactMasthead: boolean
  mobileTab: MobileShellTab
}): boolean {
  return (
    opts.showCompactMasthead &&
    (opts.mobileTab === "letters" || opts.mobileTab === "dayMail")
  )
}

/** Tablet band: day-mail slide-over trigger in non-compact, non-three-col layout. */
export function showTabletDayMailButton(opts: {
  mobileCompact: boolean
  lettersThreeCol: boolean
}): boolean {
  return !opts.mobileCompact && !opts.lettersThreeCol
}
