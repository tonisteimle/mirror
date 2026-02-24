/**
 * Generate tutorial.html from structured JSON
 * Run with: npx tsx scripts/generate-docu.ts
 */

import { readFileSync, writeFileSync } from 'fs'

interface ContentBlock {
  type: 'paragraph' | 'code' | 'exercise' | 'list' | 'note' | 'heading'
  text?: string
  code?: string
  task?: string
  items?: string[]
}

interface Subsection {
  id: string
  title: string
  content: ContentBlock[]
}

interface Section {
  id: string
  title: string
  lead?: string
  subsections: Subsection[]
}

interface Documentation {
  title: string
  version: string
  sections: Section[]
}

// HTML entity encoding for data-code attributes
function encodeForAttribute(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '&#10;')
}

// Generate sidebar navigation
function generateSidebar(sections: Section[]): string {
  const links = sections.map(section => {
    const label = getSidebarLabel(section.id, section.title)
    return `      <a href="#${section.id}">${label}</a>`
  }).join('\n')

  return `  <!-- Sidebar Navigation -->
  <nav class="sidebar">
    <div class="sidebar-header">
      <a href="#" class="sidebar-logo">Mirror</a>
    </div>
    <div class="sidebar-nav">
${links}
    </div>
  </nav>`
}

// Short labels for sidebar
function getSidebarLabel(id: string, title: string): string {
  const labels: Record<string, string> = {
    'idea': 'Introduction',
    'components': 'Components',
    'syntax-shortcuts': 'Shortcuts',
    'tokens': 'Tokens',
    'typography': 'Typography',
    'text': 'Text',
    'layout-basics': 'Layout',
    'forms': 'Forms',
    'interactivity': 'Interactivity',
    'instances': 'Instances',
    'overlays': 'Overlays',
    'animationen': 'Animations',
    'variables': 'Variables',
    'conditions': 'Conditions',
    'lists': 'Lists',
    'data-tab': 'Data Tab',
    'interaction': 'Interaction',
    'component-library': 'Component Library',
    'reference': 'Reference',
  }
  return labels[id] || title
}

// Generate sidebar with optional external links
function generateSidebarWithExternalLinks(sections: Section[], externalLinks?: { href: string; label: string }[], showSubsections?: boolean): string {
  const links: string[] = []

  for (const section of sections) {
    const label = getSidebarLabel(section.id, section.title)
    links.push(`      <a href="#${section.id}">${label}</a>`)

    // Add subsection links if requested
    if (showSubsections && section.subsections) {
      for (const sub of section.subsections) {
        const subId = sub.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')
        links.push(`      <a href="#${subId}" class="subsection">${sub.title}</a>`)
      }
    }
  }

  // Add external links (like Component Library)
  if (externalLinks) {
    for (const ext of externalLinks) {
      links.push(`      <a href="${ext.href}">${ext.label}</a>`)
    }
  }

  return `  <!-- Sidebar Navigation -->
  <nav class="sidebar">
    <div class="sidebar-header">
      <a href="#" class="sidebar-logo">Mirror</a>
    </div>
    <div class="sidebar-nav">
${links.join('\n')}
    </div>
  </nav>`
}

