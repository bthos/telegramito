import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react"
import { cn } from "../../util/cn"

export type ButtonVariant = "primary" | "ghost" | "ghostIcon"
export type ButtonSize = "md" | "sm"

type Props = {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children?: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>

/**
 * App shell buttons — maps to existing `.btn`, `.btn-ghost`, … in design tokens layer.
 */
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", className, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        variant === "primary" && "btn",
        variant === "ghost" && "btn-ghost",
        variant === "ghostIcon" && "btn-ghost btn-ghost--icon",
        size === "sm" && "btn-small",
        className
      )}
      {...rest}
    />
  )
})
