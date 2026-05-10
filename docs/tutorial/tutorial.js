/**
 * Tutorial Playground System
 *
 * Provides syntax highlighting, live compilation, and "Open in Studio" button
 * for all tutorial playground elements.
 */

// Vocabulary (kept in sync with compiler/schema/dsl.ts and CLAUDE.md DSL
// reference). Properties first, then keywords/states/events/actions.
// `buildAltRegex` sorts longest-first so multi-token entries like `pad-x`
// match before their prefix `pad`.
const PROPERTIES = [
  // Sizing
  'w', 'h', 'size', 'minw', 'min-width', 'maxw', 'max-width',
  'minh', 'min-height', 'maxh', 'max-height', 'aspect', 'full', 'hug',
  // Layout direction & flow
  'hor', 'horizontal', 'ver', 'vertical', 'gap', 'gx', 'gap-x', 'gy', 'gap-y',
  'row-height', 'rh', 'center', 'cen', 'spread', 'wrap', 'stacked',
  'grid', 'dense', 'grow', 'shrink', 'align',
  // 9-position keywords
  'tl', 'tc', 'tr', 'cl', 'cr', 'bl', 'bc', 'br',
  'hor-center', 'ver-center', 'left', 'right', 'top', 'bottom',
  // Spacing
  'pad', 'padding', 'p', 'pad-x', 'px', 'pad-y', 'py',
  'pad-t', 'pt', 'pad-r', 'pr', 'pad-b', 'pb', 'pad-l', 'pl',
  'mar', 'margin', 'm', 'mar-x', 'mx', 'mar-y', 'my',
  'mar-t', 'mt', 'mar-r', 'mr', 'mar-b', 'mb', 'mar-l', 'ml',
  // Color
  'bg', 'background', 'col', 'color', 'c', 'boc', 'ic',
  // Border & radius
  'bor', 'border', 'bor-t', 'bort', 'bor-b', 'borb',
  'bor-l', 'borl', 'bor-r', 'borr', 'rad', 'radius',
  // Typography
  'fs', 'font-size', 'weight', 'line', 'font', 'text-align',
  'italic', 'underline', 'uppercase', 'lowercase', 'truncate',
  // Position & transform
  'x', 'y', 'z', 'abs', 'absolute', 'fixed', 'relative',
  'rotate', 'rot', 'scale',
  // Effects
  'opacity', 'opa', 'o', 'shadow', 'cursor', 'blur', 'backdrop-blur', 'blur-bg',
  // Visibility
  'hidden', 'visible', 'disabled', 'scroll', 'scroll-ver',
  'scroll-hor', 'scroll-both', 'clip',
  // Content & input
  'content', 'href', 'src', 'placeholder', 'mask', 'focusable',
  'editable', 'keyboard-nav', 'keynav', 'loop-focus', 'loopfocus',
  'typeahead', 'trigger-text', 'triggertext', 'readonly',
  'type', 'name', 'value', 'checked', 'text',
  // Icon
  'is', 'icon-size', 'ic', 'icon-color', 'iw', 'icon-weight', 'fill',
  // Animation
  'anim', 'animation', 'x-offset', 'y-offset',
  // Hover-prefixed shorthand
  'hover-bg', 'hover-background', 'hover-col', 'hover-color', 'hover-c',
  'hover-opacity', 'hover-opa', 'hover-o', 'hover-scale',
  'hover-border', 'hover-bor', 'hover-border-color', 'hover-boc',
  'hover-radius', 'hover-rad',
]

const KEYWORDS = [
  // System + custom states (and size-states)
  'hover', 'focus', 'active', 'disabled',
  'on', 'off', 'open', 'closed', 'selected', 'highlighted',
  'expanded', 'collapsed', 'filled', 'valid', 'invalid', 'loading', 'error',
  'compact', 'regular', 'wide',
  // Reserved keywords
  'canvas', 'as', 'extends', 'named', 'each', 'in', 'if', 'else', 'then',
  'where', 'and', 'or', 'not', 'data', 'keys', 'selection', 'bind',
  'from', 'with', 'by', 'asc', 'desc', 'grouped', 'use',
  // Events
  'onclick', 'onhover', 'onfocus', 'onblur', 'oninput', 'onchange',
  'onkeydown', 'onkeyup', 'onclick-outside', 'onload',
  'onviewenter', 'onviewexit', 'onenter', 'onescape', 'onspace',
  'onkeyenter', 'onkeyescape', 'onkeyspace',
  // Actions
  'toggle', 'exclusive', 'show', 'hide', 'navigate', 'back', 'forward',
  'set', 'reset', 'increment', 'decrement', 'copy', 'add', 'remove',
  'create', 'save', 'delete', 'toast',
  'highlightNext', 'highlightPrev', 'selectHighlighted',
  'scrollTo', 'scrollToTop', 'scrollToBottom', 'scrollBy',
  'clear', 'setError', 'clearError', 'openUrl', 'focus', 'blur',
  // Common custom state names used in tutorials
  'todo', 'doing', 'done',
]