// Component Library prelude (tokens + component definitions)
// This is prepended to all code examples in the Component Library section
const COMPONENT_LIBRARY_PRELUDE = `[tokens]
$primary: #2271c1
$primary-hover: #1d5ba0
$primary-dark: #174a83
$secondary: #27272a
$secondary-hover: #3f3f46
$danger: #ef4444
$danger-hover: #dc2626
$success: #22c55e
$success-hover: #16a34a
$warning: #f59e0b
$warning-hover: #d97706
$info: #3b82f6
$info-hover: #2563eb
$surface: #0f0f12
$surface-raised: #18181b
$surface-overlay: #1f1f23
$surface-elevated: #27272a
$border: #27272a
$border-subtle: #1f1f23
$border-strong: #3f3f46
$text: #f4f4f5
$text-muted: #a1a1aa
$text-subtle: #71717a
$text-inverse: #18181b
$space-xs: 4
$space-sm: 8
$space-md: 12
$space-lg: 16
$space-xl: 24
$space-2xl: 32
$space-3xl: 48
$radius-sm: 4
$radius-md: 8
$radius-lg: 12
$radius-xl: 16
$radius-full: 9999
$text-xs: 12
$text-sm: 14
$text-md: 16
$text-lg: 18
$text-xl: 20
$text-2xl: 24
$text-3xl: 32

[components]
Button: hor ver-cen gap $space-sm pad $space-md $space-lg rad $radius-md cursor pointer col white
  state hover
    opacity 0.9
  state active
    opacity 0.8
  state disabled
    opacity 0.5
    cursor not-allowed

PrimaryButton from Button: bg $primary
  state hover
    bg $primary-hover

SecondaryButton from Button: bg $secondary
  state hover
    bg $secondary-hover

DangerButton from Button: bg $danger
  state hover
    bg $danger-hover

SuccessButton from Button: bg $success
  state hover
    bg $success-hover

OutlineButton from Button: bg transparent bor 1 $primary col $primary
  state hover
    bg $primary
    col white

GhostButton from Button: bg transparent col $text
  state hover
    bg $secondary

IconButton: w 40 h 40 rad $radius-md bg $secondary cen cursor pointer
  state hover
    bg $secondary-hover
  state active
    opacity 0.8

InputBase: pad $space-md $space-lg bg $surface-raised bor 1 $border rad $radius-md col $text
  state focus
    bor 1 $primary
  state disabled
    opacity 0.5
    cursor not-allowed

TextInput from InputBase: placeholder "Enter text..."
EmailInput from InputBase: placeholder "email@example.com" type email
PasswordInput from InputBase: placeholder "Password" type password
SearchInput from InputBase: placeholder "Search..."

TextareaBase: pad $space-md bg $surface-raised bor 1 $border rad $radius-md col $text rows 4
  state focus
    bor 1 $primary

Card: ver gap $space-lg pad $space-xl bg $surface-raised rad $radius-lg
  Header: hor between ver-cen
  Title: size $text-lg weight 600 col $text
  Description: size $text-sm col $text-muted
  Content: ver gap $space-md
  Footer: hor gap $space-md hor-r

Container: ver gap $space-xl pad $space-xl maxw 1200 mar 0 auto
Section: ver gap $space-lg
Row: hor gap $space-md ver-cen
Stack: ver gap $space-md

Divider: h 1 bg $border w full

NavItem: pad $space-md $space-lg rad $radius-md cursor pointer col $text-muted
  state hover
    bg $surface-overlay
    col $text
  state active
    bg $primary
    col white

TabItem: pad $space-md $space-lg cursor pointer col $text-muted bor b 2 transparent
  state hover
    col $text
  state active
    col $primary
    bor b 2 $primary

Badge: pad $space-xs $space-sm rad $radius-full size $text-xs weight 500

PrimaryBadge from Badge: bg $primary col white
SecondaryBadge from Badge: bg $secondary col $text
DangerBadge from Badge: bg $danger col white
SuccessBadge from Badge: bg $success col white
WarningBadge from Badge: bg $warning col $text-inverse

Alert: hor gap $space-md pad $space-lg rad $radius-md ver-cen
  Icon: size 20
  Content: ver gap $space-xs grow
    Title: weight 600
    Message: size $text-sm

InfoAlert from Alert: bg #1e3a5f bor 1 $info
  Icon col $info
  Title col $info
  Message col $text-muted

SuccessAlert from Alert: bg #14532d bor 1 $success
  Icon col $success
  Title col $success
  Message col $text-muted

WarningAlert from Alert: bg #422006 bor 1 $warning
  Icon col $warning
  Title col $warning
  Message col $text-muted

DangerAlert from Alert: bg #450a0a bor 1 $danger
  Icon col $danger
  Title col $danger
  Message col $text-muted
`

