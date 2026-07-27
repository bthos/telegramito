import type { SVGProps } from "react"

const strokeIco = {
  viewBox: "0 0 24 24" as const,
  width: "1.15em" as const,
  height: "1.15em" as const,
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 2 as const,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

/** Parental requests — peer allowed (checkmark). */
export function RequestsAllowedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="req-access__ico"
      aria-hidden
      focusable="false"
      {...strokeIco}
      {...props}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

/** Parental requests — peer pending review (question mark in circle). */
export function RequestsPendingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="req-access__ico"
      aria-hidden
      focusable="false"
      {...strokeIco}
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a3 3 0 0 1 5 2c0 2-3 2-3 4" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Parental requests — peer denied (cross). */
export function RequestsDeniedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="req-access__ico"
      aria-hidden
      focusable="false"
      {...strokeIco}
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
