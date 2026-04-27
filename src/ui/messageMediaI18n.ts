/** i18n `t` passed into message media / poll / web preview UI */
export type MessageMediaTranslateFn = (
  key: string,
  options?: Record<string, string | number | undefined>
) => string
