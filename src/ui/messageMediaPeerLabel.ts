import { Api } from "teleproto"

/** Stable debug/display label for a peer in story attribution and static cards. */
export function messageMediaPeerLabel(peer: Api.TypePeer | undefined): string {
  if (!peer) {
    return "?"
  }
  if (peer.className === "PeerUser") {
    return `user:${(peer as Api.PeerUser).userId}`
  }
  if (peer.className === "PeerChannel") {
    return `channel:${(peer as Api.PeerChannel).channelId}`
  }
  if (peer.className === "PeerChat") {
    return `chat:${(peer as Api.PeerChat).chatId}`
  }
  return "?"
}
