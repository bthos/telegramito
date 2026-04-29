import { useTranslation } from "react-i18next"

export const SKELETON_BUBBLE_COUNT = 6

interface MessageListSkeletonProps {
  count?: number
}

// UX-confirmed widths and sides for skeleton bubbles
const BUBBLE_WIDTHS = ["55%", "65%", "40%", "45%", "75%", "58%"]
const BUBBLE_SIDES: Array<"in" | "out"> = ["in", "out", "in", "out", "in", "out"]

/**
 * Pure presentational skeleton for the initial message list load state.
 * Renders N alternating in/out skeleton bubbles until the real list arrives.
 */
export function MessageListSkeleton({ count = SKELETON_BUBBLE_COUNT }: MessageListSkeletonProps) {
  const { t } = useTranslation()

  return (
    <ul
      className="msg-list msg-list--skeleton"
      role="status"
      aria-label={t("chat.messageListLoading")}
      aria-busy="true"
    >
      {Array.from({ length: count }, (_, i) => {
        const width = BUBBLE_WIDTHS[i % BUBBLE_WIDTHS.length]
        const side = BUBBLE_SIDES[i % BUBBLE_SIDES.length]
        return (
          <li
            key={i}
            className={`msg-gutter msg-gutter--${side}`}
            aria-hidden="true"
          >
            <div
              className={`msg-list-skeleton__bubble msg-list-skeleton__bubble--${side}`}
              style={{ width }}
            />
          </li>
        )
      })}
    </ul>
  )
}

export default MessageListSkeleton
