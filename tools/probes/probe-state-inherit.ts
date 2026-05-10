import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'
import { generateDOM } from '../../compiler/backends/dom'

// Parent has hover, child doesn't override — should child still get parent's hover?
const src = `BaseBtn: pad 10, cursor pointer, bg #333
  hover:
    bg #555

ThemedBtn as BaseBtn: rad 8

ThemedBtn "X"`

console.log('=== React ===')
const react = generateReact(parse(src))
console.log(react)
console.log('\n=== DOM (hover-related) ===')
const dom = generateDOM(parse(src))
console.log(dom.match(/hover|background-color: #555|--.*hover.*|node_\d.*hover/g))
