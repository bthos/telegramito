import { Api } from "teleproto"
import { useEffect, useMemo, useState } from "react"
import { asTwe } from "../telegram/twe"
import { APP_VERSION, TELEGRAM_LAYER_EXPECTED } from "../version"
import { Button } from "./ds"
import type { MessageMediaTranslateFn } from "./messageMediaI18n"
import { ModalChrome } from "./ModalChrome"
import { messageMediaPeerLabel as peerLabel } from "./messageMediaPeerLabel"

function dicePipCells(val: number): boolean[] {
  const cells = Array.from({ length: 9 }, () => false)
  const v = Math.max(1, Math.min(6, Math.floor(val)))
  const map: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 3, 6, 2, 5, 8],
  }
  for (const i of map[v] ?? []) {
    cells[i] = true
  }
  return cells
}

function formatUntil(ts: number): string {
  try {
    return new Date(ts * 1000).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })
  } catch {
    return String(ts)
  }
}

export function UxDiceCard({
  emoticon,
  value,
  tonStake,
  tonWin,
  t,
}: {
  emoticon: string | undefined
  value: number | undefined
  tonStake?: number
  tonWin?: number
  t: MessageMediaTranslateFn
}) {
  const em = emoticon || "🎲"
  const settled = typeof value === "number" && value > 0
  const rolling = !settled
  const stdDice = em === "🎲"
  const [fullOpen, setFullOpen] = useState(false)

  const pipCells = settled && stdDice ? dicePipCells(value!) : null

  const metaState = rolling ? "loading" : "preview"

  return (
    <div
      data-media-state={metaState}
      className="msg-media msg-media--card msg-media--dice"
      role="group"
      aria-label={t("chat.previewDice")}
    >
      <div className="msg-media-dice-row">
        {settled && stdDice && pipCells
          ? (
              <div
                className="msg-media-dice-face"
                aria-hidden
              >
                {pipCells.map((on, i) => (
                  <div
                    key={i}
                    className={on ? "msg-media-dice-pip" : "msg-media-dice-pip msg-media-dice-pip--empty"}
                  />
                ))}
              </div>
            )
          : rolling && stdDice
          ? (
              <div className="msg-media-dice-face msg-media-dice-face--spin" aria-hidden>
                {dicePipCells(3).map((on, i) => (
                  <div
                    key={i}
                    className={on ? "msg-media-dice-pip" : "msg-media-dice-pip msg-media-dice-pip--empty"}
                  />
                ))}
              </div>
            )
          : (
              <span className="msg-media-dice-emoji-lg" aria-hidden>{em}</span>
            )}
        <div className="msg-media-dice-meta">
          <span className="msg-media-card__line">
            {settled ? t("chat.diceValue", { n: value! }) : <span className="msg-media-card__muted">{t("chat.diceRolling")}</span>}
          </span>
          {typeof tonStake === "number" && typeof tonWin === "number" && Number.isFinite(tonStake) && Number.isFinite(tonWin)
            ? (
                <span className="msg-media-card__muted msg-media-card__line">
                  {t("chat.diceTonOutcome", { stake: String(tonStake), win: String(tonWin) })}
                </span>
              )
            : null}
          {settled
            ? (
                <button type="button" className="msg-media-dice-expand" onClick={() => setFullOpen(true)}>
                  {t("chat.uxDiceExpand")}
                </button>
              )
            : null}
        </div>
      </div>

      {fullOpen && settled
        ? (
            <ModalChrome onClose={() => setFullOpen(false)} ariaLabel={t("chat.previewDice")} className="media-modal-backdrop--surface">
              <div className="ux-mock-sheet" data-media-state="full">
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                  {em === "🎯"
                    ? (
                        <>
                          <div className="msg-media-dice-target" style={{ width: 180, height: 180 }}>
                            <span className="msg-media-dice-target-line" aria-hidden />
                          </div>
                          <p style={{ margin: 0, fontWeight: 800 }}>{t("chat.uxDiceBullseye")}</p>
                        </>
                      )
                    : stdDice && pipCells
                    ? (
                        <div className="msg-media-dice-face" style={{ width: 120, height: 120, padding: 16 }} aria-hidden>
                          {pipCells.map((on, i) => (
                            <div
                              key={i}
                              className={on ? "msg-media-dice-pip" : "msg-media-dice-pip msg-media-dice-pip--empty"}
                              style={on ? { width: 14, height: 14 } : undefined}
                            />
                          ))}
                        </div>
                      )
                    : (
                        <>
                          <span className="msg-media-dice-emoji-lg" style={{ fontSize: "4rem" }} aria-hidden>{em}</span>
                          <p style={{ margin: 0, fontWeight: 700 }}>{t("chat.diceValue", { n: value! })}</p>
                        </>
                      )}
                  <Button type="button" variant="ghost" onClick={() => setFullOpen(false)}>
                    {t("chat.imageViewerClose")}
                  </Button>
                </div>
              </div>
            </ModalChrome>
          )
        : null}
    </div>
  )
}

