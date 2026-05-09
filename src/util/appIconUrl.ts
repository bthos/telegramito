/**
 * Public app icon SVG (same file rasterized to PWA PNGs in prebuild).
 * @see public/favicon.svg
 */
export function appIconUrl(): string {
  const base = import.meta.env.BASE_URL
  if (base === "/" || base === "") return "/favicon.svg"
  const trimmed = base.endsWith("/") ? base.slice(0, -1) : base
  return `${trimmed}/favicon.svg`
}
