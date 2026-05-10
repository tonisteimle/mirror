/**
 * React backend — Text & Expression cluster (Slice 6 of
 * react-backend-decomp).
 *
 * Mirror lets text reference data with `$name` / `$user.name` directly
 * inside string literals, and supports inline ternaries
 * (`done ? "Ja" : "Nein"`) and computed expressions
 * (`"Total: " + count`). The DOM backend resolves these via `$get(...)`
 * at runtime; React has no runtime, so this module compile-time-resolves
 * each form into a JSX-renderable expression.
 *
 * Exports — all called from `react.ts`:
 *   getTextContent           — pull the text slot off an Instance
 *   renderTextSlot           — emit one of: literal, conditional, expr
 *   interpolateStringForJSX  — `"Hi $name"` → `` {`Hi ${tokens["name"]}`} ``
 *   expressionPartsToJS      — ComputedExpression → JS expr string
 *   rewriteIdentifiersToTokens — `done ? a : b` → `tokens["done"] ? a : b`
 *
 * Private helpers (`inlineMarkdownToJSX`, `ternaryBranchToJS`) stay
 * file-local — they have no use outside the cluster.
 *
 * Extracted from `compiler/backends/react.ts` per
 * `docs/refactoring/react-backend-decomp.md`. Behaviour is byte-
 * identical to the pre-extraction call sites.
 */

import type {
  Instance,
  Property,
  TokenDefinition,
  LoopVarReference,
  Conditional,
  ComputedExpression,
} from '../../../parser/ast'

export function getTextContent(
  instance: Instance,
  properties: Property[]
): string | LoopVarReference | Conditional | ComputedExpression | null {
  // Check for content property
  for (const prop of properties) {
    if (prop.name === 'content' && prop.values.length > 0) {
      const v = prop.values[0]
      if (typeof v === 'string') return v
      // `each task in $tasks` puts `task.title` into a positional content
      // value as a LoopVarReference. JSX needs `{task.title}`, not the
      // literal string — return the ref so the caller emits the
      // expression form.
      if (typeof v === 'object' && v !== null && 'kind' in v && v.kind === 'loopVar') {
        return v as LoopVarReference
      }
      // Inline ternary in Text content (`Text done ? "Ja" : "Nein"`).
      // Returned as-is so the renderer can emit a JSX `{cond ? a : b}`
      // expression with token names rewritten to `tokens["…"]`.
      if (typeof v === 'object' && v !== null && 'kind' in v && v.kind === 'conditional') {
        return v as Conditional
      }
      // Computed concatenation/arithmetic in Text content
      // (`Text "Total: " + count`, `Text $first + " " + $last`).
      // Pre-2026-05-10 this fell through and returned null — the React
      // backend rendered an empty `<span />`. Now we forward the
      // expression so renderTextSlot emits a real JSX expression.
      if (typeof v === 'object' && v !== null && 'kind' in v && v.kind === 'expression') {
        return v as ComputedExpression
      }
    }
  }
  // Check for text child
  for (const child of instance.children) {
    if (child.type === 'Text') return child.content
  }
  return null
}

/**
 * Render the textContent slot, handling literal strings, loop-variable
 * references that surface inside `each` blocks, and inline ternaries.
 */
