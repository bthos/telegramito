import { useEffect, useState } from "react"
import { Api } from "teleproto"
import type { TelegramClient } from "teleproto"
import bigInt from "big-integer"
import { extractCommunityStubs, type CommunityStub } from "../telegram/communityDialogs"
import { appLog } from "../util/appLogger"

/**
 * communities-dialogs: one lightweight `messages.getDialogs` page to pick up any
 * `DialogCommunity` rows (teleproto's high-level `getDialogs()` drops them).
 * Dormant by design — resolves to `[]` for every account without communities,
 * and fails silently. Deliberately independent of the main dialog pipeline so a
 * community-fetch error can never affect the chat list (AC-C1).
 */
export function useCommunityDialogs(
  client: TelegramClient | null,
  refreshKey = 0,
): { communities: CommunityStub[]; loaded: boolean } {
  const [communities, setCommunities] = useState<CommunityStub[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!client) {
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const res = await client.invoke(
          new Api.messages.GetDialogs({
            offsetDate: 0,
            offsetId: 0,
            offsetPeer: new Api.InputPeerEmpty(),
            limit: 100,
            hash: bigInt(0) as never,
          }),
        )
        if (cancelled) {
          return
        }
        setCommunities(extractCommunityStubs(res))
      } catch (e) {
        if (!cancelled) {
          appLog.warn("useCommunityDialogs: getDialogs failed (non-fatal)", e)
          setCommunities([])
        }
      } finally {
        if (!cancelled) {
          setLoaded(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [client, refreshKey])

  return { communities, loaded }
}
