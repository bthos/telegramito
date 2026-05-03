import type { TickState } from "../telegram/messageTickState"

type Props = {
  state: TickState
  /** Localized short label for assistive tech (Sent / Delivered / Read). */
  label: string
}

/**
 * Inline delivery/read ticks for outbound message footer (UX-07).
 * Stroke icons sized to match ~0.65rem msg-time line (spec AC6).
 */
export function TickIcon({ state, label }: Props) {
  const muted = "var(--muted)"
  const accent = "var(--ds-color-primary)"
  const stroke = state === "read" ? accent : muted

  const common = {
    fill: "none" as const,
    stroke,
    strokeWidth: 1.65,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }

  if (state === "sent") {
    return (
      <svg
        className="msg-tick"
        width="14"
        height="11"
        viewBox="0 0 14 11"
        role="img"
        aria-label={label}
      >
        <title>{label}</title>
        <path {...common} d="M1 5.5 L5 9 L13 1" />
      </svg>
    )
  }

  return (
    <svg
      className={`msg-tick msg-tick--double${state === "read" ? " msg-tick--read" : ""}`}
      width="18"
      height="11"
      viewBox="0 0 18 11"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <path {...common} d="M1 5.5 L5 9 L11 1" />
      <path {...common} d="M5 5.5 L9 9 L17 1" />
    </svg>
  )
}
