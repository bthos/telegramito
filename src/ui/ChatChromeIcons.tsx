import type { SVGProps } from "react"

const strokeIco = {
  viewBox: "0 0 24 24" as const,
  width: "1.25em" as const,
  height: "1.25em" as const,
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 2 as const,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

/** In-chat search — magnifying glass. */
export function SearchInChatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4.35-4.35" />
    </svg>
  )
}

/** Chat info / context panel — circled i. */
export function ChatInfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="16" x2="12" y2="11.5" />
      <circle cx="12" cy="8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Emoji picker trigger — smile outline. */
export function EmojiOutlineIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <circle cx="9" cy="10" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Attach — paperclip (Feather / Lucide geometry, single continuous path). */
export function AttachClipIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 0 2.83 2.83l9.19-9.19a6 6 0 0 0-8.49-8.49l-9.19 9.19" />
    </svg>
  )
}

/**
 * Add file — sheet + plus; reads clearly at compose control sizes (Letters narrow).
 */
export function AttachFileAddIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M12 18v-6" />
      <path d="M9 15h6" />
    </svg>
  )
}

/** Previous hit — chevron up. */
export function ChevronUpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <path d="m18 15-6-6-6 6" />
    </svg>
  )
}

/** Next hit — chevron down. */
export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

/** Open full calendar for jump-to-date (stroke calendar grid). */
export function JumpDateCalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

/** Close / dismiss — X. */
export function CloseCrossIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

/** Reply — curved arrow turning back. */
export function ReplyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <path d="M9 17 4 12l5-5" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  )
}

/** Forward — curved arrow heading on. */
export function ForwardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <path d="m15 17 5-5-5-5" />
      <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
    </svg>
  )
}

/** Co-reading bookmark ("discuss at dinner") — open book. */
export function CoReadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
      <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

/** Pin a message. */
export function PinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </svg>
  )
}

/** Unpin a message — pin with a strike. */
export function UnpinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <path d="M12 17v5" />
      <path d="M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89" />
      <path d="m2 2 20 20" />
      <path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11" />
    </svg>
  )
}
