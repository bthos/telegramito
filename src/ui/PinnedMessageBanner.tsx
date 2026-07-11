import type { Api } from "telegram"
import { getReplyToPreviewText } from "../telegram/dialogPreview"

type TChat = (k: string, o?: Record<string, string | number | undefined>) => string

/**
 * Thin strip at the top of the thread showing the currently-referenced pinned message.
 * Presentational only — no network logic. Tap the body to jump + advance to the next pin
 * (see `nextPinnedIndex`); a separate button dismisses the banner for the session.
 */
export function PinnedMessageBanner({
  messages,
  index,
  onJump,
  onDismiss,
  t,
}: {
  messages: Api.Message[]
  index: number
  onJump: (id: number) => void
  onDismiss: () => void
  t: TChat
}) {
  const len = messages.length
  if (len === 0) {
    return null
  }
  const safeIndex = ((index % len) + len) % len
  const current = messages[safeIndex]
  const id = current?.id
  if (typeof id !== "number") {
    return null
  }

  const preview = getReplyToPreviewText(current, t)
  const label = t("chat.pinnedLabel")

  return (
    <div className="pinned-banner" role="region" aria-label={label}>
      <button
        type="button"
        className="pinned-banner__body"
        aria-label={`${label}: ${preview}`}
        onClick={() => { onJump(id) }}
      >
        <span className="pinned-banner__icon" aria-hidden>
          {"\u{1F4CC}"}
        </span>
        <span className="pinned-banner__text">
          <span className="pinned-banner__lbl">{label}</span>
          <span className="pinned-banner__prev">{preview}</span>
        </span>
        {len > 1
          ? (
              <span className="pinned-banner__count">
                {t("chat.pinnedCount", { count: len })}
              </span>
            )
          : null}
      </button>
      <button
        type="button"
        className="pinned-banner__x"
        aria-label={t("chat.dismissPinnedBanner")}
        onClick={onDismiss}
      >
        {"×"}
      </button>
    </div>
  )
}
