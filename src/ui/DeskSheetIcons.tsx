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

/** Desk household — theme row (half-filled disc: light/dark contrast, not tied to one theme). */
export function DeskThemeRowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" />
    </svg>
  )
}

/** Desk household — profile row (person). */
export function DeskModeRowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6" />
    </svg>
  )
}

/** Desk household — access requests (inbox tray; envelope is reserved for Letters). */
export function DeskRequestsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <path d="M3 13.5 5.8 5.7A1.5 1.5 0 0 1 7.2 4.7h9.6a1.5 1.5 0 0 1 1.4 1L21 13.5" />
      <path d="M3 13.5V18a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 21 18v-4.5h-5a4 4 0 0 1-8 0Z" />
    </svg>
  )
}

/** Desk household — settings (sliders). */
export function DeskSettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden focusable="false" {...strokeIco} {...props}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
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
