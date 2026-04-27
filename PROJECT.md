# Project Configuration

> This file is read by agents and pipeline scripts.

## Project-Specific Configuration

- **Test command:** `npm test`
- **Build command:** `npm run build`
- **Version files:** `package.json`
- **Artifacts directory:** `.artefacts/`

## Project Context

- **What it is:** Static, browser-only Telegram client (MTProto via GramJS) with optional local parental / supervised UI (no first-party backend; session and settings stay on the device).
- **Tech stack:** TypeScript, React 19, Vite 8, GramJS (`telegram`), Vitest, ESLint, i18next; PWA via `vite-plugin-pwa`; single-file production HTML via `vite-plugin-singlefile`.
- **Key conventions:** Functional React; state in `src/context/` (`TelegramContext`, `ParentalContext`); Telegram helpers under `src/telegram/`; parental policy and storage under `src/parental/`; UI under `src/ui/`; unit tests as `src/**/*.test.ts` (Vitest, jsdom). Env: `VITE_TELEGRAM_API_ID`, `VITE_TELEGRAM_API_HASH` (see `.env.example`). License: MIT (`LICENSE`).
