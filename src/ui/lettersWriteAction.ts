export const LETTERS_COMPOSE_TEXTAREA_ID = "letters-compose-textarea"

/** Focus the letters composer once it appears (e.g. after opening a thread). */
export function focusLettersComposer(): void {
  const id = LETTERS_COMPOSE_TEXTAREA_ID
  let attempts = 0
  const maxAttempts = 24

  const tick = () => {
    const el = document.getElementById(id)
    if (el instanceof HTMLTextAreaElement) {
      el.focus()
      return
    }
    attempts += 1
    if (attempts < maxAttempts) {
      requestAnimationFrame(tick)
    }
  }

  requestAnimationFrame(tick)
}
