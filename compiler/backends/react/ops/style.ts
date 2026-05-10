/**
 * React backend — Style cluster (Slice 8 of react-backend-decomp).
 *
 * The largest cluster of the React backend: maps every Mirror property to
 * its JSX-inline-style equivalent (`bg #2271C1` → `backgroundColor:
 * '#2271C1'`, `pad 12` → `padding: '12px'`, …), plus state-pseudo-class
 * aggregation for hover/focus/active/disabled.
 *
 * Exports:
 *   generateStyles      — main Mirror-prop → JSX-style record dispatcher.
 *   formatStyleObject   — record → JS object-literal string.
 *   formatStyleAsCSS    — record → kebab-case CSS declarations (for
 *                         `<style>`-block pseudo-class rules).
 *   collectStateGroups  — gather hover/focus/active/disabled props from
 *                         component definitions + shorthand instance
 *                         props (`hover-bg #444`).
 *   ReactStateContext   — accumulator type for the `<style>`-block walk.
 *
 * Private:
 *   applyFlagProperty   — flag-form props (`italic`/`underline`/`scroll`/…).
 *
 * Extracted from `compiler/backends/react.ts` per
 * `docs/refactoring/react-backend-decomp.md`. Behaviour is byte-
 * identical to the pre-extraction call sites.
 */

import type { Property, TokenDefinition, ComponentDefinition } from '../../../parser/ast'
import { isComputedExpression, isTokenReference } from '../../../parser/ast'
import { getDevicePreset } from '../../../schema/dsl'
import { nineZoneToFlex, singleAxisCenterToFlex } from '../../../schema/layout-defaults'
import { matchesCanonical } from '../../../schema/parser-helpers'
import { getTokenSuffix } from '../../../schema/token-suffixes'
import { animationShorthand } from '../../animations'
import type { ParentLayoutContext } from './layout'

