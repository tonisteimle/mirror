/**
 * Draft Prompt Builder + Code Extraction + Splice — pure functions, no deps.
 *
 * Lives outside the studio module tree (no imports from studio/core etc.)
 * so the eval driver and any future Node-only consumer can import these
 * without dragging in browser-only modules.
 */

export interface DraftPromptInput {
  prompt: string | null
  content: string
  fullSource: string
  /** Other token files (.tok) — keyed by filename → file content */
  tokenFiles?: Record<string, string>
  /** Other component files (.com) — keyed by filename → file content */
  componentFiles?: Record<string, string>
}

/**
 * The shipping prompt. All production calls go through this. Tightened
 * after eval surfaced over-invention + non-uniform patterns (commit
 * f8791268) and again after the no-prompt-with-content branch threw the
 * draft content away (commit 1b83bc2b).
 */
export function buildDraftPrompt(input: DraftPromptInput): string {
  const hasContent = input.content.trim().length > 0
  const userInstruction = input.prompt
    ? `User-Anfrage: ${input.prompt}`
    : hasContent
      ? `Korrigiere Syntax-Fehler im Draft-Block und vervollständige fehlende Details — bewahre dabei die User-Intention. Wenn der Draft einen Button "Save" enthält, gib einen Button "Save" zurück (nicht ein anderes Element). Häufige zu behebende Probleme: Tippfehler in Property-Namen, fehlende Kommas, fehlende Quotes um Strings, fehlende \`$\` vor Token-Verweisen (z.B. \`bg primary\` → \`bg $primary\` wenn \`primary\` ein Token ist), falsche Einrückung, CSS-Syntax statt Mirror-Syntax.`
      : 'Generiere neuen Code basierend auf dem Datei-Kontext.'

  const draftContent = hasContent
    ? `\n\nAktueller Inhalt des Draft-Blocks:\n\`\`\`mirror\n${input.content}\n\`\`\``
    : '\n\nDer Draft-Block ist leer — generiere neuen Code basierend auf User-Anfrage und Kontext.'

  const tokenSection = formatProjectFileSection(
    'Token-Dateien (verfügbare $tokens — bevorzugen statt Hex-Werte zu erfinden)',
    input.tokenFiles
  )
  const componentSection = formatProjectFileSection(
    'Komponenten-Dateien (verfügbare Komponenten — wiederverwenden statt neu zu definieren)',
    input.componentFiles
  )

  return `Du bist ein Mirror DSL Code-Generator. Im folgenden Editor-Source markieren \`??\` Zeilen einen "Draft-Block" — den Bereich, der durch deine generierte Code-Antwort ersetzt werden soll.
${tokenSection}${componentSection}
## Editor-Source (aktuelle Datei, mit ?? Markern)
\`\`\`mirror
${input.fullSource}
\`\`\`
${draftContent}

## ${userInstruction}

## ANTWORTFORMAT (kritisch)
- Gib NUR den Mirror-Code zurück, eingeschlossen in einen einzigen \`\`\`mirror Code-Block
- KEIN JSON, KEINE Erklärungen davor oder danach, KEINE \`??\` Marker im Output
- Die Einrückung wird vom Editor automatisch angepasst (relative Einrückung im Code-Block ist OK)
- Wenn Tokens existieren ($name) → nutze sie statt Hex/Pixel-Werte zu erfinden
- Wenn Komponenten existieren → wiederverwenden statt neue parallel zu definieren
- Halte dich strikt an die User-Anfrage — erfinde KEINE zusätzlichen Sub-Labels, Hilfstexte
  oder Inhalte die nicht explizit gefragt wurden. Wenn der User "Switch" sagt, gib einen Switch
  ohne Sub-Beschreibung. "Mehr ist mehr" ist hier falsch — Designer iterieren weiter.
- Bei wiederholten Strukturen (mehrere Sections, Tabs, Cards, Items) → nutze IDENTISCHE
  innere Hierarchie für jede Wiederholung. Wenn Section 1 \`Frame > Text + Wrapper > Control\`
  ist, dann müssen Section 2 und 3 dieselbe Struktur haben — gleiches Spacing, gleicher Wrapper,
  gleiches Visual-Pattern.

Beispiel:
\`\`\`mirror
Frame hor, gap 8
  Button "Speichern", bg $primary
  Button "Abbrechen"
\`\`\`
`
}

