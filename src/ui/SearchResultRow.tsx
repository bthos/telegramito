import type { LiHTMLAttributes, ReactNode } from "react"
import { Api } from "telegram"
import type { TFunction } from "i18next"
import { formatSearchResultRowDate } from "../util/timeFormat"
import { cn } from "../util/cn"

export function plainMessagePreview(m: Api.Message, noTextLabel: string): string {
  if (m.className !== "Message") {
    return ""
  }
  const raw = typeof m.message === "string" ? m.message.trim() : ""
  return raw.length > 0 ? raw : noTextLabel
}

export function searchResultSenderLabel(
  m: Api.Message,
  peerDisplayName: string,
  t: TFunction,
): string {
  if (m.out) {
    return t("chat.searchFromYou")
  }
  const pa = m.className === "Message" ? m.postAuthor?.trim() : ""
  if (pa) {
    return pa
  }
  return peerDisplayName
}

function excerptParts(text: string, query: string, maxLen: number): ReactNode {
  const t = text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text
  const qt = query.trim()
  if (!qt) {
    return t
  }
  const lower = t.toLowerCase()
  const ql = qt.toLowerCase()
  const qi = lower.indexOf(ql)
  if (qi < 0) {
    return t
  }
  const before = t.slice(0, qi)
  const mid = t.slice(qi, qi + ql.length)
  const after = t.slice(qi + ql.length)
  return (
    <>
      {before}
      <strong>{mid}</strong>
      {after}
    </>
  )
}

type Props = {
  message: Api.Message
  query: string
  senderLabel: string
  locale: string
  noTextLabel: string
  optionProps: LiHTMLAttributes<HTMLLIElement>
}

/** Single search hit: sender, relative date, excerpt with match emphasis (~80 chars). */
export function SearchResultRow({
  message,
  query,
  senderLabel,
  locale,
  noTextLabel,
  optionProps,
}: Props) {
  const id = message.id
  if (typeof id !== "number") {
    return null
  }
  const plain = plainMessagePreview(message, noTextLabel)
  const excerpt = excerptParts(plain, query, 80)
  const dateLabel = formatSearchResultRowDate(message.date, locale)
  const { className: optClass, ...optionRest } = optionProps

  return (
    <li className={cn("chat-search-hit__opt", optClass)} {...optionRest}>
      <div className="chat-search-hit">
        <div className="chat-search-hit__meta">
          <span className="chat-search-hit__sender">{senderLabel}</span>
          <time
            className="chat-search-hit__date"
            dateTime={new Date(message.date * 1000).toISOString()}
          >
            {dateLabel}
          </time>
        </div>
        <p className="chat-search-hit__excerpt">{excerpt}</p>
      </div>
    </li>
  )
}