export function generateStyles(
  properties: Property[],
  tokens: TokenDefinition[],
  parentContext: ParentLayoutContext = { type: null }
): Record<string, string | number> {
  const style: Record<string, string | number> = {}
  const tokenMap = new Map<string, string | number | boolean>()

  // Slice 2 V-6: chain-resolver follows `$ref` indirections recursively
  // with a visited set (cycle-safe) and an 8-hop cap. Suffix-aware:
  // when resolving `big.gap: $base`, candidates are `base.gap` first,
  // `base` as fallback — matching the DOM-cascade semantics from Slice 24.
  const resolveTokenChain = (
    ownerName: string,
    rawValue: string | number | boolean,
    visited: Set<string> = new Set()
  ): string | number | boolean => {
    if (typeof rawValue !== 'string' || !rawValue.startsWith('$')) return rawValue
    if (visited.has(ownerName) || visited.size >= 8) return rawValue
    visited.add(ownerName)
    const refName = rawValue.slice(1)
    const dotIdx = ownerName.lastIndexOf('.')
    const ownerSuffix = dotIdx >= 0 ? ownerName.slice(dotIdx) : ''
    const candidates = ownerSuffix ? [refName + ownerSuffix, refName] : [refName]
    for (const cand of candidates) {
      const found = tokens.find(t => {
        const n = t.name.startsWith('$') ? t.name.slice(1) : t.name
        return n === cand
      })
      if (found?.value !== undefined) {
        return resolveTokenChain(cand, found.value, visited)
      }
    }
    return rawValue
  }

  for (const token of tokens) {
    // Skip tokens without a value (data objects)
    if (token.value === undefined) continue

    // Store with both formats for flexible lookup
    const nameWithoutPrefix = token.name.startsWith('$') ? token.name.slice(1) : token.name
    const nameWithPrefix = '$' + nameWithoutPrefix

    // Resolve nested token references — Slice 2 V-6: full suffix-aware chain.
    // Was 1-hop without suffix; failed for `big.gap: $base` where `base.gap`
    // is the actual target. Recursive resolver follows the chain transitively.
    const resolvedValue = resolveTokenChain(nameWithoutPrefix, token.value)

    tokenMap.set(nameWithoutPrefix, resolvedValue)
    tokenMap.set(nameWithPrefix, resolvedValue)
  }

  // Helper to resolve token references
  // Converts booleans to 0/1 for CSS compatibility
  const resolveFromMap = (
    result: string | number | boolean | undefined,
    fallback: string
  ): string | number => {
    if (result === undefined) return fallback
    if (typeof result === 'boolean') return result ? 1 : 0
    return result
  }

  // Append `px` to numeric values for CSS-pixel properties (gap, pad, w, h,
  // bor, rad, fs, …). The Mirror parser hands every numeric DSL literal in
  // as a STRING (`gap 12` → values: ["12"]), so the long-standing
  // `typeof value === 'number'` check never matched and React emitted
  // `gap: '12'` — invalid CSS the browser silently dropped. Slice 2 V-1.
  // Accepts already-suffixed values (`12px`, `100%`, `var(--…)`) verbatim,
  // and only px-ifies bare numerics.
  const NUMERIC_RE = /^-?\d+(?:\.\d+)?$/
  // Slice 2 V-7: multi-value-aware. CSS shorthands like `pad 8 16` and
  // `gap 12 8` (row-gap column-gap) hand multiple bare-numeric tokens through
  // the pipeline as a space-joined string after the React loop joins
  // `prop.values`. Each numeric part gets `px`-suffixed; non-numeric parts
  // (already-suffixed `12px`, `var(--…)`, percent) pass through verbatim.
  const pxify = (v: string | number | boolean | object): string | number => {
    if (typeof v === 'number') return `${v}px`
    if (typeof v === 'string') {
      const parts = v.split(/\s+/)
      if (parts.length > 1 && parts.every(p => NUMERIC_RE.test(p))) {
        return parts.map(p => `${p}px`).join(' ')
      }
      if (NUMERIC_RE.test(v)) return `${v}px`
    }
    return v as string | number
  }
  // `propertyName` lets the resolver apply the same suffix-mapping the IR
  // does (`gap $sp` with `sp.gap: 12` → look up `sp.gap` first, fall back
  // to `sp`). Without this, React emitted the raw `$sp` literal while the
  // DOM backend correctly resolved via `var(--sp-gap)`. Slice 2 V-2.
  const lookupWithSuffix = (
    cleanName: string,
    propertyName?: string
  ): string | number | boolean | undefined => {
    if (propertyName) {
      const suffix = getTokenSuffix(propertyName)
      if (suffix) {
        const suffixed = cleanName + suffix
        const hit = tokenMap.get(suffixed) ?? tokenMap.get('$' + suffixed)
        if (hit !== undefined) return hit
      }
    }
    return tokenMap.get(cleanName) ?? tokenMap.get('$' + cleanName)
  }
  const resolve = (
    value: string | number | boolean | object,
    propertyName?: string
  ): string | number => {
    // Handle TokenReference objects
    if (typeof value === 'object' && value !== null && 'name' in value) {
      const tokenName = (value as { name: string }).name
      const cleanName = tokenName.startsWith('$') ? tokenName.slice(1) : tokenName
      return resolveFromMap(lookupWithSuffix(cleanName, propertyName), `$${cleanName}`)
    }
    // Handle string token references
    if (typeof value === 'string' && value.startsWith('$')) {
      const cleanName = value.slice(1)
      return resolveFromMap(lookupWithSuffix(cleanName, propertyName), value)
    }
    if (typeof value === 'boolean') return value ? 1 : 0
    return value as string | number
  }

  // Slice 4 V-1: pre-scan for explicit `hor`/`ver` direction so 9-zone
  // aliases can be mapped direction-aware. The IR layout-transformer does
  // the same in two passes (collect direction first, then resolve
  // alignment); single-pass with a pre-scan keeps the React output cross-
  // backend-equivalent without restructuring the whole switch.
  const layoutDirection: 'row' | 'column' = (() => {
    for (const p of properties) {
      if (p.values.length === 0 || (p.values.length === 1 && p.values[0] === true)) {
        if (matchesCanonical(p.name, 'horizontal')) return 'row'
        if (matchesCanonical(p.name, 'vertical')) return 'column'
      }
    }
    return 'column'
  })()

  for (const prop of properties) {
    // Handle flag properties (no values) first
    if (prop.values.length === 0) {
      // Slice 4 V-1: 9-zone aliases (`tl`/`tc`/`tr`/`cl`/`cr`/`bl`/`bc`/`br`
      // + long forms `top-left`…`bottom-right` + `cen` alias for center).
      // Lookup-driven via `nineZoneToFlex` so the 18 aliases share the same
      // schema-side single-source-of-truth as the IR layout-transformer.
      const zoneFlex = nineZoneToFlex(prop.name, layoutDirection)
      if (zoneFlex) {
        style.display = 'flex'
        style.justifyContent = zoneFlex.justifyContent
        style.alignItems = zoneFlex.alignItems
        continue
      }
      // Slice 5 V-2: single-axis center keywords (`hor-center`/`ver-center`)
      // are direction-aware and pin EXACTLY ONE axis. Previously the React
      // backend had no case for them and silently dropped both keywords.
      const singleAxisFlex = singleAxisCenterToFlex(prop.name, layoutDirection)
      if (singleAxisFlex) {
        style.display = 'flex'
        style[singleAxisFlex.property] = singleAxisFlex.value
        continue
      }
      if (applyFlagProperty(prop.name, style)) continue
    }

    // Inline ternaries on style props (`Frame bg active ? #2271C1 : #333`)
    // arrive as Conditional objects in `values[0]`. React has no Mirror
    // runtime, so we statically resolve the branch using the
    // compile-time `tokens` map. Bare-identifier conditions look up the
    // token's truthiness; unresolvable conditions drop the property
    // (better than emitting `[object Object]` into the style sheet).
    // Skip `content` — text-content ternaries are rendered as JSX
    // expressions by `renderTextSlot` and read directly from `getTextContent`.
    const firstVal = prop.values[0] as unknown
    let effectiveValues = prop.values as unknown[]
    if (
      prop.name !== 'content' &&
      typeof firstVal === 'object' &&
      firstVal !== null &&
      'kind' in firstVal &&
      (firstVal as { kind?: string }).kind === 'conditional'
    ) {
      const cond = firstVal as unknown as {
        condition: string
        then: string | number
        else: string | number
      }
      const condId = cond.condition.trim()
      // Only static-resolve when the condition is a single bare identifier
      // pointing at a known data token (`active: true`).
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(condId) && tokenMap.has(condId)) {
        effectiveValues = [tokenMap.get(condId) ? cond.then : cond.else]
      } else {
        // Complex condition — drop the property silently. DOM resolves it
        // through its runtime; React would need eval to do the same.
        continue
      }
    }

    // Computed expressions (`w $project.progress + "%"`) carry a multi-part
    // Expression node. They typically reference loop variables or runtime
    // data the React backend can't statically evaluate. Drop the property
    // silently — better than `width: [object Object]` in the inline style.
    if (isComputedExpression(firstVal)) {
      continue
    }

    // Token references with dotted names that don't resolve (typically loop
    // variables: `bg $project.color` inside `each project in $projects`).
    // Without this guard, `resolve()` falls back to the literal source string,
    // producing `'$project.color'` as the CSS value. DOM resolves them at
    // runtime via `$get`; React has no runtime for loop scope, so drop them.
    //
    // Suffix-aware: a `gap $sp` reference may resolve via `sp.gap`. Treat
    // any token whose name starts with `<head>.` as a match too — only the
    // truly-orphaned head names are loop variables we can't statically
    // evaluate.
    if (isTokenReference(firstVal)) {
      const tokenName = firstVal.name
      const head = tokenName.includes('.') ? tokenName.slice(0, tokenName.indexOf('.')) : tokenName
      const headExists = tokenMap.has(head) || tokenMap.has('$' + head)
      const suffixExists =
        !headExists &&
        Array.from(tokenMap.keys()).some(k => {
          const stripped = typeof k === 'string' && k.startsWith('$') ? k.slice(1) : k
          return typeof stripped === 'string' && stripped.startsWith(head + '.')
        })
      if (!headExists && !suffixExists) {
        continue
      }
    }

    // Gradient shorthand on bg / col: `bg grad #2271C1 #7c3aed`,
    // `bg grad-ver #f59e0b #ef4444`, `bg grad 45 #10b981 #2271C1`.
    // The IR's property-transformer handles this for the DOM backend;
    // React bypasses IR so we re-derive the same `linear-gradient(...)`
    // CSS here. Mirrors `compiler/ir/transformers/property-transformer.ts:118`.
    if (
      (matchesCanonical(prop.name, 'background') || matchesCanonical(prop.name, 'color')) &&
      effectiveValues.length >= 2 &&
      typeof effectiveValues[0] === 'string' &&
      (effectiveValues[0] === 'grad' || (effectiveValues[0] as string).startsWith('grad-'))
    ) {
      const gradType = effectiveValues[0] as string
      let angle = '90deg'
      let colorStart = 1
      if (gradType === 'grad-ver') {
        angle = '180deg'
      } else if (gradType === 'grad') {
        const maybeAngle = String(effectiveValues[1])
        if (/^\d+$/.test(maybeAngle)) {
          angle = `${maybeAngle}deg`
          colorStart = 2
        }
      }
      // Each color slot may be a literal hex (`#2271C1`), a TokenReference
      // (`$primary`), or a `$primary` source string. Resolve via the same
      // `resolve()` helper the rest of the switch uses so token-typed
      // gradient stops don't leak `[object Object]` into the CSS.
      const colors = effectiveValues
        .slice(colorStart)
        .map(v => String(resolve(v as string | number | boolean | object, prop.name)))
      if (colors.length >= 2) {
        const gradientValue = `linear-gradient(${angle}, ${colors.join(', ')})`
        const isTextGradient = matchesCanonical(prop.name, 'color')
        if (isTextGradient) {
          // Text-gradient pattern: paint via background, clip-to-text,
          // hide foreground color. Same fallback the DOM IR uses.
          style.background = gradientValue
          ;(style as Record<string, string | number>)['WebkitBackgroundClip'] = 'text'
          ;(style as Record<string, string | number>)['backgroundClip'] = 'text'
          style.color = 'transparent'
        } else {
          style.background = gradientValue
        }
        continue
      }
    }

    // Slice 2 V-7: multi-value-shorthand support — `pad 8 16` / `gap 12 8`
    // arrive as `values: ["8", "16"]` / `["12", "8"]`; join them as a single
    // space-separated string so `pxify` can multi-px-ify. Single values pass
    // through unchanged (no array wrapping). Token references and the like
    // are non-string objects — those bypass the join (only one value).
    const allBareStrings =
      effectiveValues.length > 1 && effectiveValues.every(v => typeof v === 'string')
    const rawValue = allBareStrings ? effectiveValues.join(' ') : effectiveValues[0]
    const value = resolve(rawValue as string | number | boolean | object, prop.name)

    // Slice 4 V-1: 9-zone aliases reach here as `values: [true]` (the parser
    // packs boolean flags this way). Same schema-side lookup as the
    // values.length===0 branch above so all 18 aliases share one path.
    if (prop.values.length === 1 && prop.values[0] === true) {
      const zoneFlex = nineZoneToFlex(prop.name, layoutDirection)
      if (zoneFlex) {
        style.display = 'flex'
        style.justifyContent = zoneFlex.justifyContent
        style.alignItems = zoneFlex.alignItems
        continue
      }
      // Slice 5 V-2: single-axis center keywords (mirror of the
      // values.length===0 branch).
      const singleAxisFlex = singleAxisCenterToFlex(prop.name, layoutDirection)
      if (singleAxisFlex) {
        style.display = 'flex'
        style[singleAxisFlex.property] = singleAxisFlex.value
        continue
      }
      // Most other flags reach here too — `italic`, `underline`, `truncate`,
      // `absolute`, `fixed`, `relative`, etc. The parser packs them as
      // `[true]` rather than empty values; route through the same dispatch
      // so layout/typography/position flags share one source of truth.
      if (applyFlagProperty(prop.name, style)) continue
    }

    // `align <value>` direction-aware alignment. The IR resolves these
    // through the layout-transformer; the React backend bypasses IR so
    // we re-derive the same flex mapping here. Pre-2026-05-10 React
    // dropped every `align top|bottom|left|right|center` keyword
    // silently — the rendered cross-axis defaulted to `flex-start`.
    if (prop.name === 'align') {
      style.display = 'flex'
      for (const v of prop.values) {
        const val = String(v).toLowerCase()
        if (layoutDirection === 'row') {
          if (val === 'top') style.alignItems = 'flex-start'
          else if (val === 'bottom') style.alignItems = 'flex-end'
          else if (val === 'center') {
            style.alignItems = 'center'
            style.justifyContent = 'center'
          } else if (val === 'left') style.justifyContent = 'flex-start'
          else if (val === 'right') style.justifyContent = 'flex-end'
        } else {
          if (val === 'top') style.justifyContent = 'flex-start'
          else if (val === 'bottom') style.justifyContent = 'flex-end'
          else if (val === 'center') {
            style.alignItems = 'center'
            style.justifyContent = 'center'
          } else if (val === 'left') style.alignItems = 'flex-start'
          else if (val === 'right') style.alignItems = 'flex-end'
        }
      }
      continue
    }

    switch (prop.name) {
      // Layout (with values - less common)
      case 'hor':
      case 'horizontal':
        style.display = 'flex'
        style.flexDirection = 'row'
        break
      case 'ver':
      case 'vertical':
        style.display = 'flex'
        style.flexDirection = 'column'
        break
      case 'wrap':
        style.flexWrap = 'wrap'
        break
      case 'spread':
        style.justifyContent = 'space-between'
        break

      // Alignment
      case 'left':
        style.justifyContent = 'flex-start'
        break
      case 'right':
        style.justifyContent = 'flex-end'
        break
      case 'top':
        style.alignItems = 'flex-start'
        break
      case 'bottom':
        style.alignItems = 'flex-end'
        break

      // Spacing
      case 'gap':
      case 'g':
        style.gap = pxify(value)
        break
      // Slice 2 V-5: gap-x/gap-y were previously dropped silently — DOM
      // emitted column-gap/row-gap correctly via the IR layout-transformer,
      // React's switch-case had no entry. Designers writing `Frame hor,
      // gap-x 16` saw the right preview in Studio (DOM) but the React
      // export lost the property. Now both axes emit independently;
      // CSS handles the merge with unified `gap` correctly (column-gap
      // / row-gap override the unified gap per axis).
      case 'gap-x':
      case 'gx':
        style.columnGap = pxify(value)
        break
      case 'gap-y':
      case 'gy':
        style.rowGap = pxify(value)
        break
      case 'pad':
      case 'padding':
      case 'p':
        style.padding = pxify(value)
        break
      case 'margin':
      case 'mar':
      case 'm':
        style.margin = pxify(value)
        break

      // Directional padding/margin shortcuts. Mirror exposes -x, -y plus
      // -t/-r/-b/-l aliases (CLAUDE.md: `pad-x N` = horizontal,
      // `pad-y N` = vertical, `pad-t` etc.). Schema-side longhand names
      // (`pad-top`, `padding-top`, …) are not in the DSL — only the
      // 4-character abbreviations.
      case 'pad-x':
      case 'px':
        style.paddingLeft = pxify(value)
        style.paddingRight = pxify(value)
        break
      case 'pad-y':
      case 'py':
        style.paddingTop = pxify(value)
        style.paddingBottom = pxify(value)
        break
      case 'pad-t':
      case 'pt':
        style.paddingTop = pxify(value)
        break
      case 'pad-r':
      case 'pr':
        style.paddingRight = pxify(value)
        break
      case 'pad-b':
      case 'pb':
        style.paddingBottom = pxify(value)
        break
      case 'pad-l':
      case 'pl':
        style.paddingLeft = pxify(value)
        break
      case 'mar-x':
      case 'mx':
        style.marginLeft = pxify(value)
        style.marginRight = pxify(value)
        break
      case 'mar-y':
      case 'my':
        style.marginTop = pxify(value)
        style.marginBottom = pxify(value)
        break
      case 'mar-t':
      case 'mt':
        style.marginTop = pxify(value)
        break
      case 'mar-r':
      case 'mr':
        style.marginRight = pxify(value)
        break
      case 'mar-b':
      case 'mb':
        style.marginBottom = pxify(value)
        break
      case 'mar-l':
      case 'ml':
        style.marginLeft = pxify(value)
        break

      // Slice 6 V-1: CSS Grid container. `Frame grid 12` → display: grid +
      // grid-template-columns: repeat(12, 1fr). Mirror's `grid auto N` shape
      // (`Frame grid auto 250`) compiles to `repeat(auto-fill, minmax(Npx,
      // 1fr))` — but the React parser hands those as separate values
      // (`['auto', '250']`); only the resolved number lands in `value`
      // here, so we look at the raw `prop.values` to detect the form.
      case 'grid': {
        style.display = 'grid'
        const v0 = prop.values[0]
        const v1 = prop.values[1]
        if (typeof v0 === 'string' && v0 === 'auto') {
          if (typeof v1 === 'string' && /^\d+$/.test(v1)) {
            style.gridTemplateColumns = `repeat(auto-fill, minmax(${v1}px, 1fr))`
          }
          // Bare `grid auto` without size → display only (matches DOM)
        } else {
          // Numeric form: `grid 12` → repeat(12, 1fr).
          const numStr = String(value)
          if (/^\d+$/.test(numStr) && Number(numStr) > 0) {
            style.gridTemplateColumns = `repeat(${value}, 1fr)`
          } else if (typeof value === 'string' && value.startsWith('var(')) {
            // Token already resolved to var(--foo-grid). Wrap in repeat()
            // so the CSS-var carries the column count.
            style.gridTemplateColumns = `repeat(${value}, 1fr)`
          }
        }
        break
      }
      // Slice 6 V-1: row-height for grid auto-rows.
      case 'row-height':
      case 'rh':
        style.gridAutoRows = pxify(value)
        break
      // Slice 6 V-1: dense packing for grid-auto-flow.
      case 'dense':
        style.gridAutoFlow = 'dense'
        break

      // Size. Slice 6 V-2: in grid-parent context, numeric `w`/`h` are
      // column/row spans, not pixel widths. Mirrors the IR's
      // `parentLayoutContext?.type === 'grid'` branch in
      // `compiler/ir/transformers/property-transformer.ts:431-454`.
      case 'w':
      case 'width':
        if (value === 'full') {
          style.width = '100%'
        } else if (value === 'hug') {
          style.width = 'fit-content'
        } else if (
          parentContext.type === 'grid' &&
          /^\d+$/.test(String(value)) &&
          Number(value) > 0
        ) {
          style.gridColumnEnd = `span ${value}`
          style.width = '100%'
        } else {
          style.width = pxify(value)
        }
        break
      case 'h':
      case 'height':
        if (value === 'full') {
          style.height = '100%'
        } else if (value === 'hug') {
          style.height = 'fit-content'
        } else if (
          parentContext.type === 'grid' &&
          /^\d+$/.test(String(value)) &&
          Number(value) > 0
        ) {
          style.gridRowEnd = `span ${value}`
          style.height = '100%'
        } else {
          style.height = pxify(value)
        }
        break
      // Slice 6 V-2: `x N` and `y N` are context-dependent. Inside a grid
      // parent → grid-column-start / grid-row-start. Outside grid → absolute
      // positioning with left/top (matches DOM-IR
      // property-transformer.ts:394-424).
      case 'x':
        if (parentContext.type === 'grid' && /^-?\d+$/.test(String(value))) {
          style.gridColumnStart = String(value)
        } else {
          style.position = 'absolute'
          style.left = pxify(value)
        }
        break
      case 'y':
        if (parentContext.type === 'grid' && /^-?\d+$/.test(String(value))) {
          style.gridRowStart = String(value)
        } else {
          style.position = 'absolute'
          style.top = pxify(value)
        }
        break

      case 'minw':
      case 'min-width':
        style.minWidth = pxify(value)
        break
      case 'maxw':
      case 'max-width':
        style.maxWidth = pxify(value)
        break
      case 'minh':
      case 'min-height':
        style.minHeight = pxify(value)
        break
      case 'maxh':
      case 'max-height':
        style.maxHeight = pxify(value)
        break

      // Colors
      case 'col':
      case 'color':
      case 'c':
        style.color = String(value)
        break
      case 'bg':
      case 'background':
        style.backgroundColor = String(value)
        break

      // Border
      case 'bor':
      case 'border':
        // bor wants `<n>px solid` — pxify alone wouldn't add the solid keyword.
        if (typeof value === 'number' || (typeof value === 'string' && NUMERIC_RE.test(value))) {
          style.border = `${value}px solid`
        } else {
          style.border = String(value)
        }
        break
      case 'boc':
      case 'border-color':
        style.borderColor = String(value)
        break

      // Directional border-width shortcuts. `bor-t 2` → border-top-width: 2px
      // + a `solid` style so the rule renders without `border-style`. The DOM
      // IR uses individual `border-{side}-width` + global `border-style`;
      // we mirror that by setting `borderTopStyle: 'solid'` (etc.) too.
      case 'bor-t':
      case 'bort':
        if (typeof value === 'number' || (typeof value === 'string' && NUMERIC_RE.test(value))) {
          style.borderTopWidth = `${value}px`
          style.borderTopStyle = 'solid'
        }
        break
      case 'bor-r':
      case 'borr':
        if (typeof value === 'number' || (typeof value === 'string' && NUMERIC_RE.test(value))) {
          style.borderRightWidth = `${value}px`
          style.borderRightStyle = 'solid'
        }
        break
      case 'bor-b':
      case 'borb':
        if (typeof value === 'number' || (typeof value === 'string' && NUMERIC_RE.test(value))) {
          style.borderBottomWidth = `${value}px`
          style.borderBottomStyle = 'solid'
        }
        break
      case 'bor-l':
      case 'borl':
        if (typeof value === 'number' || (typeof value === 'string' && NUMERIC_RE.test(value))) {
          style.borderLeftWidth = `${value}px`
          style.borderLeftStyle = 'solid'
        }
        break

      case 'rad':
      case 'radius':
        style.borderRadius = pxify(value)
        break

      // Typography
      case 'font-size':
      case 'fs':
        style.fontSize = pxify(value)
        break
      case 'weight':
        style.fontWeight = value
        break
      case 'font':
        style.fontFamily = String(value)
        break
      case 'line':
      case 'line-height':
        style.lineHeight = value
        break
      case 'tracking':
      case 'ls':
      case 'letter':
      case 'letter-spacing':
        // Mirror's `tracking N` is a unitless multiplier — IR emits
        // `letter-spacing: Nem`. React backend bypasses IR so we
        // reproduce the same em-suffixed shape here. Pre-2026-05-10 the
        // entire property dropped silently from React output.
        style.letterSpacing =
          typeof value === 'number'
            ? `${value}em`
            : /^-?\d+(\.\d+)?$/.test(String(value))
              ? `${value}em`
              : String(value)
        break

      // Visual
      case 'opacity':
      case 'o':
        style.opacity = value
        break
      case 'cursor':
        style.cursor = String(value)
        break
      case 'overflow':
        style.overflow = String(value)
        break
      case 'scroll':
        style.overflowY = 'auto'
        break
      case 'hidden':
        style.display = 'none'
        break

      // Device size presets: `Frame device mobile` → 375×812. Mirrors the
      // IR's properties-ops.ts `getDevicePreset` expansion. An explicit
      // `w`/`h` after `device` still wins because it gets emitted later
      // in the switch and overwrites the values set here.
      case 'device': {
        const preset = getDevicePreset(String(value))
        if (preset) {
          style.width = `${preset.width}px`
          style.height = `${preset.height}px`
        }
        break
      }

      // Animations: `Frame anim spin` → `animation: 'mirror-spin …'`.
      // The corresponding `@keyframes mirror-spin` rules are emitted as
      // a single `<style>` block at the top of App() — see
      // `containsAnimUsage` + `MIRROR_ANIMATION_STYLE_BLOCK`.
      case 'anim':
      case 'animation':
        style.animation = animationShorthand(String(value))
        break

      // Transforms: combine when multiple are present so `Frame rotate 45,
      // scale 1.2` emits `transform: rotate(45deg) scale(1.2)`. Mirrors the
      // DOM IR's TransformAccumulator semantics — single `transform` value
      // with all parts space-joined in declaration order.
      case 'rotate':
      case 'rot': {
        const deg = String(value)
        const part = `rotate(${deg}deg)`
        style.transform = style.transform ? `${style.transform} ${part}` : part
        break
      }
      case 'scale': {
        const part = `scale(${String(value)})`
        style.transform = style.transform ? `${style.transform} ${part}` : part
        break
      }

      // Aspect ratio: keywords `square`/`video` plus raw `N/M` or `N`.
      // Mirrors the DOM IR's aspect-ratio handling.
      case 'aspect': {
        const map: Record<string, string> = { square: '1', video: '16/9' }
        const v = String(value)
        style.aspectRatio = map[v] ?? v
        break
      }

      // Blur effects: numeric values get `px`; pre-suffixed strings pass through.
      case 'blur': {
        const v = String(value)
        const px = /^\d+(\.\d+)?$/.test(v) ? `${v}px` : v
        style.filter = `blur(${px})`
        break
      }
      case 'backdrop-blur':
      case 'blur-bg': {
        const v = String(value)
        const px = /^\d+(\.\d+)?$/.test(v) ? `${v}px` : v
        style.backdropFilter = `blur(${px})`
        ;(style as Record<string, string | number>)['WebkitBackdropFilter'] = `blur(${px})`
        break
      }

      // Box-shadow keyword presets: sm / md / lg map to standard depths.
      case 'shadow': {
        const v = String(value)
        const presets: Record<string, string> = {
          sm: '0 1px 2px rgba(0,0,0,0.1)',
          md: '0 4px 6px rgba(0,0,0,0.15)',
          lg: '0 10px 25px rgba(0,0,0,0.2)',
        }
        style.boxShadow = presets[v] ?? v
        break
      }

      // Stack order.
      case 'z':
      case 'z-index':
        style.zIndex = value
        break

      // Text alignment + decoration values.
      case 'text-align':
      case 'align-text':
        style.textAlign = String(value)
        break
    }
  }

  // Slice 7 V-3 (B-4): when both `grid` and `hor`/`ver` are set on a
  // container, the switch-cases above both write `display`. The
  // outcome depends on property order — either case leaves an
  // inconsistent style object: `display: flex + gridTemplateColumns`
  // (grid CSS without grid display, ignored by browser) or
  // `display: grid + flexDirection` (flex axis ignored). Force grid to
  // win when both signals are present: DOM-IR (layout-transformer.ts)
  // already emits `grid-auto-flow: row/column` instead of
  // `flexDirection`, and Validator E110 catches the conflict —
  // defensive React output keeps backends symmetric when validation is
  // skipped.
  if (style.gridTemplateColumns) {
    style.display = 'grid'
    if (style.flexDirection === 'row') style.gridAutoFlow = 'row'
    else if (style.flexDirection === 'column') style.gridAutoFlow = 'column'
    delete style.flexDirection
  }

  // Token-leak guard. If a style value is still a literal `$token` string,
  // that means the suffix-aware lookup couldn't resolve it (e.g.
  // `boc $accent` when only `accent.bg` and `accent.col` are defined —
  // `accent.boc` doesn't exist, and there's no plain `accent` value
  // either). The DOM backend silently drops such props because there's
  // no `var(--accent-boc)` either. Mirror that here instead of leaking
  // the literal `'$accent'` into the inline style — that string would
  // render as an invalid CSS value the browser ignores anyway, and it
  // confuses anyone reading the generated React.
  for (const k of Object.keys(style)) {
    const v = style[k]
    if (typeof v === 'string' && v.startsWith('$')) delete style[k]
  }

  return style
}

