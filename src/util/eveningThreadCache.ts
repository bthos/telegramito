import type { Api } from "teleproto"

/** Session-scoped messages for peers opened this session (Tier 1 evening summary). */
const threadByPeerKey = new Map<string, Api.Message[]>()

export function rememberEveningThreadMessages(
  peerKey: string,
  messages: readonly Api.Message[],
): void {
  if (!peerKey || messages.length === 0) {
    return
  }
  threadByPeerKey.set(peerKey, [...messages])
}

export function getEveningThreadMessages(peerKey: string): Api.Message[] | undefined {
  return threadByPeerKey.get(peerKey)
}

/** For tests only. */
export function _clearEveningThreadCacheForTest(): void {
  threadByPeerKey.clear()
}
