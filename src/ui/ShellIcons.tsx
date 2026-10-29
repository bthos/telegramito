import type { SVGProps } from "react"

/**
 * Letters shell navigation icons (masthead tools + mobile tab bar).
 * One stroke style, `currentColor`, sized in `em` so callers scale via `font-size`.
 */
const strokeIco = {
  viewBox: "0 0 24 24" as const,
  width: "1em" as const,
  height: "1em" as const,
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.8 as const,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

/** Letters — envelope. */
export function ShellLettersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  )
}

/** Day mail — newspaper (today's digest). */
export function ShellDayMailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <path d="M4 5h12a1 1 0 0 1 1 1v13H6a2 2 0 0 1-2-2V5Z" />
      <path d="M17 9h2a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2h-1" />
      <path d="M7 9h7M7 12.5h7M7 16h4" />
    </svg>
  )
}

/** Circles — three overlapping rings (a circle of people / contacts' stories), not a single profile. */
export function ShellCirclesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <circle cx="9" cy="9.5" r="5" />
      <circle cx="15" cy="9.5" r="5" />
      <circle cx="12" cy="15" r="5" />
    </svg>
  )
}

/** Desk — writing desk with a drawer (settings, appearance, account live on the desk). */
export function ShellDeskIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <rect x="3" y="6" width="18" height="3.5" rx="1" />
      <path d="M5.5 9.5V19M18.5 9.5V19" />
      <rect x="9" y="9.5" width="6" height="5.5" rx="0.8" />
      <path d="M11.4 12.3h1.2" />
    </svg>
  )
}

/** Search (magnifier). */
export function ShellSearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  )
}

/** Close (cross). */
export function ShellCloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

/** Archive box — "Returned" letters. */
export function ShellArchiveIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <rect x="3" y="4" width="18" height="4.5" rx="1" />
      <path d="M5 8.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5" />
      <path d="M10 12.5h4" />
    </svg>
  )
}

/** Pencil — drafts. */
export function ShellDraftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      <path d="m14.5 5.5 3 3" />
    </svg>
  )
}
