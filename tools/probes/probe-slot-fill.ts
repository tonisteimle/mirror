import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'
import { generateDOM } from '../../compiler/backends/dom'

const src = `Card: bg #1a1a1a, gap 8, pad 16, rad 8
  Title: col white, fs 18, weight bold
  Body: col #888, fs 14
  Action: bg #2271C1, col white, pad 8 16, rad 6

Card
  Title "Hello"
  Body "World"
  Action "Click"`

console.log('=== React ===')
console.log(generateReact(parse(src)))
