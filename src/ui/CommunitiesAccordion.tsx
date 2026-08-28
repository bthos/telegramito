import { useId, useState } from "react"
import { useTranslation } from "react-i18next"
import { ChevronDownIcon } from "./ChatChromeIcons"
import { CommunityRow } from "./CommunityRow"
import { CommunityLimitationSheet } from "./CommunityLimitationSheet"
import type { CommunityStub } from "../telegram/communityDialogs"

/**
 * communities-dialogs (AC-C2 / AC-C6 / AC-C7): a self-contained "Communities"
 * accordion for the Letters sidebar. Renders nothing when there are no
 * communities (the dormant-until-delivered default, OQ-C3). Independent of the
 * main sidebar section machinery so it can never perturb the chat list.
 */
export function CommunitiesAccordion({
  communities,
}: {
  communities: CommunityStub[]
}) {
  const { t } = useTranslation()
  const uid = useId()
  const headId = `${uid}-communities-h`
  const panelId = `${uid}-communities-panel`
  const [open, setOpen] = useState(true)
  const [sheetStub, setSheetStub] = useState<CommunityStub | null>(null)

  if (communities.length === 0) {
    return null
  }

  return (
    <>
      <button
        type="button"
        id={headId}
        className="letters-aside-accordion__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="letters-passages__label">
          <span className="letters-passages__glyph" aria-hidden>
            ⌂
          </span>
          {t("letters.communities.sectionLabel")}
        </span>
        <span className="community-accordion__count" aria-hidden>
          {communities.length}
        </span>
        <ChevronDownIcon
          className={`letters-aside-accordion__chev${open ? " is-expanded" : ""}`}
          aria-hidden
        />
      </button>
      <div
        id={panelId}
        role="region"
        aria-label={t("letters.communities.sectionLabel")}
        className="letters-aside-accordion__panel"
        hidden={!open}
      >
        <ul className="community-accordion__list">
          {communities.map((c) => (
            <li key={c.id}>
              <CommunityRow stub={c} onOpen={setSheetStub} />
            </li>
          ))}
        </ul>
      </div>
      <CommunityLimitationSheet stub={sheetStub} onClose={() => setSheetStub(null)} />
    </>
  )
}
