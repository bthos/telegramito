import { useId, type SVGProps } from "react"

type Props = Omit<SVGProps<SVGSVGElement>, "role" | "aria-label"> & {
  /** Accessible name; the seal is decorative (`aria-hidden`) when omitted. */
  label?: string
}

/** Hand-wavy wax blob: 64 points around a circle, radius modulated by three sines. */
const BLOB_PATH =
  "M94.7 50.0L94.0 54.3L93.4 58.6L92.3 62.8L90.1 66.6L87.5 70.1L85.4 73.6L83.2 77.2L79.9 79.9L75.8 81.5L72.1 83.0L69.4 86.3L66.9 90.8L63.5 94.4L59.0 95.3L54.4 94.3L50.0 93.2L45.8 92.7L41.7 91.9L37.8 90.2L34.1 88.3L30.3 86.9L26.4 85.3L23.2 82.7L20.6 79.4L17.7 76.5L13.4 74.4L9.0 71.9L6.7 67.9L7.1 63.0L8.6 58.2L9.2 54.0L8.7 50.0L8.4 45.9L9.1 41.9L10.0 37.9L10.6 33.7L11.7 29.5L13.9 25.9L16.7 22.7L19.1 19.1L21.3 15.0L24.3 11.5L28.8 10.4L34.0 11.3L38.5 12.1L42.2 10.9L45.9 8.7L50.0 7.2L54.2 7.1L58.5 7.5L62.8 7.9L67.0 8.9L70.8 11.1L74.2 13.8L77.7 16.2L81.5 18.5L84.2 22.0L85.0 26.6L84.9 31.4L86.1 35.0L89.4 38.1L92.9 41.5L94.8 45.6Z"

/** Same paper-plane glyph as `public/favicon.svg` (24×24 box, spans x 2–23, y 3–21). */
const GLYPH_PATH = "M2,21L23,12L2,3V10L17,12L2,14V21Z"
const GLYPH_TRANSFORM = "translate(50 50) scale(1.5) translate(-12.5 -12)"

/**
 * Wax seal mark — replaces the app icon on the sealed-envelope auth card.
 * Wax colours are theme-independent on purpose: a seal looks the same on light and dark paper.
 */
export function WaxSeal({ label, className, ...rest }: Props) {
  const uid = useId()
  const body = `${uid}-body`
  const dish = `${uid}-dish`
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      width={72}
      height={72}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      <defs>
        <radialGradient id={body} cx="34%" cy="28%" r="80%">
          <stop offset="0" stopColor="#d4533a" />
          <stop offset="0.55" stopColor="#a52c18" />
          <stop offset="1" stopColor="#6b1709" />
        </radialGradient>
        <radialGradient id={dish} cx="62%" cy="68%" r="75%">
          <stop offset="0" stopColor="#a8301b" />
          <stop offset="1" stopColor="#6e1608" />
        </radialGradient>
      </defs>
      <path d={BLOB_PATH} fill={`url(#${body})`} strokeLinejoin="round" stroke="#5a1206" strokeWidth="0.8" />
      {/* Rim: dark inner edge + light lower edge reads as a pressed ring. */}
      <circle cx="50" cy="50" r="31" fill={`url(#${dish})`} />
      <circle cx="50" cy="50" r="31" fill="none" stroke="#4d0f05" strokeOpacity="0.55" strokeWidth="2" />
      <circle cx="50" cy="51.2" r="32.4" fill="none" stroke="#ffb59f" strokeOpacity="0.22" strokeWidth="1.2" />
      {/* Embossed glyph: shadow, highlight, body. */}
      <g transform={GLYPH_TRANSFORM}>
        <path d={GLYPH_PATH} fill="#2e0702" fillOpacity="0.6" transform="translate(0.8 1)" />
        <path d={GLYPH_PATH} fill="#ffd2c2" fillOpacity="0.45" transform="translate(-0.5 -0.6)" />
        <path d={GLYPH_PATH} fill="#cf4a2e" />
      </g>
      {/* Specular glint on the wax. */}
      <ellipse cx="32" cy="24" rx="10" ry="4.2" fill="#fff" fillOpacity="0.16" transform="rotate(-32 32 24)" />
    </svg>
  )
}