export function renderTextSlot(
  content: string | LoopVarReference | Conditional | ComputedExpression,
  indent: string,
  tokens: TokenDefinition[] = [],
  loopVars: ReadonlySet<string> | undefined = undefined
): string {
  if (typeof content === 'string') {
    // Mirror string content can carry `$name` / `$user.name` interpolations.
    // Resolve against the `tokens` object so the React emit shows the
    // actual data instead of a literal `$name`. Loop-var references
    // (`$t.title` inside `each t in …`) emit as JS expressions referring
    // to the iterator directly.
    return `${indent}${interpolateStringForJSX(content, tokens, loopVars)}`
  }
  if ('kind' in content && content.kind === 'conditional') {
    const cond = rewriteIdentifiersToTokens(content.condition, tokens)
    // Defensive: the parser sometimes builds a Conditional out of prose
    // text that just happens to contain `?` and `:` (e.g.
    // `**Key**: FH vs. Uni — wie wird das gesehen?` ends up as a
    // Conditional with an invalid-JS condition like `vs.Uni wie wird
    // das gesehen`). Emitting `{cond ? then : else}` with that string
    // produces unparseable JSX. Try the condition through Function and
    // if it throws, fall back to literal text content.
    try {
      new Function('tokens', `return (${cond})`)
    } catch {
      // Reconstruct the original-ish string so the user sees their
      // text instead of the broken ternary.
      const fallback = `${content.condition}${content.then ? ' ? ' + content.then : ''}${content.else ? ' : ' + content.else : ''}`
      return `${indent}${JSON.stringify(fallback).replace(/^/, '{').replace(/$/, '}')}`
    }
    // Branches may themselves be ternaries (`level == 1 ? "A" : level == 2 ? "B" : "C"`
    // arrives flattened into the else string). Run the same identifier
    // rewrite so nested conditions resolve through `tokens["…"]`.
    const thenBranch = rewriteIdentifiersToTokens(ternaryBranchToJS(content.then), tokens)
    const elseBranch = rewriteIdentifiersToTokens(ternaryBranchToJS(content.else), tokens)
    return `${indent}{${cond} ? ${thenBranch} : ${elseBranch}}`
  }
  if ('kind' in content && content.kind === 'expression') {
    // Computed expression in Text content (`Text "Total: " + count`,
    // `Text $first + " " + $last`). The parser emits a list of `parts`
    // separated by `operators`. Translate each part to a JS expression
    // and weave operators between them.
    return `${indent}{${expressionPartsToJS(content as ComputedExpression, tokens, loopVars)}}`
  }
  return `${indent}{${content.name}}`
}

/**
 * Translate a `ComputedExpression` (parts + operators) to a JS string
 * expression. Each part is one of:
 *   - string literal       → JSON.stringify(part)
 *   - number literal       → numeric form
 *   - LoopVarReference     → `task.title` (loop scope) or
 *                            `tokens["task"]?.title` (token scope)
 *   - TokenReference       → `tokens["count"]`
 *
 * Used for Text content (where we wrap the result in `{...}`) and
 * could be reused later for style props once raw-JSX style values are
 * supported.
 */
export function expressionPartsToJS(
  expr: ComputedExpression,
  tokens: TokenDefinition[],
  loopVars: ReadonlySet<string> | undefined
): string {
  const tokenNames = new Set<string>()
  for (const t of tokens) {
    const n = t.name.startsWith('$') ? t.name.slice(1) : t.name
    tokenNames.add(n)
  }
  const isOpenParen = (p: unknown): boolean => p === '('
  const isCloseParen = (p: unknown): boolean => p === ')'
  const partToJS = (part: unknown): string => {
    if (typeof part === 'string') {
      // Parens are structural — emit verbatim.
      if (part === '(' || part === ')') return part
      // String part with a `$ref` inside: the parser keeps quoted
      // strings whole, so `Text "$x.y" + " items"` arrives with parts
      // `["$x.y", " items"]` — the leading `$` survives through to
      // here. Run it through the same interpolator the standalone-
      // string path uses, then strip the JSX `{}` wrapper.
      if (part.includes('$')) {
        const wrapped = interpolateStringForJSX(part, tokens, loopVars)
        if (wrapped.startsWith('{') && wrapped.endsWith('}')) {
          return wrapped.slice(1, -1)
        }
        return wrapped
      }
      return JSON.stringify(part)
    }
    if (typeof part === 'number') return String(part)
    if (part && typeof part === 'object' && 'kind' in part) {
      const head = (part as { name?: string }).name ?? ''
      const headRoot = head.includes('.') ? head.slice(0, head.indexOf('.')) : head
      const rest = head.includes('.') ? head.slice(head.indexOf('.') + 1).split('.') : []
      // LoopVarReference resolves against the .map callback's iterator
      // when the head is in scope, otherwise we fall back to the token
      // bag (the parser uses `loopVar` for any bare identifier inside
      // an interpolation context, even when it's a top-level token).
      const isLoopScoped = loopVars?.has(headRoot) ?? false
      if (isLoopScoped) {
        return rest.length ? `${headRoot}.${rest.join('.')}` : headRoot
      }
      if (tokenNames.has(headRoot)) {
        let code = `tokens[${JSON.stringify(headRoot)}]`
        for (const part of rest) code += `?.${part}`
        return code
      }
      // Unknown identifier: best-effort emit the bare path.
      return rest.length ? `${headRoot}.${rest.join('.')}` : headRoot
    }
    return JSON.stringify(String(part))
  }
  // Weave parts and operators, paren-aware. Mirrors
  // `compiler/ir/transformers/expression-transformer.ts:buildExpressionString`:
  //   - skip the operator if the previous part was `(`
  //   - skip the operator if this part is `)`
  // Without this, `"+" + ($project.members - 2)` rendered as
  // `"+" + "(" - project.members 2 ")"` (invalid JSX).
  const out: string[] = []
  let opIndex = 0
  for (let i = 0; i < expr.parts.length; i++) {
    const part = expr.parts[i]
    const prev = i > 0 ? expr.parts[i - 1] : null
    if (i > 0 && !isOpenParen(prev) && !isCloseParen(part) && opIndex < expr.operators.length) {
      out.push(expr.operators[opIndex++])
    }
    out.push(partToJS(part))
  }
  return out.join(' ')
}

