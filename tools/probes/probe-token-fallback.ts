import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'

// `accent.bg` exists, `accent.boc` doesn't. What does each backend do
// for `boc $accent`?
const src = `accent.bg: #c9a961
accent.col: #c9a961

Frame boc $accent, bor 1, w 100, h 50`

console.log('=== DOM ===')
const dom = generateDOM(parse(src))
console.log(dom.match(/borderColor.*|--accent.*|var\(--accent.*/g))
console.log('\n=== React ===')
const react = generateReact(parse(src))
console.log(react)
