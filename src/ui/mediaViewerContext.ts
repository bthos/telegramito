/** Chrome for full-screen / expanded media (see `design-system/preview`). */
export type MediaViewerContext = {
  peerTitle: string
  sentAtLabel: string
  caption: string
  /** Telegram's `invertMedia` flag: caption was shown above the media, not below. */
  captionAbove: boolean
}
