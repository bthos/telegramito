import type { SVGProps } from "react"

const strokeIco = {
  viewBox: "0 0 24 24" as const,
  width: "1.15em" as const,
  height: "1.15em" as const,
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.8 as const,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

/** Desk household — theme row (crescent moon). */
export function DeskThemeRowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79" />
    </svg>
  )
}

/** Desk household — mode row (sprout). */
export function DeskModeRowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <path d="M12 22V12" />
      <path d="M12 12C12 8 8 6 5 8c3 2 4 4 7 4" />
      <path d="M12 12c0-4 4-6 7-4-3 2-4 4-7 4" />
    </svg>
  )
}

/** Desk household — access requests (envelope). */
export function DeskRequestsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  )
}

/** Desk household — settings (gear). */
export function DeskSettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

/** Draft card — continue letter (pencil). */
export function DeskContinueIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}
