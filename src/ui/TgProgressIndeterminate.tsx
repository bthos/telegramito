/**
 * Indeterminate Telegram-style radial loader (design system media spec DS-07).
 * Optional cancel maps to the UX-analysis centre cross control.
 */
export function TgProgressIndeterminate({
  onCancel,
  cancelLabel,
}: {
  /** When set, the centre cross is an interactive cancel control (pointer-events enabled). */
  onCancel?: () => void
  cancelLabel?: string
} = {}) {
  const cancelable = Boolean(onCancel)
  return (
    <div
      className={
        cancelable
          ? "tg-progress tg-progress--indeterminate tg-progress--cancelable"
          : "tg-progress tg-progress--indeterminate"
      }
      role={cancelable ? "status" : undefined}
      aria-busy={cancelable ? true : undefined}
      aria-hidden={cancelable ? undefined : true}
    >
      <svg className="tg-progress__svg" viewBox="0 0 50 50" width="50" height="50" aria-hidden="true">
        <circle className="tg-progress__track" cx="25" cy="25" r="19" />
        <circle className="tg-progress__bar" cx="25" cy="25" r="19" />
      </svg>
      {cancelable ? (
        <button
          type="button"
          className="tg-progress__cancel"
          aria-label={cancelLabel ?? "Cancel"}
          onClick={(e) => {
            e.stopPropagation()
            onCancel?.()
          }}
        >
          <span className="tg-progress__x" aria-hidden />
        </button>
      ) : (
        <span className="tg-progress__x" aria-hidden />
      )}
    </div>
  )
}
