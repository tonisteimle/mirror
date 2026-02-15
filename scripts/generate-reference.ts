/**
 * Generate reference.html from structured JSON
 * Run with: npx tsx scripts/generate-reference.ts
 */

import { readFileSync, writeFileSync } from 'fs'

interface TableRow {
  cells: string[]
}

interface Table {
  headers: string[]
  rows: TableRow[]
}

interface ContentBlock {
  type: 'paragraph' | 'code' | 'table' | 'highlight' | 'label' | 'h4'
  text?: string
  html?: string
  table?: Table
}

interface Subsection {
  id: string
  title: string
  content: ContentBlock[]
}

interface Section {
  id: string
  title: string
  subsections: Subsection[]
}

interface QuickRefItem {
  category: string
  items: string[]
}

interface Reference {
  title: string
  subtitle: string
  intro: string
  version: string
  generatedAt: string
  sections: Section[]
  quickRef: QuickRefItem[]
}

// Generate content block HTML
function generateContentBlock(block: ContentBlock): string {
  switch (block.type) {
    case 'paragraph':
      return `      <p>${block.html}</p>\n`

    case 'h4':
      return `      <h4>${block.text}</h4>\n`

    case 'code':
      return `      <pre>${block.html}</pre>\n`

    case 'label':
      return `      <div class="label">${block.text}</div>\n`

    case 'highlight':
      return `      <div class="highlight-box">${block.html}</div>\n`

    case 'table':
      if (!block.table) return ''
      const headers = block.table.headers
        .map(h => `<th>${h}</th>`)
        .join('')
      const rows = block.table.rows
        .map(r => `        <tr>${r.cells.map(c => `<td>${c}</td>`).join('')}</tr>`)
        .join('\n')
      return `      <table>
        <tr>${headers}</tr>
${rows}
      </table>\n`

    default:
      return ''
  }
}

// Generate subsection HTML
function generateSubsection(subsection: Subsection): string {
  const content = subsection.content.map(generateContentBlock).join('\n')
  return `      <h3>${subsection.title}</h3>
${content}`
}

// Generate section HTML
function generateSection(section: Section, index: number): string {
  if (section.subsections.length === 0 && section.title === 'Schnellreferenz') {
    return '' // Quick ref is handled separately
  }

  const subsections = section.subsections.map(generateSubsection).join('\n')

  return `    <!-- SECTION ${index + 1} -->
    <section class="section">
      <h2>${section.title}</h2>
${subsections}
    </section>

    <div class="divider"></div>
`
}

// Generate quick reference HTML
function generateQuickRef(items: QuickRefItem[]): string {
  const lines = items.map(item => {
    const itemLines = item.items.map((text, i) => {
      if (i === 0) {
        return `<span class="quick-ref-category">${item.category.padEnd(12)}</span><span class="quick-ref-items">${text}</span>`
      }
      return `            <span class="quick-ref-items">${text}</span>`
    }).join('\n')
    return itemLines
  }).join('\n')

  return `    <!-- QUICK REFERENCE -->
    <section class="section">
      <h2>Schnellreferenz</h2>
      <div class="quick-ref">
${lines}
      </div>
    </section>`
}

