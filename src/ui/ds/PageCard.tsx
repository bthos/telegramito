import { type HTMLAttributes, type ReactNode } from "react"
import { cn } from "../../util/cn"

type LayoutProps = { children: ReactNode } & HTMLAttributes<HTMLDivElement>

/**
 * Centered full-viewport auth / login area (radial + `--bg` already on `:root`).
 */
export function AuthLayout({ className, children, ...rest }: LayoutProps) {
  return (
    <div className={cn("auth-screen", className)} {...rest}>
      {children}
    </div>
  )
}

type CardProps = {
  children: ReactNode
  /** `auth` = login card; `default` = small forms; `center` = large top margin. */
  variant?: "default" | "auth" | "center"
} & HTMLAttributes<HTMLDivElement>

/**
 * Surface cards — reuses global `.auth-card` / `.card` styles from the token layer.
 */
export function PageCard({ variant = "default", className, children, ...rest }: CardProps) {
  if (variant === "auth") {
    return (
      <div className={cn("auth-card", className)} {...rest}>
        {children}
      </div>
    )
  }
  return (
    <div
      className={cn("card", variant === "center" && "card-center", className)}
      {...rest}
    >
      {children}
    </div>
  )
}
