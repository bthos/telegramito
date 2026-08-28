import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * AC-T3 (migrate-teleproto): zero remaining `from "telegram"` / `from
 * 'telegram/...'` specifiers under `src/` (imports, `vi.mock(...)` string
 * literals, and inline type-only `import("telegram")` expressions).
 *
 * F6 (Bagnik, test-gate finding): this test must live under `src/` —
 * `vite.config.ts`'s `test.include` is `["src/**\/*.test.ts", "src/**\/*.test.tsx"]`,
 * so a file under `scripts/` (as the original tech-plan draft named it) would
 * never be collected and this AC would silently go unguarded.
 *
 * Scope: `src/` only. `vendor/gramjs/**` (the submodule being retired, not
 * migrated) legitimately still says `"telegram"` internally and is out of
 * scope (G3 / tech-plan §11).
 */

const TELEGRAM_SPECIFIER_RE =
  /(?:from\s+|vi\.mock\(\s*|import\()(["'])telegram(?:\/[^"']*)?\1/

function walk(dir: string, files: string[]): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, files)
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full)
    }
  }
  return files
}

describe("no remaining GramJS (\"telegram\") imports under src/", () => {
  it("has zero from/vi.mock/import(...) specifiers naming the retired telegram package", () => {
    const selfPath = fileURLToPath(import.meta.url)
    const srcDir = path.resolve(path.dirname(selfPath), "..")
    const files = walk(srcDir, [])
    const offenders: string[] = []
    for (const file of files) {
      // Skip this file itself — its own doc comment necessarily quotes the
      // patterns it's guarding against, which would otherwise self-match.
      if (file === selfPath) continue
      const content = fs.readFileSync(file, "utf8")
      if (TELEGRAM_SPECIFIER_RE.test(content)) {
        offenders.push(path.relative(srcDir, file))
      }
    }
    expect(offenders).toEqual([])
  })
})
