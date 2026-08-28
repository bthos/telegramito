import type { LiHTMLAttributes } from "react"
import { Api } from "teleproto"
import type { TFunction } from "i18next"
import { formatSearchResultRowDate } from "../util/timeFormat"
import { searchExcerptParts } from "../util/searchExcerptParts"
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

type Props = {
  message: Api.Message
  query: string
  senderLabel: string
  locale: string
  noTextLabel: string
  optionProps: LiHTMLAttributes<HTMLLIElement>
}

/**
 * Single search hit: sender, relative date, ~80-char excerpt anchored on the
 * earliest query-token match with every token bolded (see {@link searchExcerptParts}).
 */
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
  const excerpt = searchExcerptParts(plain, query, 80)
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
