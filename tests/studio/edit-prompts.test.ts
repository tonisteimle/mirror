/**
 * Tests for studio/agent/edit-prompts.ts
 *
 * Mix aus:
 * - Inline-Snapshot-Test für Modus 1 (volle Prompt-Form als Regression-Schutz)
 * - Strukturelle Assertions für die anderen Modi (welche Sections vorhanden sind)
 *
 * Snapshots werden aktualisiert mit `npx vitest --run -u tests/studio/edit-prompts.test.ts`.
 *
 * Siehe: docs/concepts/llm-edit-flow-test-concept.md § 3.1 (edit-prompts), § 4.1 (Snapshots)
 */

import { describe, it, expect } from 'vitest'
import { buildEditPrompt, type EditCaptureCtx } from '../../studio/agent/edit-prompts'

const baseCtx = (overrides: Partial<EditCaptureCtx> = {}): EditCaptureCtx => ({
  source: 'Frame gap 12\n  Text "Hello"',
  fileName: 'app.mir',
  cursor: { line: 1, col: 1 },
  selection: null,
  instruction: null,
  diffSinceLastCall: '',
  projectFiles: { tokens: {}, components: {} },
  ...overrides,
})

describe('EditPrompts — buildEditPrompt', () => {
  describe('Modus 1 — kein Selection, keine Instruction', () => {
    it('renders the full prompt as expected (snapshot)', () => {
      const prompt = buildEditPrompt(baseCtx())
      expect(prompt).toMatchInlineSnapshot(`
        "Du bist eine Mirror-DSL Edit-Engine. Der User hat dich gebeten, den folgenden Mirror-Source zu überarbeiten / ergänzen / korrigieren. Generiere strukturierte Search/Replace-Patches.

        ## Aktuelle Datei (app.mir)

        \`\`\`mirror
        Frame gap 12
          Text "Hello"
        \`\`\`

        ## Cursor-Position

        Zeile 1, Spalte 1

        ## Antwort-Format

        Gib deine Änderungen als Search/Replace-Blöcke zurück:

        \`\`\`
        @@FIND
        <exakter Source-Snippet aus der aktuellen Datei>
        @@REPLACE
        <neuer Mirror-Code>
        @@END
        \`\`\`

        ### Beispiel — eine Änderung

        \`\`\`
        @@FIND
        Button "Speichern", bg #2271C1
        @@REPLACE
        Button "Speichern", bg #2271C1, col white, rad 6
        @@END
        \`\`\`

        ### Beispiel — zwei Änderungen plus Löschung

        \`\`\`
        @@FIND
        Text "Old Title", fs 18
        @@REPLACE
        Text "New Title", fs 24, weight bold
        @@END
        @@FIND
          Text "to be removed"
        @@REPLACE
        @@END
        \`\`\`

        ### Regeln (kritisch)

        1. **Anker MUSS unique sein.** Der \`@@FIND\`-Snippet muss byte-genau (inkl. Whitespace, Einrückung, Anführungszeichen) im Source vorkommen UND er muss EINDEUTIG sein (genau 1× im ganzen File). Bei Mehrdeutigkeit: nimm mehr Kontext-Zeilen drumherum, bis er unique ist.
        2. **Mehrere Patches möglich.** Jeder eigener \`@@FIND/@@REPLACE/@@END\`-Block. Patches werden in der Reihenfolge angewendet, in der du sie schickst.
        3. **Leerer \`@@REPLACE\`** → Löschung der Anker-Stelle.
        4. **Token-Pflicht.** Wenn ein Token mit dem passenden Suffix existiert (z.B. \`primary.bg: #2271C1\`) und der Source einen hardcodeten Wert benutzt der den Token trifft (\`bg #2271C1\`) — DANN ist das ein Idiom-Verstoss und du MUSST per Patch auf \`bg $primary\` umstellen. **Das gilt auch für Einzelwerte in Multi-Value-Properties:** wenn \`m.pad: 12\` existiert und der Source \`pad 12 24\` schreibt, ersetze partiell zu \`pad $m 24\` (nur den passenden Wert tauschen, der andere bleibt hardcoded). Token-Pflicht gilt auch ohne explizite User-Anweisung.
        5. **Component-Pflicht.** Analog für Components: wenn eine Component existiert deren Properties zu einem inline-Element passen, nutze die Component (z.B. \`PrimaryBtn "Save"\` statt \`Button "Save", bg $primary, …\`).
        6. **Redundanz-Pflicht.** Folgende Anti-Patterns musst du immer per Patch beheben (auch ohne explizite Anweisung):
           - **Doppelte Properties** auf einem Element (\`Frame ver, ver\` oder \`Button bg blue, bg red\`) → Duplikat entfernen.
           - **Wrapper-Frames ohne Properties** die nur ein Kind enthalten (\`Frame > Frame > Text\` wo der innere Frame leer ist) → den Wrapper auflösen, das Kind direkt einhängen.
           - **Re-Spezifikation von canvas-vererbten Properties.** \`canvas col white\` macht \`col white\` zum Default für alle Kinder. Ein \`Text "X", col white\` ist redundant. Gilt für \`col\`, \`font\`, \`fs\`. Ausnahme: wenn das Kind bewusst überschreibt (anderer Wert), dann nicht entfernen.
        7. **Wenn der Source bereits richtig/vollständig ist UND keine Idiom-Verstösse enthält** → gib gar keinen Block zurück (Stille ist heilig). „Stille" gilt NUR wenn Token-, Component- und Redundanz-Pflicht erfüllt sind.
        8. **Output: NUR Patches.** Keine Erklärung davor oder danach. Keine Code-Fences (\`\`\`mirror), keine Vorrede, keine Nachrede."
      `)
    })

    it('does not include Selection / Instruction / Diff sections', () => {
      const prompt = buildEditPrompt(baseCtx())
      expect(prompt).not.toContain('## User-Selection')
      expect(prompt).not.toContain('## User-Anweisung')
      expect(prompt).not.toContain('## Vom User zuletzt geänderte Bereiche')
    })
  })

  describe('Modus 2 — mit Selection', () => {
    it('includes a Selection section with the selected text', () => {
      const prompt = buildEditPrompt(
        baseCtx({
          selection: { from: 14, to: 27, text: '  Text "Hello"' },
        })
      )
      expect(prompt).toContain('## User-Selection')
      expect(prompt).toContain('  Text "Hello"')
    })
  })

  describe('Modus 3 — mit Instruction', () => {
    it('includes a User-Anweisung section', () => {
      const prompt = buildEditPrompt(baseCtx({ instruction: 'extrahiere als Card-Komponente' }))
      expect(prompt).toContain('## User-Anweisung')
      expect(prompt).toContain('extrahiere als Card-Komponente')
    })

    it('includes both Instruction and Selection when both are set', () => {
      const prompt = buildEditPrompt(
        baseCtx({
          instruction: 'mach das responsive',
          selection: { from: 0, to: 12, text: 'Frame gap 12' },
        })
      )
      expect(prompt).toContain('## User-Anweisung')
      expect(prompt).toContain('## User-Selection')
    })
  })

  describe('Diff-Section', () => {
    it('includes the diff section when diffSinceLastCall is non-empty', () => {
      const prompt = buildEditPrompt(
        baseCtx({
          diffSinceLastCall: '@@ -1,1 +1,1 @@\n-Frame gap 8\n+Frame gap 12',
        })
      )
      expect(prompt).toContain('## Vom User zuletzt geänderte Bereiche')
      expect(prompt).toContain('-Frame gap 8')
      expect(prompt).toContain('+Frame gap 12')
    })

    it('omits the diff section when diffSinceLastCall is empty', () => {
      const prompt = buildEditPrompt(baseCtx({ diffSinceLastCall: '' }))
      expect(prompt).not.toContain('## Vom User zuletzt geänderte Bereiche')
    })
  })

  describe('Project-Context', () => {
    it('includes Tokens section when tokens are non-empty', () => {
      const prompt = buildEditPrompt(
        baseCtx({
          projectFiles: {
            tokens: { 'app.tok': 'primary.bg: #2271C1' },
            components: {},
          },
        })
      )
      expect(prompt).toContain('## Tokens')
      expect(prompt).toContain('primary.bg: #2271C1')
    })

    it('includes Components section when components are non-empty', () => {
      const prompt = buildEditPrompt(
        baseCtx({
          projectFiles: {
            tokens: {},
            components: { 'a.com': 'Card: bg #111' },
          },
        })
      )
      expect(prompt).toContain('## Components')
      expect(prompt).toContain('Card: bg #111')
    })

    it('omits both Project sections when neither is set', () => {
      const prompt = buildEditPrompt(baseCtx())
      expect(prompt).not.toContain('## Tokens')
      expect(prompt).not.toContain('## Components')
    })
  })

  describe('Always-present elements', () => {
    it('contains at least two patch-format examples', () => {
      const prompt = buildEditPrompt(baseCtx())
      const beispielCount = (prompt.match(/### Beispiel/g) || []).length
      expect(beispielCount).toBeGreaterThanOrEqual(2)
    })

    it('includes the Anker-Uniqueness rule', () => {
      const prompt = buildEditPrompt(baseCtx())
      expect(prompt).toMatch(/Anker MUSS unique sein/)
    })

    it('mandates the @@FIND/@@REPLACE/@@END output format', () => {
      const prompt = buildEditPrompt(baseCtx())
      expect(prompt).toContain('@@FIND')
      expect(prompt).toContain('@@REPLACE')
      expect(prompt).toContain('@@END')
      expect(prompt).toMatch(/NUR Patches/)
    })

    it('provides cursor coordinates explicitly', () => {
      const prompt = buildEditPrompt(baseCtx({ cursor: { line: 17, col: 3 } }))
      expect(prompt).toContain('Zeile 17, Spalte 3')
    })

    it('embeds the source under a heading with the file name', () => {
      const prompt = buildEditPrompt(baseCtx({ fileName: 'login.mir' }))
      expect(prompt).toContain('## Aktuelle Datei (login.mir)')
    })
  })
})
