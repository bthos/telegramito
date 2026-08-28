import { Api } from "teleproto"
import { getPeerId } from "teleproto/Utils"

/** One SearchGlobal hit ready for Passages UI. */
export type GlobalSearchHit = {
  message: Api.Message
  /** Marked peer id — same convention as `dialogPeerKey` / `storyPeerDialogKey`. */
  peerKey: string
  peerDisplayName: string
}

export type GlobalSearchCluster = {
  peerKey: string
  peerDisplayName: string
  /** All hits for this peer from the current page (may exceed previewCap). */
  hits: GlobalSearchHit[]
  totalCount: number
  /** First `previewCap` hits for the accordion preview. */
  previewHits: GlobalSearchHit[]
}

/**
 * Marked peer id for a message's `peerId`, matching dialog list keys.
 */
export function globalHitPeerKey(message: Api.Message): string {
  return getPeerId(message.peerId, true)
}

/**
 * Group global hits by peer, preserving first-seen peer order (SearchGlobal ranking).
 * Each cluster exposes at most `previewCap` preview rows (UX D3 default: 3).
 */
export function groupGlobalSearchHits(
  hits: readonly GlobalSearchHit[],
  previewCap = 3,
): GlobalSearchCluster[] {
  const order: string[] = []
  const byPeer = new Map<string, GlobalSearchHit[]>()

  for (const hit of hits) {
    const key = hit.peerKey
    let list = byPeer.get(key)
    if (!list) {
      list = []
      byPeer.set(key, list)
      order.push(key)
    }
    list.push(hit)
  }

  return order.map((peerKey) => {
    const list = byPeer.get(peerKey) ?? []
    const first = list[0]!
    return {
      peerKey,
      peerDisplayName: first.peerDisplayName,
      hits: list,
      totalCount: list.length,
      previewHits: list.slice(0, Math.max(0, previewCap)),
    }
  })
}
