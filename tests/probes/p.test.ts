import { describe, it } from 'vitest'
import { readFileSync } from 'fs'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { writeFileSync } from 'fs'
describe('p', () => {
  it('address-manager', () => {
    const src = readFileSync('examples/address-manager.mirror', 'utf-8')
    const code = generateDOM(parse(src))
    const stripped = code.replace(/^export\s+function/gm, 'function')
    try {
      new Function(stripped)
      console.log('OK')
    } catch (e: any) {
      console.log('FAIL:', e.message)
      // Find where the error is
      const lines = stripped.split('\n')
      const m = e.stack?.match(/<anonymous>:(\d+):(\d+)/)
      if (m) {
        const ln = parseInt(m[1])
        for (let i = Math.max(0, ln - 5); i < Math.min(lines.length, ln + 5); i++) {
          console.log(`${i + 1}: ${lines[i]}`)
        }
      }
      writeFileSync('/tmp/addr.txt', code)
    }
  })
})
