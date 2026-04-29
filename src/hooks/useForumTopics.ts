import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react"
import type { TelegramClient } from "telegram"
import { Api } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"
import {
  defaultForumTopicId,
  listForumTopics,
} from "../telegram/forum"

const REFRESH_DEBOUNCE_MS = 400

function applyTopicList(
  tList: Api.ForumTopic[],
  setTopics: Dispatch<SetStateAction<Api.ForumTopic[]>>,
  setTopicId: Dispatch<SetStateAction<number | null>>
): void {
  setTopics(tList)
  setTopicId((prev) => {
    if (prev != null && tList.some((x) => x.id === prev)) {
      return prev
    }
    return defaultForumTopicId(tList)
  })
}

/**
 * Loads forum subchat topics once per entity, then debounced silent refresh on
 * {@link lastMessageTick} (unread badges) without clearing the list on errors.
 */
export function useForumTopics(
  client: TelegramClient | null,
  entity: Dialog["entity"],
  isForum: boolean,
  lastMessageTick: number
): {
  topics: Api.ForumTopic[]
  topicId: number | null
  setTopicId: Dispatch<SetStateAction<number | null>>
  topicsErr: string | null
  topicsLoading: boolean
  refreshForumTopics: () => Promise<void>
} {
  const [topics, setTopics] = useState<Api.ForumTopic[]>([])
  const [topicId, setTopicId] = useState<number | null>(null)
  const [topicsErr, setTopicsErr] = useState<string | null>(null)
  const [topicsLoading, setTopicsLoading] = useState(false)

  useEffect(() => {
    if (!client || !entity || !isForum) {
      setTopics([])
      setTopicId(null)
      setTopicsErr(null)
      setTopicsLoading(false)
      return
    }
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) {
        return
      }
      setTopicsLoading(true)
      setTopicsErr(null)
      void (async () => {
        try {
          const tList = await listForumTopics(client, entity)
          if (cancelled) {
            return
          }
          applyTopicList(tList, setTopics, setTopicId)
        } catch (e) {
          if (cancelled) {
            return
          }
          setTopicsErr(e instanceof Error ? e.message : String(e))
          setTopics([])
          setTopicId(null)
        } finally {
          if (!cancelled) {
            setTopicsLoading(false)
          }
        }
      })()
    })
    return () => {
      cancelled = true
    }
  }, [client, entity, isForum])

  useEffect(() => {
    if (!client || !entity || !isForum) {
      return
    }
    if (lastMessageTick === 0) {
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const tList = await listForumTopics(client, entity)
          if (cancelled) {
            return
          }
          applyTopicList(tList, setTopics, setTopicId)
        } catch {
          /* keep previous topics on transient errors */
        }
      })()
    }, REFRESH_DEBOUNCE_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [client, entity, isForum, lastMessageTick])

  const refreshForumTopics = useCallback(async () => {
    if (!client || !entity || !isForum) {
      return
    }
    try {
      const tList = await listForumTopics(client, entity)
      applyTopicList(tList, setTopics, setTopicId)
    } catch {
      /* keep previous topics */
    }
  }, [client, entity, isForum])

  return { topics, topicId, setTopicId, topicsErr, topicsLoading, refreshForumTopics }
}
