/** True while the message list has not received its first page yet. */
export function isInitialLoad(listLength: number): boolean {
  return listLength === 0
}
