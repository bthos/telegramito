import { NewMessage, type NewMessageEvent } from "telegram/events"
import { StringSession } from "telegram/sessions"
import { TelegramClient } from "telegram"
import type { Dialog } from "telegram/tl/custom/dialog"
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
import { createClientFromStringSession } from "../telegram/clientFactory"
import { getApiCredentials } from "../telegram/credentials"
import { getPeerInfo } from "../telegram/dialogUtils"
import { getStringSession, setStringSession } from "../parental/storage"
import { appLog } from "../util/appLogger"

type LoginStep = "idle" | "sending" | "code" | "2fa" | "busy"

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

type TelegramValue = {
  client: TelegramClient | null
  isConnecting: boolean
  isReady: boolean
  authorized: boolean
  error: string | null
  errorKey: string | null
  dialogs: Dialog[]
  hasMoreDialogs: boolean
  dialogsLoadingMore: boolean
  lastMessageTick: number
  loginStep: LoginStep
  startLogin: (phone: string) => Promise<void>
  submitCode: (code: string) => void
  submit2FA: (password: string) => void
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
  const [dialogs, setDialogs] = useState<Dialog[]>([])
  const [hasMoreDialogs, setHasMoreDialogs] = useState(true)
  const [dialogsLoadingMore, setDialogsLoadingMore] = useState(false)
  const [lastMessageTick, setLastMessageTick] = useState(0)
  const [loginStep, setLoginStep] = useState<LoginStep>("idle")
  const codeRes = useRef<((v: string) => void) | null>(null)
  const twofaRes = useRef<((v: string) => void) | null>(null)
  const loginInFlight = useRef(false)
  const msgBuilder = useRef(new NewMessage({}))

  const loadDialogsFirstPage = useCallback(async (c: TelegramClient) => {
    const list = await c.getDialogs({ limit: DIALOG_PAGE })
    setDialogs(list)
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
            } else {
              await destroyClient(b.client)
            }
          } catch (e) {
            if (!cancelled) {
              setError(
                e instanceof Error ? e.message : String(e)
              )
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
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        setLoginStep("idle")
        setClient(null)
        setAuthorized(false)
      } finally {
        setIsConnecting(false)
        loginInFlight.current = false
        codeRes.current = null
        twofaRes.current = null
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

  const value = useMemo<TelegramValue>(
    () => ({
      client: authorized ? client : null,
      isConnecting,
      isReady,
      authorized,
      error,
      errorKey,
      dialogs,
      hasMoreDialogs,
      dialogsLoadingMore,
      lastMessageTick,
      loginStep,
      startLogin,
      submitCode,
      submit2FA,
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
      dialogs,
      hasMoreDialogs,
      dialogsLoadingMore,
      lastMessageTick,
      loginStep,
      startLogin,
      submitCode,
      submit2FA,
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
