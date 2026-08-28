import { Api } from "teleproto"

function isDocument(x: unknown): x is Api.Document {
  return typeof x === "object" && x != null && (x as { className?: string }).className === "Document"
}

/**
 * The MTProto client (teleproto) / TL upgrades sometimes leave {@link Api.Message} shapes that are
 * valid on the wire but awkward for UI: e.g. `document` populated while `media` is empty, or
 * `MessageMediaPoll` without a `results` object. This layer **materializes** the same structure
 * official clients infer so {@link MessageMediaView}, placeholders, and poll widgets see concrete
 * {@link Api.MessageMedia}.
 *
 * Keep this file **pure** (no network). It handles safe *structural* repairs after deserialize; a
 * true binary-decode bug belongs upstream in teleproto (see `patches/` for the patch-package flow),
 * not here. (The "Gram" in the name is historical — GramJS was replaced by teleproto in AC-T15.)
 */
export function repairMessageAfterGramJs(m: Api.Message): Api.Message {
  if (m.className !== "Message") {
    return m
  }
  let cur: Api.Message = m

  const doc = cur.document
  if (isDocument(doc)) {
    const med = cur.media
    if (med == null || med.className === "MessageMediaEmpty") {
      cur = Object.assign(Object.create(Object.getPrototypeOf(cur)), cur, {
        media: new Api.MessageMediaDocument({ document: doc }),
      }) as Api.Message
    }
  }

  const pm = cur.media
  if (pm?.className === "MessageMediaPoll") {
    const pollWrap = pm as Api.MessageMediaPoll
    if (pollWrap.results == null) {
      cur = Object.assign(Object.create(Object.getPrototypeOf(cur)), cur, {
        media: new Api.MessageMediaPoll({
          poll: pollWrap.poll,
          results: new Api.PollResults({}),
          attachedMedia: pollWrap.attachedMedia,
        }),
      }) as Api.Message
    }
  }

  return cur
}
