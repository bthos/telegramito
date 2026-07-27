import { type ReactNode, useEffect } from "react"
import { useHardwareBackLayer } from "../hooks/useHardwareBack"
import { Button } from "./ds"

export type MainShellSubpageShellProps = {
  showBack: boolean
  backLabel: string
  onBack: () => void
  children: ReactNode
}

export function MainShellSubpageShell({
  showBack,
  backLabel,
  onBack,
  children,
}: MainShellSubpageShellProps) {
  useHardwareBackLayer(showBack, onBack)

  useEffect(() => {
    if (!showBack) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onBack()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
    }
  }, [showBack, onBack])

  return (
    <div className="one-col one-col--scroll">
      {showBack ? (
        <div className="letters-subpage-bar">
          <Button variant="ghost" type="button" onClick={onBack}>
            {backLabel}
          </Button>
        </div>
      ) : null}
      {children}
    </div>
  )
}
