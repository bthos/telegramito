/** Pure mobile tab-bar select orchestration (desk sheet vs tab switch). */

import type { MobileShellTab } from "./LettersMobileTabBar"

export type MobileTabSelectResult =
  | { kind: "openDesk" }
  | { kind: "selectTab"; tab: Exclude<MobileShellTab, "desk">; closeDesk: true }

/** Maps tab-bar tap to state updates MainShell applies. */
export function resolveMobileTabSelect(next: MobileShellTab): MobileTabSelectResult {
  if (next === "desk") {
    return { kind: "openDesk" }
  }
  return { kind: "selectTab", tab: next, closeDesk: true }
}
