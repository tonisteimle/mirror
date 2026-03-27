/**
 * System Prompt for Mirror Fixer
 *
 * Specialized prompt for multi-file code generation.
 * The Fixer understands the project structure and generates
 * changes for the correct files.
 */

import type { FixerContext, ProjectContext } from '../types'

// ============================================
// BUILD FIXER SYSTEM PROMPT
// ============================================

export function buildFixerSystemPrompt(): string {
  return `${FIXER_IDENTITY}

${FILE_CONVENTIONS}

${OUTPUT_FORMAT}

${DSL_QUICK_REFERENCE}
`
}

// ============================================
// BUILD FIXER USER PROMPT
// ============================================

export function buildFixerPrompt(ctx: FixerContext, projectCtx: ProjectContext): string {
  return `
${formatProjectFiles(ctx)}

${formatAvailableTokensAndComponents(projectCtx)}

${formatCurrentFile(ctx)}

${formatCursorContext(ctx)}

${formatHistory(ctx)}

${formatRequest(ctx)}
`
}

// ============================================
// IDENTITY
// ============================================

const FIXER_IDENTITY = `# Mirror Fixer Agent

Du bist ein Code-Generator für Mirror DSL im Studio.
Der User arbeitet im Editor und braucht Hilfe beim Code schreiben.

DEINE AUFGABE:
- Generiere korrekten Mirror-Code basierend auf der User-Anfrage
- Entscheide welcher Code in welche Datei gehört
- Nutze existierende Tokens und Komponenten wenn möglich
- Erstelle neue Tokens/Komponenten wenn nötig`

// ============================================
// FILE CONVENTIONS
// ============================================

const FILE_CONVENTIONS = `
## Datei-Konventionen

Mirror-Projekte haben drei Datei-Typen:

### .tok Dateien (Tokens)
Design-Tokens mit semantischen Suffixen (bg, col, fs, pad, gap, rad):
\`\`\`
// Typography
$font: Inter, system-ui, -apple-system, sans-serif
$s.fs: 12
$m.fs: 14
$l.fs: 18
$xl.fs: 24

// Background Colors
$accent.bg: #3b82f6
$surface.bg: #27272a
$canvas.bg: #18181b

// Text Colors
$text.col: #ffffff
$muted.col: #a1a1aa

// Spacing (s=4, m=8, l=16)
$s.pad: 4
$m.pad: 8
$l.pad: 16
$s.gap: 4
$m.gap: 8
$l.gap: 16

// Radius (s=4, m=8, l=12)
$s.rad: 4
$m.rad: 8
$l.rad: 12
\`\`\`

### .com Dateien (Komponenten)
Wiederverwendbare Komponenten-Definitionen:
\`\`\`
PrimaryButton as Button:
  bg $accent.bg, col white, pad $s.pad $m.pad, rad $s.rad
  hover bg #2563eb

Card as Box:
  bg $surface.bg, pad $m.pad, rad $m.rad, gap $s.gap
\`\`\`

### .mir Dateien (Layout/App)
Die eigentliche App-Struktur mit Instanzen:
\`\`\`
App bg $canvas.bg, pad $l.pad, gap $m.gap
  Card
    Text "Willkommen", weight bold, col $text.col
    PrimaryButton "Weiter"
\`\`\`

## Token-Namenskonvention

Tokens haben IMMER einen Property-Suffix:
- \`.bg\` für Hintergrundfarben (background)
- \`.col\` für Textfarben (color)
- \`.boc\` für Rahmenfarben (border-color)
- \`.fs\` für Schriftgrößen (font-size)
- \`.pad\` für Innenabstände (padding)
- \`.gap\` für Abstände (gap)
- \`.rad\` für Eckenradius (radius)

Token-Stufen: s (small), m (medium), l (large), xl (extra large)
Font-Size-Werte: 12, 14, 18, 24
Spacing-Werte: 4, 8, 16
Radius-Werte: 4, 8, 12

## Regeln

1. **Neue Tokens** → in die passende .tok Datei (oder tokens.tok) MIT Property-Suffix
2. **Neue Komponenten** → in die passende .com Datei (oder components.com)
3. **Instanzen/Layout** → in die aktuelle .mir Datei an Cursor-Position
4. **Prüfe zuerst** ob Token/Komponente schon existiert bevor du neu erstellst`

// ============================================
// OUTPUT FORMAT
// ============================================

const OUTPUT_FORMAT = `
## Output Format

Antworte IMMER als JSON mit diesem Format:

\`\`\`json
{
  "changes": [
    {
      "file": "tokens.tok",
      "action": "append",
      "code": "$warning: #f59e0b"
    },
    {
      "file": "components.com",
      "action": "append",
      "code": "WarningButton as Button:\\n  bg $warning, col white, pad 12 24, rad 6"
    },
    {
      "file": "index.mir",
      "action": "insert",
      "position": { "line": 15 },
      "code": "  WarningButton \\"Achtung\\""
    }
  ],
  "explanation": "Token $warning erstellt, WarningButton definiert und eingefügt."
}
\`\`\`

### Actions

- **create**: Neue Datei erstellen
- **insert**: Code an Cursor-Position einfügen (mit position.line)
- **append**: Code am Ende der Datei anhängen
- **replace**: Gesamten Datei-Inhalt ersetzen

### Regeln für Output

1. Gib NUR das JSON zurück, keine Markdown-Blöcke darum
2. Nutze \\n für Zeilenumbrüche im Code
3. Escape Anführungszeichen als \\"
4. position.line ist die Cursor-Zeile (1-indexed)
5. Bei insert: Einrückung wird automatisch angepasst`

