/**
 * React backend — Icon cluster (Slice 4 of react-backend-decomp).
 *
 * The MirrorIcon runtime component is embedded once per React file
 * when any `Icon` instance is used. Mirrors `compiler/runtime/icons.ts`
 * — same Lucide CDN, same SVG sanitization (DOMParser, strip script
 * tags and event handlers), same fallback icon, same default
 * 24/2/currentColor, same custom-icon registry.
 *
 * `generateIconJSX` emits the per-instance `<MirrorIcon … />` element.
 * `getIconName` + `formatIconPropValue` are private — only used by the
 * JSX emitter.
 *
 * Why useEffect+fetch (vs `lucide-react` peer-dep or compile-time inline-
 * SVG): keeps the React export self-contained, mirrors the DOM backend
 * exactly so cross-backend differential tests round-trip cleanly, no
 * peer-dep needed.
 *
 * Extracted from `compiler/backends/react.ts` per
 * `docs/refactoring/react-backend-decomp.md`. Behaviour is byte-
 * identical to the pre-extraction call sites.
 */

import type { Instance, Conditional, TokenDefinition } from '../../../parser/ast'
import { matchesCanonical } from '../../../schema/parser-helpers'
import { animationShorthand } from '../../animations'
import { rewriteIdentifiersToTokens } from './text'

/**
 * MirrorIcon runtime component source. Embedded once per React file
 * when `containsIconInstance` returns true. Self-contained — depends
 * only on React (peer-dep) and the Lucide CDN bundle.
 */
export const MIRROR_ICON_COMPONENT = `// Mirror Icon component (Slice 50 V-2).
// Mirrors compiler/runtime/icons.ts: Lucide CDN fetch, SVG sanitize,
// default size 24, default stroke-width 2.
const _MIRROR_LUCIDE_CDN = 'https://unpkg.com/lucide-static/icons'
const _MIRROR_FALLBACK_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/></svg>'

function _mirrorSanitizeIconName(name) {
  if (!name || typeof name !== 'string') return null
  if (name.startsWith('__loopVar:') || name.startsWith('__conditional:')) return null
  if (!/^[a-z0-9\\-]+$/.test(name)) return null
  if (name.length > 50) return null
  return name
}

function _mirrorSanitizeSVG(svgText) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgText, 'image/svg+xml')
    if (doc.querySelector('parsererror')) return null
    const svg = doc.documentElement
    if (svg.tagName.toLowerCase() !== 'svg') return null
    for (const tag of ['script','foreignObject','use','image','a','style','defs','metadata','animate','set']) {
      svg.querySelectorAll(tag).forEach(el => el.remove())
    }
    const dangerous = /^(on|href|xlink:href|src|data|formaction)/i
    for (const el of svg.querySelectorAll('*')) {
      for (const attr of Array.from(el.attributes)) {
        if (dangerous.test(attr.name) || attr.value.includes('javascript:')) {
          el.removeAttribute(attr.name)
        }
      }
    }
    return svg.outerHTML
  } catch {
    return null
  }
}

const _mirrorIconCache = new Map()

// Slice 51 V-1: Custom-Icon-Registry. Populated at compile-time from
// dollar-icons declarations (see compiler/backends/react.ts).
// MirrorIcon checks here first before falling through to Lucide-CDN.
const _MIRROR_CUSTOM_ICONS = {}

function _mirrorBuildCustomSvg(pathData, viewBox) {
  const paths = String(pathData).split(/[\\n|]/).map(p => p.trim()).filter(p => p.length > 0)
    .map(p => '<path d="' + p + '"/>').join('')
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (viewBox || '0 0 24 24') +
    '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>'
}

function MirrorIcon({ name, size, color, strokeWidth, fill, style: extraStyle }) {
  const [svg, setSvg] = React.useState(_mirrorIconCache.get(name) ?? '')
  React.useEffect(() => {
    // Slice 51 V-1: Custom-Icon-Registry takes precedence over Lucide-CDN.
    // Mirrors compiler/runtime/icons.ts:getIconSvg semantics.
    const custom = _MIRROR_CUSTOM_ICONS[name]
    if (custom) {
      setSvg(_mirrorBuildCustomSvg(custom.path, custom.viewBox))
      return
    }
    const safe = _mirrorSanitizeIconName(name)
    if (!safe) { setSvg(_MIRROR_FALLBACK_ICON); return }
    if (_mirrorIconCache.has(safe)) { setSvg(_mirrorIconCache.get(safe)); return }
    let cancelled = false
    fetch(_MIRROR_LUCIDE_CDN + '/' + safe + '.svg')
      .then(r => r.ok ? r.text() : null)
      .then(text => {
        if (cancelled) return
        const sanitized = text ? _mirrorSanitizeSVG(text) : null
        const final = sanitized ?? _MIRROR_FALLBACK_ICON
        _mirrorIconCache.set(safe, final)
        setSvg(final)
      })
      .catch(() => { if (!cancelled) setSvg(_MIRROR_FALLBACK_ICON) })
    return () => { cancelled = true }
  }, [name])
  // Apply size/color/stroke-width/fill to the inner SVG via inline style
  // and dangerouslySetInnerHTML — mirror the DOM backend's
  // applyIconToElement behavior. SVG inherits color via currentColor.
  const px = (v) => {
    if (v == null) return undefined
    const s = String(v)
    return /^\\d+(\\.\\d+)?$/.test(s) ? s + 'px' : s
  }
  const wrapStyle = {
    display: 'inline-flex',
    width: px(size) ?? '24px',
    height: px(size) ?? '24px',
    color: color ?? 'currentColor',
    flexShrink: 0,
  }
  // Post-process the cached SVG so size/stroke-width/fill apply uniformly.
  const dressed = React.useMemo(() => {
    if (!svg) return ''
    let out = svg
    const sw = strokeWidth != null ? String(strokeWidth) : '2'
    if (fill) {
      out = out.replace(/<svg([^>]*)>/, '<svg$1 fill="currentColor" stroke="none">')
    } else {
      out = out.replace(/stroke-width="[^"]*"/, 'stroke-width="' + sw + '"')
    }
    return out
  }, [svg, strokeWidth, fill])
  return React.createElement('span', {
    'data-component': 'Icon',
    'data-mirror-name': 'Icon',
    style: extraStyle ? Object.assign({}, wrapStyle, extraStyle) : wrapStyle,
    dangerouslySetInnerHTML: { __html: dressed },
  })
}`

