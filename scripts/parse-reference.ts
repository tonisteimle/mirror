/**
 * Parse reference.html into structured JSON
 * Run with: npx tsx scripts/parse-reference.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { JSDOM } from 'jsdom'

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
  html?: string  // For code blocks with syntax highlighting
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

function parseElement(el: Element, subsection: Subsection): void {
  const tagName = el.tagName.toLowerCase()

  // Paragraph
  if (tagName === 'p' && !el.classList.contains('subtitle')) {
    const html = el.innerHTML.trim()
    if (html) {
      subsection.content.push({ type: 'paragraph', html })
    }
    return
  }

  // H4 sub-heading
  if (tagName === 'h4') {
    const text = el.textContent?.trim()
    if (text) {
      subsection.content.push({ type: 'h4', text })
    }
    return
  }

  // Code block (pre)
  if (tagName === 'pre') {
    const html = el.innerHTML
    if (html) {
      subsection.content.push({ type: 'code', html })
    }
    return
  }

  // Table
  if (tagName === 'table') {
    const headers: string[] = []
    const rows: TableRow[] = []

    const headerCells = el.querySelectorAll('th')
    headerCells.forEach(th => {
      headers.push(th.innerHTML.trim())
    })

    const dataRows = el.querySelectorAll('tr')
    dataRows.forEach(tr => {
      const cells: string[] = []
      const tds = tr.querySelectorAll('td')
      if (tds.length > 0) {
        tds.forEach(td => {
          cells.push(td.innerHTML.trim())
        })
        rows.push({ cells })
      }
    })

    if (headers.length > 0 || rows.length > 0) {
      subsection.content.push({ type: 'table', table: { headers, rows } })
    }
    return
  }

  // Highlight box
  if (el.classList.contains('highlight-box') || el.classList.contains('info-box')) {
    const html = el.innerHTML.trim()
    if (html) {
      subsection.content.push({ type: 'highlight', html })
    }
    return
  }

  // Label
  if (el.classList.contains('label')) {
    const text = el.textContent?.trim()
    if (text) {
      subsection.content.push({ type: 'label', text })
    }
    return
  }

  // Grid or other container - recurse
  if (tagName === 'div' && !el.classList.contains('section-number')) {
    Array.from(el.children).forEach(child => {
      parseElement(child, subsection)
    })
  }
}

function parseHTML(html: string): Reference {
  const dom = new JSDOM(html)
  const doc = dom.window.document

  const sections: Section[] = []
  const quickRef: QuickRefItem[] = []

  // Get title and subtitle
  const title = doc.querySelector('h1')?.textContent?.trim() || 'Mirror Referenz'
  const subtitle = doc.querySelector('.subtitle')?.textContent?.trim() || ''

  // Get intro box
  const introBox = doc.querySelector('.info-box')
  const intro = introBox?.innerHTML || ''

  // Find all section elements
  const sectionElements = doc.querySelectorAll('section.section')

  sectionElements.forEach((sectionEl) => {
    const h2 = sectionEl.querySelector('h2')
    const sectionTitle = h2?.textContent?.trim() || ''
    const sectionId = sectionTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')

    // Check if this is the Quick Reference section
    const quickRefDiv = sectionEl.querySelector('.quick-ref')
    if (quickRefDiv) {
      // Parse quick reference
      const lines = quickRefDiv.innerHTML.split('\n')
      let currentCategory = ''

      lines.forEach(line => {
        const categoryMatch = line.match(/class="quick-ref-category">([^<]+)</)
        const itemsMatch = line.match(/class="quick-ref-items">([^<]+)</)

        if (categoryMatch) {
          currentCategory = categoryMatch[1].trim()
        }
        if (itemsMatch && currentCategory) {
          const existingItem = quickRef.find(q => q.category === currentCategory)
          if (existingItem) {
            existingItem.items.push(itemsMatch[1].trim())
          } else {
            quickRef.push({
              category: currentCategory,
              items: [itemsMatch[1].trim()]
            })
          }
        }
      })

      sections.push({
        id: sectionId,
        title: sectionTitle,
        subsections: []
      })
      return
    }

    const subsections: Subsection[] = []
    let currentSubsection: Subsection | null = null

    // Iterate through all children
    const children = Array.from(sectionEl.children)

    for (const child of children) {
      const tagName = child.tagName.toLowerCase()

      // Skip section number and h2
      if (child.classList.contains('section-number') || tagName === 'h2') {
        continue
      }

      if (tagName === 'h3') {
        // Save previous subsection
        if (currentSubsection) {
          subsections.push(currentSubsection)
        }

        const subTitle = child.textContent?.trim() || ''
        currentSubsection = {
          id: subTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          title: subTitle,
          content: []
        }
      } else if (currentSubsection) {
        parseElement(child, currentSubsection)
      }
    }

    // Don't forget the last subsection
    if (currentSubsection) {
      subsections.push(currentSubsection)
    }

    sections.push({
      id: sectionId,
      title: sectionTitle,
      subsections
    })
  })

  return {
    title,
    subtitle,
    intro,
    version: '1.0',
    generatedAt: new Date().toISOString(),
    sections,
    quickRef
  }
}

// Main
const htmlPath = './docs/reference.html'
const jsonPath = './docs/reference.json'

const html = readFileSync(htmlPath, 'utf-8')
const reference = parseHTML(html)

writeFileSync(jsonPath, JSON.stringify(reference, null, 2))

console.log(`Parsed ${reference.sections.length} sections`)
console.log(`Quick Ref: ${reference.quickRef.length} categories`)
console.log(`Written to ${jsonPath}`)

// Print summary
reference.sections.forEach(section => {
  console.log(`\n${section.title} (${section.id})`)
  section.subsections.forEach(sub => {
    console.log(`  - ${sub.title} (${sub.content.length} blocks)`)
  })
})
