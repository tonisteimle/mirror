import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'
import * as fs from 'node:fs'

const src = fs.readFileSync('examples/hospital-dashboard/dashboard.mirror', 'utf8')
const react = generateReact(parse(src))

const objCount = (react.match(/\[object Object\]/g) ?? []).length
const literalDollar = react.match(/["'`]\$[a-z][a-zA-Z0-9_.-]*["'`]/g) ?? []
const undefinedTokens = react.match(/'[a-z][a-zA-Z0-9_-]*':\s*undefined/g) ?? []
console.log(
  `size: ${react.length}, [object Object]: ${objCount}, literal $: ${literalDollar.length}, undefined-tokens: ${undefinedTokens.length}`
)
if (literalDollar.length) console.log('   ', literalDollar.slice(0, 8))
if (undefinedTokens.length) console.log('   ', undefinedTokens.slice(0, 8))

// Hunt for fishy patterns
const lines = react.split('\n')
const flags = new Map<string, number>()
const tally = (k: string) => flags.set(k, (flags.get(k) ?? 0) + 1)
for (const l of lines) {
  if (l.includes('NaN')) tally('NaN')
  if (l.match(/style=\{\{ \}\}/)) tally('empty-style')
  if (l.match(/style=.+display: 'flex'.+display: 'flex'/)) tally('duplicate-display')
  if (l.includes('px px')) tally('px-px')
}
console.log('flags:', Object.fromEntries(flags))
