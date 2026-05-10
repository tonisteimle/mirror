/**
 * Probe: confirm that the parser does not infinite-loop on nested state
 * blocks. Used to validate whether the pre-flight check in
 * `studio/agent/generation-pipeline.ts:detectPreflightIssues` is still
 * load-bearing or whether the parser has become defensive enough that
 * the pre-flight is redundant.
 *
 * Run with `npx tsx tools/probes/parser-nested-state.ts`.
 */

import { parse } from '../../compiler/parser/parser'

const cases = [
  {
    name: 'hover inside on',
    src: `Box: bg #fff
  on:
    bg #eee
    hover:
      bg #ddd
`,
  },
  {
    name: 'hover inside hover (deepest case)',
    src: `Box: bg #fff
  hover:
    bg #eee
    hover:
      bg #ddd
`,
  },
  {
    name: 'three-deep nesting',
    src: `Box: bg #fff
  hover:
    on:
      active:
        bg #ddd
`,
  },
]

for (const c of cases) {
  const start = Date.now()
  const result = parse(c.src)
  const elapsed = Date.now() - start
  const errCount = result.errors?.length ?? 0
  console.log(`[${c.name}] parsed in ${elapsed}ms; errors: ${errCount}`)
  if (errCount > 0 && process.argv.includes('-v')) {
    for (const err of result.errors ?? []) {
      console.log('  ', err.message)
    }
  }
}
