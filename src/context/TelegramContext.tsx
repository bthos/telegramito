import { NewMessage, Raw, type NewMessageEvent } from "teleproto/events"
import { StringSession } from "teleproto/sessions"
import { TelegramClient, errors } from "teleproto"
import type { Dialog } from "teleproto/tl/custom/dialog"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { browserClientOptions, createClientFromStringSession } from "../telegram/clientFactory"
import {
  clearAvailableReactionsCache,
  prefetchAvailableReactionsAssets,
} from "../telegram/availableReactionsCache"
import { getApiCredentials } from "../telegram/credentials"
import { getPeerInfo } from "../telegram/dialogUtils"
import { getStringSession, setStringSession } from "../parental/storage"
import { appLog } from "../util/appLogger"
import { getEphemeralUpdatePeerKey } from "../telegram/ephemeralUpdate"

type LoginStep =
  | "idle"
  | "sending"
  | "code"
  | "2fa"
  | "busy"
  | "email"
  | "emailCode"
  | "captchaBlocked"

/**
 * Thrown from `reCaptchaCallback` to abort `client.start` cleanly (D8: no
 * in-app captcha widget in v1 — show `captchaBlocked` and let the user finish
 * in official Telegram). teleproto's `sendCode` re-throws whatever
 * `reCaptchaCallback` throws with no special handling (`client/auth.js`), so
 * this propagates straight out of `c.start(...)` into the catch block below —
 * which must recognize this specific error and skip the generic error-banner
 * + revert-to-idle fallback, or the `captchaBlocked` screen never renders.
 */
export class TeleprotoCaptchaAbort extends Error {
  constructor() {
    super("Telegram requires a security check Telegramito cannot complete in the browser.")
    this.name = "TeleprotoCaptchaAbort"
  }
}

/**
 * AC-T8: typed handling for the auth/connect failures this app already
 * surfaces (session-dead / frozen / flood), per `ux-design.md`'s mapping
 * table. Real class names grepped from the installed package
 * (`node_modules/teleproto/errors/RPCErrorList.d.ts`) rather than trusted
 * blind from spec — all confirmed to match spec's assumed names exactly.
 * Not a request to type every error site in the app — only the ones that
 * already show `e.message` for auth/session/connect failures.
 */
export function classifyAuthError(e: unknown): { key: string; seconds: number | null } | null {
  if (e instanceof errors.SessionRevokedError || e instanceof errors.AuthKeyUnregisteredError) {
    return { key: "sessionDead", seconds: null }
  }
  if (e instanceof errors.FloodWaitError || e instanceof errors.SlowModeWaitError) {
    return { key: "floodWait", seconds: e.seconds }
  }
  if (e instanceof errors.FrozenMethodInvalidError || e instanceof errors.FrozenParticipantMissingError) {
    return { key: "accountRestricted", seconds: null }
  }
  if (e instanceof errors.EmailUnconfirmedError) {
    // Our emailAddress/emailVerification hooks are always wired into
    // client.start (Phase 3) — if this throws anyway, the hooks weren't live
    // for this account state, so fall back to the plain copy per
    // ux-design.md's "else login.emailRequired".
    return { key: "emailRequired", seconds: null }
  }
  return null
}

const DIALOG_PAGE = 100

function attachNewMessageListener(
  client: TelegramClient,
  builder: NewMessage,
  bump: () => void
): void {
  client.addEventHandler(
    (ev: NewMessageEvent) => {
      if (ev?.message) {
        bump()
      }
    },
    builder
  )
}

/**
 * ephemeral-messages (AC-E1 / AC-E6): a raw update handler that only reacts to
 * the three Layer 228 ephemeral update constructors — logs the ignored traffic
 * and records the peer so the chat can show an honest ribbon. Wrapped so a
 * detection error can never break the classic update pipeline (AC-E3). Every
 * non-ephemeral update (the overwhelming majority) hits one `instanceof` and
 * returns.
 */
function attachEphemeralListener(
  client: TelegramClient,
  builder: Raw,
  onEphemeralForPeer: (peerKey: string) => void
): void {
  client.addEventHandler((update: unknown) => {
    try {
      const peerKey = getEphemeralUpdatePeerKey(update)
      if (peerKey == null) {
        return
      }
      appLog.warn("ephemeral update ignored (not shown in Telegramito)", {
        type: (update as { className?: string })?.className,
      })
      onEphemeralForPeer(peerKey)
    } catch {
      /* never let ephemeral detection disturb the update stream */
    }
  }, builder)
}