/**
 * Single-source-of-truth for flag-style Mirror properties (no value, or
 * `[true]`). Returns true when the name was recognized and a style was
 * applied so the caller can `continue` past the value-bearing pipeline.
 *
 * The parser produces both empty-values and `[true]`-values shapes for
 * flags depending on context, so the calling switch in `generateStyles`
 * routes both forms through here to keep one definition per CSS effect.
 * 9-zone and single-axis-center aliases stay at the call site since they
 * need the layout-direction context that flows from a sibling `hor`/`ver`.
 */
function applyFlagProperty(name: string, style: Record<string, string | number>): boolean {
  switch (name) {
    case 'hor':
    case 'horizontal':
      style.display = 'flex'
      style.flexDirection = 'row'
      return true
    case 'ver':
    case 'vertical':
      style.display = 'flex'
      style.flexDirection = 'column'
      return true
    case 'spread':
      style.justifyContent = 'space-between'
      return true
    case 'wrap':
      style.flexWrap = 'wrap'
      return true

    // Cross-axis baseline alignment for mixed-size text rows. The DOM
    // IR emits `align-items: baseline`; React used to fall through to
    // the default `flex-start` and silently flatten the alignment.
    case 'ver-baseline':
      style.alignItems = 'baseline'
      return true

    // Overflow.
    case 'scroll':
    case 'scroll-ver':
      style.overflowY = 'auto'
      return true
    case 'scroll-hor':
      style.overflowX = 'auto'
      return true
    case 'scroll-both':
      style.overflow = 'auto'
      return true
    case 'clip':
      style.overflow = 'hidden'
      return true

    // Visibility.
    case 'hidden':
      style.display = 'none'
      return true
    case 'visible':
      style.display = 'flex'
      return true

    // Position.
    case 'absolute':
    case 'abs':
      style.position = 'absolute'
      return true
    case 'fixed':
      style.position = 'fixed'
      return true
    case 'relative':
      style.position = 'relative'
      return true

    // Stacked overlay container — children with `x`/`y`/`abs` anchor
    // against this Frame. DOM IR emits `position: relative` for the
    // same reason; without it, absolute children jump to the viewport.
    case 'stacked':
      style.position = 'relative'
      return true

    // Typography flags.
    case 'italic':
      style.fontStyle = 'italic'
      return true
    case 'underline':
      style.textDecoration = 'underline'
      return true
    case 'uppercase':
      style.textTransform = 'uppercase'
      return true
    case 'lowercase':
      style.textTransform = 'lowercase'
      return true
    case 'truncate':
      // Triplet matches DOM IR's ellipsis-truncation output.
      style.overflow = 'hidden'
      style.textOverflow = 'ellipsis'
      style.whiteSpace = 'nowrap'
      return true

    // Flex-child shorthand flags.
    case 'grow':
      style.flexGrow = 1
      return true
    case 'shrink':
      style.flexShrink = 1
      return true

    default:
      return false
  }
}

