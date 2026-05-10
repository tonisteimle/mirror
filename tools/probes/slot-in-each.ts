/**
 * Probe — Slot inside Each-loop / Conditional.
 *
 * Findings doc claims `transformInstance` mishandles Slot in
 * EachChild/Conditional path: dispatches as Instance, hits
 * `if (!instance.component)` and emits „Instance missing component
 * name" warning instead of going through `transformSlotPrimitive`.
 *
 * Question: does Mirror DSL even produce a Slot AST inside
 * Each-template/Conditional? If yes, what currently happens?
 */

import { generateDOM, parse } from '../../compiler'

function probe(label: string, src: string): void {
  console.log(`\n=== ${label} ===`)
  const ast = parse(src)
  if (ast.errors.length) {
    console.log('  parse errors:', ast.errors.map(e => e.message).join(' | '))
  }
  try {
    const dom = generateDOM(ast)
    const warnings = dom.match(/Warning: [^\n]+/g) ?? []
    if (warnings.length) {
      console.log('  warnings:', warnings.slice(0, 3).join(' | '))
    } else {
      console.log('  (no warnings)')
    }
    const missingComponent = dom.match(/Instance missing component name/) !== null
    console.log('  „Instance missing component name" emitted:', missingComponent)
  } catch (e) {
    console.log('  threw:', (e as Error).message.slice(0, 200))
  }
}

probe(
  'A) Slot inside component used in each loop (canonical)',
  `Card:
  Body:
    pad 16

cards:
  c1:
    title: "A"
  c2:
    title: "B"

each card in $cards
  Card
    Body
      Text "$card.title"`
)

probe(
  'B) Bare Slot reference inside each (probably nonsensical)',
  `each item in $items
  Slot Title`
)

probe(
  'C) Slot inside if-block',
  `Card:
  Body:
    pad 16

if loggedIn
  Card
    Body
      Text "Welcome"`
)

probe(
  'D) Nested if (ConditionalNode in then-branch — type-system lie)',
  `if outer
  if inner
    Text "Both"
  else
    Text "Only outer"
else
  Text "None"`
)

probe(
  'E) each inside if (Each in then-branch)',
  `items:
  i1:
    name: "X"

if visible
  each item in $items
    Text "$item.name"`
)
