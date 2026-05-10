import { parse, generateDOM } from '../../compiler'
import { readFileSync } from 'fs'

function extractUserCode(code: string): string {
  const lines = code.split('\n')
  let start = -1
  let end = -1
  for (let i = 0; i < lines.length; i++) {
    if (
      start === -1 &&
      lines[i].match(/^\s*\/\/\s+\w/) &&
      i > 0 &&
      lines[i - 1].trim() === '' &&
      lines[i + 1] &&
      lines[i + 1].match(/^\s*const\s+node_\d+\w*\s*=/)
    ) {
      start = i
    }
    if (lines[i].includes('// Attach API methods directly')) {
      end = i
      break
    }
  }
  while (end > start && lines[end - 1].trim() === '') end--
  return lines.slice(start, end).join('\n')
}

for (const name of ['l10-stacked', 'l12-position']) {
  const src = readFileSync(`tests/fixtures/layout/${name}/input.mirror`, 'utf-8')
  const expected = readFileSync(`tests/fixtures/layout/${name}/expected.dom.js`, 'utf-8')
  const ast = parse(src)
  const out = extractUserCode(generateDOM(ast))
  console.log(`=== ${name} ===`)
  const eLines = expected.replace(/\n+$/, '').split('\n')
  const aLines = out.split('\n')
  let diffCount = 0
  for (let i = 0; i < Math.max(eLines.length, aLines.length); i++) {
    if (eLines[i] !== aLines[i]) {
      console.log(`L${i}: - ${eLines[i] ?? '<EOF>'}\n      + ${aLines[i] ?? '<EOF>'}`)
      diffCount++
      if (diffCount > 8) break
    }
  }
}