// Extract relevant prelude for a code example
function extractRelevantPrelude(code: string, fullPrelude: string): string {
  // Find all tokens used in the code (e.g., $primary, $space-md)
  const tokenMatches = code.match(/\$[a-zA-Z][a-zA-Z0-9-]*/g) || []
  const usedTokens = [...new Set(tokenMatches)]

  // Find all component types used (capitalized words that might be components)
  const componentMatches = code.match(/\b[A-Z][a-zA-Z]*(?:Button|Input|Card|Alert|Badge|Item|Base)?\b/g) || []
  const usedComponents = [...new Set(componentMatches)]

  // Parse the full prelude
  const lines = fullPrelude.split('\n')
  const relevantLines: string[] = []
  let inRelevantComponent = false
  let componentIndent = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Section headers
    if (trimmed === '[tokens]' || trimmed === '[components]') {
      if (relevantLines.length > 0 && relevantLines[relevantLines.length - 1] !== '') {
        relevantLines.push('')
      }
      relevantLines.push(trimmed)
      inRelevantComponent = false
      continue
    }

    // Token definition
    if (trimmed.startsWith('$') && trimmed.includes(':')) {
      const tokenName = trimmed.split(':')[0].trim()
      if (usedTokens.includes(tokenName)) {
        relevantLines.push(trimmed)
      }
      continue
    }

    // Component definition start
    const componentMatch = trimmed.match(/^([A-Z][a-zA-Z]*)(?: from [A-Z][a-zA-Z]*)?:/)
    if (componentMatch) {
      const componentName = componentMatch[1]
      const parentMatch = trimmed.match(/from ([A-Z][a-zA-Z]*)/)
      const parentName = parentMatch ? parentMatch[1] : null

      // Include if component or its parent is used
      if (usedComponents.includes(componentName) || (parentName && usedComponents.includes(parentName))) {
        inRelevantComponent = true
        componentIndent = line.search(/\S/)
        relevantLines.push(line)
      } else {
        inRelevantComponent = false
      }
      continue
    }

    // Inside a relevant component definition
    if (inRelevantComponent) {
      const currentIndent = line.search(/\S/)
      if (trimmed === '' || currentIndent > componentIndent) {
        relevantLines.push(line)
      } else {
        inRelevantComponent = false
      }
    }
  }

  // Clean up: remove empty sections, consecutive blank lines
  const cleaned: string[] = []
  let lastWasBlank = false
  let hasTokens = false
  let hasComponents = false

  for (const line of relevantLines) {
    if (line === '[tokens]') hasTokens = true
    if (line === '[components]') hasComponents = true

    if (line.trim() === '') {
      if (!lastWasBlank) cleaned.push('')
      lastWasBlank = true
    } else {
      cleaned.push(line)
      lastWasBlank = false
    }
  }

  // Remove [tokens] or [components] if they have no content
  let result = cleaned.join('\n').trim()

  // Remove empty sections
  result = result.replace(/\[tokens\]\s*\n\s*\[components\]/g, '[components]')
  result = result.replace(/\[tokens\]\s*$/g, '')
  result = result.replace(/\[components\]\s*$/g, '')

  return result
}

// Generate content block HTML
function generateContentBlock(block: ContentBlock, prelude?: string, inlinePrelude?: boolean): string {
  switch (block.type) {
    case 'heading':
      return `      <h4>${block.text}</h4>\n`

    case 'paragraph':
      // Check if this is an h4 heading (stored as **text**)
      if (block.text?.startsWith('**') && block.text?.endsWith('**')) {
        const title = block.text.slice(2, -2)
        return `      <h4>${title}</h4>\n`
      }
      return `      <p>${block.text}</p>\n`

    case 'code':
      let finalCode = block.code || ''
      if (prelude && inlinePrelude) {
        // Extract only relevant parts of prelude and prepend to code
        const relevantPrelude = extractRelevantPrelude(finalCode, prelude)
        if (relevantPrelude) {
          finalCode = relevantPrelude + '\n\n[page]\n' + finalCode
        }
      }
      const preludeAttr = (prelude && !inlinePrelude) ? ` data-prelude="${encodeForAttribute(prelude)}"` : ''
      return `      <div class="mirror-editor" data-code="${encodeForAttribute(finalCode)}"${preludeAttr}></div>\n`

    case 'exercise':
      let exerciseCode = block.code || ''
      if (prelude && inlinePrelude && block.code) {
        const relevantPrelude = extractRelevantPrelude(exerciseCode, prelude)
        if (relevantPrelude) {
          exerciseCode = relevantPrelude + '\n\n[page]\n' + exerciseCode
        }
      }
      const exercisePreludeAttr = (prelude && !inlinePrelude) ? ` data-prelude="${encodeForAttribute(prelude)}"` : ''
      return `      <div class="exercise">
        <div class="exercise-label">Try it</div>
        <p class="exercise-task">${block.task}</p>
        ${block.code ? `<div class="mirror-editor" data-code="${encodeForAttribute(exerciseCode)}"${exercisePreludeAttr}></div>` : ''}
      </div>\n`

    case 'list':
      const items = (block.items || []).map(item => `        <li>${item}</li>`).join('\n')
      return `      <ul>\n${items}\n      </ul>\n`

    case 'note':
      return `      <div class="highlight-box">
        <p>${block.text}</p>
      </div>\n`

    default:
      return ''
  }
}

