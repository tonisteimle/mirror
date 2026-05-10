import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'
import * as fs from 'node:fs'

// Concatenate the multi-file project the way npm run export does.
const dir = 'examples/personas-informatik'
const files = ['tokens.tok', 'components.com', 'app.mir']
let src = ''
for (const f of files) {
  const path = `${dir}/${f}`
  if (fs.existsSync(path)) {
    src += fs.readFileSync(path, 'utf8') + '\n\n'
  }
}

console.log('combined src size:', src.length)
try {
  const react = generateReact(parse(src))
  console.log('react size:', react.length)
  // Issues
  const objCount = (react.match(/\[object Object\]/g) ?? []).length
  const literalDollar = react.match(/["'`]\$[a-z][a-zA-Z0-9_.-]*["'`]/g) ?? []
  const undefinedTokens = react.match(/'[a-z][a-zA-Z0-9_-]*':\s*undefined/g) ?? []
  console.log(
    `[object Object]: ${objCount}, literal $: ${literalDollar.length}, undefined-tokens: ${undefinedTokens.length}`
  )
  if (literalDollar.length) console.log('   ', literalDollar.slice(0, 8))
  // Dump first 2KB
  console.log('\n=== first 2KB ===')
  console.log(react.slice(0, 2000))
} catch (e) {
  console.log('ERROR:', (e as Error).message)
}
