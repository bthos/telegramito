// `util` (and other Node shims) read `process` at load time. Must exist before
// any import that transitively loads `util`.
import process from "process"
;(globalThis as typeof globalThis & { process: typeof process }).process = process
