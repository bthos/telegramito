import type { SVGProps } from "react"

/** Envelope + dot — «только непрочитанные сообщения». Stroke matches `currentColor`. */
export function UnreadFilterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.15em"
      height="1.15em"
      className="chat-filter-ico"
      aria-hidden
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <path d="m22 6-10 7L2 6" />
      <circle cx="18.75" cy="5.25" r="2.65" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Облачко темы / ветка форума — подпись «Тема». */
export function ForumTopicIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.05em"
      height="1.05em"
      className="chat-filter-ico"
      aria-hidden
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      <path d="M9 10h6M9 14h4" />
    </svg>
  )
}
