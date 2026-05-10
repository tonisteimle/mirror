import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'

const cases: [string, string][] = [
  ['onclick toast', `Button "Click", onclick toast("Hi")`],
  ['onclick copy', `Button "Copy", onclick copy("Hello")`],
  ['onclick openUrl', `Button "Visit", onclick openUrl("https://example.com")`],
  ['onclick back', `Button "Back", onclick back()`],
  ['onhover toast', `Frame onhover toast("hover")\n  Text "X"`],
  ['onenter toast', `Input onenter toast("enter")`],
  ['onkeydown enter', `Input onkeydown(enter) toast("Y")`],
  ['onkeydown escape', `Input onkeydown(escape) toast("Esc")`],
  ['multi-keydown', `Input onkeydown(enter) toast("E")\n  onkeydown(escape) toast("Esc")`],
  ['unsupported (increment)', `count: 0\n\nButton "X", onclick increment(count)`],
  ['multi-action', `Button "X", onclick toast("Hi"), copy("World")`],
]

for (const [label, src] of cases) {
  console.log('===', label, '===')
  const out = generateReact(parse(src))
  // Find the JSX line(s) containing the handler
  const lines = out.split('\n')
  for (const line of lines) {
    if (/onClick|onMouseEnter|onKeyDown|onFocus|onBlur|onChange|onInput/.test(line)) {
      console.log(line.trim())
    }
  }
}
