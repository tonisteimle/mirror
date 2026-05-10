import { parse } from '../../compiler/parser'

const src = `Card: bg #1a1a1a
  Title: col white, fs 14
  Body: col #888

Card
  Title "Hello"
  Body "World"`

const ast = parse(src) as any
console.log('=== components ===')
console.log(JSON.stringify(ast.components, null, 2).slice(0, 2000))
console.log('\n=== instances ===')
console.log(JSON.stringify(ast.instances, null, 2))