/**
 * Convert a Mirror text-content string into a JSX-renderable expression.
 *
 * Mirror lets text reference data with `$name` / `$user.name` directly
 * inside string literals: `Text "Hi $name"` and `Text "$user.name"`. The
 * DOM backend resolves these via `$get(...)` at runtime; React has no
 * runtime, so we compile-time-resolve into either a plain string literal
 * (no refs), a single token-lookup expression (one ref, whole content),
 * or a template literal that interleaves literal segments with token
 * accesses. Identifiers not matching any token name pass through untouched
 * — same conservative rule the conditional-rewriter uses.
 *
 * Outputs (always wrapped in `{...}` for JSX):
 *   "Hello"          → `{"Hello"}`
 *   "$name"          → `{tokens["name"]}`
 *   "Hi $name"       → `` {`Hi ${tokens["name"]}`} ``
 *   "$user.name"     → `{tokens["user"]?.name}`
 */
export function interpolateStringForJSX(
  content: string,
  tokens: TokenDefinition[],
  loopVars: ReadonlySet<string> | undefined = undefined
): string {
  // Inline-markdown short-circuit. The DOM backend runs every text
  // through `formatInlineMarkdown` at render time which converts
  // `**bold**` → `<strong>` and `*italic*` → `<em>`. React doesn't
  // have that runtime, so we statically transform here when the
  // content has markdown markers AND no `$`-interpolations (mixed
  // markdown+token-interpolation is rare and falls through to the
  // template-literal path with raw markup; can be re-tackled if it
  // shows up in real examples).
  if (!content.includes('$') && /\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`/.test(content)) {
    return inlineMarkdownToJSX(content)
  }
  if ((tokens.length === 0 && !loopVars) || !content.includes('$')) {
    return `{${JSON.stringify(content)}}`
  }
  const tokenNames = new Set<string>()
  for (const t of tokens) {
    const n = t.name.startsWith('$') ? t.name.slice(1) : t.name
    tokenNames.add(n)
  }

  type Segment = { kind: 'text'; value: string } | { kind: 'expr'; code: string }
  const segments: Segment[] = []
  let i = 0
  let textBuf = ''
  while (i < content.length) {
    const ch = content[i]
    if (ch === '$') {
      // Match `$<id>(.<id>)*` — bare-identifier-with-dots. Stop on
      // anything that isn't a valid identifier char.
      const start = i + 1
      let j = start
      const isHead = (c: string) => /[A-Za-z_]/.test(c)
      const isTail = (c: string) => /[A-Za-z0-9_]/.test(c)
      if (j < content.length && isHead(content[j])) {
        while (j < content.length && isTail(content[j])) j++
        // Allow dotted access: `$user.name`, `$a.b.c`
        while (
          j < content.length &&
          content[j] === '.' &&
          j + 1 < content.length &&
          isHead(content[j + 1])
        ) {
          j++ // consume `.`
          while (j < content.length && isTail(content[j])) j++
        }
        const ref = content.slice(start, j)
        const head = ref.includes('.') ? ref.slice(0, ref.indexOf('.')) : ref
        // Loop-var lookup wins over token lookup — inside `each t in $tasks`
        // the iterator `t` shadows any (improbable) sibling token. Emit the
        // bare identifier path so it resolves against the .map callback's
        // parameter.
        const isLoopVar = loopVars?.has(head) ?? false
        if (isLoopVar || tokenNames.has(head)) {
          if (textBuf.length > 0) {
            segments.push({ kind: 'text', value: textBuf })
            textBuf = ''
          }
          // Loop-var: `t.title` (raw chain). Token: `tokens["head"]?.foo`.
          let code: string
          if (isLoopVar) {
            code = head
            if (ref.includes('.')) {
              const rest = ref.slice(head.length + 1).split('.')
              for (const part of rest) code += `.${part}`
            }
          } else {
            code = `tokens[${JSON.stringify(head)}]`
            if (ref.includes('.')) {
              const rest = ref.slice(head.length + 1).split('.')
              for (const part of rest) code += `?.${part}`
            }
          }
          segments.push({ kind: 'expr', code })
          i = j
          continue
        }
        // Not a known token or loop var — fall through, emit literal `$ref`.
      }
      textBuf += ch
      i++
      continue
    }
    textBuf += ch
    i++
  }
  if (textBuf.length > 0) segments.push({ kind: 'text', value: textBuf })

  // Pure literal (no `$ref` matched) — same shape as the no-`$` branch.
  if (segments.every(s => s.kind === 'text')) {
    return `{${JSON.stringify(segments.map(s => (s as { value: string }).value).join(''))}}`
  }
  // Single expression (e.g. just `$name`) — emit raw, no template literal.
  if (segments.length === 1 && segments[0].kind === 'expr') {
    return `{${segments[0].code}}`
  }
  // Mixed: template literal interleaves text and `${expr}` parts.
  const parts: string[] = []
  for (const seg of segments) {
    if (seg.kind === 'text') {
      // Escape backticks, backslashes, and `${` sequences for template-literal context.
      parts.push(seg.value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${'))
    } else {
      parts.push('${' + seg.code + '}')
    }
  }
  return '{`' + parts.join('') + '`}'
}

/**
 * Convert Mirror's inline-markdown subset (`**bold**`, `*italic*`,
 * `` `code` ``) into a JSX fragment with `<strong>` / `<em>` / `<code>`
 * elements. Mirrors the DOM runtime's `formatInlineMarkdown` semantics
 * — DOM uses innerHTML; React needs real elements so user content is
 * never injected as raw HTML.
 *
 * Returns a single-line JSX expression suitable for placement inside a
 * `<span>` (or any text-content slot). Multiple segments are wrapped
 * in a Fragment.
 */
function inlineMarkdownToJSX(content: string): string {
  type Seg = { kind: 'text' | 'strong' | 'em' | 'code'; value: string }
  const segs: Seg[] = []
  let i = 0
  let buf = ''
  const flushText = () => {
    if (buf.length > 0) {
      segs.push({ kind: 'text', value: buf })
      buf = ''
    }
  }
  while (i < content.length) {
    // `**bold**` — must check before single `*` so the longer match wins.
    if (content[i] === '*' && content[i + 1] === '*') {
      const close = content.indexOf('**', i + 2)
      if (close > i + 2) {
        flushText()
        segs.push({ kind: 'strong', value: content.slice(i + 2, close) })
        i = close + 2
        continue
      }
    }
    // `*italic*` — single-asterisk run.
    if (content[i] === '*') {
      const close = content.indexOf('*', i + 1)
      // Reject empty runs and anything that looks like a `**...**` start.
      if (close > i + 1 && content[close + 1] !== '*' && content[i + 1] !== '*') {
        flushText()
        segs.push({ kind: 'em', value: content.slice(i + 1, close) })
        i = close + 1
        continue
      }
    }
    // Inline `code` with backticks.
    if (content[i] === '`') {
      const close = content.indexOf('`', i + 1)
      if (close > i + 1) {
        flushText()
        segs.push({ kind: 'code', value: content.slice(i + 1, close) })
        i = close + 1
        continue
      }
    }
    buf += content[i]
    i++
  }
  flushText()
  if (segs.length === 0) return `{${JSON.stringify(content)}}`
  if (segs.length === 1 && segs[0].kind === 'text') {
    return `{${JSON.stringify(segs[0].value)}}`
  }
  const parts = segs.map(s => {
    if (s.kind === 'text') return `{${JSON.stringify(s.value)}}`
    const tag = s.kind === 'strong' ? 'strong' : s.kind === 'em' ? 'em' : 'code'
    return `<${tag}>{${JSON.stringify(s.value)}}</${tag}>`
  })
  // Wrap in `<>...</>` so the caller's `{...}` slot gets a single
  // expression that React can render as multiple children.
  return `<>${parts.join('')}</>`
}

