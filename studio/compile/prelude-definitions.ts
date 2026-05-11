/**
 * Prelude-definition collector for the validator pass.
 *
 * The validator flags references to undefined tokens and components. When
 * a Mirror project spans multiple files (e.g. layout in `app.mir` consumes
 * tokens in `tokens.tok` and components in `components.com`), the layout
 * being validated does not itself declare those symbols — they live in the
 * prelude that `compile()` prepends to the layout for codegen. To keep the
 * validator quiet about cross-file refs, we precompute the symbol sets it
 * should treat as already-defined.
 *
 * Pure helper: takes a parsed prelude AST (or null when no prelude exists)
 * and returns two `Set<string>`s for the validator's `preludeTokens` /
 * `preludeComponents` options. No compiler-bundle access; the caller does
 * the parsing.
 *
 * Token-name handling matches the validator's lookup shape:
 *   - The leading `$` (if any) is stripped before insertion.
 *   - Both the full base name (`primary.bg`) AND its root segment
 *     (`primary`) are added — references like `bg $primary` resolve
 *     against the root, while `bg $primary.bg` resolves against the
 *     full key.
 */

import type { Program } from '../../compiler/parser/ast'

export interface PreludeDefinitions {
  preludeTokens: Set<string>
  preludeComponents: Set<string>
}

export function collectPreludeDefinitions(preludeAst: Program | null): PreludeDefinitions {
  const preludeTokens = new Set<string>()
  const preludeComponents = new Set<string>()
  if (!preludeAst) return { preludeTokens, preludeComponents }

  for (const token of preludeAst.tokens || []) {
    const baseName = token.name.startsWith('$') ? token.name.slice(1) : token.name
    const rootName = baseName.split('.')[0]
    preludeTokens.add(rootName)
    preludeTokens.add(baseName)
  }
  for (const comp of preludeAst.components || []) {
    preludeComponents.add(comp.name)
  }
  return { preludeTokens, preludeComponents }
}