export function UxGameCard({
  game,
  t,
}: {
  game: Api.Game
  t: MessageMediaTranslateFn
}) {
  const [playOpen, setPlayOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [prog, setProg] = useState(0)

  useEffect(() => {
    if (!loading) {
      return
    }
    const id = window.setInterval(() => {
      setProg((p) => {
        if (p >= 100) {
          window.clearInterval(id)
          return 100
        }
        return p + 12
      })
    }, 160)
    const done = window.setTimeout(() => {
      setLoading(false)
      setProg(0)
      setPlayOpen(true)
    }, 900)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(done)
    }
  }, [loading])

  return (
    <div data-media-state={loading ? "loading" : "preview"} className="msg-media msg-media--card msg-media-game" role="group" aria-label={t("chat.previewGame")}>
      <div className="msg-media-game__poster">
        <span className="msg-media-game__badge">{t("chat.uxGameBadge")}</span>
        <div className="msg-media-game__title">{game.title || t("chat.previewGame")}</div>
      </div>
      {game.description
        ? <p className="msg-media-card__line msg-media-card__line--pre">{game.description}</p>
        : null}
      <div className="msg-media-game__actions">
        <button
          type="button"
          className="msg-media-game__btn"
          disabled={loading}
          onClick={() => {
            setLoading(true)
            setProg(8)
          }}
        >
          {loading ? t("chat.uxGameOpening") : t("chat.uxGamePlay")}
        </button>
      </div>
      {loading
        ? (
            <div data-media-state="loading" className="msg-media-game-progress" aria-hidden>
              <span style={{ width: `${prog}%` }} />
            </div>
          )
        : null}

      {playOpen
        ? (
            <ModalChrome onClose={() => setPlayOpen(false)} ariaLabel={game.title || t("chat.previewGame")} className="media-modal-backdrop--surface">
              <div className="ux-mock-sheet" data-media-state="full">
                <div className="ux-mock-game-scene">
                  <div className="ux-mock-game-topbar">
                    <span>{game.title || "Game"}</span>
                    <button type="button" onClick={() => setPlayOpen(false)} style={{ border: "none", background: "none", color: "inherit", cursor: "pointer", font: "inherit" }}>
                      ×
                    </button>
                  </div>
                  <div style={{ padding: "1.25rem", fontSize: "0.85rem", opacity: 0.85 }}>
                    {t("chat.uxGameDecorHint")}
                  </div>
                </div>
                <div style={{ marginTop: "0.65rem", display: "flex", justifyContent: "flex-end" }}>
                  <Button type="button" variant="ghost" onClick={() => setPlayOpen(false)}>
                    {t("chat.imageViewerClose")}
                  </Button>
                </div>
              </div>
            </ModalChrome>
          )
        : null}
    </div>
  )
}

