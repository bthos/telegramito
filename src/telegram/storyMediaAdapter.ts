import { Api } from "telegram"

/**
 * AC12 — wraps a story's media/id/date/peer into an `Api.Message`-shaped
 * adapter so it can be fed straight into `MessageMediaView`/`MessageMediaStatic`
 * (which take a full `Api.Message`, not raw media) without forking the
 * blob-fetch/decode pipeline. Mirrors `MessageMediaView.tsx`'s own
 * (private, unexported) `messageWithReplacedMedia` trick, minus a real base
 * message to clone — stories have none, so this targets `Api.Message.prototype`
 * directly (Decision Record 4).
 */
export function buildStoryMediaMessage(story: Api.StoryItem, peer: Api.TypePeer): Api.Message {
  return Object.assign(Object.create(Api.Message.prototype), {
    id: story.id,
    peerId: peer,
    media: story.media,
    date: story.date,
    out: story.out === true,
  }) as Api.Message
}
