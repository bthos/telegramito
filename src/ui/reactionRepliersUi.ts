import { Api } from "telegram"

export function reactionKey(r: Api.TypeReaction): string {
  if (r.className === "ReactionEmpty") {
    return "e"
  }
  if (r.className === "ReactionEmoji") {
    return `em:${(r as Api.ReactionEmoji).emoticon}`
  }
  if (r.className === "ReactionCustomEmoji") {
    return `c:${String((r as Api.ReactionCustomEmoji).documentId)}`
  }
  if (r.className === "ReactionPaid") {
    return "p"
  }
  return "?"
}

export function reactionsEqual(a: Api.TypeReaction, b: Api.TypeReaction): boolean {
  return reactionKey(a) === reactionKey(b)
}

export function myReactionsList(recent: readonly Api.TypeMessagePeerReaction[] | undefined): Api.TypeReaction[] {
  if (!recent?.length) {
    return []
  }
  return recent
    .filter((x) => x.className === "MessagePeerReaction" && (x as Api.MessagePeerReaction).my)
    .map((x) => (x as Api.MessagePeerReaction).reaction)
    .filter(
      (r) =>
        r.className === "ReactionEmoji" || r.className === "ReactionCustomEmoji"
    ) as Api.TypeReaction[]
}
