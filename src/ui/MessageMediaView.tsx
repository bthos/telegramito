import { Api } from "teleproto"
import type { TelegramClient } from "teleproto"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { usePeerName } from "../hooks/usePeerName"
import { getMessageDocument, formatDocumentSize } from "../telegram/documentFile"
import { getMessageMediaTypeLabel } from "../telegram/dialogPreview"
import { isRoundVideoDoc, isStickerDoc } from "../telegram/documentMediaKind"
import { getMessageMediaPollFromMessage } from "../telegram/messagePollMedia"
import type { MessageMediaTranslateFn } from "./messageMediaI18n"
import { PollReadonly, useWpPreview, WebPageView } from "./messageMediaPollWeb"
import {
  extractStoryInnerMedia,
  isNonBlobVisualMedia,
  listPaidBundleSlots,
  resolveMessageMediaForDisplay,
  shouldRenderPaidBundleBlock,
} from "../telegram/messageMediaUnwrap"
import { MessageMediaStatic } from "./MessageMediaStatic"
import { PhotoMediaViewer } from "./PhotoMediaViewer"
import { VideoFullViewer } from "./VideoFullViewer"
import { getVideoDurationSeconds, formatVideoDuration } from "../telegram/documentVideoMeta"
import { getAudioDurationSeconds } from "../telegram/documentAudioMeta"
import { MediaPlaceholder, resolveMediaPlaceholderType } from "./MediaPlaceholder"
import { getMediaBoxDimensions, mediaBoxStyleVars } from "../telegram/mediaBoxDimensions"
import { TgProgressIndeterminate } from "./TgProgressIndeterminate"
import { VoiceMessageInline, VoiceMessageLoadingRow } from "./VoiceMessageInline"
import { AudioTrackInline } from "./AudioTrackInline"
import { DocumentAttachmentInline } from "./DocumentAttachmentInline"
import { StickerInline } from "./StickerInline"
import { useInlineThumb } from "./useInlineThumb"
import { MessagePollView } from "./MessagePollView"
import { messageMediaPeerLabel } from "./messageMediaPeerLabel"
import { useMessageMediaBlob } from "./useMessageMediaBlob"
import {
  AudioTrackLoadingRow,
  DocumentAttachmentDeferredRow,
  DocumentAttachmentLoadingRow,
  GifDeferredLoading,
  GifDeferredPending,
  PaidBundlePreviewRow,
  PhotoDeferredLoading,
  PhotoDeferredPending,
  VideoDeferredLoading,
  VideoDeferredPending,
  VideoInlinePlayer,
  documentAttachmentLabels,
  mediaLoadingIsCompact,
} from "./messageMediaDeferredViews"

import type { MediaViewerContext } from "./mediaViewerContext"

export type { MediaViewerContext } from "./mediaViewerContext"
export { AudioTrackLoadingRow, DocumentAttachmentLoadingRow, VideoInlinePlayer } from "./messageMediaDeferredViews"

function messageWithReplacedMedia(
  base: Api.Message,
  media: Api.TypeMessageMedia,
): Api.Message {
  return Object.assign(
    Object.create(Object.getPrototypeOf(base)),
    base,
    { media },
  ) as Api.Message
}

