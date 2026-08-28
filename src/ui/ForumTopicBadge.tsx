import type { BigInteger } from "big-integer"
import type { Api } from "teleproto"
import type { TelegramClient } from "teleproto"
import { useEffect, useState, type CSSProperties } from "react"
import { getCustomEmojiObjectUrl } from "../telegram/customEmojiCache"
import { forumTopicIconSwatchColor } from "../telegram/forum"
import { ForumTopicIcon } from "./ChatFilterIcons"

function ForumTopicCustomEmojiThumb({
  documentId,
  client,
  iconColor,
}: {
  documentId: BigInteger
  client: TelegramClient
  iconColor: number
}) {
  const [url, setUrl] = useState<string | null>(null)
  const idStr = String(documentId)
  const swatch = forumTopicIconSwatchColor(iconColor)

  useEffect(() => {
    setUrl(null)
    let cancelled = false
    void (async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        if (cancelled) return
        if (attempt > 0) {
          await new Promise<void>((r) => {
            setTimeout(r, 180 * attempt)
          })
        }
        if (cancelled) return
        const u = await getCustomEmojiObjectUrl(client, documentId)
        if (cancelled) return
        if (u) {
          setUrl(u)
          return
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [client, documentId, idStr])

  if (url) {
    return (
      <span className="forum-topic-badge forum-topic-badge--emoji" aria-hidden>
        <img className="forum-topic-badge__img" src={url} alt="" decoding="async" loading="lazy" />
      </span>
    )
  }

  return (
    <span
      className="forum-topic-badge forum-topic-badge--swatch"
      style={{ "--forum-topic-badge-bg": swatch } as CSSProperties}
      aria-hidden
    >
      <ForumTopicIcon className="forum-topic-badge__glyph" />
    </span>
  )
}

/** Visual for the active forum topic: custom emoji thumbnail or color swatch; generic icon if unknown. */
export function ForumTopicBadge({
  topic,
  client,
}: {
  topic: Api.ForumTopic | undefined
  client: TelegramClient | null
}) {
  if (!topic || topic.className !== "ForumTopic") {
    return (
      <span className="forum-topic-badge forum-topic-badge--placeholder" aria-hidden>
        <ForumTopicIcon />
      </span>
    )
  }

  if (topic.iconEmojiId != null && client) {
    return (
      <ForumTopicCustomEmojiThumb documentId={topic.iconEmojiId} client={client} iconColor={topic.iconColor} />
    )
  }

  const bg = forumTopicIconSwatchColor(topic.iconColor)
  return (
    <span
      className="forum-topic-badge forum-topic-badge--swatch"
      style={{ "--forum-topic-badge-bg": bg } as CSSProperties}
      aria-hidden
    >
      <ForumTopicIcon className="forum-topic-badge__glyph" />
    </span>
  )
}
