/**
 * Indeterminate Telegram-style radial loader (design system media spec).
 */
export function TgProgressIndeterminate() {
  return (
    <div className="tg-progress tg-progress--indeterminate" aria-hidden="true">
      <svg className="tg-progress__svg" viewBox="0 0 50 50" width="50" height="50" aria-hidden="true">
        <circle className="tg-progress__track" cx="25" cy="25" r="19" />
        <circle className="tg-progress__bar" cx="25" cy="25" r="19" />
      </svg>
    </div>
  )
}
