/**
 * Alignment Helpers Module
 *
 * CSS flexbox alignment utilities for Mirror elements.
 *
 * Only `ALIGN_MAP` is exported today — the typed `alignToCSS` /
 * `getAlign` runtime helpers were superseded by inline `_alignToCSS` /
 * `_getAlign` in `compiler/backends/dom/runtime-template/index.ts`.
 * `ALIGN_MAP` is kept here so the runtime-template can re-use the
 * canonical mapping (and the parity test in
 * `tests/runtime/runtime-template-parity.test.ts` pins both forms to
 * the same literal).
 */

export const ALIGN_MAP: Record<string, string> = {
  left: 'flex-start',
  right: 'flex-end',
  center: 'center',
  top: 'flex-start',
  bottom: 'flex-end',
}
