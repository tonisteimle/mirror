/**
 * Tutorial Example Extractor
 *
 * Extrahiert alle Code-Beispiele aus den Tutorial-HTML-Dateien.
 * Die Beispiele sind in <textarea> Tags innerhalb von .playground Containern.
 */

import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export interface TutorialChapter {
  name: string
  file: string
  examples: string[]
}

/**
 * Extrahiert alle Beispiele aus einer Tutorial-HTML-Datei
 */
function extractFromFile(filePath: string): string[] {
  const html = readFileSync(filePath, 'utf-8')
  const examples: string[] = []

  // Regex für <textarea>...</textarea> innerhalb von playground
  const textareaRegex = /<textarea[^>]*>([\s\S]*?)<\/textarea>/g
  let match

  while ((match = textareaRegex.exec(html)) !== null) {
    const code = match[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .trim()

    if (code) {
      examples.push(code)
    }
  }

  return examples
}

/**
 * Extrahiert Beispiele aus allen Tutorial-Kapiteln
 */
export function extractTutorialExamples(tutorialDir?: string): TutorialChapter[] {
  const dir = tutorialDir || join(__dirname, '../../../docs/tutorial/html')
  const chapters: TutorialChapter[] = []

  // Alle HTML-Dateien im Tutorial-Verzeichnis (sortiert)
  const files = readdirSync(dir)
    .filter(f => f.endsWith('.html') && f !== 'index.html')
    .sort()

  for (const file of files) {
    const filePath = join(dir, file)
    const examples = extractFromFile(filePath)

    if (examples.length > 0) {
      // Name aus Dateiname extrahieren (z.B. "01-elemente" -> "01 - elemente")
      const name = file
        .replace('.html', '')
        .replace(/-/g, ' ')
        .replace(/^(\d+)\s+/, '$1 - ')

      chapters.push({
        name,
        file,
        examples
      })
    }
  }

  return chapters
}

/**
 * Gibt Statistik über alle Tutorial-Beispiele aus
 */
export function printStats(): void {
  const chapters = extractTutorialExamples()
  let total = 0

  console.log('\nTutorial Examples Statistics:')
  console.log('=' .repeat(50))

  for (const chapter of chapters) {
    console.log(`${chapter.name}: ${chapter.examples.length} examples`)
    total += chapter.examples.length
  }

  console.log('=' .repeat(50))
  console.log(`Total: ${total} examples in ${chapters.length} chapters`)
}

// CLI: npx ts-node extract-examples.ts
const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  printStats()
}
