/**
 * Mirror runtime DOM attribute names + IR-marker prefixes.
 *
 * Centralized constants for the well-known strings that Mirror's runtime
 * stamps onto every emitted element + the marker prefixes that thread
 * loop / conditional context through IR values. Pre-2026-05-13 these
 * lived as inline literals scattered across ~55 production sites — a
 * single rename of `data-mirror-id` would have required a 16-file
 * sweep with risk of missing a quoted-string variant.
 *
 * Centralizing here (in compiler/utils/) keeps both `compiler/` and
 * `studio/` consumers on one source without a layering violation —
 * studio/ already imports from compiler/utils/ (logger, escape-html).
 *
 * NOT migrated (intentional):
 *   - `compiler/backends/dom/runtime-template/index.ts` — the runtime
 *     template stamps these into the generated JS as inline literals;
 *     importing the constants would NOT inline them into the output.
 *   - Test files + test-api/ — large surface, low risk, low payoff;
 *     leave at literals unless a test_pin needs the indirection.
 *
 * Forward-compat: if the runtime ever needs to change one of these
 * attribute names (e.g. for a new isolation mode), update both the
 * constant AND the runtime-template inline copy in the same commit.
 */

/**
 * DOM attribute that carries the Mirror IR node id on every emitted
 * element. Used by selection, source-map, hit-detection, sync.
 */
export const MIRROR_ID_ATTR = 'data-mirror-id'

/**
 * IR value prefix that marks a loop variable reference (`each` body).
 * Backends strip the prefix and emit the bare variable name as a JS
 * identifier reference (no `$get(...)` wrap).
 */
export const LOOP_VAR_PREFIX = '__loopVar:'

/**
 * IR value prefix that marks a conditional expression
 * (`cond ? then : else`). Backends parse the suffix to emit a real
 * ternary in the generated JS / JSX / template.
 */
export const CONDITIONAL_PREFIX = '__conditional:'
