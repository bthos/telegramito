/** Inspired by telegram-react’s ScrollDownButton — jump to latest messages when scrolled up. */
export function ScrollToBottomFab({
  visible,
  onClick,
  label,
  unreadBadge,
}: {
  visible: boolean
  onClick: () => void
  label: string
  /** Optional unread count while the user is scrolled away (e.g. dialog unread). */
  unreadBadge?: number
}) {
  const n = unreadBadge ?? 0
  const showBadge = visible && n > 0
  const aria =
    showBadge ? `${label} (${n > 99 ? "99+" : String(n)})` : label
  return (
    <button
      type="button"
      className={`message-scroll__fab${visible ? "" : " message-scroll__fab--hidden"}`.trim()}
      onClick={onClick}
      aria-label={aria}
      title={aria}
      aria-hidden={visible ? undefined : true}
      tabIndex={visible ? 0 : -1}
    >
      <svg
        viewBox="0 0 24 24"
        width="1.35rem"
        height="1.35rem"
        aria-hidden
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
      {showBadge ? (
        <span className="message-scroll__fab-badge">
          {n > 99 ? "99+" : n}
        </span>
      ) : null}
    </button>
  )
}
