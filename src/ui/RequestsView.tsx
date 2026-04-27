import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Dialog } from "telegram/tl/custom/dialog"
import { useParentalSettings } from "../context/ParentalContext"
import {
  getPendingRequests,
  setPeerAccessState,
  type PeerAccessState,
} from "../parental/storage"
import type { PendingRequest } from "../parental/types"
import { getPeerInfo, isPrivateUserDialog } from "../telegram/dialogUtils"

function getPrivateAccessState(
  key: string,
  allow: ReadonlySet<string>,
  requests: PendingRequest[]
): PeerAccessState {
  if (allow.has(key)) {
    return "allowed"
  }
  const r = requests.find((x) => x.targetId === key)
  if (r?.status === "denied") {
    return "denied"
  }
  return "pending"
}

type RequestsStatusFilter = "all" | PeerAccessState

const STATUS_FILTER_I18N: Record<RequestsStatusFilter, string> = {
  all: "requests.filterAll",
  allowed: "requests.filterAllowed",
  pending: "requests.filterPending",
  denied: "requests.filterDenied",
}

type Props = {
  dialogs: Dialog[]
}

export function RequestsView({ dialogs }: Props) {
  const { t } = useTranslation()
  const { settings, setSettings } = useParentalSettings()
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [statusFilter, setStatusFilter] = useState<RequestsStatusFilter>("all")

  const load = useCallback(async () => {
    setRequests(await getPendingRequests())
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load, settings])

  const allow = new Set(settings.allowlistIds)

  const filteredDialogs = useMemo(() => {
    if (statusFilter === "all") {
      return dialogs
    }
    return dialogs.filter((d) => {
      const p = getPeerInfo(d)
      const isPriv = isPrivateUserDialog(d)
      const rowState: PeerAccessState = isPriv
        ? getPrivateAccessState(p.key, allow, requests)
        : "allowed"
      return rowState === statusFilter
    })
  }, [dialogs, statusFilter, allow, requests])

  const onPick = (d: Dialog, state: PeerAccessState) => {
    if (!isPrivateUserDialog(d)) return
    const p = getPeerInfo(d)
    void (async () => {
      const next = await setPeerAccessState(p.key, p.name, state)
      await setSettings(next)
      await load()
    })()
  }

  if (dialogs.length === 0) {
    return <p className="muted pad">{t("requests.emptyDialogs")}</p>
  }

  const filterKeys: RequestsStatusFilter[] = [
    "all",
    "allowed",
    "pending",
    "denied",
  ]
  return (
    <div className="req-view">
      <div
        className="req-filters"
        role="tablist"
        aria-label={t("requests.filterLabel")}
      >
        {filterKeys.map((f) => {
          const active = statusFilter === f
          return (
            <button
              key={f}
              type="button"
              className={active ? "req-filter__btn is-active" : "req-filter__btn"}
              role="tab"
              aria-selected={active}
              id={`req-filter-${f}`}
              onClick={() => {
                setStatusFilter(f)
              }}
            >
              {t(STATUS_FILTER_I18N[f])}
            </button>
          )
        })}
      </div>
      {filteredDialogs.length === 0 ? (
        <p className="muted pad req-view__empty" role="status">
          {t("requests.emptyFilter")}
        </p>
      ) : (
        <ul className="req-list" role="list">
          {filteredDialogs.map((d) => {
            const p = getPeerInfo(d)
            const isPriv = isPrivateUserDialog(d)
            const rowState: PeerAccessState = isPriv
              ? getPrivateAccessState(p.key, allow, requests)
              : "allowed"

            return (
              <li className="request-row" key={p.key}>
                <span className="request-row__name">{p.name}</span>
                <div
                  className="req-access"
                  role="group"
                  aria-label={t("requests.groupLabel", { name: p.name })}
                >
                  <button
                    type="button"
                    className={
                      rowState === "allowed" ? "req-access__btn is-on" : "req-access__btn"
                    }
                    onClick={() => {
                      onPick(d, "allowed")
                    }}
                    disabled={!isPriv}
                    aria-pressed={rowState === "allowed"}
                    aria-label={t("requests.ariaAllowed")}
                  >
                    ✅
                  </button>
                  <button
                    type="button"
                    className={
                      rowState === "pending" ? "req-access__btn is-on" : "req-access__btn"
                    }
                    onClick={() => {
                      onPick(d, "pending")
                    }}
                    disabled={!isPriv}
                    aria-pressed={rowState === "pending"}
                    aria-label={t("requests.ariaPending")}
                  >
                    ❔
                  </button>
                  <button
                    type="button"
                    className={
                      rowState === "denied" ? "req-access__btn is-on" : "req-access__btn"
                    }
                    onClick={() => {
                      onPick(d, "denied")
                    }}
                    disabled={!isPriv}
                    aria-pressed={rowState === "denied"}
                    aria-label={t("requests.ariaDenied")}
                  >
                    ❌
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
