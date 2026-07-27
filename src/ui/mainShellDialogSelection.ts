/** Pure dialog selection retain/clear predicates for MainShell. */

import type { AppMode } from "../parental/types"

function keySet(keys: readonly string[]): Set<string> {
  return new Set(keys)
}

/** Selected peer must remain in eligible list and still be loaded in dialogs. */
export function shouldRetainSelectedDialog(opts: {
  selectedKey: string
  eligibleKeys: readonly string[]
  loadedKeys: readonly string[]
}): boolean {
  const eligible = keySet(opts.eligibleKeys)
  const loaded = keySet(opts.loadedKeys)
  return eligible.has(opts.selectedKey) && loaded.has(opts.selectedKey)
}

/** Child mode: clear open chat when peer is on denied list. */
export function shouldClearDeniedPeerSelection(opts: {
  appMode: AppMode
  peerKey: string
  deniedPeerIds: ReadonlySet<string>
}): boolean {
  return opts.appMode === "child" && opts.deniedPeerIds.has(opts.peerKey)
}

/** @deprecated Use {@link shouldClearDeniedPeerSelection}. */
export function shouldClearDeniedPrivateSelection(opts: {
  appMode: AppMode
  isPrivateUser: boolean
  peerKey: string
  deniedPeerIds: ReadonlySet<string>
}): boolean {
  return shouldClearDeniedPeerSelection(opts)
}

/** Night list lock in child mode clears any open chat. */
export function shouldClearSelectionForNightLock(opts: {
  nightHidden: boolean
  appMode: AppMode
  hasSelection: boolean
}): boolean {
  return opts.nightHidden && opts.appMode === "child" && opts.hasSelection
}
