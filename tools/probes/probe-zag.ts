import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'
import { generateDOM } from '../../compiler/backends/dom'

const cases: [string, string][] = [
  ['DatePicker basic', `DatePicker placeholder "Datum wählen"`],
  ['DatePicker with min/max', `DatePicker placeholder "Pick", min "2024-01-01", max "2024-12-31"`],
  ['DatePicker range', `DatePicker selectionMode range`],
  ['DatePicker positioning', `DatePicker positioning bottom-end`],
]

for (const [label, src] of cases) {
  console.log('===', label, '===')
  try {
    const dom = generateDOM(parse(src))
    const react = generateReact(parse(src))
    const fw = generateFramework(parse(src))
    console.log(`  DOM: ${dom.length} bytes, has DatePicker:`, dom.includes('DatePicker'))
    console.log(`  React: ${react.length} bytes, has DatePicker:`, react.includes('DatePicker'))
    console.log(`  Framework: ${fw.length} bytes, has DatePicker:`, fw.includes('DatePicker'))
    // First non-import line
    const reactLines = react.split('\n')
    const idx = reactLines.findIndex(l => l.trim().startsWith('<') && !l.includes('React'))
    console.log('  React JSX:', reactLines[idx]?.trim().slice(0, 240))
  } catch (e) {
    console.log('  ERROR:', (e as Error).message)
  }
}
