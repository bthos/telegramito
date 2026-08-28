import { Api } from "teleproto"

/**
 * join-invite-chat-result (Layer 228): `channels.joinChannel` and
 * `messages.importChatInvite` now return the `messages.ChatInviteJoinResult`
 * union — success-with-updates, or a webview / guard-bot path — instead of a
 * bare `Updates`. Every join call routes through {@link unwrapChatInviteJoinResult}
 * so no caller assumes `Updates` and the webview branch never carries an
 * invented `url` (D6 / AC-J1).
 */

export type ChatInviteJoinOutcome =
  | { kind: "ok"; updates: Api.TypeUpdates }
  | {
      kind: "webview"
      /** Bot that owns the confirmation flow — stringified `long`. */
      botId: string
      /** Query id to pass to `messages.requestChatJoinWebView` for a URL. */
      queryId: string
      users: Api.TypeUser[]
    }

/** Thrown for a `ChatInviteJoinResult` variant this client does not handle. */
export class UnknownChatInviteJoinResultError extends Error {
  readonly resultClassName: string
  constructor(resultClassName: string) {
    super(`Unhandled chat-invite join result: ${resultClassName}`)
    this.name = "UnknownChatInviteJoinResultError"
    this.resultClassName = resultClassName
  }
}

/**
 * Normalise a `messages.ChatInviteJoinResult` to a typed outcome.
 * - `ChatInviteJoinResultOk`  → `{ kind: "ok", updates }` (apply like any Updates)
 * - `ChatInviteJoinResultWebView` → `{ kind: "webview", botId, queryId, users }`
 *   — **no `url`**; a caller that needs one invokes `messages.requestChatJoinWebView`
 * - anything else → `UnknownChatInviteJoinResultError` (never a silent no-op)
 */
export function unwrapChatInviteJoinResult(
  result: Api.messages.TypeChatInviteJoinResult,
): ChatInviteJoinOutcome {
  if (result instanceof Api.messages.ChatInviteJoinResultOk) {
    return { kind: "ok", updates: result.updates }
  }
  if (result instanceof Api.messages.ChatInviteJoinResultWebView) {
    return {
      kind: "webview",
      botId: String(result.botId),
      queryId: String(result.queryId),
      users: Array.isArray(result.users) ? result.users : [],
    }
  }
  throw new UnknownChatInviteJoinResultError(
    (result as { className?: string })?.className ?? "unknown",
  )
}
