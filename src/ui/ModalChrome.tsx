import { type ReactNode } from "react"
import { createPortal } from "react-dom"
import { useDismissibleLayer } from "../hooks/useDismissibleLayer"

type Props = {
  children: ReactNode
  onClose: () => void
  ariaLabel: string
  /** Extra class on the backdrop wrapper (e.g. theme). */
  className?: string
  /** Panel class — default `media-modal-panel`. */
  panelClassName?: string
}

/**
 * Focus-trapped modal backdrop (SPA). Click backdrop to close; Escape handled by children or caller.
 */
export function ModalChrome({
  children,
  onClose,
  ariaLabel,
  className = "",
  panelClassName = "media-modal-panel",
}: Props) {
  const rootRef = useDismissibleLayer(true, onClose)

  const node = (
    <div
      className={`media-modal-backdrop ${className}`.trim()}
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose()
        }
      }}
    >
      <div
        ref={rootRef}
        className={panelClassName}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