// CSS styles - cleaned and optimized
const CSS_STYLES = `    /* ==========================================================================
       CSS Variables
       ========================================================================== */
    :root {
      /* Colors */
      --color-bg: #111;
      --color-bg-darker: #0a0a0a;
      --color-surface: #1a1a1a;
      --color-border: #222;

      --color-text: #999;
      --color-text-muted: #555;
      --color-text-light: #888;
      --color-text-bright: #bbb;
      --color-text-heading: #ccc;
      --color-text-title: #eee;

      --color-accent: #3B82F6;
      --color-accent-light: #60A5FA;
      --color-info-bg: #1a2744;

      /* Syntax */
      --syntax-comment: #555;
      --syntax-component: #7a7;
      --syntax-property: #888;
      --syntax-value: #b96;
      --syntax-string: #a88;
      --syntax-keyword: #88a;
      --syntax-token: #8aa;

      /* Spacing */
      --space-sm: 8px;
      --space-md: 12px;
      --space-lg: 16px;
      --space-xl: 24px;
      --space-2xl: 32px;
      --space-3xl: 48px;
      --space-4xl: 64px;

      /* Typography */
      --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-mono: 'SF Mono', 'Consolas', monospace;

      /* Layout */
      --content-width: 720px;
      --text-width: 480px;
    }

    /* ==========================================================================
       Base & Reset
       ========================================================================== */
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: var(--font-sans);
      background: var(--color-bg);
      color: var(--color-text);
      line-height: 1.7;
      padding: var(--space-3xl) var(--space-xl);
      font-size: 14px;
    }

    a { color: inherit; }

    .container {
      max-width: var(--content-width);
      margin: 0 auto;
    }

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
      font-size: 18px;
      font-weight: 500;
      color: var(--color-text-heading);
      margin: var(--space-2xl) 0 var(--space-md);
    }

    h3 {
      font-size: 15px;
      font-weight: 500;
      color: var(--color-text-bright);
      margin: var(--space-2xl) 0 var(--space-md);
    }

    h4 {
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text-light);
      margin: var(--space-xl) 0 var(--space-sm);
    }

    p {
      margin-bottom: var(--space-md);
      max-width: var(--text-width);
    }

    .subtitle {
      margin-bottom: var(--space-3xl);
    }

    .section {
      margin-bottom: var(--space-2xl);
    }

    .section-number { display: none; }

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
    }

    .inline-code {
      background: var(--color-surface);
      padding: 2px 6px;
    }

    /* Syntax colors */
    .comment { color: var(--syntax-comment); }
    .component { color: var(--syntax-component); }
    .property { color: var(--syntax-property); }
    .value { color: var(--syntax-value); }
    .string { color: var(--syntax-string); }
    .keyword { color: var(--syntax-keyword); }
    .token { color: var(--syntax-token); }

    /* ==========================================================================
       Tables
       ========================================================================== */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: var(--space-lg) 0;
    }

    th, td {
      padding: var(--space-sm) var(--space-md);
      text-align: left;
      border-bottom: 1px solid var(--color-border);
    }

    th {
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td code {
      background: var(--color-surface);
      padding: 1px 4px;
    }

    tr:last-child td { border-bottom: none; }

    /* ==========================================================================
       Components
       ========================================================================== */
    .label {
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 20px 0 6px;
    }

    .highlight-box {
      border-left: 2px solid #333;
      padding-left: var(--space-lg);
      margin: 20px 0;
    }

    .highlight-box p { margin: 0; }

    .info-box {
      background: var(--color-info-bg);
      border-left: 4px solid var(--color-accent);
      padding: var(--space-lg) 20px;
      margin: var(--space-lg) 0;
      border-radius: 0 8px 8px 0;
    }

    .info-box strong { color: var(--color-accent-light); }

    .slots-states {
      display: flex;
      gap: var(--space-lg);
      margin: var(--space-md) 0;
      flex-wrap: wrap;
    }

    .slots-states-item strong { margin-right: 4px; }
    .slots-states-item span { color: var(--syntax-component); }

    .divider { display: none; }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-lg);
      margin: var(--space-lg) 0;
      align-items: stretch;
    }

    .grid pre { margin: 0; height: 100%; }

    /* ==========================================================================
       Quick Reference
       ========================================================================== */
    .quick-ref {
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 1.8;
    }

    .quick-ref-category {
      color: var(--color-text-light);
      display: inline-block;
      min-width: 100px;
    }

    .quick-ref-items {
      color: var(--color-text);
    }

    /* ==========================================================================
       Footer
       ========================================================================== */
    .footer {
      margin-top: var(--space-4xl);
      padding-top: var(--space-xl);
      border-top: 1px solid var(--color-border);
    }

    /* ==========================================================================
       Responsive
       ========================================================================== */
    @media (max-width: 600px) {
      .grid { grid-template-columns: 1fr; }

      body { padding: var(--space-xl) var(--space-lg); }

      h1 { font-size: 32px; }
    }`

// Generate full HTML document
function generateHTML(reference: Reference): string {
  const sections = reference.sections.map((s, i) => generateSection(s, i)).join('\n')
  const quickRef = generateQuickRef(reference.quickRef)

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mirror – Referenz</title>
  <style>
${CSS_STYLES}
  </style>
</head>
<body>
  <div class="container">
    <h1>${reference.title}</h1>
    <p class="subtitle">${reference.subtitle}</p>

    <div class="info-box" style="margin: 24px 0;">
      ${reference.intro}
    </div>

${sections}

${quickRef}

    <footer class="footer">
      <p>Mirror Referenz v${reference.version}</p>
      <p style="font-size: 11px; color: #555; margin-top: 8px;">Generiert: ${new Date().toISOString().split('T')[0]}</p>
    </footer>
  </div>
</body>
</html>
`
}

// Main
const jsonPath = './docs/reference.json'
const htmlPath = './docs/reference-generated.html'

const json = readFileSync(jsonPath, 'utf-8')
const reference: Reference = JSON.parse(json)

const html = generateHTML(reference)
writeFileSync(htmlPath, html)

console.log(`Generated ${htmlPath}`)
console.log(`  ${reference.sections.length} sections`)
console.log(`  ${reference.sections.reduce((sum, s) => sum + s.subsections.length, 0)} subsections`)
console.log(`  ${reference.quickRef.length} quick ref categories`)
