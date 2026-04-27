// The npm `util` polyfill exposes `inspect` but not `inspect.custom`. GramJS
// defines `[util.inspect.custom]()` on classes; without the symbol, evaluation
// can fail when that property is read.
import { inspect } from "util"

const fn = inspect
if (typeof fn === "function" && (fn as { custom?: symbol }).custom == null) {
  ;(fn as { custom: symbol }).custom = Symbol.for("nodejs.util.inspect.custom")
}
