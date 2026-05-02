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

export function useTypingIndicators(
  entity: Dialog["entity"],
  client: TelegramClient | null,
  sendOwnTyping = true,
): { typers: string[] } {
  const [typers, setTypers] = useState<string[]>([])

  const ownUserIdRef = useRef<bigint | null>(null)
  const typerNamesRef = useRef(new Map<string, string>())
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  // Fetch own user ID once for self-echo filtering (AC4)
  useEffect(() => {
    if (!client) return
    void (async () => {
      try {
        const me = await (client as unknown as { getMe(): Promise<{ id: bigint }> }).getMe()
        if (me?.id) ownUserIdRef.current = me.id
      } catch {
        // best-effort
      }
    })()
  }, [client])

  // Clear state on peer change (AC5)
  useEffect(() => {
    for (const t of timersRef.current.values()) clearTimeout(t)
    timersRef.current.clear()
    typerNamesRef.current.clear()
    setTypers([])
  }, [entity])

  useEffect(() => {
    if (!client || !entity) return

    function removeTyper(key: string) {
      clearTimeout(timersRef.current.get(key))
      timersRef.current.delete(key)
      typerNamesRef.current.delete(key)
      setTypers([...typerNamesRef.current.values()])
    }

    function scheduleRemove(key: string) {
      clearTimeout(timersRef.current.get(key))
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
        const eUser = entity as Api.User
        if (!bigInt(String(update.userId)).equals(bigInt(String(eUser.id)))) return
        if (ownUserIdRef.current != null) {
          if (bigInt(String(update.userId)).equals(bigInt(String(ownUserIdRef.current)))) {
            return
          }
        }
        const key = String(update.userId)
        if (isCancel) { removeTyper(key); return }
        void addTyper(
          key,
          new Api.PeerUser({ userId: bigInt(String(update.userId)) }),
        )
        return
      }

      if (update.className === "UpdateChatUserTyping") {
        const eGroup = entity as Api.Chat | Api.Channel
        if (update.chatId !== eGroup.id) return
        const fromPeer = update.fromId
        if (!fromPeer || fromPeer.className !== "PeerUser" || fromPeer.userId == null) return
        const fromId = fromPeer.userId
        if (
          ownUserIdRef.current != null &&
          bigInt(String(fromId)).equals(bigInt(String(ownUserIdRef.current)))
        ) {
          return
        }
        const key = String(fromId)
        if (isCancel) { removeTyper(key); return }
        void addTyper(key, new Api.PeerUser({ userId: bigInt(String(fromId)) }))
      }
    }

    client.addEventHandler(handler, builder)

    return () => {
      client.removeEventHandler(handler, builder)
    }
  }, [client, entity])

  // sendOwnTyping wiring: ChatView calls makeTypingSender() for the textarea onChange
  void sendOwnTyping

  return { typers }
}

/** Returns a debounced function to call on textarea input events. */
export function makeTypingSender(
  entity: Dialog["entity"],
  client: TelegramClient | null,
  debounceMs = 3_000,
): (() => void) | null {
  if (!client || !entity) return null
  let timer: ReturnType<typeof setTimeout> | null = null
  return () => {
    if (timer != null) return
    timer = setTimeout(() => {
      timer = null
      void client
        .invoke(
          new Api.messages.SetTyping({
            peer: entity as unknown as Api.TypeInputPeer,
            action: new Api.SendMessageTypingAction(),
          }),
        )
        .catch(() => undefined)
    }, debounceMs)
  }
}
