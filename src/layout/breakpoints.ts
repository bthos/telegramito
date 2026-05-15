/**
 * Responsive layout breakpoints (px).
 *
 * **`@media` in CSS keeps the same numeric literals** — custom properties inside
 * media queries are unreliable across targets. When you change a value here,
 * update matching rules in `app.css`, `letters.css`, etc. Comments there reference
 * these names (`BP.*`).
 */

/** Narrow / phone-first shell (list + thread stack): width ≤ `narrowMax`. */
export const BP = {
  /** `(max-width: phoneMax)` — tiny phones / compact panels (Emoji full-screen etc.). */
  phoneMax: 639,
  /** `(min-width: sm)` — start of “small tablet” band; pairs with lg−1 below. */
  sm: 640,
  /** `(min-width: lg)` — desktop context panel as flex sibling. */
  lg: 1024,
  /** Main grid / Letters masthead stacking. */
  stackMdMax: 720,
  /**
   * Upper bound for narrow chat shell (`chats-narrow`); aligns with telegram-react
   * `PAGE_WIDTH_SMALL` intent.
   */
  narrowMax: 960,
  /** Letters third column (day-mail rail): width ≥ `lettersThreeColMin`. */
  lettersThreeColMin: 1280,
} as const

/** Values that must stay one-off from BP for `min-*` / `max-*` CSS pairing. */
export const BP_PAIR = {
  /** `(min-width: …)` desktop page / Letters full-bleed — must be `narrowMax + 1`. */
  narrowDesktopMin: BP.narrowMax + 1,
  /** Tablet band upper bound — `lg - 1`. */
  tabletPortraitMax: BP.lg - 1,
  /** `(max-width: …)` — hide Letters rail below three-col threshold. */
  lettersBelowThreeColMax: BP.lettersThreeColMin - 1,
} as const

/** `matchMedia` query strings for hooks and non-CSS checks. */
export const layoutMq = {
  maxWidth: (px: number) => `(max-width: ${px}px)`,
  minWidth: (px: number) => `(min-width: ${px}px)`,
  range: (minPx: number, maxPx: number) =>
    `(min-width: ${minPx}px) and (max-width: ${maxPx}px)`,
} as const
