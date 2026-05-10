import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'

const cases: [string, string][] = [
  // Each over inline array
  ['inline array', `each x in [1, 2, 3]\n  Text "$x"`],
  // Each over collection with .count
  ['count agg', `tasks:\n  t1: {}\n  t2: {}\n\nText "$tasks.count items"`],
  // Each over .first
  [
    'first agg',
    `users:\n  max:\n    name: "Max"\n  anna:\n    name: "Anna"\n\nText "$users.first.name"`,
  ],
  // Multiple eaches sibling
  [
    'parallel each',
    `tasks:\n  t1:\n    title: "A"\n\neach t in $tasks\n  Text "1: $t.title"\n\neach t in $tasks\n  Text "2: $t.title"`,
  ],
  // Each inside conditional
  [
    'cond + each',
    `loggedIn: true\ntasks:\n  t1:\n    title: "A"\n\nif loggedIn\n  each t in $tasks\n    Text "$t.title"`,
  ],
  // Computed prop
  [
    'computed style',
    `projects:\n  p1:\n    progress: 50\n\neach p in $projects\n  Frame w $p.progress, h 6, bg blue`,
  ],
  // Computed expression in text
  ['computed text', `count: 5\n\nText "Total: " + count`],
  // Nested data with deep ref
  [
    'deep nested',
    `app:\n  user:\n    profile:\n      name: "Max"\n\nText "$app.user.profile.name"`,
  ],
  // Frame stacked
  ['stacked', `Frame stacked, w 100, h 100\n  Text "Bg"\n  Text "Overlay", x 10, y 10`],
  // Heading via H1/H2
  ['h1 h2', `H1 "Title"\nH2 "Subtitle"`],
  // Section
  ['section', `Section\n  H1 "Heading"\n  Text "Body"`],
]

for (const [label, src] of cases) {
  console.log('===', label, '===')
  try {
    const out = generateReact(parse(src))
    const body = out.split('\n').filter(l => l.trim().startsWith('<') || l.trim().startsWith('{'))
    console.log(
      body
        .slice(0, 6)
        .map(l => '  ' + l.trim())
        .join('\n')
    )
  } catch (e) {
    console.log('  ERROR:', (e as Error).message)
  }
}
