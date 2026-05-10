import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'

const cases: [string, string][] = [
  // pseudo states
  ['hover only', `Btn: bg #333\n  hover:\n    bg #555\n\nBtn "X"`],
  // hover-bg shorthand
  ['hover-bg shorthand', `Button "X", bg #333, hover-bg #555`],
  // multiple instances of same component
  ['multi instances', `Btn: bg #333, pad 10\n\nBtn "A"\nBtn "B"\nBtn "C"`],
  // Each with index?
  [
    'each index',
    `tasks:\n  t1:\n    title: "A"\n  t2:\n    title: "B"\n\neach task,i in $tasks\n  Text "$i: $task.title"`,
  ],
  // OrderBy
  [
    'orderBy',
    `tasks:\n  t1:\n    pri: 2\n  t2:\n    pri: 1\n\neach t in $tasks by pri\n  Text "$t.pri"`,
  ],
  // Where filter
  [
    'where filter',
    `tasks:\n  t1:\n    done: true\n  t2:\n    done: false\n\neach t in $tasks where t.done\n  Text "$t.title"`,
  ],
  // Compound conditional
  ['compound cond', `a: 5\nb: 10\n\nif a > 0 && b > 0\n  Text "Both"`],
  // Inline ternary in style with $token
  [
    'ternary with token',
    `accent.bg: green\ndanger.bg: red\nactive: true\n\nFrame bg active ? $accent : $danger, w 100, h 50`,
  ],
  // Form with multiple fields
  [
    'form with multiple',
    `name: ""\nemail: ""\n\nFrame gap 12\n  Input bind name, placeholder "Name"\n  Input bind email, placeholder "Email"\n  Button "Submit", onclick toast("Submitted")`,
  ],
]

for (const [label, src] of cases) {
  console.log('===', label, '===')
  try {
    const out = generateReact(parse(src))
    // Extract main JSX body
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
