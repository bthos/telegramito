import { describe, expect, it } from "vitest"
import { errors } from "teleproto"
import { classifyAuthError, TeleprotoCaptchaAbort } from "./TelegramContext"

/**
 * AC-T8 (migrate-teleproto): one test per confirmed-real typed error class
 * (grepped from `node_modules/teleproto/errors/RPCErrorList.d.ts` per
 * tech-plan §7.1) routed to the correct `ux-design.md` mapping-table key,
 * rather than falling through to a generic `e.message` string.
 *
 * `classifyAuthError` is the single chokepoint both auth/connect failure
 * sites in TelegramContext.tsx (boot-time reconnect, startLogin) run every
 * caught error through — testing it directly is a more precise regression
 * guard than re-deriving a full client/session mock for each error class.
 */
describe("classifyAuthError (AC-T8 typed error mapping)", () => {
  it("maps SessionRevokedError to login.sessionDead", () => {
    const e = new errors.SessionRevokedError({ request: undefined })
    expect(classifyAuthError(e)).toEqual({ key: "sessionDead", seconds: null })
  })

  it("maps AuthKeyUnregisteredError to login.sessionDead", () => {
    const e = new errors.AuthKeyUnregisteredError({ request: undefined })
    expect(classifyAuthError(e)).toEqual({ key: "sessionDead", seconds: null })
  })

  it("maps FloodWaitError to login.floodWait with seconds carried through", () => {
    const e = new errors.FloodWaitError({ request: undefined, capture: 30 })
    expect(classifyAuthError(e)).toEqual({ key: "floodWait", seconds: 30 })
  })

  it("maps SlowModeWaitError to login.floodWait with seconds carried through", () => {
    const e = new errors.SlowModeWaitError({ request: undefined, capture: 15 })
    expect(classifyAuthError(e)).toEqual({ key: "floodWait", seconds: 15 })
  })

  it("maps FrozenMethodInvalidError to login.accountRestricted", () => {
    const e = new errors.FrozenMethodInvalidError({ request: undefined })
    expect(classifyAuthError(e)).toEqual({ key: "accountRestricted", seconds: null })
  })

  it("maps FrozenParticipantMissingError to login.accountRestricted", () => {
    const e = new errors.FrozenParticipantMissingError({ request: undefined })
    expect(classifyAuthError(e)).toEqual({ key: "accountRestricted", seconds: null })
  })

  it("maps EmailUnconfirmedError to login.emailRequired", () => {
    const e = new errors.EmailUnconfirmedError({ request: undefined })
    expect(classifyAuthError(e)).toEqual({ key: "emailRequired", seconds: null })
  })

  it("returns null for an unrelated error (keeps the generic e.message fallback)", () => {
    expect(classifyAuthError(new Error("network blip"))).toBeNull()
  })

  it("returns null for TeleprotoCaptchaAbort — that path is handled separately (F7), not as a typed error banner", () => {
    expect(classifyAuthError(new TeleprotoCaptchaAbort())).toBeNull()
  })
})
