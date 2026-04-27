import { Api } from "telegram"
import { isSameOptionBytes } from "./pollOptions"

export type PollOptionBytes = Parameters<typeof isSameOptionBytes>[0]

export function isPollOptionChosenRow(v: unknown): boolean {
  return Boolean(
    v
      && typeof v === "object"
      && (v as Api.PollAnswerVoters).className === "PollAnswerVoters"
      && (v as Api.PollAnswerVoters).chosen
  )
}

/**
 * True if the current user has a chosen option in PollResults (after voting).
 */
export function pollUserHasVoted(
  pollP: Api.Poll,
  res: Api.PollResults | null
): boolean {
  if (!res?.results) {
    return false
  }
  for (const a of pollP.answers) {
    const row = res.results.find(
      (r) => isSameOptionBytes(r.option as PollOptionBytes, (a as Api.PollAnswer).option as PollOptionBytes)
    )
    if (isPollOptionChosenRow(row)) {
      return true
    }
  }
  return false
}

/**
 * When `pollResults.min` is set, per-option vote counts are hidden until the user votes
 * (or the poll is closed), matching official clients.
 */
export function shouldShowPollResultBreakdown(
  res: Api.PollResults | null,
  hasVoted: boolean,
  closed: boolean
): boolean {
  if (!res) {
    return false
  }
  if (closed) {
    return true
  }
  if (res.min && !hasVoted) {
    return false
  }
  return true
}

export function pollOptionCount(
  res: Api.PollResults | null,
  optionBytes: unknown
): number {
  return res?.results?.find((r) => isSameOptionBytes(r.option as PollOptionBytes, optionBytes as PollOptionBytes))?.voters ?? 0
}

export function pollOptionPct(n: number, tot: number): number {
  if (tot <= 0) {
    return 0
  }
  return Math.round((n * 100) / tot)
}

/** Server-chosen options for multi-choice polls (used to reset local UI when results refresh). */
export function multiChosenOptionKeysFromResults(
  pollP: Api.Poll,
  res: Api.PollResults | null
): Set<string> {
  const s = new Set<string>()
  if (!res?.results) {
    return s
  }
  for (const a of pollP.answers) {
    const row = res.results.find(
      (r) => isSameOptionBytes(r.option as PollOptionBytes, (a as Api.PollAnswer).option as PollOptionBytes)
    )
    if (isPollOptionChosenRow(row)) {
      s.add((a as Api.PollAnswer).option.toString())
    }
  }
  return s
}

/** Stable key so a multi-choice poll subtree remounts when server results change. */
export function pollMultiResyncKey(
  pollP: Api.Poll,
  res: Api.PollResults | null
): string {
  const chosen = multiChosenOptionKeysFromResults(pollP, res)
  const parts = pollP.answers.map((a) => {
    const k = (a as Api.PollAnswer).option.toString()
    return `${k}:${chosen.has(k) ? "1" : "0"}`
  })
  return `${res?.totalVoters ?? 0}|${parts.join(";")}`
}