function formatProjectFileSection(
  heading: string,
  files: Record<string, string> | undefined
): string {
  if (!files) return ''
  const entries = Object.entries(files).filter(([, content]) => content.trim())
  if (entries.length === 0) return ''

  const blocks = entries
    .map(([name, content]) => `### ${name}\n\`\`\`mirror\n${content}\n\`\`\``)
    .join('\n\n')

  return `\n## ${heading}\n${blocks}\n`
}

/**
 * Extract the first \`\`\`mirror or \`\`\` code block from an AI response.
 * Falls back to the trimmed response if no code block is found but the
 * first line is a recognizable Mirror DSL construct.
 */
export function extractCodeBlock(response: string): string | null {
  if (!response) return null

  const fenceMatch = response.match(/```(?:mirror|mir)?\s*\n([\s\S]*?)\n```/)
  if (fenceMatch) {
    return fenceMatch[1].trim()
  }

  const trimmed = response.trim()
  const firstLine = trimmed.split('\n')[0]
  if (looksLikeMirrorLine(firstLine)) {
    return trimmed
  }

  return null
}

const MIRROR_PRIMITIVES = new Set([
  'Frame',
  'Box',
  'Text',
  'Button',
  'Input',
  'Textarea',
  'Label',
  'Image',
  'Img',
  'Icon',
  'Link',
  'Slot',
  'Divider',
  'Spacer',
  'Header',
  'Nav',
  'Main',
  'Section',
  'Article',
  'Aside',
  'Footer',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'Dialog',
  'Tooltip',
  'Tabs',
  'Tab',
  'Select',
  'Item',
  'Checkbox',
  'Switch',
  'Slider',
  'RadioGroup',
  'RadioItem',
  'DatePicker',
  'Table',
  'Row',
  'Column',
  'Line',
  'Bar',
  'Pie',
  'Donut',
  'Area',
])

function looksLikeMirrorLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (/^canvas\b/.test(trimmed)) return true
  if (/^[a-z][\w]*(?:\.[a-z][\w]*)*\s*:/.test(trimmed)) return true
  const head = trimmed.match(/^([A-Z][A-Za-z0-9]*)/)
  if (!head) return false
  const name = head[1]
  const rest = trimmed.slice(name.length)
  if (rest === '' && MIRROR_PRIMITIVES.has(name)) return true
  if (/:/.test(rest)) return true
  return /["$#(]|\b\d/.test(rest)
}

/**
 * Re-indent a block of code: prefix each non-blank line with `indent`,
 * leave blank lines untouched. Used for splicing AI output into a draft
 * block that lives at some indentation depth.
 */
export function indentBlock(code: string, indent: string): string {
  return code
    .split('\n')
    .map(line => (line.trim() ? indent + line : line))
    .join('\n')
}

/**
 * Replace the `??`-bracketed draft block in `source` with `newContent`.
 *
 * The first `??` line marks the start (its indentation becomes the new
 * block's indentation); the next `??` line marks the end. If only one
 * `??` is present, `newContent` is appended at the end of the source.
 *
 * Pure string operation — no editor state. The production splice in
 * studio/editor/draft-mode.ts goes through CodeMirror because it needs
 * to dispatch a transaction; the eval driver and any other Node-only
 * consumer should call this instead of reimplementing the parse.
 */
export function spliceDraftBlock(source: string, newContent: string): string {
  const lines = source.split('\n')
  let startIdx = -1
  let endIdx = -1
  let indent = ''
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)\?\?(.*)$/)
    if (!m) continue
    if (startIdx === -1) {
      startIdx = i
      indent = m[1]
    } else {
      endIdx = i
      break
    }
  }
  if (startIdx === -1) return source + '\n' + newContent
  const closingIdx = endIdx === -1 ? lines.length - 1 : endIdx
  const indented = indentBlock(newContent, indent)
  return [...lines.slice(0, startIdx), indented, ...lines.slice(closingIdx + 1)].join('\n')
}
