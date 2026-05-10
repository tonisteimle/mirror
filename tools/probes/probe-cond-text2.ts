import { parse } from '../../compiler/parser'

const cases = [
  // Baseline
  `Text done ? "Yes" : "No"`,
  // Token reference works?
  `Text $on ? "Yes" : "No"`,
  // Dotted reference works?
  `Text $user.active ? "Yes" : "No"`,
  // Comparison with number?
  `Text $count > 0 ? "Has" : "Empty"`,
  // Comparison with string — the failing case:
  `Text $status == "online" ? "On" : "Off"`,
  // Just dotted with string:
  `Text $x.y == "a" ? "A" : "B"`,
  // Wrap in parens:
  `Text ($status == "online") ? "On" : "Off"`,
]

for (const src of cases) {
  console.log('===', src, '===')
  try {
    const ast = parse(src)
    // print first instance's content prop
    const items = (ast as any).children ?? (ast as any).items ?? []
    const first = items[0]
    if (first?.properties) {
      const content = first.properties.find((p: any) => p.name === 'content')
      console.log('  content prop:', JSON.stringify(content?.values).slice(0, 250))
    }
    console.log('  num root items:', items.length)
    console.log('  first.children:', JSON.stringify(first?.children).slice(0, 200))
  } catch (e) {
    console.log('  parse error:', (e as Error).message)
  }
  console.log()
}
