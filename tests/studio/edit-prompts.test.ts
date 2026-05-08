/**
 * Tests for studio/agent/edit-prompts.ts
 *
 * Mix aus:
 * - Inline-Snapshot-Test für Modus 1 (volle Prompt-Form als Regression-Schutz)
 * - Strukturelle Assertions für die anderen Modi (welche Sections vorhanden sind)
 *
 * Snapshots werden aktualisiert mit `npx vitest --run -u tests/studio/edit-prompts.test.ts`.
 *
 * Siehe: docs/archive/concepts/llm-edit-flow-test-concept.md § 3.1 (edit-prompts), § 4.1 (Snapshots)
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
  siblings: {},
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

        ### Beispiel — eine Änderung in der aktiven Datei (kein @@FILE nötig)

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

        ### Beispiel — Cross-File-Patch (Token in tokens.mir + Use-Site in der aktiven Datei)

        \`\`\`
        @@FILE tokens.mir
        @@FIND
        primary.bg: #2271C1
        @@REPLACE
        primary.bg: #2271C1
        accent.bg: #f59e0b
        @@END
        @@FIND
        Button "Hervorheben", bg red
        @@REPLACE
        Button "Hervorheben", bg $accent
        @@END
        \`\`\`

        \`@@FILE name.mir\` vor einem \`@@FIND\`-Block leitet den Patch in eine andere Datei. Ohne \`@@FILE\` zielt der Patch auf die aktuell aktive Datei (Default). Du darfst nur in EXISTIERENDE Files patchen — neue Files anzulegen ist nicht erlaubt (das macht der User selbst über das Explorer-Panel).

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

    it('selection text is wrapped in a mirror code-fence (not raw)', () => {
      // The LLM needs the selection delimited so it doesn't bleed into
      // adjacent sections. Lock in the fence wrap.
      const prompt = buildEditPrompt(
        baseCtx({ selection: { from: 0, to: 12, text: 'Frame gap 12' } })
      )
      expect(prompt).toMatch(/## User-Selection[\s\S]*?```mirror\nFrame gap 12\n```/)
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

    it('Selection precedes Instruction in the output (lock section order)', () => {
      // Section order matters for the LLM: Selection identifies the
      // primary focus area, then Instruction clarifies the goal. A swap
      // would change the LLM's reading frame.
      const prompt = buildEditPrompt(
        baseCtx({
          instruction: 'mach das responsive',
          selection: { from: 0, to: 12, text: 'Frame gap 12' },
        })
      )
      const idxSel = prompt.indexOf('## User-Selection')
      const idxInst = prompt.indexOf('## User-Anweisung')
      expect(idxSel).toBeGreaterThan(0)
      expect(idxInst).toBeGreaterThan(idxSel)
    })

    it('preserves multi-line instructions verbatim', () => {
      const inst = 'Mach folgende Änderungen:\n1. Padding auf 24\n2. Background auf primary'
      const prompt = buildEditPrompt(baseCtx({ instruction: inst }))
      expect(prompt).toContain(inst)
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
    it('includes a Sibling-Files section when siblings are non-empty (with token content)', () => {
      const prompt = buildEditPrompt(
        baseCtx({
          siblings: { 'tokens.mir': 'primary.bg: #2271C1' },
        })
      )
      expect(prompt).toContain('Sibling-Files')
      expect(prompt).toContain('primary.bg: #2271C1')
      expect(prompt).toContain('tokens.mir')
    })

    it('includes a Sibling-Files section when siblings are non-empty (with component content)', () => {
      const prompt = buildEditPrompt(
        baseCtx({
          siblings: { 'components.mir': 'Card: bg #111' },
        })
      )
      expect(prompt).toContain('Sibling-Files')
      expect(prompt).toContain('Card: bg #111')
    })

    it('omits the Sibling-Files section when siblings are empty', () => {
      const prompt = buildEditPrompt(baseCtx())
      expect(prompt).not.toContain('Sibling-Files')
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

  // -----------------------------------------------------------------------
  // P2 coverage gaps
  // -----------------------------------------------------------------------

  describe('Section ordering invariants', () => {
    it('Source heading precedes Cursor heading precedes Antwort-Format', () => {
      const prompt = buildEditPrompt(baseCtx())
      const idxSrc = prompt.indexOf('## Aktuelle Datei')
      const idxCur = prompt.indexOf('## Cursor-Position')
      const idxFmt = prompt.indexOf('## Antwort-Format')
      expect(idxSrc).toBeGreaterThan(0)
      expect(idxCur).toBeGreaterThan(idxSrc)
      expect(idxFmt).toBeGreaterThan(idxCur)
    })

    it('Diff section appears AFTER User-Anweisung when both are present', () => {
      // Diff is "what user did since last call" — it's context, not the
      // primary directive. It should sit between user-input and the
      // sibling files.
      const prompt = buildEditPrompt(
        baseCtx({
          instruction: 'do X',
          diffSinceLastCall: '@@ -1,1 +1,1 @@\n-A\n+B',
        })
      )
      const idxInst = prompt.indexOf('## User-Anweisung')
      const idxDiff = prompt.indexOf('## Vom User zuletzt geänderte Bereiche')
      expect(idxInst).toBeGreaterThan(0)
      expect(idxDiff).toBeGreaterThan(idxInst)
    })

    it('Sibling-Files section appears AFTER Diff section', () => {
      const prompt = buildEditPrompt(
        baseCtx({
          diffSinceLastCall: '@@ -1,1 +1,1 @@\n-A\n+B',
          siblings: { 'tokens.mir': 'primary.bg: #2271C1' },
        })
      )
      const idxDiff = prompt.indexOf('## Vom User zuletzt geänderte Bereiche')
      const idxSib = prompt.indexOf('Sibling-Files')
      expect(idxDiff).toBeGreaterThan(0)
      expect(idxSib).toBeGreaterThan(idxDiff)
    })

    it('Antwort-Format always comes LAST (rules section terminates the prompt)', () => {
      // Critical: the LLM reads top-to-bottom. The final instruction is
      // "output ONLY patches". Putting anything after Antwort-Format
      // would weaken that signal.
      const prompt = buildEditPrompt(
        baseCtx({
          instruction: 'do X',
          selection: { from: 0, to: 4, text: 'test' },
          diffSinceLastCall: '@@ -1,1 +1,1 @@\n-A\n+B',
          siblings: { 'tokens.mir': 'a.bg: #fff' },
        })
      )
      // Check that the ## Antwort-Format heading is the LAST top-level
      // ## heading in the prompt.
      const headings = [...prompt.matchAll(/^## /gm)].map(m => m.index!)
      const lastHeading = Math.max(...headings)
      const fmtIdx = prompt.indexOf('## Antwort-Format')
      expect(fmtIdx).toBe(lastHeading)
    })
  })

  describe('Edge cases', () => {
    it('empty source still produces a valid prompt with empty code-fence', () => {
      const prompt = buildEditPrompt(baseCtx({ source: '' }))
      // The code-fence opens and closes around the empty source. Two
      // consecutive ```mirror lines would mean the closing fence is
      // present.
      expect(prompt).toContain('```mirror\n\n```')
      // Cursor and rules still present.
      expect(prompt).toContain('Zeile 1, Spalte 1')
      expect(prompt).toMatch(/Anker MUSS unique sein/)
    })

    it('selection containing @@FIND-style markers is preserved verbatim (no escaping)', () => {
      // Risk: if someone selects text that already contains @@FIND/@@END,
      // we would NOT escape it — the LLM must figure out from the heading
      // that this is selection content, not patch output. Lock in the
      // current behavior so a future "let's escape" change is intentional.
      const text = '@@FIND\nBlock\n@@REPLACE\nReplaced\n@@END'
      const prompt = buildEditPrompt(baseCtx({ selection: { from: 0, to: 30, text } }))
      // Selection is wrapped in ```mirror; the @@-tokens must appear inside.
      expect(prompt).toMatch(/## User-Selection[\s\S]*?@@FIND[\s\S]*?@@END/)
    })

    it('multi-byte unicode in source is preserved verbatim', () => {
      const src = 'Frame gap 12\n  Text "Größe 🎯"'
      const prompt = buildEditPrompt(baseCtx({ source: src }))
      expect(prompt).toContain(src)
    })

    it('multiple siblings produce multiple ### file headings within the section', () => {
      const prompt = buildEditPrompt(
        baseCtx({
          siblings: {
            'tokens.mir': 'a.bg: #fff',
            'components.mir': 'Card: bg #111',
          },
        })
      )
      // Both names must appear, both prefixed with `### ` (file sub-heading).
      expect(prompt).toContain('### tokens.mir')
      expect(prompt).toContain('### components.mir')
    })

    it('siblings with whitespace-only content are filtered (no ### heading emitted)', () => {
      // Discovery: prompt-utils.formatProjectFileSection filters those out.
      const prompt = buildEditPrompt(
        baseCtx({
          siblings: {
            'real.mir': 'Frame gap 12',
            'empty.mir': '   \n\n',
          },
        })
      )
      expect(prompt).toContain('### real.mir')
      expect(prompt).not.toContain('### empty.mir')
    })

    it('siblings section is dropped entirely when ALL siblings are whitespace-only', () => {
      const prompt = buildEditPrompt(
        baseCtx({
          siblings: { 'empty.mir': '\n\n' },
        })
      )
      expect(prompt).not.toContain('Sibling-Files')
    })

    it('source is wrapped in ```mirror code-fence (not generic ```)', () => {
      const prompt = buildEditPrompt(baseCtx({ source: 'Frame' }))
      expect(prompt).toContain('```mirror\nFrame\n```')
    })

    it('diff is wrapped in ```diff code-fence (not ```mirror)', () => {
      const prompt = buildEditPrompt(baseCtx({ diffSinceLastCall: '@@ -1,1 +1,1 @@\n-A\n+B' }))
      // The diff fence is a syntax-highlight signal for the LLM —
      // tells it "this is unified-diff, not Mirror source".
      expect(prompt).toContain('```diff\n@@ -1,1 +1,1 @@')
    })
  })

  describe('Critical rules content', () => {
    it('rules 1-8 are all present (no rule silently dropped)', () => {
      // The ruleset is the contract with the LLM. A regression that
      // accidentally drops a rule (e.g. via a bad merge) would silently
      // weaken the LLM's behavior. Lock in the count.
      const prompt = buildEditPrompt(baseCtx())
      // Rule numbers appear at the start of `\d. **`-prefixed lines.
      const ruleHeads = prompt.match(/^\d\. \*\*/gm) ?? []
      expect(ruleHeads).toHaveLength(8)
    })

    it('rule about "Stille ist heilig" (no-op response policy) is present', () => {
      const prompt = buildEditPrompt(baseCtx())
      expect(prompt).toMatch(/Stille ist heilig/)
    })

    it('rule about token-Pflicht is present', () => {
      const prompt = buildEditPrompt(baseCtx())
      expect(prompt).toMatch(/Token-Pflicht/)
    })

    it('@@FILE cross-file syntax is documented in examples', () => {
      const prompt = buildEditPrompt(baseCtx())
      expect(prompt).toContain('@@FILE tokens.mir')
      expect(prompt).toContain('Cross-File-Patch')
    })

    it('forbids creating new files (only existing files can be patched)', () => {
      const prompt = buildEditPrompt(baseCtx())
      // The LLM must NOT invent new files. Lock in the prohibition copy.
      expect(prompt).toMatch(/EXISTIERENDE Files/)
      expect(prompt).toMatch(/neue Files anzulegen ist nicht erlaubt/)
    })
  })
})