// Generate subsection HTML
function generateSubsection(subsection: Subsection, prelude?: string, inlinePrelude?: boolean): string {
  // Generate ID from title if not provided
  const generatedId = subsection.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')
  const id = subsection.id || generatedId
  const content = subsection.content.map(block => generateContentBlock(block, prelude, inlinePrelude)).join('\n')

  return `      <h3 id="${id}">${subsection.title}</h3>

${content}`
}

// Generate section HTML
function generateSection(section: Section, inlinePrelude?: boolean): string {
  const lead = section.lead
    ? `      <p class="lead">${section.lead}</p>\n`
    : ''

  // Use Component Library prelude for component-library section
  const prelude = section.id === 'component-library' ? COMPONENT_LIBRARY_PRELUDE : undefined
  const subsections = section.subsections.map(sub => generateSubsection(sub, prelude, inlinePrelude)).join('\n')

  return `    <!-- ${section.title.toUpperCase()} -->
    <section class="concept" id="${section.id}">
      <h2>${section.title}</h2>
${lead}
${subsections}
    </section>`
}

// CSS styles - cleaned and organized with CSS variables
const CSS_STYLES = `    /* ==========================================================================
       CSS Variables
       ========================================================================== */
    :root {
      /* Colors */
      --color-bg: #111;
      --color-bg-darker: #0a0a0a;
      --color-bg-code: #0d0d0d;
      --color-surface: #1a1a1a;
      --color-border: #222;
      --color-border-light: #252525;

      --color-text: #777;
      --color-text-muted: #555;
      --color-text-subtle: #444;
      --color-text-light: #888;
      --color-text-bright: #aaa;
      --color-text-heading: #fff;
      --color-text-title: #eee;

      --color-accent: #2271c1;
      --color-accent-light: #5ba8f5;
      --color-string: #a88;
      --color-value: #b96;

      /* Spacing */
      --space-xs: 4px;
      --space-sm: 8px;
      --space-md: 12px;
      --space-lg: 16px;
      --space-xl: 24px;
      --space-2xl: 32px;
      --space-3xl: 48px;
      --space-4xl: 64px;

      /* Border Radius */
      --radius-sm: 3px;
      --radius-md: 4px;
      --radius-lg: 8px;
      --radius-xl: 12px;

      /* Typography */
      --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-mono: 'SF Mono', 'Consolas', monospace;

      /* Layout */
      --content-width: 720px;
      --text-width: 480px;
      --sidebar-width: 120px;
    }

    /* ==========================================================================
       Base & Reset
       ========================================================================== */
    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body {
      overflow-x: hidden;
      width: 100%;
    }

    body {
      font-family: var(--font-sans);
      background: var(--color-bg);
      color: var(--color-text);
      line-height: 1.7;
      font-size: 14px;
    }

    a { color: inherit; }

    /* ==========================================================================
       Typography
       ========================================================================== */
    h1 {
      font-size: 48px;
      font-weight: 400;
      color: var(--color-text-title);
      margin-bottom: var(--space-sm);
      letter-spacing: -1px;
    }

    h2 {
      font-size: 28px;
      font-weight: 500;
      color: var(--color-text-heading);
      margin: var(--space-3xl) 0 var(--space-lg);
      letter-spacing: -0.5px;
    }

    h3 {
      font-size: 18px;
      font-weight: 500;
      color: var(--color-text-heading);
      margin: var(--space-2xl) 0 var(--space-md);
    }

    h4 {
      font-size: 15px;
      font-weight: 500;
      color: var(--color-text-bright);
      margin: var(--space-xl) 0 var(--space-sm);
    }

    p {
      margin-bottom: var(--space-md);
      max-width: var(--text-width);
    }

    .lead {
      margin-bottom: 20px;
      max-width: var(--text-width);
    }

    ul {
      list-style: none;
      margin: 20px 0;
    }

    ul li {
      padding: 6px 0 6px 20px;
      position: relative;
    }

    ul li::before {
      content: "–";
      position: absolute;
      left: 0;
    }

    /* ==========================================================================
       Code & Syntax Highlighting
       ========================================================================== */
    pre, code {
      font-family: var(--font-mono);
      font-size: 12px;
    }

    pre {
      background: var(--color-bg-darker);
      border: 1px solid var(--color-border);
      padding: var(--space-lg);
      overflow-x: auto;
      margin: var(--space-lg) 0;
      line-height: 1.6;
      max-width: 100%;
    }

    .inline-code {
      background: var(--color-border-light);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
    }

    /* Syntax colors */
    .comment { color: var(--color-text-muted); }
    .component { color: var(--color-accent-light); }
    .property { color: var(--color-text-light); }
    .value { color: var(--color-value); }
    .string { color: var(--color-string); }
    .keyword { color: var(--color-accent); }
    .token { color: var(--color-accent-light); }

    /* ==========================================================================
       Layout
       ========================================================================== */
    .page-layout {
      display: flex;
      min-height: 100vh;
    }

    .main-content {
      flex: 1;
      max-width: 100%;
      overflow-x: hidden;
    }

    .container {
      max-width: var(--content-width);
      margin: 0 auto;
      padding: var(--space-3xl);
    }

    .concept {
      margin-bottom: var(--space-2xl);
    }

    /* ==========================================================================
       Sidebar Navigation
       ========================================================================== */
    .sidebar {
      width: var(--sidebar-width);
      flex-shrink: 0;
      position: fixed;
      top: 64px;
      right: calc(50% + 360px + 24px);
      z-index: 100;
    }

    .sidebar-header { display: none; }

    .sidebar-nav a {
      display: block;
      padding: var(--space-xs) 0;
      color: var(--color-text-subtle);
      text-decoration: none;
      font-size: 12px;
      text-align: right;
      transition: color 0.15s;
    }

    .sidebar-nav a:hover { color: var(--color-text-light); }
    .sidebar-nav a.active { color: var(--color-text-heading); }

    .sidebar-nav a.subsection {
      font-size: 11px;
      padding-left: 12px;
      color: var(--color-text-muted);
    }

    .sidebar-nav a.subsection:hover { color: var(--color-text-light); }

    /* ==========================================================================
       Components
       ========================================================================== */

    /* Grid layout */
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-lg);
      margin: var(--space-lg) 0;
      align-items: start;
    }

    .grid pre,
    .grid .label { margin: 0; }

    /* Labels */
    .label {
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 20px 0 6px;
    }

    /* Highlight box */
    .highlight-box { margin: 20px 0; }
    .highlight-box p { margin: 0; }

    /* Rule box */
    .rule-box { margin: var(--space-lg) 0; }
    .rule-box h4 { margin-bottom: var(--space-sm); }

    /* Comparison */
    .comparison {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-xl);
      margin: var(--space-xl) 0;
    }

    .comparison-item h4 { margin-bottom: var(--space-sm); }

    /* Footer */
    .footer {
      margin-top: var(--space-4xl);
      padding-top: var(--space-xl);
      border-top: 1px solid var(--color-border);
    }

    /* ==========================================================================
       Collapsible Code Sections
       ========================================================================== */
    details.full-code {
      margin: 20px 0;
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md);
      background: var(--color-bg-code);
    }

    details.full-code summary {
      padding: var(--space-md) var(--space-lg);
      cursor: pointer;
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      user-select: none;
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    details.full-code summary:hover {
      color: var(--color-text-heading);
      background: #151515;
    }

    details.full-code summary::before {
      content: "▶";
      font-size: 10px;
      transition: transform 0.2s;
    }

    details.full-code[open] summary::before {
      transform: rotate(90deg);
    }

    details.full-code summary::-webkit-details-marker { display: none; }

    details.full-code pre {
      margin: 0;
      border: none;
      border-top: 1px solid var(--color-border);
      border-radius: 0 0 var(--radius-md) var(--radius-md);
    }

    /* ==========================================================================
       Mirror Editor (Playgrounds)
       ========================================================================== */
    .mirror-editor {
      margin-bottom: var(--space-lg);
      max-width: 100%;
      overflow: hidden;
      border-radius: var(--radius-lg);
    }

    /* ==========================================================================
       Exercises
       ========================================================================== */
    .exercise {
      margin: var(--space-xl) 0 40px 0;
    }

    .exercise-label {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-accent);
      margin-bottom: var(--space-sm);
    }

    .exercise-task {
      font-size: 13px;
      color: var(--color-text);
      margin-bottom: var(--space-md);
    }

    /* ==========================================================================
       Responsive Design
       ========================================================================== */
    @media (max-width: 1100px) {
      .sidebar { display: none; }
    }

    @media (max-width: 768px) {
      body { font-size: 18px; line-height: 1.5; }

      p, li, .lead { font-size: 18px; line-height: 1.5; }

      .container { padding: var(--space-xl) var(--space-lg); }

      h1 { font-size: 32px; }
      h2 { font-size: 24px; margin: var(--space-2xl) 0 var(--space-md); }
      h3 { font-size: 18px; margin: var(--space-xl) 0 10px; }

      .lead, p { max-width: 100%; }

      pre, code { font-size: 14px; }
      pre { padding: var(--space-md); }

      ul li { padding-left: var(--space-lg); }

      .grid,
      .comparison { grid-template-columns: 1fr; }

      .comparison { gap: var(--space-lg); }

      .mirror-editor .cm-editor,
      .mirror-editor .cm-content,
      .mirror-editor .cm-line { font-size: 14px; }
    }`

