import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'

const cases: [string, string][] = [
  [
    'toggle() with on:',
    `LikeBtn: bg #333, col #888, pad 12 20, rad 6, toggle()
  Text "Like"
  on:
    bg #ef4444
    col white
    Text "Liked!"

LikeBtn`,
  ],
  [
    'exclusive() Tabs',
    `Tab: pad 12 20, col #888, cursor pointer, exclusive()
  selected:
    col white

Frame hor
  Tab "Home", selected
  Tab "Profile"
  Tab "Settings"`,
  ],
  [
    'instance with on initial-state',
    `Btn: pad 10 20, bg #333, toggle()
  on:
    bg #2271C1

Btn "Active", on
Btn "Off"`,
  ],
]

for (const [label, src] of cases) {
  console.log('===', label, '===')
  const out = generateReact(parse(src))
  console.log(out.slice(0, 1800))
  console.log('...')
}
