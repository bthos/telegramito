import type { SVGProps } from "react"

/**
 * Smiling child face — `currentColor` (stroke + fills for eyes/mouth).
 */
export function ChildModeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.1em"
      height="1.1em"
      aria-hidden
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="11" r="6" />
      <circle cx="9.2" cy="10.2" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="10.2" r="0.9" fill="currentColor" stroke="none" />
      <path
        d="M8.5 14c.9 1.1 2.1 1.7 3.5 1.7s2.6-.6 3.5-1.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * Shield — parent / supervision; `currentColor` for stroke.
 */
export function ParentModeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.1em"
      height="1.1em"
      aria-hidden
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  )
}
