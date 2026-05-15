import type { ReactNode } from "react"

type Props = {
  /** On the main thread use `h1` + `titleId` for `aria-labelledby`; in the rail use `h2` without id. */
  titleHeadingLevel?: "h1" | "h2"
  /** Required when `titleHeadingLevel` is `h1`. */
  titleId?: string
  title: string
  /**
   * When the kicker already carries the chat name (ribbon) and matches the title,
   * hide the visible heading and keep a screen-reader-only title for `aria-labelledby`.
   */
  titleVisuallyHidden?: boolean
  /**
   * When false, omit the title heading (e.g. narrow shell already renders `#thread-title` in the top bar).
   */
  renderHeading?: boolean
  /** Small-caps editorial ribbon above title (channels / groups — HF mock). */
  kickerLine?: ReactNode | null
  /** Toolbar beside title (e.g. unread-only toggle). */
  trailingInTitleRow?: ReactNode | null
  /**
   * Inline insights (volume + calendar). Omit or pass `null` for a lead-only masthead
   * (e.g. compact center column when chrome is docked in the right rail).
   */
  insights?: ReactNode | null
  /** Stack title block above insights (narrow right rail). Default: side-by-side grid. */
  layoutVariant?: "default" | "stacked"
  metaLine?: ReactNode | null
  windowLine?: ReactNode | null
  jumpStrip?: ReactNode | null
}

/**
 * Editorial thread masthead for Letters v2: `[ title stack ] [ insights ]` with handoff 28px gutter.
 * Jump-by-date interactive grid lives in {@link LettersThreadInsights} (HF mock).
 */
export function LettersLetterHeader({
  titleHeadingLevel = "h1",
  titleId,
  title,
  titleVisuallyHidden = false,
  renderHeading = true,
  kickerLine,
  trailingInTitleRow,
  insights = null,
  layoutVariant = "default",
  metaLine,
  windowLine,
  jumpStrip,
}: Props) {
  const TitleTag = titleHeadingLevel === "h1" ? "h1" : "h2"
  const hasInsights = insights != null
  const rootClass = [
    "letters-letter-header",
    layoutVariant === "stacked" ? "letters-letter-header--stacked" : "",
    !hasInsights ? "letters-letter-header--lead-only" : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={rootClass}>
      <div className="letters-letter-header__lead">
        {kickerLine != null ? <div className="letters-letter-header__kicker">{kickerLine}</div> : null}
        <div className="letters-letter-header__title-row">
          {renderHeading ? (
            <TitleTag
              {...(titleHeadingLevel === "h1" && titleId != null ? { id: titleId } : {})}
              className={
                titleVisuallyHidden ? "thread-h visually-hidden" : "thread-h"
              }
            >
              {title}
            </TitleTag>
          ) : null}
          {trailingInTitleRow}
        </div>
        {metaLine}
        {windowLine}
        {jumpStrip}
      </div>
      {hasInsights ? insights : null}
    </div>
  )
}
