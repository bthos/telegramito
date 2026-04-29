## Handoff log — full Telegram media & content

### 2026-04-27 Vadavik → Lojma (+ Veles) [spec]

**Spec:** `.artefacts/features/2026-04-27-full-telegram-media/spec.md`  
**Key ACs:** 5 must-have criteria (see §5). **Open questions:** 5 (see §7).  
**Decisions captured:** Phased plan A–E; reference = telegram-react + optional tweb for TL; paid/nested media explicitly in scope; Stars payment UX deferred pending product answer.

Artifacts: `spec.md`, `handoff-log.md`.

## 17:03 Cmok → Bagnik [build]
What was built: Fixed three Laznik-identified code quality issues — redundant effect deps in `useBlob`, fragile inline function in `ChatMessagesVirtualList`, and god-component hook extraction from `ChatView` into three dedicated hooks (`useChatMessages`, `useReadReceipt`, `useChatScroll`). All 112 tests pass; pre-existing TypeScript errors in `availableReactionsCache.test.ts` are unchanged. Changed files: `src/ui/MessageMediaView.tsx`, `src/ui/ChatMessagesVirtualList.tsx`, `src/ui/ChatView.tsx`, `src/hooks/useChatMessages.ts` (new), `src/hooks/useReadReceipt.ts` (new), `src/hooks/useChatScroll.ts` (new), `package.json` (0.0.0→0.0.1). Divergence: `useChatMessages` opts uses `listForViewLengthRef: RefObject<number>` instead of `listForViewLength: number` to avoid circular dependency (listForView derives from list returned by the hook).

## 17:26 Bagnik → Zlydni [code QA pass]
Context: code QA. Result: PASS. Issues: Fixed TS type errors in `src/telegram/availableReactionsCache.test.ts` (number literals not assignable to BigInteger, partial attribute stub not assignable to TypeDocumentAttribute — resolved with `as unknown as` casts). Tests: 112/112 pass. Build: clean (zero TS errors, vite bundle produced). Security: no hardcoded secrets, no PII logging, no plaintext HTTP outbound from new files, no analytics/telemetry, no unapproved external data egress. Safe to commit.
