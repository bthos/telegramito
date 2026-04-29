import { useEffect, useRef } from "react"
import type { TelegramClient } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"
import { markChatReadUpTo } from "../telegram/markChatRead"

export function useReadReceipt(opts: {
  client: TelegramClient | null
  entity: Dialog["entity"]
  convKey: string
  maxMsgIdVisible: number | undefined
  isForum: boolean
  topicId: number | null
  blocked: boolean
  appMode: string
  refreshDialogs: () => void
  refreshForumTopics: () => void
}): void {
  const {
    client,
    entity,
    convKey,
    maxMsgIdVisible,
    isForum,
    topicId,
    blocked,
    appMode,
    refreshDialogs,
    refreshForumTopics,
  } = opts

  const lastReadAckRef = useRef<{ convKey: string; maxId: number } | null>(null)

  useEffect(() => {
    lastReadAckRef.current = null
  }, [convKey])

  useEffect(() => {
    if (blocked && appMode === "child") {
      return
    }
    if (!client || !entity) {
      return
    }
    if (isForum && topicId == null) {
      return
    }
    const maxId = maxMsgIdVisible
    if (maxId == null) {
      return
    }
    const prev = lastReadAckRef.current
    if (prev?.convKey === convKey && prev.maxId >= maxId) {
      return
    }
    const t = window.setTimeout(() => {
      void markChatReadUpTo(client, entity, maxId, {
        isForum,
        topicId: topicId ?? null,
      })
        .then(() => {
          lastReadAckRef.current = { convKey, maxId }
          void refreshDialogs()
          if (isForum) {
            void refreshForumTopics()
          }
        })
        .catch(() => {
          /* best-effort read receipt */
        })
    }, 380)
    return () => {
      window.clearTimeout(t)
    }
  }, [
    blocked,
    appMode,
    client,
    entity,
    convKey,
    maxMsgIdVisible,
    isForum,
    topicId,
    refreshDialogs,
    refreshForumTopics,
  ])
}
