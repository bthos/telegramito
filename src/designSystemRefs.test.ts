import { execFileSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

describe("design system reference paths", () => {
  it("has no legacy design-system path references in src/ or .tlk/features/", () => {
    expect(() => {
      execFileSync(process.execPath, ["scripts/check-ds-refs.mjs"], {
        cwd: root,
        stdio: "pipe",
      })
    }).not.toThrow()
  })
})