export function UxInvoiceCard({
  inv,
  amountLabel,
  t,
}: {
  inv: Api.MessageMediaInvoice
  amountLabel: string
  t: MessageMediaTranslateFn
}) {
  const [payStage, setPayStage] = useState<"idle" | "charging" | "receipt">("idle")

  useEffect(() => {
    if (payStage !== "charging") {
      return
    }
    const id = window.setTimeout(() => setPayStage("receipt"), 1100)
    return () => window.clearTimeout(id)
  }, [payStage])

  const cardMediaState = payStage === "charging" ? "loading" : payStage === "receipt" ? "full" : "preview"

  return (
    <div
      data-media-state={cardMediaState}
      className="msg-media msg-media--card"
      role="group"
      aria-label={t("chat.previewInvoice")}
    >
      <div className="msg-media-invoice-card">
        <div className="msg-media-invoice-hero" aria-hidden />
        <div className="msg-media-invoice-body">
          <div className="msg-media-card__title">{inv.title || t("chat.previewInvoice")}</div>
          {inv.description ? <p className="msg-media-card__line msg-media-card__line--pre">{inv.description}</p> : null}
          <div className="msg-media-card__line msg-media-card__strong">{amountLabel}</div>
          {inv.startParam ? <p className="msg-media-card__muted">{t("chat.invoiceCompleteInTelegram")}</p> : null}
          <div className="msg-media-invoice-actions">
            <button type="button" className="msg-media-invoice-pay" onClick={() => setPayStage("charging")}>
              {t("chat.uxInvoicePay")}
            </button>
          </div>
        </div>
      </div>

      {payStage === "charging"
        ? (
            <ModalChrome onClose={() => setPayStage("idle")} ariaLabel={t("chat.uxInvoiceCharging")} className="media-modal-backdrop--surface">
              <div className="ux-mock-sheet" data-media-state="loading">
                <div className="ux-mock-sheet__title">{t("chat.uxInvoiceCharging")}</div>
                <div className="ux-mock-spinner" aria-hidden />
                <p style={{ textAlign: "center", margin: 0, fontSize: "0.85rem", opacity: 0.85 }}>{amountLabel}</p>
              </div>
            </ModalChrome>
          )
        : null}
      {payStage === "receipt"
        ? (
            <ModalChrome onClose={() => setPayStage("idle")} ariaLabel={t("chat.uxInvoiceReceipt")} className="media-modal-backdrop--surface">
              <div className="ux-mock-sheet" data-media-state="full">
                <div className="msg-media-receipt">
                  <div className="msg-media-receipt__head">{t("chat.uxInvoiceReceipt")}</div>
                  <div className="msg-media-receipt__row">
                    <span>{inv.title || t("chat.previewInvoice")}</span>
                    <span>{amountLabel}</span>
                  </div>
                  <div className="msg-media-receipt__row">
                    <span>{t("chat.uxInvoiceStatus")}</span>
                    <span>{t("chat.uxInvoicePaid")}</span>
                  </div>
                </div>
                <Button type="button" variant="ghost" onClick={() => setPayStage("idle")}>
                  {t("chat.imageViewerClose")}
                </Button>
              </div>
            </ModalChrome>
          )
        : null}
    </div>
  )
}