export function MessageMediaView({
  message, client, noPreview, filterGifs, t, pollVoter, viewerContext,
}: {
  message: Api.Message
  client: TelegramClient | null
  noPreview: boolean
  filterGifs: boolean
  t: MessageMediaTranslateFn
  pollVoter?: { entity: unknown; onVoted: () => void }
  viewerContext?: MediaViewerContext | null
}) {
  const { t: te } = useTranslation()
  const senderFromId = message.className === "Message" ? message.fromId : undefined
  const senderPeerName = usePeerName(senderFromId, client)
  const paidBundleSlots = useMemo(() => {
    if (message.media?.className !== "MessageMediaPaidMedia") {
      return null
    }
    return listPaidBundleSlots(message.media as Api.MessageMediaPaidMedia)
  }, [message])

  const renderPaidAsBundle = Boolean(
    paidBundleSlots && shouldRenderPaidBundleBlock(paidBundleSlots),
  )

  const resolved = useMemo(() => {
    if (
      paidBundleSlots != null
      && paidBundleSlots.length === 1
      && paidBundleSlots[0].kind === "full"
      && !renderPaidAsBundle
    ) {
      return { ...message, media: paidBundleSlots[0].media } as Api.Message
    }
    return resolveMessageMediaForDisplay(message)
  }, [message, paidBundleSlots, renderPaidAsBundle])

  const blobSourceMessage = useMemo(() => {
    if (renderPaidAsBundle) {
      return {
        ...message,
        media: { className: "MessageMediaEmpty" } as Api.MessageMediaEmpty,
      } as Api.Message
    }
    if (
      paidBundleSlots != null
      && paidBundleSlots.length === 1
      && paidBundleSlots[0].kind === "full"
    ) {
      return { ...message, media: paidBundleSlots[0].media } as Api.Message
    }
    return resolveMessageMediaForDisplay(message)
  }, [message, paidBundleSlots, renderPaidAsBundle])

  const storyInnerMedia = useMemo<Api.TypeMessageMedia | null>(() => {
    if (!resolved.media || resolved.media.className !== "MessageMediaStory") return null
    return extractStoryInnerMedia(resolved.media)
  }, [resolved.media])

  const wpPreview = useWpPreview(resolved, client, noPreview)
  const mediaBoxStyle = useMemo(
    () => mediaBoxStyleVars(getMediaBoxDimensions(resolved)) as React.CSSProperties | undefined,
    [resolved],
  )
  const [s, requestLoad, cancelLoad] = useMessageMediaBlob(blobSourceMessage, client, filterGifs)
  const inlineThumb = useInlineThumb(blobSourceMessage.media)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [videoFullOpen, setVideoFullOpen] = useState(false)
  const errLabel = te("error")
  const cancelLabel = te("common.cancel")

  const imagePreviewUrl = s.k === "i" ? s.u : null
  const videoPreviewUrl = s.k === "v" ? s.u : null
  useEffect(() => {
    queueMicrotask(() => {
      setLightboxOpen(false)
      setVideoFullOpen(false)
    })
  }, [message.id, imagePreviewUrl, videoPreviewUrl])

  if (renderPaidAsBundle && paidBundleSlots) {
    return (
      <div
        className="msg-paid-bundle"
        role="group"
        aria-label={te("chat.paidBundleGroupAria")}
      >
        {paidBundleSlots.map((slot, i) =>
          slot.kind === "preview"
            ? (
                <PaidBundlePreviewRow key={i} preview={slot.preview} te={te} />
              )
            : (
                <MessageMediaView
                  key={i}
                  message={
                    Object.assign(
                      Object.create(Object.getPrototypeOf(message)),
                      message,
                      { media: slot.media },
                    ) as Api.Message
                  }
                  client={client}
                  noPreview={noPreview}
                  filterGifs={filterGifs}
                  t={t}
                  pollVoter={pollVoter}
                  viewerContext={viewerContext}
                />
              ),
        )}
      </div>
    )
  }

  const pollMedia = getMessageMediaPollFromMessage(resolved)
  if (pollMedia) {
    const attached = pollMedia.attachedMedia
    const attachedBlock = attached != null
      ? (
          <div
            className="msg-poll-attached"
            role="group"
            aria-label={te("chat.pollAttachedMediaAria")}
          >
            <MessageMediaView
              message={messageWithReplacedMedia(message, attached)}
              client={client}
              noPreview={noPreview}
              filterGifs={filterGifs}
              t={t}
              pollVoter={pollVoter}
              viewerContext={viewerContext}
            />
          </div>
        )
      : null
    if (client && pollVoter) {
      return (
        <div className="msg-poll-with-media" data-media-state="preview">
          <MessagePollView
            media={pollMedia}
            t={t}
            client={client}
            messageId={message.id!}
            entity={pollVoter.entity}
            onVoted={pollVoter.onVoted}
          />
          {attachedBlock}
        </div>
      )
    }
    return (
      <div className="msg-poll-with-media" data-media-state="preview">
        <PollReadonly media={pollMedia} t={t} client={client} />
        {attachedBlock}
      </div>
    )
  }
  if (resolved.media?.className === "MessageMediaWebPage" && !noPreview) {
    return (
      <WebPageView
        m={resolved}
        no={noPreview}
        t={t}
        thumbUrl={wpPreview.thumbUrl}
        thumbPhase={wpPreview.thumbPhase}
        onThumbRequest={wpPreview.requestThumb}
        viewerContext={viewerContext}
      />
    )
  }
  if (storyInnerMedia !== null) {
    const storyMed = resolved.media as Api.MessageMediaStory
    const innerMsg = { ...resolved, media: storyInnerMedia } as Api.Message
    const attribution = t("chat.storyFrom", { peer: messageMediaPeerLabel(storyMed.peer) })
      + (storyMed.id != null ? ` · #${storyMed.id}` : "")
    return (
      <div className="msg-story-inline-wrap">
        <div className="msg-story-attribution" aria-label={t("chat.previewStory")}>
          {attribution}
        </div>
        <MessageMediaView
          message={innerMsg}
          client={client}
          noPreview={noPreview}
          filterGifs={filterGifs}
          t={t}
          pollVoter={pollVoter}
          viewerContext={viewerContext}
        />
      </div>
    )
  }
  if (isNonBlobVisualMedia(resolved.media)) {
    return <MessageMediaStatic m={resolved} t={t} />
  }
  if (s.k === "f") {
    return <div className="msg-media msg-media--filtered" role="status">{t("chat.filteredGif")}</div>
  }
  if (s.k === "w") {
    const placeholderType = resolveMediaPlaceholderType(resolved, getMessageDocument(resolved))
    const compact = mediaLoadingIsCompact(placeholderType)
    const tapLabel = te("chat.mediaTapToLoad")
    if (placeholderType === "attachment") {
      const docMeta = documentAttachmentLabels(resolved)
      if (docMeta) {
        return (
          <DocumentAttachmentDeferredRow
            name={docMeta.name}
            sizeStr={docMeta.sizeStr}
            ext={docMeta.ext}
            ariaLabel={tapLabel}
            onActivate={requestLoad}
          />
        )
      }
    }
    if (placeholderType === "video") {
      return (
        <VideoDeferredPending
          resolved={resolved}
          onActivate={requestLoad}
          tapLabel={tapLabel}
          footHint={te("chat.mediaTapToLoadHint")}
          sentAtLabel={viewerContext?.sentAtLabel ?? null}
          thumbDataUrl={inlineThumb?.dataUrl}
          style={mediaBoxStyle}
        />
      )
    }
    if (placeholderType === "gif") {
      return (
        <GifDeferredPending
          onActivate={requestLoad}
          tapLabel={tapLabel}
          footHint={te("chat.mediaTapToLoadHint")}
          sentAtLabel={viewerContext?.sentAtLabel ?? null}
          thumbDataUrl={inlineThumb?.dataUrl}
          style={mediaBoxStyle}
        />
      )
    }
    if (placeholderType === "photo") {
      return (
        <PhotoDeferredPending
          onActivate={requestLoad}
          tapLabel={tapLabel}
          footHint={te("chat.mediaTapToLoadHint")}
          sentAtLabel={viewerContext?.sentAtLabel ?? null}
          thumbDataUrl={inlineThumb?.dataUrl}
          style={mediaBoxStyle}
        />
      )
    }
    return (
      <div
        className={
          compact
            ? "msg-media msg-media--pending ds-media-pending ds-media-pending--compact"
            : "msg-media msg-media--pending ds-media-pending"
        }
        data-media-state="preview"
      >
        <button
          type="button"
          className="msg-media-pending-hit"
          aria-label={tapLabel}
          onClick={(e) => {
            e.stopPropagation()
            requestLoad()
          }}
        >
          <MediaPlaceholder type={placeholderType} shimmer={false} variant="pending" style={mediaBoxStyle} />
        </button>
        {!compact ? (
          <div className="media-pending-foot" role="status">
            <span className="media-pending-foot__hint">{te("chat.mediaTapToLoadHint")}</span>
            {viewerContext?.sentAtLabel ? (
              <span className="media-pending-foot__time">{viewerContext.sentAtLabel}</span>
            ) : (
              <span className="media-pending-foot__time" aria-hidden />
            )}
          </div>
        ) : null}
      </div>
    )
  }
  if (s.k === "d") {
    const placeholderType = resolveMediaPlaceholderType(resolved, getMessageDocument(resolved))
    const compact = mediaLoadingIsCompact(placeholderType)
    if (placeholderType === "attachment") {
      const docMeta = documentAttachmentLabels(resolved)
      if (docMeta) {
        return (
          <DocumentAttachmentLoadingRow
            name={docMeta.name}
            sizeStr={docMeta.sizeStr}
            hint={te("chat.mediaDownloadProgress")}
            timeLabel={viewerContext?.sentAtLabel ?? null}
            onCancel={cancelLoad}
            cancelLabel={cancelLabel}
          />
        )
      }
    }
    if (placeholderType === "video") {
      const dV = getMessageDocument(resolved)
      const roundV = dV ? isRoundVideoDoc(dV) : false
      const durSec = getVideoDurationSeconds(dV)
      const durationLabel = durSec != null ? formatVideoDuration(durSec) : null
      const sizeStr = dV ? formatDocumentSize(dV.size) : null
      return (
        <VideoDeferredLoading
          hint={te("chat.mediaDownloadProgress")}
          timeLabel={viewerContext?.sentAtLabel ?? null}
          round={roundV}
          thumbDataUrl={inlineThumb?.dataUrl}
          durationLabel={durationLabel}
          sizeStr={sizeStr}
          onCancel={cancelLoad}
          cancelLabel={cancelLabel}
          style={mediaBoxStyle}
        />
      )
    }
    if (placeholderType === "gif") {
      return (
        <GifDeferredLoading
          hint={te("chat.mediaDownloadProgress")}
          timeLabel={viewerContext?.sentAtLabel ?? null}
          thumbDataUrl={inlineThumb?.dataUrl}
          onCancel={cancelLoad}
          cancelLabel={cancelLabel}
          style={mediaBoxStyle}
        />
      )
    }
    if (placeholderType === "photo") {
      return (
        <PhotoDeferredLoading
          hint={te("chat.mediaDownloadProgress")}
          timeLabel={viewerContext?.sentAtLabel ?? null}
          thumbDataUrl={inlineThumb?.dataUrl}
          onCancel={cancelLoad}
          cancelLabel={cancelLabel}
          style={mediaBoxStyle}
        />
      )
    }
    if (placeholderType === "audio") {
      const dA = getMessageDocument(resolved)
      if (dA) {
        return (
          <AudioTrackLoadingRow
            doc={dA}
            hint={te("chat.mediaDownloadProgress")}
            onCancel={cancelLoad}
            cancelLabel={cancelLabel}
          />
        )
      }
    }
    if (placeholderType === "voice") {
      const dV = getMessageDocument(resolved)
      const durSec = getAudioDurationSeconds(dV)
      return (
        <VoiceMessageLoadingRow
          durationSec={durSec}
          hint={te("chat.mediaDownloadProgress")}
          onCancel={cancelLoad}
          cancelLabel={cancelLabel}
        />
      )
    }
    return (
      <div
        className={
          compact
            ? "msg-media msg-media--loading ds-media-loading ds-media-loading--compact"
            : "msg-media msg-media--loading ds-media-loading"
        }
        data-media-state="loading"
      >
        <MediaPlaceholder type={placeholderType} shimmer style={mediaBoxStyle} />
        <TgProgressIndeterminate onCancel={cancelLoad} cancelLabel={cancelLabel} />
        {!compact ? (
          <div className="media-loading-foot" role="status">
            <span className="media-loading-foot__hint">{te("chat.mediaDownloadProgress")}</span>
            {viewerContext?.sentAtLabel ? (
              <span className="media-loading-foot__time">{viewerContext.sentAtLabel}</span>
            ) : (
              <span className="media-loading-foot__time" aria-hidden />
            )}
          </div>
        ) : null}
      </div>
    )
  }
  if (s.k === "e") {
    return <div className="msg-media msg-media--err" role="status" aria-label={errLabel} />
  }
  if (s.k === "i") {
    const d = getMessageDocument(resolved)
    if (d && isStickerDoc(d)) {
      return (
        <div className="msg-media msg-media--sticker" data-media-state="preview" style={mediaBoxStyle}>
          <StickerInline url={s.u} doc={d} />
        </div>
      )
    }
    const chatTitleFallback = viewerContext?.peerTitle ?? te("chat.mediaViewerPeerFallback")
    const senderTrimmed = senderPeerName.trim()
    const postAuthorTrimmed = typeof message.postAuthor === "string" ? message.postAuthor.trim() : ""
    const senderLabel = message.out
      ? te("chat.mediaViewerYou")
      : senderTrimmed || postAuthorTrimmed || chatTitleFallback
    const sentAt = viewerContext?.sentAtLabel ?? ""
    const caption = viewerContext?.caption ?? ""
    const captionAbove = viewerContext?.captionAbove ?? false
    return (
      <div className="msg-media msg-media--photo" data-media-state="preview" style={mediaBoxStyle}>
        <button
          type="button"
          className="msg-img-link"
          title={te("chat.openPhoto")}
          aria-label={te("chat.openPhoto")}
          onClick={() => {
            setLightboxOpen(true)
          }}
        >
          <img className="msg-img" src={s.u} alt="" draggable={false} />
        </button>
        {lightboxOpen ? (
          <PhotoMediaViewer
            url={s.u}
            onClose={() => {
              setLightboxOpen(false)
            }}
            labelClose={te("chat.imageViewerClose")}
            labelBackdrop={te("chat.imageViewerBackdrop")}
            peerTitle={senderLabel}
            sentAtLabel={sentAt}
            caption={caption}
            captionAbove={captionAbove}
          />
        ) : null}
      </div>
    )
  }
  if (s.k === "v") {
    const d = getMessageDocument(resolved)
    const round = d ? isRoundVideoDoc(d) : false
    const gifStyle = s.loop
    const durSec = getVideoDurationSeconds(d)
    const durationLabel = durSec != null ? formatVideoDuration(durSec) : null
    const peerTitle = viewerContext?.peerTitle ?? te("chat.mediaViewerPeerFallback")
    const sentAt = viewerContext?.sentAtLabel ?? ""
    const wrapClass = [
      "msg-media msg-media--video",
      gifStyle ? "msg-media--gif" : "",
      round ? "msg-media--round-video" : "",
    ].filter(Boolean).join(" ")
    return (
      <div className={wrapClass} data-media-state="preview" style={mediaBoxStyle}>
        <VideoInlinePlayer
          src={s.u}
          loop={s.loop}
          autoPlay={gifStyle}
          muted
          playLabel={te("chat.playVideo")}
          round={round}
          durationLabel={gifStyle ? null : durationLabel}
          onExpand={() => setVideoFullOpen(true)}
          showGifTag={gifStyle}
        />
        {videoFullOpen ? (
          <VideoFullViewer
            src={s.u}
            loop={s.loop}
            onClose={() => setVideoFullOpen(false)}
            ariaLabel={te("chat.videoViewerDialog")}
            labelClose={te("chat.imageViewerClose")}
            title={peerTitle}
            sentAtLabel={sentAt}
            labelPlay={te("chat.videoPlay")}
            labelPause={te("chat.videoPause")}
            labelVolume={te("chat.videoVolume")}
            durationSec={durSec}
            variant={round ? "round" : "rect"}
          />
        ) : null}
      </div>
    )
  }
  if (s.k === "au") {
    const d = getMessageDocument(resolved)
    const dur = getAudioDurationSeconds(d)
    if (s.voice) {
      return (
        <div className="msg-media msg-media--audio msg-media--voice" data-media-state="preview">
          <VoiceMessageInline
            src={s.u}
            durationSec={dur}
            viewerContext={viewerContext}
            unplayed={!message.out && Boolean(message.mediaUnread)}
          />
        </div>
      )
    }
    return (
      <div className="msg-media msg-media--audio" data-media-state="preview">
        {d ? <AudioTrackInline src={s.u} doc={d} viewerContext={viewerContext} /> : (
          <audio
            className="msg-audio"
            src={s.u}
            controls
            preload="metadata"
            aria-label={te("chat.previewAudio")}
          />
        )}
      </div>
    )
  }
  if (s.k === "at") {
    const d = getMessageDocument(resolved)
    return (
      <DocumentAttachmentInline
        url={s.u}
        name={s.name}
        sizeStr={s.sizeStr}
        doc={d}
        viewerContext={viewerContext}
      />
    )
  }
  if (s.k === "z") {
    const med = resolved.media
    if (
      med
      && med.className !== "MessageMediaEmpty"
      && !(med.className === "MessageMediaWebPage" && !noPreview)
    ) {
      return (
        <div className="msg-media msg-media--card" role="status">
          <span className="msg-media-card__muted">{getMessageMediaTypeLabel(message, t)}</span>
        </div>
      )
    }
  }
  return null
}

