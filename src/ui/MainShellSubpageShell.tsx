import type { ReactNode } from "react"
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
  return (
    <div className="one-col one-col--scroll">
      {showBack ? (
        <div className="letters-mobile-subpage-bar">
          <Button variant="ghost" type="button" onClick={onBack}>
            {backLabel}
          </Button>
        </div>
      ) : null}
      {children}
    </div>
  )
}
