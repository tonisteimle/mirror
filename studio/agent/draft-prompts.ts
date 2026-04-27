/**
 * Draft Prompt Builders + Code Extraction — pure functions, no dependencies.
 *
 * Extracted from fixer.ts so the eval driver can import these without dragging
 * in the full studio/agent module tree (which transitively pulls studio/core
 * and other browser-only modules). Production code in fixer.ts re-exports.
 *
 * Keep this file dependency-free.
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

export type DraftPromptBuilder = (input: DraftPromptInput) => string

/**
 * Registry of named draft prompt variants. The eval driver can pick a
 * non-default variant via `window.__draftPromptVariant`. Production always
 * uses 'current'.
 */
export const DRAFT_PROMPT_VARIANTS: Record<string, DraftPromptBuilder> = {
  current: buildDraftPromptCurrent,
}

export function resolveDraftPromptBuilder(name?: string): DraftPromptBuilder {
  if (!name || !(name in DRAFT_PROMPT_VARIANTS)) return DRAFT_PROMPT_VARIANTS.current
  return DRAFT_PROMPT_VARIANTS[name]
}

export function listDraftPromptVariants(): string[] {
  return Object.keys(DRAFT_PROMPT_VARIANTS)
}

/**
 * The shipping prompt. All production calls go through this. Tightened from
 * the original after eval surfaced over-invention + non-uniform patterns
 * (see commit f8791268).
 */
export function buildDraftPromptCurrent(input: DraftPromptInput): string {
  const userInstruction = input.prompt
    ? `User-Anfrage: ${input.prompt}`
    : 'Vervollständige oder korrigiere den Code im Draft-Block basierend auf dem Kontext.'

  const draftContent = input.content.trim()
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
 * Falls back to the trimmed response if no code block is found but the first
 * line is a recognizable Mirror DSL construct.
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
