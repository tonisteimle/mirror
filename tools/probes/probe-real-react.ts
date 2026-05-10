import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'
import * as fs from 'node:fs'

const files = [
  'examples/hotel-checkin.mirror',
  'examples/portfolio-advisor.mirror',
  'examples/address-manager.mirror',
  'examples/time-tracking.mirror',
]

for (const f of files) {
  if (!fs.existsSync(f)) continue
  const src = fs.readFileSync(f, 'utf8')
  console.log(`\n========== ${f} ==========`)
  try {
    const react = generateReact(parse(src))
    const fw = generateFramework(parse(src))
    // Hunt issues across both backends
    for (const [name, out] of [
      ['React', react],
      ['Framework', fw],
    ] as const) {
      const objCount = (out.match(/\[object Object\]/g) ?? []).length
      const literalDollar = out.match(/["'`]\$[a-z][a-zA-Z0-9_.-]*["'`]/g) ?? []
      const undefinedTokens = out.match(/'[a-z][a-zA-Z0-9_-]*':\s*undefined/g) ?? []
      console.log(
        `  [${name}] size: ${out.length}, [object Object]: ${objCount}, literal $: ${literalDollar.length}, undefined-tokens: ${undefinedTokens.length}`
      )
      if (literalDollar.length) console.log(`     literal $foo:`, literalDollar.slice(0, 3))
      if (undefinedTokens.length) console.log(`     'foo': undefined:`, undefinedTokens.slice(0, 3))
    }
  } catch (e) {
    console.log('  ERROR:', (e as Error).message)
  }
}
