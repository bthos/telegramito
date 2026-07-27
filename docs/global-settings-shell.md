# Settings

Opening Settings in Telegramito takes you to a dedicated full-page view that sits completely
outside the Letters desk — no masthead strip, no correspondence columns, no mobile tab bar.
It looks and feels like the desk (same terracotta chrome and card styling), but it is its own
independent screen.

## Opening Settings

Two entry points open the global Settings screen:

| Where you are | How to open Settings |
|---|---|
| Any screen (desktop or mobile) | Tap the **Settings** pill in the masthead |
| Letters desk sheet (Стол) | Tap **Settings** inside the desk sheet |

Both routes produce the same full-page Settings screen. There is no longer a narrow settings
column nested inside the desk layout.

## Returning to your chats

To leave Settings and go back to the chat list:

- Tap the **Back** button visible inside the Settings screen, or
- Press the hardware Back button (Android) or Back gesture, or
- Press **Escape** on desktop.

One Back press always returns you to the Chats tab — there is no intermediate "are you sure"
step. Your scroll position and any open chat are preserved, exactly as described in
[docs/back-navigation.md](back-navigation.md).

## PIN lock and parental controls

Settings that require a PIN to unlock behave exactly as they did before. The PIN prompt appears
on top of the Settings screen and, once dismissed, drops you back into Settings rather than all
the way back to chats. Parental control settings (blocking, restrictions) follow the same
locked / unlocked flow as before — nothing in that behaviour has changed.

## Theme

The theme preference defaults to **System** (matches your device's light / dark mode). The theme
picker is on the **Letters desk** (Стол), not inside the Settings screen. That location and the
system default are unchanged.

## Requests

Requests remain inside the desk layout and are not affected by this change.

## Known limitations

- The unsupported-media "open Settings" shortcut does not yet link directly into the Settings
  screen. It will be wired in a future release when that CTA is productized.

---

*Settings is presented in `src/ui/MainShell.tsx` (global shell branch) with the same terracotta
chrome as the in-desk settings column. Styling in `src/styles/tokens-letters.css` (dual-scope
`.app-root--main .settings` / `.app-root--peripheral .settings`). If Settings entry points or
back-navigation behaviour change, update this page to match.*
