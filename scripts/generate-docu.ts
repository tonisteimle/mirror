/**
 * Generate mirror-docu.html from structured JSON
 * Run with: npx tsx scripts/generate-docu.ts
 */

import { readFileSync, writeFileSync } from 'fs'

interface ContentBlock {
  type: 'paragraph' | 'code' | 'exercise' | 'list' | 'note'
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
  generatedAt: string
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
    'reference': 'Reference',
  }
  return labels[id] || title
}

// Generate content block HTML
function generateContentBlock(block: ContentBlock): string {
  switch (block.type) {
    case 'paragraph':
      // Check if this is an h4 heading (stored as **text**)
      if (block.text?.startsWith('**') && block.text?.endsWith('**')) {
        const title = block.text.slice(2, -2)
        return `      <h4>${title}</h4>\n`
      }
      return `      <p>${block.text}</p>\n`

    case 'code':
      return `      <div class="mirror-editor" data-code="${encodeForAttribute(block.code || '')}"></div>\n`

    case 'exercise':
      return `      <div class="exercise">
        <div class="exercise-label">Try it</div>
        <p class="exercise-task">${block.task}</p>
        ${block.code ? `<div class="mirror-editor" data-code="${encodeForAttribute(block.code)}"></div>` : ''}
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
function generateSubsection(subsection: Subsection): string {
  const id = subsection.id ? ` id="${subsection.id}"` : ''
  const content = subsection.content.map(generateContentBlock).join('\n')

  return `      <h3${id}>${subsection.title}</h3>

${content}`
}

// Generate section HTML
function generateSection(section: Section): string {
  const lead = section.lead
    ? `      <p class="lead">${section.lead}</p>\n`
    : ''

  const subsections = section.subsections.map(generateSubsection).join('\n')

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

// Generate full HTML document
function generateHTML(documentation: Documentation): string {
  const sidebar = generateSidebar(documentation.sections)
  const sections = documentation.sections.map(generateSection).join('\n\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mirror – Documentation</title>
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
${LOGO_HTML}

${sections}

    <!-- Footer -->
    <div class="footer">
      <p>Generated from mirror-docu.json on ${new Date().toISOString().split('T')[0]}</p>
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
const jsonPath = './docs/mirror-docu.json'
const htmlPath = './docs/mirror-docu-generated.html'

const json = readFileSync(jsonPath, 'utf-8')
const documentation: Documentation = JSON.parse(json)

const html = generateHTML(documentation)
writeFileSync(htmlPath, html)

console.log(`Generated ${htmlPath}`)
console.log(`  ${documentation.sections.length} sections`)
console.log(`  ${documentation.sections.reduce((sum, s) => sum + s.subsections.length, 0)} subsections`)
