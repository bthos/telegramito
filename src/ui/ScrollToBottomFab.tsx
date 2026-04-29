/** Inspired by telegram-react’s ScrollDownButton — jump to latest messages when scrolled up. */
export function ScrollToBottomFab({
  visible,
  onClick,
  label,
}: {
  visible: boolean
  onClick: () => void
  label: string
}) {
  if (!visible) {
    return null
  }
  return (
    <button
      type="button"
      className="message-scroll__fab"
      onClick={onClick}
      aria-label={label}
      title={label}
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
    </button>
  )
}
