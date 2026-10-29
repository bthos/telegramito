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
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10.2" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10.2" r="1" fill="currentColor" stroke="none" />
      <path d="M8 14.4c1 1.5 2.4 2.2 4 2.2s3-.7 4-2.2" fill="none" />
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