export function UxPaidMediaCard({
  starsLabel,
  t,
}: {
  starsLabel: string | null
  t: MessageMediaTranslateFn
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)

  const outerState = galleryOpen ? "full" : confirmOpen ? "loading" : "preview"

  return (
    <div data-media-state={outerState} className="msg-media msg-media--card msg-media-paid" role="group" aria-label={t("chat.previewPaidMedia")}>
      <div className="msg-media-paid__blur" aria-hidden />
      <div className="msg-media-paid__lock" aria-hidden>
        <span className="msg-media-paid__stars">🔒</span>
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="msg-media-card__title">{t("chat.previewPaidMedia")}</div>
        {starsLabel ? <div className="msg-media-card__line msg-media-card__strong">{starsLabel}</div> : null}
        <p className="msg-media-card__muted msg-media-card__hint">{t("chat.paidBundlePlaceholder")}</p>
        <div className="msg-media-paid__strip">
          <button type="button" className="msg-media-paid__btn" onClick={() => setConfirmOpen(true)}>
            {t("chat.uxPaidUnlock")}
          </button>
        </div>
      </div>

      {confirmOpen && !galleryOpen
        ? (
            <ModalChrome onClose={() => setConfirmOpen(false)} ariaLabel={t("chat.uxPaidConfirmTitle")} className="media-modal-backdrop--surface">
              <div className="ux-mock-sheet" data-media-state="loading">
                <div className="ux-mock-sheet__title">{t("chat.uxPaidConfirmTitle")}</div>
                <p style={{ margin: "0 0 0.85rem", fontSize: "0.88rem", lineHeight: 1.4 }}>{t("chat.uxPaidConfirmBody", { amount: starsLabel || "—" })}</p>
                <div style={{ display: "flex", gap: "0.45rem", justifyContent: "flex-end" }}>
                  <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setConfirmOpen(false)
                      setGalleryOpen(true)
                    }}
                  >
                    {t("chat.uxPaidConfirmCta")}
                  </Button>
                </div>
              </div>
            </ModalChrome>
          )
        : null}

      {galleryOpen
        ? (
            <ModalChrome onClose={() => setGalleryOpen(false)} ariaLabel={t("chat.uxPaidGalleryTitle")} className="media-modal-backdrop--surface">
              <div className="ux-mock-sheet" data-media-state="full">
                <div className="ux-mock-sheet__title">{t("chat.uxPaidGalleryTitle")}</div>
                <div className="msg-media-paid-grid" aria-hidden>
                  <div />
                  <div />
                  <div />
                  <div />
                  <div />
                  <div />
                </div>
                <p style={{ marginTop: "0.65rem", fontSize: "0.8rem", opacity: 0.75 }}>{t("chat.uxPaidGalleryHint")}</p>
                <Button type="button" variant="ghost" onClick={() => setGalleryOpen(false)}>
                  {t("chat.imageViewerClose")}
                </Button>
              </div>
            </ModalChrome>
          )
        : null}
    </div>
  )
}

export function UxStoryCard({
  story,
  t,
}: {
  story: Api.MessageMediaStory
  t: MessageMediaTranslateFn
}) {
  const [playerOpen, setPlayerOpen] = useState(false)
  const [expiredOpen, setExpiredOpen] = useState(false)

  return (
    <div data-media-state="preview" className="msg-media msg-media--card" role="group" aria-label={t("chat.previewStory")}>
      <div className="msg-media-story-stub">
        <div className="msg-media-story-stub__inner">
          <div className="msg-media-story-bar" aria-hidden>
            <i />
            <i />
            <i />
          </div>
          <div className="msg-media-card__line">
            {t("chat.storyFrom", { peer: peerLabel(story.peer) })}
            {story.id != null ? ` · #${story.id}` : ""}
          </div>
          <div className="msg-media-story-actions">
            <button type="button" className="msg-media-paid__btn" onClick={() => setPlayerOpen(true)}>
              {t("chat.uxStoryWatch")}
            </button>
            <button type="button" className="msg-media-paid__btn" onClick={() => setExpiredOpen(true)}>
              {t("chat.uxStoryExpiredOpen")}
            </button>
          </div>
        </div>
      </div>
      <a className="msg-media-card__link" href="https://t.me" target="_blank" rel="noopener noreferrer">
        {t("chat.storyOpenInApp")}
      </a>

      {expiredOpen
        ? (
            <ModalChrome onClose={() => setExpiredOpen(false)} ariaLabel={t("chat.uxStoryExpiredTitle")} className="media-modal-backdrop--surface">
              <div className="ux-mock-sheet" data-media-state="loading">
                <div className="ux-mock-sheet__title">{t("chat.uxStoryExpiredTitle")}</div>
                <p style={{ margin: 0, fontSize: "0.88rem" }}>{t("chat.uxStoryExpiredBody")}</p>
                <Button type="button" variant="ghost" onClick={() => setExpiredOpen(false)}>
                  {t("chat.imageViewerClose")}
                </Button>
              </div>
            </ModalChrome>
          )
        : null}

      {playerOpen
        ? (
            <ModalChrome onClose={() => setPlayerOpen(false)} ariaLabel={t("chat.previewStory")} className="media-modal-backdrop--surface">
              <div className="ux-mock-sheet" data-media-state="full" style={{ background: "#0f172a", color: "#f8fafc", padding: "0.65rem", borderRadius: "0.55rem" }}>
                <div className="msg-media-story-bar" aria-hidden style={{ marginBottom: "0.65rem" }}>
                  <i style={{ background: "rgba(255,255,255,.85)" }} />
                  <i />
                  <i />
                </div>
                <div style={{ minHeight: 220, borderRadius: "0.45rem", background: "linear-gradient(180deg,#1e293b,#020617)", display: "grid", placeItems: "center", fontSize: "0.85rem", opacity: 0.85 }}>
                  {t("chat.uxStoryPlayerPlaceholder")}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.65rem", fontSize: "0.78rem", opacity: 0.9 }}>
                  <span>{peerLabel(story.peer)}</span>
                  <span>{t("chat.uxStoryReplyHint")}</span>
                </div>
                <Button type="button" variant="ghost" onClick={() => setPlayerOpen(false)}>
                  {t("chat.imageViewerClose")}
                </Button>
              </div>
            </ModalChrome>
          )
        : null}
    </div>
  )
}

