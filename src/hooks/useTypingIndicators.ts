import { useEffect, useRef, useState } from "react"
import bigInt from "big-integer"
import { Raw } from "telegram/events"
import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"

const TYPER_TIMEOUT_MS = 5_000

function extractName(entity: unknown): string {
  if (entity == null || typeof entity !== "object") return ""
  const e = entity as Record<string, unknown>
  if (typeof e.firstName === "string" || typeof e.lastName === "string") {
    return [e.firstName, e.lastName]
      .filter((p): p is string => typeof p === "string" && p.trim() !== "")
      .join(" ")
  }
  if (typeof e.title === "string" && e.title.trim() !== "") return e.title.trim()
  if (typeof e.username === "string" && e.username.trim() !== "") return e.username.trim()
  return ""
}

function idsEqual(a: unknown, b: unknown): boolean {
  try {
    return bigInt(String(a)).equals(bigInt(String(b)))
  } catch {
    return false
  }
}

function chatEntityMatchesUpdate(
  entity: Api.Chat | Api.Channel,
  chatId: unknown,
): boolean {
  return idsEqual((entity as Api.Chat | Api.Channel).id, chatId)
}

export function useTypingIndicators(
  entity: Dialog["entity"],
  client: TelegramClient | null,
): { typers: string[] } {
  const [typers, setTypers] = useState<string[]>([])

  const ownUserIdRef = useRef<ReturnType<typeof bigInt> | null>(null)
  const typerNamesRef = useRef(new Map<string, string>())
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    if (!client) return
    void (async () => {
      try {
        const me = await client.getMe()
        if (me?.id != null) ownUserIdRef.current = bigInt(String(me.id))
      } catch {
        // best-effort
      }
    })()
  }, [client])

  useEffect(() => {
    for (const t of timersRef.current.values()) clearTimeout(t)
    timersRef.current.clear()
    typerNamesRef.current.clear()
    setTypers([])
  }, [entity])

  useEffect(() => {
    if (!client || !entity) return

    function removeTyper(key: string) {
      const existing = timersRef.current.get(key)
      if (existing != null) clearTimeout(existing)
      timersRef.current.delete(key)
      typerNamesRef.current.delete(key)
      setTypers([...typerNamesRef.current.values()])
    }

    function scheduleRemove(key: string) {
      const existing = timersRef.current.get(key)
      if (existing != null) clearTimeout(existing)
      timersRef.current.set(
        key,
        setTimeout(() => removeTyper(key), TYPER_TIMEOUT_MS),
      )
    }

    async function addTyper(key: string, peerUser: Api.PeerUser) {
      if (!typerNamesRef.current.has(key)) {
        try {
          const resolved = await client!.getEntity(peerUser)
          typerNamesRef.current.set(key, extractName(resolved) || key)
        } catch {
          typerNamesRef.current.set(key, key)
        }
      }
      scheduleRemove(key)
      setTypers([...typerNamesRef.current.values()])
    }

    const builder = new Raw({
      types: [Api.UpdateUserTyping, Api.UpdateChatUserTyping],
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (update: any) => {
      const isCancel = update.action?.className === "SendMessageCancelAction"

      if (update.className === "UpdateUserTyping") {
        if (entity.className !== "User") return

        const uid = update.userId
        if (ownUserIdRef.current != null && idsEqual(uid, ownUserIdRef.current)) return

        const eUser = entity as Api.User
        if (!idsEqual(uid, eUser.id)) return

        const key = String(uid)
        if (isCancel) {
          removeTyper(key)
          return
        }
        void addTyper(key, new Api.PeerUser({ userId: bigInt(String(uid)) }))
        return
      }

      if (update.className === "UpdateChatUserTyping") {
        if (entity.className !== "Chat" && entity.className !== "Channel") return
        const eGroup = entity as Api.Chat | Api.Channel
        if (!chatEntityMatchesUpdate(eGroup, update.chatId)) return

        const fromPeer = update.fromId
        if (!fromPeer || fromPeer.className !== "PeerUser" || fromPeer.userId == null)
          return

        const fromId = fromPeer.userId
        if (ownUserIdRef.current != null && idsEqual(fromId, ownUserIdRef.current))
          return

        const key = String(fromId)
        if (isCancel) {
          removeTyper(key)
          return
        }
        void addTyper(key, new Api.PeerUser({ userId: bigInt(String(fromId)) }))
      }
    }

    client.addEventHandler(handler, builder)

    return () => {
      client.removeEventHandler(handler, builder)
    }
  }, [client, entity])

  return { typers }
}

const OWN_TYPING_MIN_INTERVAL_MS = 3_000

/**
 * Throttled caller for `messages.SetTyping` (at most once per `intervalMs` while typing).
 * Returns `null` when typing cannot be sent for the current peer.
 */
export function makeTypingSender(
  entity: Dialog["entity"],
  client: TelegramClient | null,
  intervalMs = OWN_TYPING_MIN_INTERVAL_MS,
): (() => void) | null {
  if (!client || !entity) return null

  let lastSent = 0
  let inputPeer: Api.TypeInputPeer | undefined

  return () => {
    const now = Date.now()
    if (now - lastSent < intervalMs) return
    lastSent = now

    void (async () => {
      try {
        if (!inputPeer) inputPeer = await client.getInputEntity(entity)
        await client.invoke(
          new Api.messages.SetTyping({
            peer: inputPeer,
            action: new Api.SendMessageTypingAction(),
          }),
        )
      } catch {
        inputPeer = undefined
      }
    })()
  }
}
