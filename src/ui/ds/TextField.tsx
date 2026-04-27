import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "../../util/cn"

type Props = {
  variant?: "default" | "search"
} & InputHTMLAttributes<HTMLInputElement>

/**
 * Themed text input; maps to `.input` and optional `.input-search` (top bar, etc.).
 */
export const TextField = forwardRef<HTMLInputElement, Props>(function TextField(
  { className, variant = "default", ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn("input", variant === "search" && "input-search", className)}
      {...rest}
    />
  )
})