export function UxGiveawayCard({
  g,
  t,
}: {
  g: Api.MessageMediaGiveaway
  t: MessageMediaTranslateFn
}) {
  const [rulesOpen, setRulesOpen] = useState(false)
  const [joined, setJoined] = useState(false)

  const prize = g.prizeDescription?.trim() || t("chat.previewGiveaway")
  const ends = formatUntil(g.untilDate)

  return (
    <div data-media-state={joined ? "loading" : "preview"} className="msg-media msg-media--card" role="group" aria-label={t("chat.previewGiveaway")}>
      <div className="msg-media-giveaway-gift">
        <div className="msg-media-giveaway-icon" aria-hidden>🎁</div>
        <div style={{ minWidth: 0 }}>
          <div className="msg-media-card__title">{t("chat.previewGiveaway")}</div>
          <div className="msg-media-giveaway-prize">{prize}</div>
          <div className="msg-media-giveaway-channels">
            {t("chat.giveawayWinners", { n: g.quantity })}
            {g.channels?.length ? ` · ${g.channels.length} channels` : ""}
          </div>
          <div className="msg-media-giveaway-countdown">{t("chat.uxGiveawayEnds", { date: ends })}</div>
        </div>
      </div>
      <button type="button" className="msg-media-giveaway-btn" onClick={() => setJoined(true)}>
        {t("chat.uxGiveawayTakePart")}
      </button>
      <button type="button" className="msg-media-paid__btn" style={{ marginTop: "0.35rem", width: "100%" }} onClick={() => setRulesOpen(true)}>
        {t("chat.uxGiveawayRules")}
      </button>
      {joined
        ? (
            <p className="msg-media-card__muted" style={{ marginTop: "0.45rem" }}>{t("chat.uxGiveawayJoined")}</p>
          )
        : null}
      <p className="msg-media-card__muted msg-media-card__hint">{t("chat.giveawayViewInTelegram")}</p>

      {rulesOpen
        ? (
            <ModalChrome onClose={() => setRulesOpen(false)} ariaLabel={t("chat.uxGiveawayRules")} className="media-modal-backdrop--surface">
              <div className="ux-mock-sheet" data-media-state="full">
                <div className="ux-mock-sheet__title">{t("chat.uxGiveawayRules")}</div>
                <ul style={{ margin: "0 0 0.85rem", paddingLeft: "1.1rem", fontSize: "0.88rem", lineHeight: 1.45 }}>
                  <li>{t("chat.uxGiveawayRule1")}</li>
                  <li>{t("chat.uxGiveawayRule2")}</li>
                  <li>{t("chat.uxGiveawayRule3")}</li>
                </ul>
                <Button type="button" variant="ghost" onClick={() => setRulesOpen(false)}>
                  {t("chat.imageViewerClose")}
                </Button>
              </div>
            </ModalChrome>
          )
        : null}
    </div>
  )
}

