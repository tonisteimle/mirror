/**
 * Tutorial Playground System
 *
 * Provides syntax highlighting, live compilation, and "Open in Studio" button
 * for all tutorial playground elements.
 */

// Syntax highlighting patterns
const patterns = [
  { regex: /\/\/.*$/gm, cls: 'syn-comment' },
  { regex: /"[^"]*"/g, cls: 'syn-string' },
  { regex: /\$[a-zA-Z][a-zA-Z0-9.]*/g, cls: 'syn-token' },
  { regex: /#[0-9A-Fa-f]{3,8}\b/g, cls: 'syn-hex' },
  { regex: /\b\d+(\.\d+)?(%|px|rem|em)?\b/g, cls: 'syn-number' },
  { regex: /\b(pad|padding|bg|background|col|color|gap|rad|radius|bor|border|boc|width|height|size|font|weight|center|hor|ver|spread|wrap|hidden|visible|opacity|shadow|cursor|grid|scroll|clip|truncate|italic|underline|uppercase|lowercase|left|right|top|bottom|margin|w|h|fs|is|ic|scale|name|full|shrink|placeholder)\b/g, cls: 'syn-property' },
  { regex: /\b(hover|focus|active|disabled|onclick|onhover|onfocus|onblur|oninput|onchange|onkeydown|onclick-outside|selected|state|show|hide|toggle|cycle|exclusive|open|close|as|on|todo|doing|done|loading|valid|invalid|error|loaded|default)\b/g, cls: 'syn-keyword' },
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
    if (m.from >= lastEnd) { filtered.push(m); lastEnd = m.to }
  }
  let result = '', pos = 0
  for (const m of filtered) {
    if (m.from > pos) result += html.slice(pos, m.from)
    const escaped = m.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    result += `<span class="${m.cls}">${escaped}</span>`
    pos = m.to
  }
  return result + html.slice(pos)
}

/**
 * Initialize all playgrounds on the page
 */
function initializePlaygrounds() {
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

    function updateHighlight() { pre.innerHTML = highlight(textarea.value) }

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
        link.href = '../../../assets/mirror-defaults.css'
        shadow.appendChild(link)

        const code = MirrorLang.compile(textarea.value)
        const execCode = code.replace('export function createUI', 'function createUI')
        const fn = new Function(execCode + '\nreturn createUI();')
        const ui = fn()
        if (ui && ui.root) {
          // Add mirror-root class to the root element
          ui.root.classList.add('mirror-root')
          shadow.appendChild(ui.root)
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
        textarea.value = textarea.value.slice(0, s) + '  ' + textarea.value.slice(textarea.selectionEnd)
        textarea.selectionStart = textarea.selectionEnd = s + 2
        updateHighlight()
        compile()
      }
    })

    textarea.addEventListener('scroll', () => { pre.scrollTop = textarea.scrollTop; pre.scrollLeft = textarea.scrollLeft })
    updateHighlight()
    compile()
  })
}

/**
 * Tutorial Sidebar Navigation
 *
 * Creates a responsive sidebar that appears on wide screens.
 * The navigation structure is defined here and injected into the DOM.
 */

const tutorialNavigation = [
  {
    section: 'Start',
    items: [
      { num: '00', title: 'Intro', file: '00-intro.html' },
    ]
  },
  {
    section: 'Grundlagen',
    items: [
      { num: '01', title: 'Elemente', file: '01-elemente.html' },
      { num: '02', title: 'Komponenten', file: '02-komponenten.html' },
      { num: '03', title: 'Tokens', file: '03-tokens.html' },
      { num: '04', title: 'Layout', file: '04-layout.html' },
      { num: '05', title: 'Styling', file: '05-styling.html' },
    ]
  },
  {
    section: 'Interaktion',
    items: [
      { num: '06', title: 'States', file: '06-states.html' },
      { num: '07', title: 'Functions', file: '07-functions.html' },
      { num: '08', title: 'Navigation', file: '08-navigation.html' },
      { num: '09', title: 'Overlays', file: '09-overlays.html' },
    ]
  },
  {
    section: 'Daten',
    items: [
      { num: '10', title: 'Variablen', file: '10-variablen.html' },
      { num: '11', title: 'Content', file: '11-content.html' },
      { num: '12', title: 'Bedingungen', file: '12-bedingungen.html' },
      { num: '13', title: 'Pages', file: '13-pages.html' },
    ]
  },
  {
    section: 'Referenz',
    items: [
      { num: '14', title: 'Häufige Fehler', file: '14-fehler.html' },
    ]
  },
]

function createTutorialSidebar() {
  // Don't create sidebar on index page
  const currentFile = window.location.pathname.split('/').pop() || 'index.html'
  if (currentFile === 'index.html' || currentFile === 'playground.html') return

  // Create sidebar element
  const sidebar = document.createElement('aside')
  sidebar.className = 'tutorial-sidebar'

  // Header with logo
  const header = document.createElement('div')
  header.className = 'tutorial-sidebar-header'
  header.innerHTML = `
    <a href="index.html">
      <img src="logo.svg" alt="Mirror">
      <span>Tutorial</span>
    </a>
  `
  sidebar.appendChild(header)

  // Create navigation sections
  for (const section of tutorialNavigation) {
    const sectionEl = document.createElement('div')
    sectionEl.className = 'tutorial-sidebar-section'

    const titleEl = document.createElement('div')
    titleEl.className = 'tutorial-sidebar-section-title'
    titleEl.textContent = section.section
    sectionEl.appendChild(titleEl)

    for (const item of section.items) {
      const link = document.createElement('a')
      link.className = 'tutorial-sidebar-link'
      link.href = item.file

      // Mark current page as active
      if (currentFile === item.file) {
        link.classList.add('active')
      }

      link.innerHTML = `
        <span class="tutorial-sidebar-link-num">${item.num}</span>
        <span>${item.title}</span>
      `
      sectionEl.appendChild(link)
    }

    sidebar.appendChild(sectionEl)
  }

  // Add sidebar to page
  document.body.insertBefore(sidebar, document.body.firstChild)
  document.body.classList.add('has-sidebar')
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializePlaygrounds()
    createTutorialSidebar()
  })
} else {
  initializePlaygrounds()
  createTutorialSidebar()
}
