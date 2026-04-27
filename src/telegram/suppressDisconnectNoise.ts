/**
 * GramJS / MTProto: `Not` connected` in Connection.recv, reconnect stack traces,
 * and "Connection closed while receiving" during teardown are not actionable
 * in app code. Filter console noise; keep unhandledrejection + error for other cases.
 */
function isBenignDisconnectNoise(e: unknown): boolean {
  if (e instanceof Error) {
    if (e.message === "Not connected" || e.message === "not connected") {
      return true
    }
  }
  if (e != null && typeof e === "object" && "message" in e) {
    const m = String((e as { message?: string }).message)
    if (m === "Not connected" || m === "not connected") {
      return true
    }
  }
  if (e != null && typeof e === "string") {
    if (e === "Not connected" || e === "not connected") {
      return true
    }
  }
  return false
}

function isBenignLogArg(args: unknown[]): boolean {
  const a0 = args[0]
  if (isBenignDisconnectNoise(a0)) {
    return true
  }
  if (typeof a0 === "string") {
    if (
      a0.includes("Connection closed while receiving")
      || a0.includes("The server closed the connection while sending")
    ) {
      return true
    }
  }
  return false
}

let installed = false

export function installDisconnectNoiseSuppression(): void {
  if (installed) {
    return
  }
  if (typeof window === "undefined") {
    return
  }
  installed = true

  const onRejection = (ev: PromiseRejectionEvent) => {
    if (isBenignDisconnectNoise(ev.reason)) {
      ev.preventDefault()
    }
  }
  window.addEventListener("unhandledrejection", onRejection)

  window.addEventListener("error", (ev) => {
    if (isBenignDisconnectNoise((ev as ErrorEvent).error)) {
      ev.preventDefault()
    }
  })

  const origError = console.error
  const origWarn = console.warn
  console.error = (...a: unknown[]) => {
    if (isBenignLogArg(a)) {
      return
    }
    origError.apply(console, a as never[])
  }
  console.warn = (...a: unknown[]) => {
    if (isBenignLogArg(a)) {
      return
    }
    origWarn.apply(console, a as never[])
  }
}
