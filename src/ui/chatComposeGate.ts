/** Pure compose enablement gates (ChatView / ChatComposer). */

export function canCompose(opts: {
  isForum: boolean
  topicsLoading: boolean
  topicsErr: string | null
  topicId: number | null
  topicsLength: number
}): boolean {
  return (
    !opts.isForum ||
    (!opts.topicsLoading &&
      opts.topicsErr == null &&
      opts.topicId != null &&
      opts.topicsLength > 0)
  )
}

export function canSendNow(opts: {
  canCompose: boolean
  isUploading: boolean
  draftNonempty: boolean
  pendingAttachmentCount: number
}): boolean {
  return (
    opts.canCompose &&
    !opts.isUploading &&
    (opts.draftNonempty || opts.pendingAttachmentCount > 0)
  )
}
