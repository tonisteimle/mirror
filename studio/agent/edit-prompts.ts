/**
 * Prompt-Builder für den LLM-Edit-Flow.
 *
 * Erzeugt aus einem `EditCaptureCtx` einen vollständigen Prompt-String,
 * den `fixer.runEdit()` an die Bridge weitergibt. Die Antwort kommt im
 * Search/Replace-Format zurück (siehe `patch-format.ts`).
 *
 * Drei Modi:
 *   1. Cmd+Enter ohne Selection (`selection === null`, `instruction === null`)
 *   2. Cmd+Enter mit Selection
 *   3. Cmd+Shift+Enter (mit `instruction`, optional Selection)
 *
 * Siehe: docs/concepts/llm-edit-flow.md (Anforderungen),
 *        docs/concepts/llm-edit-flow-plan.md (T2.2)
 */

import { formatProjectFileSection } from './prompt-utils'

export interface EditCaptureCtx {
  /** Vollständiger Source der aktuellen Datei. */
  source: string
  /** Datei-Identifier (für die Heading im Prompt). */
  fileName: string
  /** Cursor-Position (1-basiert). */
  cursor: { line: number; col: number }
  /** Aktive Selection oder `null`. */
  selection: { from: number; to: number; text: string } | null
  /** Optional: User-Anweisung (Modus 3). `null` für Modi 1 und 2. */
  instruction: string | null
  /** Diff seit letztem LLM-Call (kann leer sein). */
  diffSinceLastCall: string
  /** Project-Kontext: Token- und Component-Dateien aus anderen Files. */
  projectFiles: {
    tokens: Record<string, string>
    components: Record<string, string>
  }
}

const PATCH_FORMAT_EXAMPLES = `### Beispiel — eine Änderung

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
\`\`\``

const RULES = `### Regeln (kritisch)

1. **Anker MUSS unique sein.** Der \`@@FIND\`-Snippet muss byte-genau (inkl. Whitespace, Einrückung, Anführungszeichen) im Source vorkommen UND er muss EINDEUTIG sein (genau 1× im ganzen File). Bei Mehrdeutigkeit: nimm mehr Kontext-Zeilen drumherum, bis er unique ist.
2. **Mehrere Patches möglich.** Jeder eigener \`@@FIND/@@REPLACE/@@END\`-Block. Patches werden in der Reihenfolge angewendet, in der du sie schickst.
3. **Leerer \`@@REPLACE\`** → Löschung der Anker-Stelle.
4. **Wenn der Source bereits richtig/vollständig ist** → gib gar keinen Block zurück (Stille ist heilig).
5. **Output: NUR Patches.** Keine Erklärung davor oder danach. Keine Code-Fences (\`\`\`mirror), keine Vorrede, keine Nachrede.`

export function buildEditPrompt(ctx: EditCaptureCtx): string {
  const parts: string[] = []

  parts.push(
    `Du bist eine Mirror-DSL Edit-Engine. Der User hat dich gebeten, den folgenden Mirror-Source zu überarbeiten / ergänzen / korrigieren. Generiere strukturierte Search/Replace-Patches.`
  )

  parts.push(`## Aktuelle Datei (${ctx.fileName})

\`\`\`mirror
${ctx.source}
\`\`\``)

  parts.push(`## Cursor-Position

Zeile ${ctx.cursor.line}, Spalte ${ctx.cursor.col}`)

  if (ctx.selection) {
    parts.push(`## User-Selection

Der User hat folgenden Bereich markiert (fokussiere primär hier — du darfst aber auch ausserhalb ändern, wenn nötig):

\`\`\`mirror
${ctx.selection.text}
\`\`\``)
  }

  if (ctx.instruction) {
    parts.push(`## User-Anweisung

${ctx.instruction}`)
  }

  if (ctx.diffSinceLastCall) {
    parts.push(`## Vom User zuletzt geänderte Bereiche (seit letztem AI-Call)

\`\`\`diff
${ctx.diffSinceLastCall}
\`\`\``)
  }

  const tokenSection = formatProjectFileSection(
    'Tokens (verfügbar als $name)',
    ctx.projectFiles.tokens
  )
  const componentSection = formatProjectFileSection(
    'Components (verfügbar — wiederverwenden statt neu definieren)',
    ctx.projectFiles.components
  )
  if (tokenSection) parts.push(tokenSection.trim())
  if (componentSection) parts.push(componentSection.trim())

  parts.push(`## Antwort-Format

Gib deine Änderungen als Search/Replace-Blöcke zurück:

\`\`\`
@@FIND
<exakter Source-Snippet aus der aktuellen Datei>
@@REPLACE
<neuer Mirror-Code>
@@END
\`\`\`

${PATCH_FORMAT_EXAMPLES}

${RULES}`)

  return parts.join('\n\n')
}