/**
 * Slice 50 V-2: Render an Icon instance as `<MirrorIcon ... />`.
 * Reads `is`/`ic`/`iw`/`fill` (and aliases) directly from the instance
 * properties — no need to thread through the full style pipeline since
 * MirrorIcon applies them itself. Token references survive as the
 * `var(--…)` strings the resolver emits, which JSX accepts as inline
 * style values.
 */
export function generateIconJSX(
  instance: Instance,
  indent: string,
  tokens: TokenDefinition[] = []
): string {
  const iconName = getIconName(instance)
  const propAttrs: string[] = [`name=${JSON.stringify(iconName)}`]
  let animValue: string | null = null

  for (const p of instance.properties) {
    const v = p.values[0]
    if (matchesCanonical(p.name, 'icon-size')) {
      propAttrs.push(`size=${formatIconPropValue(v, 'is', tokens)}`)
    } else if (matchesCanonical(p.name, 'icon-color')) {
      propAttrs.push(`color=${formatIconPropValue(v, 'ic', tokens)}`)
    } else if (matchesCanonical(p.name, 'icon-weight')) {
      propAttrs.push(`strokeWidth=${formatIconPropValue(v, 'iw', tokens)}`)
    } else if (p.name === 'fill') {
      propAttrs.push(`fill`)
    } else if (matchesCanonical(p.name, 'animation')) {
      animValue = animationShorthand(String(v))
    }
  }

  // Pass animations through as an inline style — MirrorIcon spreads
  // unknown props onto the rendered SVG. `Icon "loader", anim spin` is
  // the canonical usage (loading spinner) so this is the most-used path.
  if (animValue) {
    propAttrs.push(`style={{ animation: ${JSON.stringify(animValue)} }}`)
  }

  return `${indent}<MirrorIcon ${propAttrs.join(' ')} />`
}

function getIconName(instance: Instance): string {
  // Icon name lives as the first string positional arg / textContent.
  // Mirror parser stores it depending on form — try both.
  for (const p of instance.properties) {
    if (p.name === 'content' || p.name === 'textContent') {
      const v = p.values[0]
      if (typeof v === 'string') return v
    }
  }
  return ''
}

/**
 * Slice 50 V-2: format a property value for the MirrorIcon JSX prop.
 *
 * `propAlias` is the short Mirror name (`is`/`ic`/`iw`) so we can apply
 * the same suffix resolution the IR token-resolver uses (`is` → `.is`,
 * `ic` → `.ic`, etc.). Without this the React backend emitted
 * `var(--iconSize)` while the DOM backend declared the CSS variable as
 * `--iconSize-is` — cross-backend variable-name mismatch, MirrorIcon
 * would silently fall back to default size.
 */
function formatIconPropValue(
  v: unknown,
  propAlias: 'is' | 'ic' | 'iw',
  tokens: TokenDefinition[] = []
): string {
  if (v == null) return '{undefined}'
  if (typeof v === 'number') return `{${v}}`
  if (typeof v === 'boolean') return `{${v}}`
  if (typeof v === 'string') {
    // Bare numeric strings → number JSX expression.
    if (/^-?\d+(\.\d+)?$/.test(v)) return `{${v}}`
    return JSON.stringify(v)
  }
  if (typeof v === 'object' && v !== null && 'kind' in v) {
    // Inline ternary on an icon prop: `Icon "check", ic done ? green : gray`.
    // Pre-2026-05-10 this fell through to `JSON.stringify(String(v))` which
    // produced `color="[object Object]"` — the React render then crashed
    // when the MirrorIcon spread that string onto the SVG. Emit a JSX
    // expression carrying the rewritten condition (token names → tokens["..."]).
    const cond = v as Conditional
    if (cond.kind === 'conditional') {
      const c = rewriteIdentifiersToTokens(cond.condition, tokens)
      const fmt = (branch: unknown) => {
        if (typeof branch === 'string') return JSON.stringify(branch)
        if (typeof branch === 'number') return String(branch)
        return JSON.stringify(String(branch))
      }
      return `{${c} ? ${fmt(cond.then)} : ${fmt(cond.else)}}`
    }
  }
  if (typeof v === 'object' && v !== null && 'name' in v) {
    // Token reference — emit as `var(--<name>-<suffix>)` string matching
    // the suffix-aware CSS variable declaration emitted by the DOM/state
    // pipeline. The suffix is the same one `compiler/schema/token-suffixes.ts`
    // uses (alias-keyed: `is`→`.is`, `ic`→`.ic`, `iw`→`.iw`).
    const tokenName = (v as { name: string }).name.replace(/^\$/, '')
    const cssVarName = `${tokenName.replace(/\./g, '-')}-${propAlias}`
    return JSON.stringify(`var(--${cssVarName})`)
  }
  return JSON.stringify(String(v))
}
