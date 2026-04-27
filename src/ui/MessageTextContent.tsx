import type { BigInteger } from "big-integer"
import { Api } from "telegram"
import type { TelegramClient } from "telegram"
import { Fragment, useEffect, useState, type ReactNode } from "react"
import { getMessageMediaTypeLabel } from "../telegram/dialogPreview"
import { getCustomEmojiObjectUrl } from "../telegram/customEmojiCache"

type TFun = (k: string, o?: Record<string, string | number | undefined>) => string

function lineBreaks(text: string, keyBase: string): ReactNode {
  if (!text) {
    return null
  }
  return text.split("\n").map((line, i) => (
    <Fragment key={`${keyBase}n${i}`}>
      {i > 0 && <br />}
      {line}
    </Fragment>
  ))
}

function allowHref(href: string): string {
  const t = href.trim()
  const lower = t.toLowerCase()
  if (
    lower.startsWith("javascript:")
    || lower.startsWith("data:")
    || lower.startsWith("vbscript:")
    || lower.startsWith("file:")
  ) {
    return "about:blank"
  }
  if (t.startsWith("tg://") || t.startsWith("mailto:") || t.startsWith("tel:")) {
    return t
  }
  if (t.startsWith("https://") || t.startsWith("http://")) {
    return t
  }
  if (t.startsWith("//")) {
    return `https:${t}`
  }
  return "about:blank"
}

