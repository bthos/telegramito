import type { ImgHTMLAttributes } from "react"
import logoUrl from "../assets/brand-mark.svg?url"

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  alt?: string
}

/** App mark: squircle + send (favicon + topbar). */
export function TelegramMark({ className, alt = "", title, ...rest }: Props) {
  return (
    <img
      className={className}
      src={logoUrl}
      alt={alt}
      title={title}
      decoding="async"
      draggable={false}
      width={32}
      height={32}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...rest}
    />
  )
}
