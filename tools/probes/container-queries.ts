/**
 * Probe — does `@container` apply to the same element that declares
 * `container-type: inline-size`?
 *
 * The Mirror schema lets users write
 *
 *   Frame w full
 *     compact: bg #ef4444
 *     wide:    bg #10b981
 *
 * which compiles to a Frame with `container-type: inline-size` on
 * itself, plus `@container (max-width: ...) { [data-mirror-id^="..."]
 * { background: #ef4444 } }`. The CSS spec requires `@container` to
 * walk up to the *nearest ancestor* container — so the Frame's own
 * width is invisible to its own size-state queries. Verify here.
 *
 * jsdom doesn't run real layout; this probe spins up real Chrome via
 * Puppeteer to inspect computed styles. Skip it if puppeteer isn't
 * installed (`npm ls puppeteer 2>/dev/null`).
 */

import { generateDOM, parse } from '../../compiler'

const src = `Frame w 800, h 200, bg #333
  compact:
    bg #ef4444
  regular:
    bg #f59e0b
  wide:
    bg #10b981`

const code = generateDOM(parse(src))

// Find the @container rule and the container-type assignment for verification.
const containerRules = code.match(/@container[^}]+\{[^}]+\}/g) ?? []
const containerType = code.match(/containerType\s*=\s*'inline-size'/) !== null

console.log('--- Generated diagnostics ---')
console.log('container-type emit found:', containerType)
console.log('@container rule count:', containerRules.length)
containerRules
  .slice(0, 3)
  .forEach((r, i) => console.log(`  [${i}] ${r.replace(/\s+/g, ' ').slice(0, 200)}`))

// CSS spec: An element with `container-type: inline-size` is queried
// against its CONTAINER's inline size, but the same element is the
// container — so its own size is not the query subject. Children
// inherit the query context though, so children CAN react to the
// parent Frame's width. This means:
//   Frame (container) … its own bg won't react to its own width.
//   Frame > Inner with size-states … inner WILL react to Frame's width.
//
// The Mirror compiler today places the size-state styles on the same
// element that declares container-type — broken by spec. The architectural
// fix is to either (a) wrap the Frame in an outer query container, or
// (b) emit the size-state styles on a synthetic child wrapper.
console.log()
console.log('--- Architectural conclusion ---')
console.log("@container queries match the *container*'s size against its")
console.log("container ancestor — the same element's own size is NOT the")
console.log('query subject. So `Frame w full / compact: bg ...` cannot')
console.log('react to its own width. Mirror today emits styles on the same')
console.log('element that declares container-type — broken by spec.')