function buildAltRegex(words) {
  const sorted = Array.from(new Set(words)).sort((a, b) => b.length - a.length)
  const escaped = sorted.map(w => w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'g')
}

const patterns = [
  { regex: /\/\/.*$/gm, cls: 'syn-comment' },
  { regex: /"[^"]*"/g, cls: 'syn-string' },
  { regex: /\$[a-zA-Z][a-zA-Z0-9.]*/g, cls: 'syn-token' },
  { regex: /#[0-9A-Fa-f]{3,8}\b/g, cls: 'syn-hex' },
  { regex: /\b\d+(\.\d+)?(%|px|rem|em)?\b/g, cls: 'syn-number' },
  { regex: buildAltRegex(PROPERTIES), cls: 'syn-property' },
  { regex: buildAltRegex(KEYWORDS), cls: 'syn-keyword' },
  { regex: /\b[A-Z][a-zA-Z0-9]*\b/g, cls: 'syn-component' },
]

function highlight(text) {
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const matches = []
  for (const p of patterns) {
    p.regex.lastIndex = 0
    let m
    while ((m = p.regex.exec(text)) !== null) {
      matches.push({ from: m.index, to: m.index + m[0].length, cls: p.cls, text: m[0] })
    }
  }
  matches.sort((a, b) => a.from - b.from)
  const filtered = []
  let lastEnd = 0
  for (const m of matches) {
    if (m.from >= lastEnd) {
      filtered.push(m)
      lastEnd = m.to
    }
  }
  let result = '',
    pos = 0
  for (const m of filtered) {
    if (m.from > pos) result += html.slice(pos, m.from)
    const escaped = m.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    result += `<span class="${m.cls}">${escaped}</span>`
    pos = m.to
  }
  return result + html.slice(pos)
}

/**
 * Static playgrounds: syntax-highlight, no live preview / compile.
 * Markup: <div class="playground static"><div class="playground-code"><pre>code</pre></div></div>
 */
function initializeStaticPlaygrounds() {
  document.querySelectorAll('.playground.static .playground-code pre').forEach(pre => {
    const text = pre.textContent
    pre.innerHTML = highlight(text)
  })
}

/**
 * Initialize all playgrounds on the page
 */
function initializePlaygrounds() {
  initializeStaticPlaygrounds()
  document.querySelectorAll('.playground[data-playground]').forEach(p => {
    const codeContainer = p.querySelector('.playground-code')
    const textarea = p.querySelector('textarea')
    const preview = p.querySelector('.playground-preview')
    const pre = document.createElement('pre')
    codeContainer.insertBefore(pre, textarea)

    // Add "Open in Studio" button with icon
    const studioBtn = document.createElement('button')
    studioBtn.className = 'studio-btn'
    studioBtn.title = 'Im Studio öffnen'
    // External link icon (Lucide)
    studioBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`
    studioBtn.onclick = () => {
      const code = encodeURIComponent(textarea.value)
      window.open(`../../studio/?code=${code}`, '_blank')
    }
    codeContainer.appendChild(studioBtn)

    function updateHighlight() {
      pre.innerHTML = highlight(textarea.value)
    }

    // Use Shadow DOM to scope CSS per playground
    let shadow = preview.shadowRoot
    if (!shadow) {
      shadow = preview.attachShadow({ mode: 'open' })
    }

    function compile() {
      try {
        shadow.innerHTML = ''

        // Inject mirror-defaults.css into Shadow DOM
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = '../../assets/mirror-defaults.css'
        shadow.appendChild(link)

        const code = MirrorLang.compile(textarea.value)
        const execCode = code.replace('export function createUI', 'function createUI')
        const fn = new Function(execCode + '\nreturn createUI();')
        // createUI() returns the root DOM element directly.
        const root = fn()
        if (root) {
          root.classList.add('mirror-root')
          shadow.appendChild(root)
        }
      } catch (e) {
        shadow.innerHTML = `<div class="playground-error" style="color:#ef4444;font-size:14px;padding:12px;">${e.message}</div>`
      }
    }

    textarea.addEventListener('input', () => {
      updateHighlight()
      clearTimeout(textarea._t)
      textarea._t = setTimeout(compile, 100)
    })

    textarea.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault()
        const s = textarea.selectionStart
        textarea.value =
          textarea.value.slice(0, s) + '  ' + textarea.value.slice(textarea.selectionEnd)
        textarea.selectionStart = textarea.selectionEnd = s + 2
        updateHighlight()
        compile()
      }
    })

    textarea.addEventListener('scroll', () => {
      pre.scrollTop = textarea.scrollTop
      pre.scrollLeft = textarea.scrollLeft
    })
    updateHighlight()
    compile()
  })
}

/**
 * Tutorial Top-Bar + Mega-Menu Navigation
 *
 * Top-bar (always visible): hamburger button + Mirror logo.
 * Hamburger opens a full-screen overlay with all chapters arranged
 * in 4 labeled columns.
 */

// 4 columns, visually balanced (6/8/8/6). Studio is split into
// Bedienen (entry + editing tools) and Vertiefen (IDE/States + Output).
// Order matches the index: Studio first, Sprache in the middle,
// then deeper Studio.
const tutorialSections = [
  {
    title: 'Studio — Bedienen',
    groups: [
      {
        title: 'Einstieg',
        items: [
          { num: '17', file: '17-ai-bauen.html', title: 'AI-Bauen' },
          { num: '18', file: '18-studio.html', title: 'Bedienung' },
        ],
      },
      {
        title: 'Editing-Werkzeuge',
        items: [
          { num: '19', file: '19-pickers.html', title: 'Pickers' },
          { num: '20', file: '20-komponenten-workflow.html', title: 'Komponenten-Workflow' },
          { num: '21', file: '21-tokens-workflow.html', title: 'Tokens-Workflow' },
          { num: '22', file: '22-visuelles-editieren.html', title: 'Visuelles Editieren' },
        ],
      },
    ],
  },
  {
    title: 'Sprache — Aufbau',
    groups: [
      {
        title: 'Grundlagen',
        items: [
          { num: '01', file: '01-elemente.html', title: 'Elemente' },
          { num: '02', file: '02-komponenten.html', title: 'Komponenten' },
          { num: '03', file: '03-tokens.html', title: 'Tokens' },
          { num: '04', file: '04-layout.html', title: 'Layout' },
          { num: '05', file: '05-styling.html', title: 'Styling' },
        ],
      },
      {
        title: 'Wirkung',
        items: [
          { num: '06', file: '06-states.html', title: 'States' },
          { num: '07', file: '07-animationen.html', title: 'Animationen' },
          { num: '08', file: '08-functions.html', title: 'Functions' },
        ],
      },
    ],
  },
  {
    title: 'Sprache — Bausteine',
    groups: [
      {
        title: 'Daten & Seiten',
        items: [
          { num: '09', file: '09-daten.html', title: 'Daten' },
          { num: '10', file: '10-seiten.html', title: 'Seiten' },
          { num: '16', file: '16-prosa.html', title: 'Prosa-Mode' },
        ],
      },
      {
        title: 'Bibliothek',
        items: [
          { num: '11', file: '11-eingabe.html', title: 'Eingabe' },
          { num: '12', file: '12-navigation.html', title: 'Navigation' },
          { num: '13', file: '13-overlays.html', title: 'Overlays' },
          { num: '14', file: '14-tabellen.html', title: 'Tabellen' },
          { num: '15', file: '15-charts.html', title: 'Charts' },
        ],
      },
    ],
  },
  {
    title: 'Studio — Vertiefen',
    groups: [
      {
        title: 'Code & States',
        items: [
          { num: '23', file: '23-states.html', title: 'States im Studio' },
          { num: '24', file: '24-code-editor.html', title: 'Code-Editor' },
        ],
      },
      {
        title: 'Files & Output',
        items: [
          { num: '25', file: '25-multi-file.html', title: 'Multi-File' },
          { num: '26', file: '26-run-mode.html', title: 'Run-Mode' },
          { num: '27', file: '27-export.html', title: 'Export' },
          { num: '28', file: '28-reference.html', title: 'Reference' },
        ],
      },
    ],
  },
]

// Build a flat lookup so the topbar can show the current chapter title.
function findChapter(file) {
  for (const section of tutorialSections) {
    for (const group of section.groups) {
      for (const item of group.items) {
        if (item.file === file) return item
      }
    }
  }
  return null
}

function createTutorialNav() {
  // Skip on playground (no chapter context).
  let currentFile = window.location.pathname.split('/').pop() || 'index.html'
  if (currentFile === '' || currentFile === 'tutorial') currentFile = 'index.html'
  if (!currentFile.includes('.')) currentFile = currentFile + '.html'
  if (currentFile === 'playground.html') return

  // Top bar (always visible): hamburger left, logo center-left next to it.
  // If we're inside a chapter, show its number + title on the right.
  const chapter = findChapter(currentFile)
  const topbar = document.createElement('header')
  topbar.className = 'tutorial-topbar'
  topbar.innerHTML = `
    <button type="button" class="tutorial-topbar-hamburger" aria-label="Menü öffnen" aria-expanded="false">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
    <a class="tutorial-topbar-brand" href="index.html">
      <img src="logo-mirror.png" alt="Mirror">
      <span>Mirror</span>
    </a>
    ${chapter ? `<div class="tutorial-topbar-chapter"><span class="tutorial-topbar-chapter-num">${chapter.num}</span><span class="tutorial-topbar-chapter-title">${chapter.title}</span></div>` : ''}
  `

  // Mega-menu overlay
  const overlay = document.createElement('div')
  overlay.className = 'tutorial-megamenu'
  overlay.setAttribute('aria-hidden', 'true')

  const inner = document.createElement('div')
  inner.className = 'tutorial-megamenu-inner'

  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.className = 'tutorial-megamenu-close'
  closeBtn.setAttribute('aria-label', 'Menü schließen')
  closeBtn.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  `
  inner.appendChild(closeBtn)

  const grid = document.createElement('div')
  grid.className = 'tutorial-megamenu-grid'

  for (const section of tutorialSections) {
    const col = document.createElement('div')
    col.className = 'tutorial-megamenu-col'

    const heading = document.createElement('h3')
    heading.className = 'tutorial-megamenu-heading'
    heading.textContent = section.title
    col.appendChild(heading)

    for (const group of section.groups) {
      const subhead = document.createElement('div')
      subhead.className = 'tutorial-megamenu-subhead'
      subhead.textContent = group.title
      col.appendChild(subhead)

      const list = document.createElement('ul')
      list.className = 'tutorial-megamenu-list'
      for (const item of group.items) {
        const li = document.createElement('li')
        const a = document.createElement('a')
        a.className = 'tutorial-megamenu-link'
        a.href = item.file
        if (currentFile === item.file) a.classList.add('active')
        a.innerHTML = `<span class="tutorial-megamenu-num">${item.num}</span><span>${item.title}</span>`
        li.appendChild(a)
        list.appendChild(li)
      }
      col.appendChild(list)
    }
    grid.appendChild(col)
  }
  inner.appendChild(grid)
  overlay.appendChild(inner)

  // Wire open/close
  const hamburger = topbar.querySelector('.tutorial-topbar-hamburger')
  function open() {
    overlay.classList.add('is-open')
    overlay.setAttribute('aria-hidden', 'false')
    hamburger.setAttribute('aria-expanded', 'true')
    document.body.classList.add('megamenu-open')
  }
  function close() {
    overlay.classList.remove('is-open')
    overlay.setAttribute('aria-hidden', 'true')
    hamburger.setAttribute('aria-expanded', 'false')
    document.body.classList.remove('megamenu-open')
  }
  hamburger.addEventListener('click', () => {
    if (overlay.classList.contains('is-open')) close(); else open()
  })
  closeBtn.addEventListener('click', close)
  overlay.addEventListener('click', e => {
    // Click on backdrop (outside .tutorial-megamenu-inner content) closes.
    if (e.target === overlay) close()
  })
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) close()
  })

  document.body.insertBefore(overlay, document.body.firstChild)
  document.body.insertBefore(topbar, document.body.firstChild)
  document.body.classList.add('has-topbar')
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializePlaygrounds()
    createTutorialNav()
  })
} else {
  initializePlaygrounds()
  createTutorialNav()
}
