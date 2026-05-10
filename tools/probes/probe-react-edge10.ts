import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'

const cases: [string, string][] = [
  // Inherit from component with hover state
  [
    'inherit hover state',
    `Btn: pad 10, bg #333, cursor pointer\n  hover:\n    bg #555\n\nPrimaryBtn as Btn: bg #2271C1\n  hover:\n    bg #1d5e9c\n\nPrimaryBtn "X"`,
  ],
  // Multi-level inheritance with state
  [
    'multi-level state',
    `BaseBtn: pad 10, cursor pointer\n  hover:\n    opacity 0.9\nThemedBtn as BaseBtn: bg #333\n\nThemedBtn "X"`,
  ],
  // Component with children + state-block-with-children
  [
    'comp w state-children',
    `Liker: pad 12, bg #333, toggle()\n  Icon "heart", ic #888\n  Text "Like"\n  on:\n    bg #ef4444\n    Icon "heart", ic white, fill\n    Text "Liked"\n\nLiker, on`,
  ],
  // Multiple instances differ in their initial state
  [
    'multi-instance with states',
    `Tab: pad 12 20, exclusive()\n  selected:\n    col blue\n\nFrame hor\n  Tab "A"\n  Tab "B", selected\n  Tab "C"`,
  ],
  // Custom state (not toggle/exclusive)
  [
    'custom state',
    `Status: pad 8 16, rad 6\n  done:\n    bg #10b981\n    col white\n  pending:\n    bg #f59e0b\n    col white\n  todo:\n    bg #333\n    col #888\n\nStatus "Task 1", done\nStatus "Task 2", pending\nStatus "Task 3", todo`,
  ],
  // Conditional rendering inside instance with state
  [
    'cond + state',
    `loggedIn: true\n\nBtn: bg #333\n  hover:\n    bg #555\n\nif loggedIn\n  Btn "Logout"`,
  ],
]

for (const [label, src] of cases) {
  console.log('===', label, '===')
  try {
    const out = generateReact(parse(src))
    const lines = out.split('\n')
    const idx = lines.findIndex(l => l.trim().startsWith('<') && !l.includes('React'))
    console.log(
      lines
        .slice(idx, idx + 6)
        .map(l => '  ' + l.trim())
        .join('\n')
        .slice(0, 800)
    )
  } catch (e) {
    console.log('  ERROR:', (e as Error).message)
  }
}
