import type { Api } from "teleproto"

/**
 * Stable identity string for a peer for React keys and blob-fetch binding.
 * Matches the historical `usePeerName` peer cache scheme.
 */
export function peerKeyFromPeer(peerId: Api.TypePeer | undefined): string {
  if (peerId == null) return ""
  if (peerId.className === "PeerUser") {
    return `u:${String((peerId as Api.PeerUser).userId)}`
  }
  if (peerId.className === "PeerChannel") {
    return `c:${String((peerId as Api.PeerChannel).channelId)}`
  }
  if (peerId.className === "PeerChat") {
    return `h:${String((peerId as Api.PeerChat).chatId)}`
  }
  return ""
}
