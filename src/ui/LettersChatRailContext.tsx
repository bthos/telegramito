import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"
import type { Dialog } from "teleproto/tl/custom/dialog"

export type LettersRailDigestProps = {
  dialogs: Dialog[]
  selectedKey: string | null
  onSelect: (d: Dialog, opts?: { focusMessageId?: number }) => void
}

type Ctx = {
  digest: LettersRailDigestProps
  lettersInfoOpen: boolean
  setLettersInfoOpen: Dispatch<SetStateAction<boolean>>
  lettersInfoSlot: ReactNode | null
  setLettersInfoSlot: Dispatch<SetStateAction<ReactNode | null>>
}

const LettersChatRailContext = createContext<Ctx | null>(null)

export function LettersChatRailProvider({
  digest,
  selectedKey,
  children,
}: {
  digest: LettersRailDigestProps
  /** When the active chat changes, close info rail and clear slot. */
  selectedKey: string | null
  children: ReactNode
}) {
  const [lettersInfoOpen, setLettersInfoOpen] = useState(false)
  const [lettersInfoSlot, setLettersInfoSlot] = useState<ReactNode>(null)

  useEffect(() => {
    queueMicrotask(() => {
      setLettersInfoOpen(false)
      setLettersInfoSlot(null)
    })
  }, [selectedKey])

  const value = useMemo(
    (): Ctx => ({
      digest,
      lettersInfoOpen,
      setLettersInfoOpen,
      lettersInfoSlot,
      setLettersInfoSlot,
    }),
    [digest, lettersInfoOpen, lettersInfoSlot],
  )

  return <LettersChatRailContext.Provider value={value}>{children}</LettersChatRailContext.Provider>
}

export function useLettersChatRail(): Ctx {
  const c = useContext(LettersChatRailContext)
  if (!c) {
    throw new Error("useLettersChatRail must be used under LettersChatRailProvider")
  }
  return c
}

/** Wide layout without provider (narrow), or outside Letters flow. */
export function useLettersChatRailOptional(): Ctx | null {
  return useContext(LettersChatRailContext)
}
