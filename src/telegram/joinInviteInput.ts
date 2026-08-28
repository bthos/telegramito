/**
 * join-invite-chat-result: parse whatever the user pastes into the Join sheet
 * into a single API intent. Private invite links (`+` / `joinchat`) win over a
 * bare username when both look present (UX contract in `ux-design.md`).
 */

export type JoinInviteTarget =
  | { kind: "invite"; hash: string }
  | { kind: "username"; username: string }

const INVITE_HASH = /^[A-Za-z0-9_-]{8,64}$/
const USERNAME = /^[A-Za-z][A-Za-z0-9_]{3,31}$/

/** Strip a leading scheme + `t.me` / `telegram.me` host, returning the path/query tail. */
function stripHost(raw: string): string {
  let s = raw.trim()
  s = s.replace(/^https?:\/\//i, "").replace(/^tg:\/\//i, "")
  s = s.replace(/^(www\.)?(t\.me|telegram\.me|telegram\.dog)\//i, "")
  return s
}

export function parseJoinInviteInput(raw: string): JoinInviteTarget | null {
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }

  // tg://join?invite=HASH
  const tgJoin = /^tg:\/\/join\?invite=([A-Za-z0-9_-]+)/i.exec(trimmed)
  if (tgJoin) {
    return { kind: "invite", hash: tgJoin[1] }
  }

  const tail = stripHost(trimmed)

  // t.me/+HASH  |  t.me/joinchat/HASH
  const plus = /^\+([A-Za-z0-9_-]+)/.exec(tail)
  if (plus) {
    return { kind: "invite", hash: plus[1] }
  }
  const joinchat = /^joinchat\/([A-Za-z0-9_-]+)/i.exec(tail)
  if (joinchat) {
    return { kind: "invite", hash: joinchat[1] }
  }

  // @name  |  t.me/name
  if (tail.startsWith("@")) {
    const u = tail.slice(1).split(/[/?#]/)[0]
    return USERNAME.test(u) ? { kind: "username", username: u } : null
  }
  const pathHead = tail.split(/[/?#]/)[0]
  // A `-` is invalid in a username, so a bare token containing one is an invite
  // hash; otherwise a username-shaped token is treated as a public username.
  if (!pathHead.includes("-") && USERNAME.test(pathHead)) {
    return { kind: "username", username: pathHead }
  }
  if (INVITE_HASH.test(pathHead)) {
    return { kind: "invite", hash: pathHead }
  }

  return null
}