export function formatStyleObject(style: Record<string, string | number>): string {
  const entries = Object.entries(style)
  if (entries.length === 0) return '{}'

  const parts = entries.map(([key, value]) => {
    const formattedValue = typeof value === 'string' ? `'${value}'` : value
    return `${key}: ${formattedValue}`
  })

  return `{ ${parts.join(', ')} }`
}

/**
 * Convert a JS-style record (`{ backgroundColor: '#555', fontSize: 18 }`) to
 * a CSS declaration string (`background-color: #555; font-size: 18;`).
 * Used to emit pseudo-class state rules (`:hover`, `:focus`, …) in a real
 * stylesheet — JSX `style={{ }}` doesn't support pseudo-selectors. Numeric
 * values flow through unchanged; React's px-conversion already happened
 * upstream in `generateStyles`.
 */
export function formatStyleAsCSS(style: Record<string, string | number>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(style)) {
    // camelCase → kebab-case, but keep `--custom-prop` intact.
    let cssKey: string
    if (key.startsWith('--')) {
      cssKey = key
    } else if (key.startsWith('Webkit') || key.startsWith('Moz') || key.startsWith('Ms')) {
      // Vendor prefixes: Webkit → -webkit-
      cssKey =
        '-' + key[0].toLowerCase() + key.slice(1).replace(/[A-Z]/g, m => '-' + m.toLowerCase())
    } else {
      cssKey = key.replace(/[A-Z]/g, m => '-' + m.toLowerCase())
    }
    parts.push(`${cssKey}: ${value}`)
  }
  return parts.join('; ')
}

