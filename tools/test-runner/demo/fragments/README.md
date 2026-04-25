# Demo Fragments

Reusable demo step sequences. Each fragment exports a function that returns
`DemoAction[]`. Demos import fragments and spread them into their `steps`:

```ts
import { resetCanvas, paletteHighlight } from '../fragments/setup'

export const demoScript: DemoScript = {
  name: 'Some Demo',
  steps: [
    ...resetCanvas(),
    { action: 'comment', text: 'Drop a Frame' },
    ...paletteHighlight('comp-frame'),
    {
      action: 'dropFromPalette',
      component: 'Frame',
      target: { byId: 'node-1' },
      at: { kind: 'index', index: 0 },
    },
    // ...
  ],
}
```

## Conventions

- One fragment file = one cohesive responsibility (`setup.ts`, `card.ts`,
  `tokens.ts`, ...).
- Fragments accept options as a single object argument. All options are
  optional with sensible defaults.
- Fragments do **not** wrap themselves in a `DemoScript`. They return raw
  `DemoAction[]`.
- Comments / `wait`s for video pacing belong inside fragments — that's part
  of the value.
- A fragment should end with the same panel/cursor state it started with
  (no hidden side effects).

## Recommended split

- `setup.ts` — reset, prelude management, panel visibility
- `palette.ts` — palette navigation helpers (highlight component before drop)
- `card.ts` — basic card construction (frame + h1 + text + button)
- `tokens.ts` — token file creation, common token sets
- `inline-edits.ts` — common text replacements

A new fragment graduates to its own file once it is used in 2+ demos.
