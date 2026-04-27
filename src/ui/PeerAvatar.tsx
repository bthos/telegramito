import type { CSSProperties } from "react"

function hueFromKey(id: string): [number, number, number] {
  let h = 0
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 33 + id.charCodeAt(i)) % 360
  }
  const s = 42 + (id.length % 25)
  const l = 40 + (id.length % 15)
  return [h, s, l] as [number, number, number]
}

type Props = {
  id: string
  name: string
  size?: number
  className?: string
}

export function PeerAvatar({ id, name, size = 40, className = "" }: Props) {
  const [h, s, l] = hueFromKey(id)
  const trimmed = name.trim() || "?"
  const ch =
    trimmed.length >= 2
      ? (trimmed[0] + (trimmed[1]! === " " ? trimmed[0]! : trimmed[1]!)).toUpperCase()
      : trimmed[0]!.toUpperCase()

  return (
    <span
      className={`peer-avatar ${className}`.trim()}
      style={
        {
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          lineHeight: `${size}px`,
          background: `linear-gradient(135deg, hsl(${h} ${s}% ${l}%), hsl(${(h + 40) % 360} ${s}% ${l + 8}%))`,
          fontSize: size < 32 ? "0.65rem" : "0.75rem",
        } as CSSProperties
      }
      aria-hidden
    >
      {ch}
    </span>
  )
}