export function UxGiveawayResultsCard({
  g,
  t,
}: {
  g: Api.MessageMediaGiveawayResults
  t: MessageMediaTranslateFn
}) {
  const [phase, setPhase] = useState<"preview" | "drawing" | "won">("preview")

  const chips = useMemo(() => {
    const w = g.winners ?? []
    return w.slice(0, 6).map((id) => String(id))
  }, [g.winners])

  return (
    <div data-media-state={phase === "drawing" ? "loading" : phase === "won" ? "full" : "preview"} className="msg-media msg-media--card" role="group" aria-label={t("chat.previewGiveaway")}>
      <div className="msg-media-giveaway-results-trophy" aria-hidden>🏆</div>
      <div className="msg-media-card__title">{t("chat.uxGiveawayResultsTitle")}</div>
      <p className="msg-media-card__line">{t("chat.giveawayWinners", { n: g.winnersCount })}</p>
      <div className="msg-media-giveaway-winners">
        {chips.map((c) => (
          <span key={c} className="msg-media-giveaway-chip">{c}</span>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.45rem", marginTop: "0.55rem" }}>
        <button type="button" className="msg-media-paid__btn" onClick={() => setPhase("drawing")}>
          {t("chat.uxGiveawayRedraw")}
        </button>
        <button type="button" className="msg-media-invoice-pay" style={{ flex: 1, padding: "0.4rem" }} onClick={() => setPhase("won")}>
          {t("chat.uxGiveawaySimulateWin")}
        </button>
      </div>
      <p className="msg-media-card__muted msg-media-card__hint">{t("chat.giveawayViewInTelegram")}</p>

      {phase === "drawing"
        ? (
            <ModalChrome onClose={() => setPhase("preview")} ariaLabel={t("chat.uxGiveawayDrawing")} className="media-modal-backdrop--surface">
              <div className="ux-mock-sheet" data-media-state="loading">
                <div className="ux-mock-sheet__title">{t("chat.uxGiveawayDrawing")}</div>
                <div className="msg-media-giveaway-dots" aria-hidden>
                  ···
                </div>
                <Button type="button" variant="ghost" onClick={() => setPhase("preview")}>
                  {t("common.cancel")}
                </Button>
              </div>
            </ModalChrome>
          )
        : null}

      {phase === "won"
        ? (
            <ModalChrome onClose={() => setPhase("preview")} ariaLabel={t("chat.uxGiveawayYouWon")} className="media-modal-backdrop--surface">
              <div className="ux-mock-sheet" data-media-state="full">
                <div className="ux-mock-sheet__title">{t("chat.uxGiveawayYouWon")}</div>
                <p style={{ margin: "0 0 0.85rem", fontSize: "0.9rem" }}>{t("chat.uxGiveawayRedeem")}</p>
                <Button type="button" variant="ghost" onClick={() => setPhase("preview")}>
                  {t("chat.imageViewerClose")}
                </Button>
              </div>
            </ModalChrome>
          )
        : null}
    </div>
  )
}

export function UxTodoCard({
  title,
  items,
  completedIds,
  flags,
  t,
}: {
  title: string
  items: Api.TodoItem[]
  completedIds: ReadonlySet<number>
  flags: { append: boolean; complete: boolean }
  t: MessageMediaTranslateFn
}) {
  const total = items.length
  const done = items.filter((it) => completedIds.has(it.id)).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const allDone = total > 0 && done === total

  return (
    <div data-media-state={allDone ? "full" : "preview"} className="msg-media msg-media--card" role="group" aria-label={t("chat.previewTodo")}>
      <div className="msg-media-todo-head">
        <div className="msg-media-card__title">{title}</div>
        <span style={{ fontSize: "0.78rem", opacity: 0.85 }}>{t("chat.uxTodoProgress", { done, total })}</span>
      </div>
      <div className="msg-media-todo-progress" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </div>
      {flags.append || flags.complete
        ? (
            <p className="msg-media-card__muted msg-media-card__hint">
              {t("chat.todoListFlags", {
                append: flags.append ? t("chat.todoOthersAppend") : "—",
                complete: flags.complete ? t("chat.todoOthersComplete") : "—",
              })}
            </p>
          )
        : null}
      <ol className="msg-media-todo-list">
        {items.map((it) => {
          const tx = asTwe(it.title).text || `#${it.id}`
          const isDone = completedIds.has(it.id)
          return (
            <li key={it.id} className={`msg-media-todo-item ${isDone ? "msg-media-todo-item--done" : ""}`.trim()}>
              <span className="msg-media-todo-check" aria-hidden />
              <span>{tx}</span>
            </li>
          )
        })}
      </ol>
      {allDone ? <div className="msg-media-todo-celebrate">{t("chat.uxTodoAllDone")}</div> : null}
    </div>
  )
}

export function UxUnsupportedCard({
  t,
}: {
  t: MessageMediaTranslateFn
}) {
  const [open, setOpen] = useState(false)
  const [checking, setChecking] = useState(false)

  const startCheck = () => {
    setChecking(true)
    window.setTimeout(() => {
      setChecking(false)
      setOpen(true)
    }, 700)
  }

  if (checking) {
    return (
      <div
        data-media-state="loading"
        className="msg-media msg-media--card msg-media--unsupported"
        role="status"
        aria-busy="true"
        data-testid="MessageMediaUnsupportedLoading"
      >
        <div className="msg-media-unsupported-row">
          <span className="msg-media-unsupported-icon msg-media-unsupported-icon--busy" aria-hidden>
            ↓
          </span>
          <div>
            <span className="msg-media-card__title">{t("chat.uxUnsupportedCheckingTitle")}</span>
            <p className="msg-media-card__muted msg-media-card__hint">{t("chat.uxUnsupportedCheckingDesc")}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div data-media-state="preview" className="msg-media msg-media--card msg-media--unsupported" role="status" data-testid="MessageMediaUnsupported">
      <div className="msg-media-unsupported-row">
        <span className="msg-media-unsupported-icon" aria-hidden>⚠️</span>
        <div>
          <span className="msg-media-card__muted">{t("chat.mediaUnsupported")}</span>
          <p className="msg-media-card__muted msg-media-card__hint">{t("chat.mediaUnsupportedHint")}</p>
        </div>
      </div>
      <button type="button" className="msg-media-paid__btn" style={{ marginTop: "0.45rem" }} onClick={startCheck}>
        {t("chat.uxUnsupportedCheck")}
      </button>

      {open
        ? (
            <ModalChrome onClose={() => setOpen(false)} ariaLabel={t("chat.uxUnsupportedUpdateTitle")} className="media-modal-backdrop--surface">
              <div className="ux-mock-sheet" data-media-state="full">
                <div className="ux-mock-sheet__title">{t("chat.uxUnsupportedUpdateTitle")}</div>
                <div className="msg-media-receipt__row">
                  <span>{t("chat.uxUnsupportedThisClient")}</span>
                  <span>{APP_VERSION}</span>
                </div>
                <div className="msg-media-receipt__row">
                  <span>{t("chat.uxUnsupportedExpectedLayer")}</span>
                  <span>{TELEGRAM_LAYER_EXPECTED}</span>
                </div>
                <p style={{ margin: "0.65rem 0", fontSize: "0.82rem", opacity: 0.82 }}>{t("chat.uxUnsupportedLayerHint")}</p>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  {t("chat.imageViewerClose")}
                </Button>
              </div>
            </ModalChrome>
          )
        : null}
    </div>
  )
}
