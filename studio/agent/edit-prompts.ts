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
 * Siehe: docs/archive/concepts/llm-edit-flow.md (Anforderungen),
 *        docs/archive/concepts/llm-edit-flow-plan.md (T2.2)
 */

import { formatProjectFileSection } from './prompt-utils'
import { findSketchBlocks } from './sketch-blocks'

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
  /**
   * Project-Kontext: alle Geschwister-Dateien aus dem Projekt-Root, OHNE
   * die aktive Datei. Multi-File-Roadmap: Mirror unterscheidet keine
   * File-Typen mehr — die LLM sieht alle Files und erkennt am Inhalt was
   * Tokens / Components / Data / Layouts sind. Compliance-Checks
   * (checkTokenCompliance, checkComponentCompliance) parsen jeden Sibling
   * und ziehen sich die relevanten Definitionen selbst raus.
   */
  siblings: Record<string, string>
}

const PATCH_FORMAT_EXAMPLES = `### Beispiel — eine Änderung in der aktiven Datei (kein @@FILE nötig)

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

\`@@FILE name.mir\` vor einem \`@@FIND\`-Block leitet den Patch in eine andere Datei. Ohne \`@@FILE\` zielt der Patch auf die aktuell aktive Datei (Default). Du darfst nur in EXISTIERENDE Files patchen — neue Files anzulegen ist nicht erlaubt (das macht der User selbst über das Explorer-Panel).`

const RULES = `### Regeln (kritisch)

1. **Anker MUSS unique sein.** Der \`@@FIND\`-Snippet muss byte-genau (inkl. Whitespace, Einrückung, Anführungszeichen) im Source vorkommen UND er muss EINDEUTIG sein (genau 1× im ganzen File). Bei Mehrdeutigkeit: nimm mehr Kontext-Zeilen drumherum, bis er unique ist.
2. **Mehrere Patches möglich.** Jeder eigener \`@@FIND/@@REPLACE/@@END\`-Block. Patches werden in der Reihenfolge angewendet, in der du sie schickst.
3. **Leerer \`@@REPLACE\`** → Löschung der Anker-Stelle.
4. **Token-Pflicht.** Wenn ein Token mit dem passenden Suffix existiert (z.B. \`primary.bg: #2271C1\`) und der Source einen hardcodeten Wert benutzt der den Token trifft (\`bg #2271C1\`) — DANN ist das ein Idiom-Verstoss und du MUSST per Patch auf \`bg $primary\` umstellen. **Das gilt auch für Einzelwerte in Multi-Value-Properties:** wenn \`m.pad: 12\` existiert und der Source \`pad 12 24\` schreibt, ersetze partiell zu \`pad $m 24\` (nur den passenden Wert tauschen, der andere bleibt hardcoded). Token-Pflicht gilt auch ohne explizite User-Anweisung.
5. **Component-Pflicht.** Analog für Components: wenn eine Component existiert deren Properties zu einem inline-Element passen, nutze die Component (z.B. \`PrimaryBtn "Save"\` statt \`Button "Save", bg $primary, …\`).
6. **Redundanz-Pflicht.** Folgende Anti-Patterns musst du immer per Patch beheben (auch ohne explizite Anweisung):
   - **Doppelte Properties** auf einem Element (\`Frame ver, ver\` oder \`Button bg blue, bg red\`) → Duplikat entfernen.
   - **Wrapper-Frames ohne Properties** die nur ein Kind enthalten (\`Frame > Frame > Text\` wo der innere Frame leer ist) → den Wrapper auflösen, das Kind direkt einhängen.
   - **Re-Spezifikation von canvas-vererbten Properties.** \`canvas col white\` macht \`col white\` zum Default für alle Kinder. Ein \`Text "X", col white\` ist redundant. Gilt für \`col\`, \`font\`, \`fs\`. Ausnahme: wenn das Kind bewusst überschreibt (anderer Wert), dann nicht entfernen.
7. **Wenn der Source bereits richtig/vollständig ist UND keine Idiom-Verstösse enthält** → gib gar keinen Block zurück (Stille ist heilig). „Stille" gilt NUR wenn Token-, Component- und Redundanz-Pflicht erfüllt sind UND keine Sketch-Blocks (siehe nächste Regel) im Source vorhanden sind.
8. **Sketch-Pflicht.** Sieht der Source einen Block der Form \`--\\n<beliebiger Inhalt>\\n--\` (zwei Zeilen mit nur \`--\`, dazwischen freier Text), ist das ein **User-Sketch**. Der User hat damit explizit signalisiert: „das ist nicht-Mirror, mach echten Code draus." Du MUSST den gesamten Block (einschliesslich beider \`--\`-Marker-Zeilen) per Patch ersetzen — durch Mirror-Code, der die Absicht des Sketches umsetzt. Behalte die Einrückung des öffnenden \`--\` für den ersten Output-Token bei. Sketch-Inhalt kann natürliche Sprache, Pseudocode oder Mischformen sein — interpretiere wohlwollend.
9. **Output: NUR Patches.** Keine Erklärung davor oder danach. Keine Code-Fences (\`\`\`mirror), keine Vorrede, keine Nachrede.`

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

  const sketchBlocks = findSketchBlocks(ctx.source)
  if (sketchBlocks.length > 0) {
    const blockList = sketchBlocks
      .map(
        (b, i) =>
          `### Sketch ${i + 1} (Zeile ${b.startLine}–${b.endLine})\n\n\`\`\`\n${b.text}\n\`\`\``
      )
      .join('\n\n')
    parts.push(`## Sketch-Blocks im Source — Pflicht-Übersetzung

Der User hat ${sketchBlocks.length === 1 ? 'einen Sketch-Block' : `${sketchBlocks.length} Sketch-Blocks`} markiert (\`-- ... --\`). Inhalt ist nicht echtes Mirror — übersetze in echten Mirror-Code und ersetze pro Block die kompletten drei Bestandteile (öffnender \`--\`-Marker, Inhalt, schliessender \`--\`-Marker) durch das Resultat. Behalte die Einrückung der \`--\`-Marker für den ersten Output-Token bei.

${blockList}`)
  }

  const siblingSection = formatProjectFileSection(
    'Sibling-Files (Tokens, Components, Data, andere Layouts — alle wiederverwenden statt neu zu definieren)',
    ctx.siblings
  )
  if (siblingSection) parts.push(siblingSection.trim())

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
