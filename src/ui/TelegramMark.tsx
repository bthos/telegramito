import type { ImgHTMLAttributes } from "react"
import { appIconUrl } from "../util/appIconUrl"

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  alt?: string
}

/** App mark: same SVG as PWA / favicon (`public/favicon.svg`). */
export function TelegramMark({ className, alt = "", title, ...rest }: Props) {
  return (
    <img
      className={className}
      src={appIconUrl()}
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