/**
 * Accumulator for pseudo-class CSS rules emitted during the React tree
 * walk. `[data-h="N"]:hover { … }` rules need to live in a stylesheet
 * (JSX inline `style` can't carry pseudo-selectors), so we collect them
 * as we walk and emit a single `<style>` block at the top of `App()`.
 */
export interface ReactStateContext {
  rules: string[]
  counter: { value: number }
}

/**
 * Detect system-state blocks (`hover:`, `focus:`, `active:`, `disabled:`)
 * on a resolved component, plus shorthand `hover-X` / `focus-X` /
 * `active-X` / `disabled-X` properties on the instance/component. Returns
 * a per-state property list; empty if there's nothing to emit.
 */
export function collectStateGroups(
  compDef: ComponentDefinition | undefined,
  allProps: Property[]
): Array<{
  state: string
  properties: Property[]
  animation?: { duration?: number; easing?: string }
}> {
  const SYSTEM_STATES = ['hover', 'focus', 'active', 'disabled'] as const
  const groups: Record<string, Property[]> = {}
  const animations: Record<string, { duration?: number; easing?: string } | undefined> = {}

  // 1) State blocks from the component definition (`hover: bg #555`).
  for (const s of compDef?.states ?? []) {
    if (!SYSTEM_STATES.includes(s.name as (typeof SYSTEM_STATES)[number])) continue
    if (s.properties && s.properties.length > 0) {
      ;(groups[s.name] ??= []).push(...s.properties)
    }
    if (s.animation) animations[s.name] = s.animation
  }

  // 2) Shorthand props on the instance/component (`hover-bg #555`,
  //    `focus-boc #2271C1`, `active-opacity 0.8`, `disabled-opa 0.5`).
  for (const p of allProps) {
    for (const state of SYSTEM_STATES) {
      const prefix = `${state}-`
      if (p.name.startsWith(prefix)) {
        const stripped = p.name.slice(prefix.length)
        ;(groups[state] ??= []).push({
          ...p,
          name: stripped,
        } as Property)
        break
      }
    }
  }

  return Object.entries(groups)
    .filter(([, props]) => props.length > 0)
    .map(([state, properties]) => ({ state, properties, animation: animations[state] }))
}
