import { useMemo } from "react"
import type { Api } from "telegram"
import { extractInlineThumb } from "../telegram/strippedThumb"

export function useInlineThumb(
  media: Api.TypeMessageMedia | undefined,
): { dataUrl: string; w: number; h: number } | null {
  return useMemo(() => extractInlineThumb(media), [media])
}
