import { parse, generateDOM } from '../../compiler'
import { readFileSync } from 'fs'

const src = readFileSync('tests/fixtures/layout/l12-position/input.mirror', 'utf-8')
console.log('=== INPUT ===')
console.log(src)
console.log('=== OUTPUT (node_2 styles only) ===')
const out = generateDOM(parse(src))
const m = out.match(/Object\.assign\(node_2\.style, \{[\s\S]*?\}\)/)
console.log(m?.[0])
console.log('=== node_3 ===')
const m3 = out.match(/Object\.assign\(node_3\.style, \{[\s\S]*?\}\)/)
console.log(m3?.[0])
