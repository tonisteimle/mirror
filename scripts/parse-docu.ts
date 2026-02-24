/**
 * Parse tutorial.html into structured JSON
 * Run with: npx tsx scripts/parse-docu.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { JSDOM } from 'jsdom'

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

function parseElement(el: Element, subsection: Subsection): void {
  const tagName = el.tagName.toLowerCase()

  // Skip lead paragraphs (handled separately)
  if (tagName === 'p' && el.classList.contains('lead')) {
    return
  }

  // Paragraph
  if (tagName === 'p') {
    const text = el.textContent?.trim()
    if (text) {
      subsection.content.push({ type: 'paragraph', text })
    }
    return
  }

  // H4 headings - add as paragraph with special formatting
  if (tagName === 'h4') {
    const text = el.textContent?.trim()
    if (text) {
      subsection.content.push({ type: 'paragraph', text: `**${text}**` })
    }
    return
  }

  // Mirror editor (code playground)
  if (el.classList.contains('mirror-editor')) {
    const code = el.getAttribute('data-code')
    if (code) {
      subsection.content.push({ type: 'code', code: decodeHTMLEntities(code) })
    }
    return
  }

  // Exercise block
  if (el.classList.contains('exercise')) {
    const taskEl = el.querySelector('.exercise-task')
    const codeEl = el.querySelector('.mirror-editor')
    subsection.content.push({
      type: 'exercise',
      task: taskEl?.textContent?.trim(),
      code: codeEl ? decodeHTMLEntities(codeEl.getAttribute('data-code') || '') : undefined
    })
    return
  }

  // Unordered list
  if (tagName === 'ul') {
    const items = Array.from(el.querySelectorAll('li'))
      .map(li => li.textContent?.trim() || '')
      .filter(Boolean)
    if (items.length > 0) {
      subsection.content.push({ type: 'list', items })
    }
    return
  }

  // Rule box (contains ul)
  if (el.classList.contains('rule-box')) {
    const ul = el.querySelector('ul')
    if (ul) {
      const items = Array.from(ul.querySelectorAll('li'))
        .map(li => li.textContent?.trim() || '')
        .filter(Boolean)
      if (items.length > 0) {
        subsection.content.push({ type: 'list', items })
      }
    }
    return
  }

  // Pre (code block)
  if (tagName === 'pre') {
    const code = el.textContent?.trim()
    if (code) {
      subsection.content.push({ type: 'code', code })
    }
    return
  }

  // Grid, example, comparison - recurse into children
  // But skip exercise containers (they're handled above)
  if ((el.classList.contains('grid') ||
      el.classList.contains('example') ||
      el.classList.contains('comparison') ||
      tagName === 'div') &&
      !el.classList.contains('exercise')) {
    // Recurse into child elements
    Array.from(el.children).forEach(child => {
      parseElement(child, subsection)
    })
  }
}

function parseHTML(html: string): Documentation {
  const dom = new JSDOM(html)
  const doc = dom.window.document

  const sections: Section[] = []

  // Find all section elements
  const sectionElements = doc.querySelectorAll('section.concept')

  sectionElements.forEach((sectionEl) => {
    const sectionId = sectionEl.getAttribute('id') || ''
    const h2 = sectionEl.querySelector('h2')
    const sectionTitle = h2?.textContent?.trim() || ''

    // Get lead paragraph
    const leadEl = sectionEl.querySelector('p.lead')
    const lead = leadEl?.textContent?.trim()

    const subsections: Subsection[] = []
    let currentSubsection: Subsection | null = null

    // Iterate through all children
    const children = Array.from(sectionEl.children)

    for (const child of children) {
      const tagName = child.tagName.toLowerCase()

      if (tagName === 'h3') {
        // Save previous subsection
        if (currentSubsection) {
          subsections.push(currentSubsection)
        }

        // Start new subsection
        currentSubsection = {
          id: child.getAttribute('id') || '',
          title: child.textContent?.trim() || '',
          content: []
        }
      } else if (currentSubsection) {
        // Add content to current subsection
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
      lead,
      subsections
    })
  })

  return {
    title: 'Mirror Documentation',
    version: '1.0',
    generatedAt: new Date().toISOString(),
    sections
  }
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&#10;/g, '\n')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

// Main
const htmlPath = './docs/tutorial.html'
const jsonPath = './docs/tutorial.json'

const html = readFileSync(htmlPath, 'utf-8')
const documentation = parseHTML(html)

writeFileSync(jsonPath, JSON.stringify(documentation, null, 2))

console.log(`Parsed ${documentation.sections.length} sections`)
console.log(`Written to ${jsonPath}`)

// Print summary
documentation.sections.forEach(section => {
  console.log(`\n${section.title} (${section.id})`)
  section.subsections.forEach(sub => {
    console.log(`  - ${sub.title} (${sub.content.length} blocks)`)
  })
})