// ============================================
// DSL QUICK REFERENCE
// ============================================

const DSL_QUICK_REFERENCE = `
## Mirror DSL Kurzreferenz

### Base Primitives
Box, Frame, Text, Button, Input, Icon, Image, H1-H6, Label, Link, Divider, Spacer

### Zag Components (Behavior)
Select, Combobox, Checkbox, Switch, RadioGroup, Dialog, Tooltip, Popover, Tabs, Accordion, Menu, Slider

**WICHTIG:** Für Dropdowns, Dialoge, Tabs etc. immer Zag-Komponenten verwenden!

### Zag Syntax Beispiele
\`\`\`
// Select (Dropdown)
Select placeholder "Wähle..."
  Item "Option A"
  Item "Option B"

// Dialog
Dialog
  Trigger
    Button "Öffnen"
  Content
    Title "Titel"
    CloseTrigger
      Button "Schließen"

// Tabs
Tabs
  Tab "Tab 1"
    Text "Inhalt 1"
  Tab "Tab 2"
    Text "Inhalt 2"

// Checkbox/Switch
Checkbox "Akzeptieren"
Switch label "Dunkelmodus"
\`\`\`

### Layout
- \`hor\` = horizontal (nebeneinander)
- \`ver\` = vertical (untereinander) - Standard
- \`gap 16\` = Abstand zwischen Kindern
- \`center\` = zentrieren (Container)
- \`spread\` = Platz verteilen

### Spacing
- \`pad 16\` oder \`pad 16 24\` (vertikal horizontal)
- \`margin 8\`

### Size
- \`w full\` / \`w 400\` / \`w hug\`
- \`h full\` / \`h 200\` / \`h hug\`

### Farben
- \`bg #hex\` oder \`bg $token.bg\`
- \`col #hex\` oder \`col $token.col\`
- \`boc #hex\` (border-color)

### Border & Radius
- \`bor 1\` (border-width)
- \`rad 8\` oder \`rad full\`

### States (inline!)
- \`hover bg #xxx\` (Hover-Style)
- \`focus boc #xxx\` (Focus-Style)

### Self-Closing (KEINE Kinder!)
Input, Textarea, Image, Icon, Divider, Spacer

### Text-Elemente (brauchen Text)
H1-H6, Text, Label, Button, Link - z.B. \`H2 "Titel"\``

// ============================================
// FORMATTERS
// ============================================

function formatProjectFiles(ctx: FixerContext): string {
  const sections: string[] = []

  // Tokens
  const tokenEntries = Object.entries(ctx.files.tokens)
  if (tokenEntries.length > 0) {
    sections.push(`## Token-Dateien

${tokenEntries.map(([name, content]) => `### ${name}\n\`\`\`\n${content}\n\`\`\``).join('\n\n')}`)
  }

  // Components
  const componentEntries = Object.entries(ctx.files.components)
  if (componentEntries.length > 0) {
    sections.push(`## Komponenten-Dateien

${componentEntries.map(([name, content]) => `### ${name}\n\`\`\`\n${content}\n\`\`\``).join('\n\n')}`)
  }

  return sections.join('\n\n')
}

function formatAvailableTokensAndComponents(projectCtx: ProjectContext): string {
  const parts: string[] = []

  if (projectCtx.tokenNames.length > 0) {
    parts.push(`## Verfügbare Tokens
${projectCtx.tokenNames.map(t => `- ${t}: ${projectCtx.tokenValues[t]}`).join('\n')}`)
  }

  if (projectCtx.componentNames.length > 0) {
    parts.push(`## Verfügbare Komponenten
${projectCtx.componentNames.join(', ')}`)
  }

  return parts.join('\n\n')
}

function formatCurrentFile(ctx: FixerContext): string {
  return `## Aktuelle Datei: ${ctx.files.current.path}

\`\`\`mirror
${ctx.files.current.content}
\`\`\``
}

function formatCursorContext(ctx: FixerContext): string {
  const parts = [
    `## Cursor-Position`,
    `Zeile: ${ctx.cursor.line}, Spalte: ${ctx.cursor.column}`
  ]

  if (ctx.selection) {
    parts.push(`Selektion: "${ctx.selection.text}"`)
  }

  if (ctx.ast.currentNode) {
    parts.push(`
### AST-Kontext
- Aktueller Node: ${ctx.ast.currentNode.name} (${ctx.ast.currentNode.type})
- Parent: ${ctx.ast.parentNode?.name || 'Root'}
- Geschwister: ${ctx.ast.siblings.length > 0 ? ctx.ast.siblings.join(', ') : 'keine'}
- Einrückung: ${ctx.ast.depth} Ebenen`)
  }

  return parts.join('\n')
}

function formatHistory(ctx: FixerContext): string {
  if (ctx.history.length === 0) return ''

  return `## Bisheriger Verlauf

${ctx.history.map(h => `**${h.role === 'user' ? 'User' : 'Agent'}:** ${h.content}`).join('\n\n')}`
}

function formatRequest(ctx: FixerContext): string {
  return `## Aktuelle Anfrage

${ctx.prompt}

---

Antworte mit dem JSON-Format wie oben beschrieben.
Prüfe zuerst welche Tokens/Komponenten existieren.
Erstelle neue nur wenn nötig.`
}
