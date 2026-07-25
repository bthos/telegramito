/**
 * Portal target for Letters-themed overlays.
 *
 * `--letters-*` custom properties (see tokens-letters.css) are scoped to
 * `.app-root--main`, not `:root`. Portaling straight to `document.body`
 * escapes that scope, so `var(--letters-panel)` etc. resolve to nothing and
 * the overlay renders with a transparent background.
 */
export function getLettersPortalRoot(): Element {
  return document.querySelector(".app-root--main") ?? document.body
}
