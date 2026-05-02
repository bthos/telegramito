type Props = { typers: string[] }

function buildLabel(typers: string[]): string {
  if (typers.length === 1) return `${typers[0]} is typing…`
  if (typers.length === 2) return `${typers[0]} and ${typers[1]} are typing…`
  const others = typers.length - 2
  return `${typers[0]}, ${typers[1]} and ${others} other${others === 1 ? "" : "s"} are typing…`
}

export function TypingIndicator({ typers }: Props) {
  const visible = typers.length > 0
  return (
    <div
      className="typing-indicator"
      style={{ visibility: visible ? "visible" : "hidden" }}
      aria-live="polite"
      aria-atomic="true"
    >
      {visible ? (
        <>
          <span className="typing-dots" aria-hidden="true">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </span>
          <span className="typing-label">{buildLabel(typers)}</span>
        </>
      ) : null}
    </div>
  )
}