// Logo SVG
const LOGO_HTML = `    <!-- Logo + Title -->
    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 8px;">
      <div style="position: relative; width: 48px; height: 50px; flex-shrink: 0;">
        <div style="position: absolute; width: 32px; height: 31px; border-radius: 6px; background: #2271c1; transform: rotate(16deg); top: 0; left: 0;"></div>
        <div style="position: absolute; width: 32px; height: 31px; border-radius: 6px; background: #5ba8f5; transform: rotate(16deg); top: 11px; left: 8px; box-shadow: 0 -2px 2px rgba(0,0,0,0.25);"></div>
      </div>
      <h1 style="margin: 0;">Mirror</h1>
    </div>`

interface GenerateOptions {
  title: string
  footerText: string
  externalLinks?: { href: string; label: string }[]
  backLink?: { href: string; label: string }
  showSubsections?: boolean
  inlinePrelude?: boolean
}

// Generate full HTML document
function generateHTML(documentation: Documentation, options: GenerateOptions): string {
  const sidebar = generateSidebarWithExternalLinks(documentation.sections, options.externalLinks, options.showSubsections)
  const sections = documentation.sections.map(s => generateSection(s, options.inlinePrelude)).join('\n\n')

  const backLinkHTML = options.backLink
    ? `<div style="margin-bottom: 24px;"><a href="${options.backLink.href}" style="color: #2271c1; text-decoration: none; font-size: 13px;">← ${options.backLink.label}</a></div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
${CSS_STYLES}
  </style>
</head>
<body>
<div class="page-layout">
${sidebar}

  <!-- Main Content -->
  <div class="main-content">
  <div class="container">
${backLinkHTML}
${LOGO_HTML}

${sections}

    <!-- Footer -->
    <div class="footer">
      <p>${options.footerText}</p>
    </div>
  </div>
  </div>
</div>

<!-- Mirror Editor Script -->
<script src="mirror-editor.js?v=${new Date().getTime()}"></script>

<!-- Scroll Spy for Navigation -->
<script>
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.sidebar-nav a');

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const top = section.offsetTop - 100;
      if (scrollY >= top) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('active');
      }
    });
  });
</script>
</body>
</html>
`
}