/**
 * Rewrite a Mirror condition expression for use in React-emitted JS.
 * In Mirror, bare identifiers (`done`, `count`) reference top-level data
 * that lives on the `tokens` object in the React backend's emit. Replace
 * any such identifier with `tokens["name"]` so the expression evaluates
 * against the actual data at runtime. Operators, literals, comparisons
 * stay untouched — Mirror condition syntax is JS-compatible.
 */
export function rewriteIdentifiersToTokens(expr: string, tokens: TokenDefinition[]): string {
  if (tokens.length === 0) return expr
  const tokenNames = new Set<string>()
  for (const t of tokens) {
    const n = t.name.startsWith('$') ? t.name.slice(1) : t.name
    tokenNames.add(n)
  }
  // Walk the string tracking whether we're inside a `"..."` / `'...'` /
  // `` `...` `` literal — identifiers there are content, not references.
  let out = ''
  let i = 0
  let inString: '"' | "'" | '`' | null = null
  while (i < expr.length) {
    const ch = expr[i]
    if (inString) {
      out += ch
      if (ch === '\\' && i + 1 < expr.length) {
        out += expr[i + 1]
        i += 2
        continue
      }
      if (ch === inString) inString = null
      i++
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch as '"' | "'" | '`'
      out += ch
      i++
      continue
    }
    // Identifier?
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i
      while (j < expr.length && /[A-Za-z0-9_$]/.test(expr[j])) j++
      const ident = expr.slice(i, j)
      const isMember = i > 0 && expr[i - 1] === '.'
      const isKeyword =
        ident === 'true' || ident === 'false' || ident === 'null' || ident === 'undefined'
      // `$name`-form: parser-preserved when the conditional was led by a
      // `$token`. Strip the `$` and resolve as a normal token reference
      // so React emits `tokens["name"]` instead of leaking a literal
      // `$name` JS reference (which would be a ReferenceError at render).
      const stripped = ident.startsWith('$') ? ident.slice(1) : null
      if (!isMember && !isKeyword && stripped && tokenNames.has(stripped)) {
        out += `tokens[${JSON.stringify(stripped)}]`
      } else if (!isMember && !isKeyword && tokenNames.has(ident)) {
        out += `tokens[${JSON.stringify(ident)}]`
      } else {
        out += ident
      }
      i = j
      continue
    }
    out += ch
    i++
  }
  return out
}

/**
 * Ternary branches arrive as already-quoted source strings (`"Ja"`) or
 * numbers. JS-emit them straight through — quoted literals are valid JS,
 * numbers stringify cleanly.
 */
function ternaryBranchToJS(value: string | number): string {
  return typeof value === 'number' ? String(value) : value
}
