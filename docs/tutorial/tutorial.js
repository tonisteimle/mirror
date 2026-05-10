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
  {
    regex:
      /\b(pad|padding|bg|background|col|color|gap|rad|radius|bor|border|boc|width|height|size|font|weight|center|hor|ver|spread|wrap|hidden|visible|opacity|shadow|cursor|grid|scroll|clip|truncate|italic|underline|uppercase|lowercase|left|right|top|bottom|margin|w|h|fs|is|ic|scale|name|full|shrink|placeholder|row-height)\b/g,
    cls: 'syn-property',
  },
  {
    regex:
      /\b(hover|focus|active|disabled|onclick|onhover|onfocus|onblur|oninput|onchange|onkeydown|onclick-outside|selected|state|show|hide|toggle|cycle|exclusive|open|close|as|on|todo|doing|done|loading|valid|invalid|error|loaded|default)\b/g,
    cls: 'syn-keyword',
  },
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
 * Tutorial Sidebar Navigation
 *
 * Creates a responsive sidebar that appears on wide screens.
 * The navigation structure is defined here and injected into the DOM.
 */

// Tutorial Navigation Structure
// Sprache (00-10, 16) + Komponenten-Bibliothek (11-15) + Studio (17-28)
const tutorialNavigation = [
  // Die Sprache
  { num: '00', file: 'index.html', title: 'Intro', section: 'Sprache' },
  { num: '01', file: '01-elemente.html', title: 'Elemente' },
  { num: '02', file: '02-komponenten.html', title: 'Komponenten' },
  { num: '03', file: '03-tokens.html', title: 'Tokens' },
  { num: '04', file: '04-layout.html', title: 'Layout' },
  { num: '05', file: '05-styling.html', title: 'Styling' },
  { num: '06', file: '06-states.html', title: 'States' },
  { num: '07', file: '07-animationen.html', title: 'Animationen' },
  { num: '08', file: '08-functions.html', title: 'Functions' },
  { num: '09', file: '09-daten.html', title: 'Daten' },
  { num: '10', file: '10-seiten.html', title: 'Seiten' },
  { num: '16', file: '16-prosa.html', title: 'Prosa-Mode' },
  // Komponenten-Bibliothek
  { num: '11', file: '11-eingabe.html', title: 'Eingabe', section: 'Komponenten' },
  { num: '12', file: '12-navigation.html', title: 'Navigation' },
  { num: '13', file: '13-overlays.html', title: 'Overlays' },
  { num: '14', file: '14-tabellen.html', title: 'Tabellen' },
  { num: '15', file: '15-charts.html', title: 'Charts' },
  // Mirror Studio
  { num: '17', file: '17-ai-bauen.html', title: 'AI-Bauen', section: 'Studio' },
  { num: '18', file: '18-studio.html', title: 'Bedienung Basis' },
  { num: '19', file: '19-pickers.html', title: 'Pickers' },
  { num: '20', file: '20-komponenten-workflow.html', title: 'Komponenten-Workflow' },
  { num: '21', file: '21-tokens-workflow.html', title: 'Tokens-Workflow' },
  { num: '22', file: '22-visuelles-editieren.html', title: 'Visuelles Editieren' },
  { num: '23', file: '23-states.html', title: 'States im Studio' },
  { num: '24', file: '24-code-editor.html', title: 'Code-Editor' },
  { num: '25', file: '25-multi-file.html', title: 'Multi-File-Projekt' },
  { num: '26', file: '26-run-mode.html', title: 'Run-Mode' },
  { num: '27', file: '27-export.html', title: 'Export & Deploy' },
  { num: '28', file: '28-reference.html', title: 'Reference' },
]

function createTutorialSidebar() {
  // Don't create sidebar on playground page. Dev-server may strip .html from
  // the URL — normalise so the active-link check below matches item.file.
  let currentFile = window.location.pathname.split('/').pop() || 'index.html'
  if (currentFile === '' || currentFile === 'tutorial') currentFile = 'index.html'
  if (!currentFile.includes('.')) currentFile = currentFile + '.html'
  if (currentFile === 'playground.html') return

  // Create sidebar element
  const sidebar = document.createElement('aside')
  sidebar.className = 'tutorial-sidebar'

  // Header with logo
  const header = document.createElement('div')
  header.className = 'tutorial-sidebar-header'
  header.innerHTML = `
    <a href="index.html">
      <img src="logo-mirror.png" alt="Mirror">
      <span>Mirror</span>
    </a>
  `
  sidebar.appendChild(header)

  // Group entries by section. Each entry that carries `section` opens a
  // new group; subsequent entries without one attach to the most recently
  // opened group.
  let currentSection = null
  let sectionEl = null
  for (const item of tutorialNavigation) {
    if (item.section) {
      currentSection = item.section
      sectionEl = document.createElement('div')
      sectionEl.className = 'tutorial-sidebar-section'
      const title = document.createElement('div')
      title.className = 'tutorial-sidebar-section-title'
      title.textContent = currentSection
      sectionEl.appendChild(title)
      sidebar.appendChild(sectionEl)
    }
    if (!sectionEl) continue
    const link = document.createElement('a')
    link.className = 'tutorial-sidebar-link'
    link.href = item.file
    if (currentFile === item.file) {
      link.classList.add('active')
    }
    link.innerHTML = `
      <span class="tutorial-sidebar-link-num">${item.num}</span>
      <span>${item.title}</span>
    `
    sectionEl.appendChild(link)
  }

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