function SpoilerText({
  children,
  revealLabel,
}: {
  children: ReactNode
  revealLabel: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <span
      className={open ? "msg-entity--spoiler msg-entity--spoiler--open" : "msg-entity--spoiler"}
      onClick={() => { setOpen(true) }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          setOpen(true)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={open ? undefined : revealLabel}
      title={open ? undefined : revealLabel}
    >
      {children}
    </span>
  )
}

function CustomEmojiImage({
  documentId,
  client,
}: {
  documentId: BigInteger
  client: TelegramClient
}) {
  const [url, setUrl] = useState<string | null>(null)
  const idStr = String(documentId)
  useEffect(() => {
    let o = true
    void getCustomEmojiObjectUrl(client, documentId).then((u) => {
      if (o) {
        setUrl(u)
      }
    })
    return () => {
      o = false
    }
  }, [client, idStr, documentId])
  if (url) {
    return <img className="msg-custom-emoji-img" src={url} alt="" decoding="async" loading="lazy" />
  }
  return <span className="msg-custom-emoji-ph" aria-hidden />
}

function unparseToReact(
  text: string,
  entities: Api.TypeMessageEntity[],
  _offset = 0,
  _length: number | undefined = undefined,
  client: TelegramClient,
  t?: TFun
): ReactNode {
  if (!text || !entities || !entities.length) {
    if (_length !== undefined) {
      return lineBreaks(text.slice(0, _length), "plain")
    }
    return lineBreaks(text, "plain")
  }
  const len = _length === undefined ? text.length : _length
  const out: ReactNode[] = []
  let lastOffset = 0
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i]
    if (entity.offset >= _offset + len) {
      break
    }
    const relativeOffset = entity.offset - _offset
    if (relativeOffset > lastOffset) {
      out.push(lineBreaks(text.slice(lastOffset, relativeOffset), `g${i}`))
    } else if (relativeOffset < lastOffset) {
      continue
    }
    const length = entity.length
    const slice = text.slice(relativeOffset, relativeOffset + length)
    const rest = entities.slice(i + 1)
    const makeInner = () =>
      unparseToReact(slice, rest, entity.offset, length, client, t)
    if (entity instanceof Api.MessageEntityBold) {
      out.push(
        <strong className="msg-entity" key={i}>
          {makeInner()}
        </strong>
      )
    } else if (entity instanceof Api.MessageEntitySpoiler) {
      out.push(
        <SpoilerText
          key={i}
          revealLabel={t ? t("chat.spoilerTapToShow") : "Spoiler — tap to show"}
        >
          {makeInner()}
        </SpoilerText>
      )
    } else if (entity instanceof Api.MessageEntityItalic) {
      out.push(
        <em className="msg-entity" key={i}>
          {makeInner()}
        </em>
      )
    } else if (entity instanceof Api.MessageEntityUnderline) {
      out.push(
        <u className="msg-entity" key={i}>
          {makeInner()}
        </u>
      )
    } else if (entity instanceof Api.MessageEntityStrike) {
      out.push(
        <del className="msg-entity" key={i}>
          {makeInner()}
        </del>
      )
    } else if (entity instanceof Api.MessageEntityCode) {
      out.push(
        <code className="msg-entity msg-entity--code" key={i}>
          {makeInner()}
        </code>
      )
    } else if (entity instanceof Api.MessageEntityBlockquote) {
      out.push(
        <blockquote className="msg-entity msg-entity--quote" key={i}>
          {makeInner()}
        </blockquote>
      )
    } else if (entity instanceof Api.MessageEntityPre) {
      if (entity.language) {
        out.push(
          <pre className="msg-entity msg-entity--pre" key={i}>
            <code className={`language-${entity.language}`}>{makeInner()}</code>
          </pre>
        )
      } else {
        out.push(
          <pre className="msg-entity msg-entity--pre" key={i}>
            {makeInner()}
          </pre>
        )
      }
    } else if (entity instanceof Api.MessageEntityEmail) {
      out.push(
        <a key={i} className="msg-entity--link" href={`mailto:${encodeURIComponent(slice)}`}>
          {makeInner()}
        </a>
      )
    } else if (entity instanceof Api.MessageEntityUrl) {
      out.push(
        <a
          key={i}
          className="msg-entity--link"
          href={allowHref(slice)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {makeInner()}
        </a>
      )
    } else if (entity instanceof Api.MessageEntityTextUrl) {
      out.push(
        <a
          key={i}
          className="msg-entity--link"
          href={allowHref(String(entity.url))}
          target="_blank"
          rel="noopener noreferrer"
        >
          {makeInner()}
        </a>
      )
    } else if (entity instanceof Api.MessageEntityMention) {
      out.push(
        <a
          key={i}
          className="msg-entity--mention"
          href={allowHref(`https://t.me/${slice.replace(/^@/, "")}`)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {makeInner()}
        </a>
      )
    } else if (entity instanceof Api.MessageEntityMentionName) {
      out.push(
        <a
          key={i}
          className="msg-entity--link"
          href={allowHref(`tg://user?id=${entity.userId}`)}
        >
          {makeInner()}
        </a>
      )
    } else if (entity instanceof Api.MessageEntityCustomEmoji) {
      out.push(
        <span key={i} className="msg-entity-inline-emoji" role="img" aria-hidden>
          <CustomEmojiImage documentId={entity.documentId} client={client} />
        </span>
      )
    } else if (entity instanceof Api.MessageEntityHashtag) {
      const tag = slice.replace(/^#/, "")
      out.push(
        <a
          key={i}
          className="msg-entity--tag msg-entity--tag-link"
          href={allowHref(`https://t.me/search?hashtag=${encodeURIComponent(tag)}`)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {makeInner()}
        </a>
      )
    } else if (entity instanceof Api.MessageEntityCashtag) {
      out.push(
        <a
          key={i}
          className="msg-entity--tag msg-entity--tag-link"
          href={allowHref(`https://t.me/search?q=%24${encodeURIComponent(slice.replace(/^\$/, ""))}`)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {makeInner()}
        </a>
      )
    } else if (entity instanceof Api.MessageEntityBotCommand) {
      out.push(
        <span key={i} className="msg-entity--cmd">
          {makeInner()}
        </span>
      )
    } else if (entity instanceof Api.MessageEntityPhone) {
      out.push(
        <a key={i} className="msg-entity--link" href={`tel:${encodeURIComponent(slice.replace(/\s/g, ""))}`}>
          {makeInner()}
        </a>
      )
    } else {
      out.push(lineBreaks(slice, `n${i}`))
    }
    lastOffset = relativeOffset + length
  }
  out.push(lineBreaks(text.slice(lastOffset, text.length), "tail"))
  return <Fragment>{out}</Fragment>
}

/** Renders a caption or poll line with the same rules as a message (entities + custom emoji). */
export function renderMessageEntities(
  text: string,
  entities: Api.TypeMessageEntity[] | undefined,
  client: TelegramClient | null,
  t?: TFun
): ReactNode {
  if (!text.trim()) {
    return null
  }
  if (entities && entities.length && client) {
    return (
      <span className="msg-text-richtext">
        {unparseToReact(text, entities, 0, undefined, client, t)}
      </span>
    )
  }
  return <span className="msg-text-richtext">{lineBreaks(text, "ext")}</span>
}

export type MessageTextContentProps = {
  message: Api.Message
  client: TelegramClient | null
  noPreview: boolean
  t: TFun
}

export function MessageTextContent({ message, client, noPreview, t }: MessageTextContentProps) {
  if (message.media && message.media.className === "MessageMediaWebPage" && noPreview) {
    const cap = typeof message.message === "string" ? message.message.trim() : ""
    if (cap.length > 0) {
      return <>{lineBreaks(message.message ?? cap, "wp")}</>
    }
    return <>{t("chat.previewLink")}</>
  }
  const raw = typeof message.message === "string" ? message.message : ""
  if (!raw.trim().length) {
    if (message.media && message.media.className === "MessageMediaWebPage" && !noPreview) {
      return null
    }
    if (
      message.media &&
      message.media.className !== "MessageMediaEmpty" &&
      message.media.className !== "MessageMediaWebPage"
    ) {
      return null
    }
    return <span className="msg-text-richtext">{getMessageMediaTypeLabel(message, t)}</span>
  }
  if (message.entities && message.entities.length > 0 && client) {
    return (
      <span className="msg-text-richtext">
        {unparseToReact(raw, message.entities, 0, undefined, client, t)}
      </span>
    )
  }
  return <span className="msg-text-richtext">{lineBreaks(raw, "f")}</span>
}