// Main
const jsonPath = './docs/tutorial.json'
const mainHtmlPath = './docs/tutorial.html'
const libraryHtmlPath = './docs/component-library.html'

const json = readFileSync(jsonPath, 'utf-8')
const fullDocumentation: Documentation = JSON.parse(json)

// Split: separate component-library from main documentation
const componentLibrarySection = fullDocumentation.sections.find(s => s.id === 'component-library')
const mainSections = fullDocumentation.sections.filter(s => s.id !== 'component-library')

// Generate main documentation (without component-library, but with link to it)
const mainDocumentation: Documentation = {
  ...fullDocumentation,
  sections: mainSections
}

// Insert link to Component Library between "Interaction" and "Reference" in sidebar
const mainHtml = generateHTML(mainDocumentation, {
  title: 'Mirror – Documentation',
  footerText: 'Mirror Documentation',
  externalLinks: [
    { href: 'component-library.html', label: 'Component Library' }
  ]
})
writeFileSync(mainHtmlPath, mainHtml)

console.log(`Generated ${mainHtmlPath}`)
console.log(`  ${mainSections.length} sections`)
console.log(`  ${mainSections.reduce((sum, s) => sum + s.subsections.length, 0)} subsections`)

// Generate Component Library as separate page
if (componentLibrarySection) {
  const libraryDocumentation: Documentation = {
    title: 'Component Library',
    version: fullDocumentation.version,
    sections: [componentLibrarySection]
  }

  const libraryHtml = generateHTML(libraryDocumentation, {
    title: 'Mirror – Component Library',
    footerText: 'Mirror Component Library',
    backLink: { href: 'tutorial.html', label: 'Back to Documentation' },
    showSubsections: true,
    inlinePrelude: false
  })
  writeFileSync(libraryHtmlPath, libraryHtml)

  console.log(`Generated ${libraryHtmlPath}`)
  console.log(`  ${componentLibrarySection.subsections.length} subsections`)
}