type TelegramValue = {
  client: TelegramClient | null
  isConnecting: boolean
  isReady: boolean
  authorized: boolean
  error: string | null
  errorKey: string | null
  errorSeconds: number | null
  dialogs: Dialog[]
  hasMoreDialogs: boolean
  dialogsLoadingMore: boolean
  lastMessageTick: number
  /** ephemeral-messages: peer keys that have received ephemeral traffic this session. */
  ephemeralPeerKeys: ReadonlySet<string>
  /** Bumps when a new ephemeral update lands, so consumers re-render. */
  ephemeralTick: number
  loginStep: LoginStep
  startLogin: (phone: string) => Promise<void>
  submitCode: (code: string) => void
  submit2FA: (password: string) => void
  submitEmail: (email: string) => void
  submitEmailCode: (code: string) => void
  dismissCaptchaBlock: () => void
  logOut: () => Promise<void>
  refreshDialogs: () => Promise<void>
  loadMoreDialogs: () => Promise<void>
}

const TelegramContext = createContext<TelegramValue | null>(null)

function saveSessionString(client: TelegramClient): void {
  const s = client.session as StringSession
  if (s && typeof s.save === "function") {
    const raw = s.save() as string
    void setStringSession(raw)
  }
}

export function TelegramProvider({ children }: { children: ReactNode }): React.ReactNode {
  const [client, setClient] = useState<TelegramClient | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [errorSeconds, setErrorSeconds] = useState<number | null>(null)
  const [dialogs, setDialogs] = useState<Dialog[]>([])
  const [hasMoreDialogs, setHasMoreDialogs] = useState(true)
  const [dialogsLoadingMore, setDialogsLoadingMore] = useState(false)
  const [lastMessageTick, setLastMessageTick] = useState(0)
  const ephemeralPeersRef = useRef<Set<string>>(new Set())
  const [ephemeralTick, setEphemeralTick] = useState(0)
  const [loginStep, setLoginStep] = useState<LoginStep>("idle")
  const codeRes = useRef<((v: string) => void) | null>(null)
  const twofaRes = useRef<((v: string) => void) | null>(null)
  const emailRes = useRef<((v: string) => void) | null>(null)
  const emailCodeRes = useRef<((v: string) => void) | null>(null)
  const loginInFlight = useRef(false)
  const msgBuilder = useRef(new NewMessage({}))
  const rawBuilder = useRef(new Raw({}))

  const handleEphemeralForPeer = useCallback((peerKey: string) => {
    ephemeralPeersRef.current.add(peerKey)
    setEphemeralTick(Date.now())
  }, [])

  const loadDialogsFirstPage = useCallback(async (c: TelegramClient) => {
    const list = await c.getDialogs({ limit: DIALOG_PAGE })
    /** Keep dialogs from pagination tails; naked `setDialogs(list)` drops them on every tick refresh. */
    setDialogs((prev) => {
      const keys = new Set(list.map((d) => getPeerInfo(d).key))
      const tail = prev.filter((d) => !keys.has(getPeerInfo(d).key))
      return tail.length === 0 ? list : [...list, ...tail]
    })
    setHasMoreDialogs(list.length >= DIALOG_PAGE)
  }, [])

  const refreshDialogs = useCallback(async () => {
    if (client) {
      await loadDialogsFirstPage(client)
    }
  }, [client, loadDialogsFirstPage])

  const loadMoreDialogs = useCallback(async () => {
    if (!client || !hasMoreDialogs || dialogsLoadingMore) {
      return
    }
    const last = dialogs[dialogs.length - 1]
    if (!last) {
      return
    }
    setDialogsLoadingMore(true)
    try {
      const offsetId = last.message?.id ?? last.dialog.topMessage ?? 0
      const offsetDate = last.date
      const offsetPeer = last.inputEntity
      const next = await client.getDialogs({
        limit: DIALOG_PAGE,
        offsetDate,
        offsetId,
        offsetPeer,
      })
      setDialogs((prev) => {
        const keys = new Set(prev.map((d) => getPeerInfo(d).key))
        const merged = [...prev]
        for (const d of next) {
          const k = getPeerInfo(d).key
          if (!keys.has(k)) {
            keys.add(k)
            merged.push(d)
          }
        }
        return merged
      })
      setHasMoreDialogs(next.length >= DIALOG_PAGE)
    } catch (e) {
      appLog.warn("loadMoreDialogs", e)
    } finally {
      setDialogsLoadingMore(false)
    }
  }, [client, dialogs, dialogsLoadingMore, hasMoreDialogs])

  const destroyClient = useCallback(async (c: TelegramClient) => {
    try {
      await c.destroy()
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setIsReady(false)
      setErrorKey(null)
      setErrorSeconds(null)
      setError(null)
      const creds = getApiCredentials()
      if (!creds.ok) {
        if (!cancelled) {
          setErrorKey("api")
          setIsReady(true)
        }
        return
      }
      const sessionStr = await getStringSession()
      if (sessionStr) {
        const b = createClientFromStringSession(sessionStr)
        if (b.ok) {
          setIsConnecting(true)
          try {
            await b.client.connect()
            if (cancelled) {
              await destroyClient(b.client)
              return
            }
            if (await b.client.checkAuthorization()) {
              setClient(b.client)
              setAuthorized(true)
              setLoginStep("idle")
              await loadDialogsFirstPage(b.client)
              attachNewMessageListener(b.client, msgBuilder.current, () => {
                setLastMessageTick(Date.now())
              })
              attachEphemeralListener(b.client, rawBuilder.current, handleEphemeralForPeer)
            } else {
              await destroyClient(b.client)
            }
          } catch (e) {
            if (!cancelled) {
              const classified = classifyAuthError(e)
              if (classified) {
                setErrorKey(classified.key)
                setErrorSeconds(classified.seconds)
              }
              setError(e instanceof Error ? e.message : String(e))
            }
            await destroyClient(b.client)
          } finally {
            if (!cancelled) {
              setIsConnecting(false)
              setIsReady(true)
            }
          }
        } else {
          if (!cancelled) {
            setErrorKey("api")
            setIsReady(true)
          }
        }
      } else {
        if (!cancelled) setIsReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [destroyClient, loadDialogsFirstPage])

  const startLogin = useCallback(
    async (phone: string) => {
      if (loginInFlight.current) return
      setErrorKey(null)
      setErrorSeconds(null)
      setError(null)
      const creds = getApiCredentials()
      if (!creds.ok) {
        setErrorKey("api")
        return
      }
      loginInFlight.current = true
      setIsConnecting(true)
      try {
        if (client) {
          const old = client
          setClient(null)
          setAuthorized(false)
          await destroyClient(old)
        }
        const s = new StringSession("")
        const c = new TelegramClient(s, creds.apiId, creds.apiHash, {
          connectionRetries: 5,
          ...browserClientOptions,
        })
        setClient(c)
        setLoginStep("sending")
        await c.start({
          phoneNumber: phone,
          phoneCode: async () => {
            setLoginStep("code")
            setIsConnecting(false)
            return await new Promise<string>((resolve) => {
              codeRes.current = (v: string) => {
                codeRes.current = null
                resolve(v)
              }
            })
          },
          password: async () => {
            setLoginStep("2fa")
            setIsConnecting(false)
            return await new Promise<string>((resolve) => {
              twofaRes.current = (v: string) => {
                twofaRes.current = null
                resolve(v)
              }
            })
          },
          emailAddress: async () => {
            setLoginStep("email")
            setIsConnecting(false)
            return await new Promise<string>((resolve) => {
              emailRes.current = (v: string) => {
                emailRes.current = null
                resolve(v)
              }
            })
          },
          emailVerification: async () => {
            setLoginStep("emailCode")
            setIsConnecting(false)
            // D8: v1 only supports the emailed code, not Google/Apple sign-in.
            return await new Promise<{ type: "code"; code: string }>((resolve) => {
              emailCodeRes.current = (v: string) => {
                emailCodeRes.current = null
                resolve({ type: "code", code: v })
              }
            })
          },
          reCaptchaCallback: async () => {
            setLoginStep("captchaBlocked")
            setIsConnecting(false)
            // D8: no in-app widget — abort `client.start` cleanly instead of
            // resolving with a fake token (see TeleprotoCaptchaAbort above).
            throw new TeleprotoCaptchaAbort()
          },
          onError: async (err) => {
            setError(err.message)
            return true
          },
        })
        if (await c.checkAuthorization()) {
          setAuthorized(true)
          setLoginStep("idle")
          saveSessionString(c)
          await loadDialogsFirstPage(c)
          attachNewMessageListener(c, msgBuilder.current, () => {
            setLastMessageTick(Date.now())
          })
          attachEphemeralListener(c, rawBuilder.current, handleEphemeralForPeer)
        }
      } catch (e) {
        if (e instanceof TeleprotoCaptchaAbort) {
          // loginStep is already "captchaBlocked" (set inside reCaptchaCallback
          // above) — do not overwrite it with the generic error banner or
          // revert to "idle" (F7); the captchaBlocked screen must stick until
          // the user dismisses it.
        } else {
          const classified = classifyAuthError(e)
          if (classified) {
            setErrorKey(classified.key)
            setErrorSeconds(classified.seconds)
          }
          setError(e instanceof Error ? e.message : String(e))
          setLoginStep("idle")
        }
        setClient(null)
        setAuthorized(false)
      } finally {
        setIsConnecting(false)
        loginInFlight.current = false
        codeRes.current = null
        twofaRes.current = null
        emailRes.current = null
        emailCodeRes.current = null
      }
    },
    [client, destroyClient, loadDialogsFirstPage]
  )

  const submitCode = useCallback((code: string) => {
    if (codeRes.current) {
      setLoginStep("busy")
      setIsConnecting(true)
      codeRes.current(code)
    }
  }, [])

  const submit2FA = useCallback((password: string) => {
    if (twofaRes.current) {
      setLoginStep("busy")
      setIsConnecting(true)
      twofaRes.current(password)
    }
  }, [])

  const submitEmail = useCallback((email: string) => {
    if (emailRes.current) {
      setLoginStep("busy")
      setIsConnecting(true)
      emailRes.current(email)
    }
  }, [])

  const submitEmailCode = useCallback((code: string) => {
    if (emailCodeRes.current) {
      setLoginStep("busy")
      setIsConnecting(true)
      emailCodeRes.current(code)
    }
  }, [])

  /** "Understood" on the captchaBlocked screen (D8) — returns to idle so the user can retry later. */
  const dismissCaptchaBlock = useCallback(() => {
    setLoginStep("idle")
  }, [])

  const logOut = useCallback(async () => {
    if (client) {
      await destroyClient(client)
    }
    setClient(null)
    setAuthorized(false)
    setDialogs([])
    setHasMoreDialogs(true)
    await setStringSession(null)
  }, [client, destroyClient])

  useEffect(() => {
    if (!client) {
      clearAvailableReactionsCache()
      return
    }
    if (!authorized) {
      return
    }
    void prefetchAvailableReactionsAssets(client)
  }, [client, authorized])

  const value = useMemo<TelegramValue>(
    () => ({
      client: authorized ? client : null,
      isConnecting,
      isReady,
      authorized,
      error,
      errorKey,
      errorSeconds,
      dialogs,
      hasMoreDialogs,
      dialogsLoadingMore,
      lastMessageTick,
      ephemeralPeerKeys: ephemeralPeersRef.current,
      ephemeralTick,
      loginStep,
      startLogin,
      submitCode,
      submit2FA,
      submitEmail,
      submitEmailCode,
      dismissCaptchaBlock,
      logOut,
      refreshDialogs,
      loadMoreDialogs,
    }),
    [
      client,
      authorized,
      isConnecting,
      isReady,
      error,
      errorKey,
      errorSeconds,
      dialogs,
      hasMoreDialogs,
      dialogsLoadingMore,
      lastMessageTick,
      ephemeralTick,
      loginStep,
      startLogin,
      submitCode,
      submit2FA,
      submitEmail,
      submitEmailCode,
      dismissCaptchaBlock,
      logOut,
      refreshDialogs,
      loadMoreDialogs,
    ]
  )

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  )
}

export function useTelegram(): TelegramValue {
  const v = useContext(TelegramContext)
  if (!v) {
    throw new Error("useTelegram must be under TelegramProvider")
  }
  return v
}
