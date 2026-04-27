import { useId } from "react"
import { cn } from "../../util/cn"

type Props = {
  checked: boolean
  onChange: (v: boolean) => void
  id?: string
  label: string
  description?: string
  disabled?: boolean
  /** Suffix to avoid duplicate id when the same label appears twice */
  idSuffix?: string
}

/**
 * Toggle switch; `role="switch"` and keyboard — pairs with DS tokens (`.settings__field`, `.switch` in CSS).
 */
export function Switch({
  checked,
  onChange,
  id: idProp,
  label,
  description,
  disabled,
  idSuffix = "sw",
}: Props) {
  const uid = useId()
  const id = idProp ?? `${idSuffix}-${uid.replace(/:/g, "")}`

  return (
    <div
      className={cn("settings__field", disabled && "settings__field--disabled")}
    >
      <div className="settings__field-text">
        <div className="settings__field-label" id={`${id}-l`}>
          {label}
        </div>
        {description
          ? (
              <p className="settings__field-desc" id={`${id}-d`}>
                {description}
              </p>
            )
          : null}
      </div>
      <button
        type="button"
        id={id}
        className="switch"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled ?? false}
        aria-labelledby={`${id}-l`}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault()
            if (!disabled) {
              onChange(!checked)
            }
          }
        }}
        onClick={() => {
          if (!disabled) {
            onChange(!checked)
          }
        }}
      >
        <span className="switch__track" aria-hidden>
          <span className="switch__thumb" />
        </span>
      </button>
    </div>
  )
}
