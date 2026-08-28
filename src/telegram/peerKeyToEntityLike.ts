import bigInt from "big-integer"
import { Api } from "teleproto"
import type { EntityLike } from "teleproto/define"

/**
 * Maps stable peer keys used in UI (dialog keys, message sender keys) to a GramJS {@link EntityLike}.
 * Returns `null` when the key cannot be resolved for MTProto (non-id fallback strings).
 */
export function peerKeyToEntityLike(peerKey: string): EntityLike | null {
  if (!peerKey) return null
  if (peerKey.startsWith("u:")) {
    const rest = peerKey.slice(2)
    if (!/^\d+$/.test(rest)) return null
    return new Api.PeerUser({ userId: bigInt(rest) })
  }
  if (peerKey.startsWith("c:")) {
    const rest = peerKey.slice(2)
    if (!/^\d+$/.test(rest)) return null
    return new Api.PeerChannel({ channelId: bigInt(rest) })
  }
  if (peerKey.startsWith("h:")) {
    const rest = peerKey.slice(2)
    if (!/^\d+$/.test(rest)) return null
    return new Api.PeerChat({ chatId: bigInt(rest) })
  }
  if (/^-?\d+$/.test(peerKey)) {
    return bigInt(peerKey)
  }
  return null
}
