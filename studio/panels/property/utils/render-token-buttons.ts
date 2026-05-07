/**
 * Token-button group renderer.
 *
 * Five property sections (spacing/margin/layout/border/typography) used
 * to ship near-identical 60-line copies of "render N token buttons,
 * collapse to 3 + dropdown if more than 4". This module owns that
 * markup so all sections share a single source of truth, including
 * the active-match logic (matches token-ref OR short-ref OR literal
 * value) and the chevron-down expand SVG.
 *
 * The data-attribute scheme is parameterised because click handlers in
 * each section listen on `.token-btn[data-${propKey}-token]` and need
 * to keep identifying which property the click belongs to. Pass
 * `propKey: 'pad' | 'mar' | 'gap' | 'rad' | 'fs' | 'w' | 'h' | 'col' | …`
 * and the helper emits `data-${propKey}-token`.
 */

const MAX_DIRECT = 4
const VISIBLE_COUNT = 3

const CHEVRON_SVG =
  '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 4l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'

export interface TokenButtonItem {
  /** Visible button text — token short name ("sm") or literal label ("0", "Full"). */
  label: string
  /** Resolved px value (e.g. "8", "16", "999"). */
  value: string
  /**
   * Full token reference (e.g. "$sm.pad"). Empty string for literal-only
   * items like "0" prefix or "999" full-radius suffix.
   */
  tokenRef: string
}

export interface RenderTokenButtonsConfig {
  /** Section's current value, may be a $ref ("$md.pad" or "$md") or literal ("16"). */
  activeValue: string
  /**
   * Token list, already filtered by suffix (e.g. only `.pad` tokens for
   * the spacing section). Empty list → empty string returned.
   */
  tokens: ReadonlyArray<TokenButtonItem>
  /**
   * Property key used in data-attributes. The helper emits
   * `data-${propKey}-token="${value}"` plus `data-token-ref="${ref}"`,
   * which is what each section's click handler listens for.
   */
  propKey: string
  /**
   * Optional direction modifier (e.g. "all" / "horizontal" / "top") for
   * spacing and margin per-side rendering. When set, helper emits
   * `data-${propKey}-dir="${direction}"` on every button + the dropdown
   * wrapper, so the click handler can disambiguate sides.
   */
  direction?: string
  /**
   * Optional CSS class suffix applied to the dropdown container (e.g.
   * "rad" → ".token-dropdown.token-dropdown-rad"). Used by border
   * section to distinguish its dropdown from spacing's. Default: none.
   */
  dropdownClass?: string
  /**
   * Optional HTML appended *after* the token list (still inside the
   * outer wrapper). Border uses this for its 999/full-radius button.
   */
  trailingHtml?: string
}

/**
 * Decide whether a token entry is "active" given the current value.
 * Tolerates the three representations the editor source can hold:
 *   - Full ref: `$sm.pad`
 *   - Short ref: `$sm` (preferred form, resolves to the suffix the
 *     property expects)
 *   - Literal value: `8`
 *
 * Border's "0" prefix item has tokenRef === "" — for those, only the
 * literal-value match counts.
 */
function isTokenActive(token: TokenButtonItem, activeValue: string): boolean {
  if (
    token.tokenRef &&
    (activeValue === token.tokenRef || activeValue === stripSuffix(token.tokenRef))
  ) {
    return true
  }
  return activeValue === token.value
}

/** "$sm.pad" → "$sm". "$sm" stays "$sm". Used to match the short-ref form. */
function stripSuffix(tokenRef: string): string {
  const dotIdx = tokenRef.indexOf('.')
  return dotIdx === -1 ? tokenRef : tokenRef.slice(0, dotIdx)
}

function buildAttrs(propKey: string, token: TokenButtonItem, direction?: string): string {
  const dir = direction ? ` data-${propKey}-dir="${direction}"` : ''
  return `data-${propKey}-token="${token.value}" data-token-ref="${token.tokenRef}"${dir}`
}

function renderButton(
  token: TokenButtonItem,
  active: boolean,
  propKey: string,
  direction?: string
): string {
  const cls = `token-btn${active ? ' active' : ''}`
  const title = token.tokenRef ? `${token.tokenRef}: ${token.value}` : token.value
  return `<button class="${cls}" ${buildAttrs(propKey, token, direction)} title="${title}">${token.label}</button>`
}

function renderDropdownItem(
  token: TokenButtonItem,
  active: boolean,
  propKey: string,
  direction?: string
): string {
  const cls = `token-dropdown-item${active ? ' active' : ''}`
  return `<button class="${cls}" ${buildAttrs(propKey, token, direction)}>${token.label} <span class="token-dropdown-value">${token.value}</span></button>`
}

export function renderTokenButtonGroup(config: RenderTokenButtonsConfig): string {
  const { activeValue, tokens, propKey, direction, dropdownClass, trailingHtml } = config

  if (tokens.length === 0) return trailingHtml ?? ''

  const buttons = tokens.map(t =>
    renderButton(t, isTokenActive(t, activeValue), propKey, direction)
  )
  const trailing = trailingHtml ?? ''

  if (tokens.length <= MAX_DIRECT) {
    return buttons.join('') + trailing
  }

  // 5+ tokens: show the first 3 + chevron dropdown for the rest.
  const visible = buttons.slice(0, VISIBLE_COUNT)
  const hidden = tokens.slice(VISIBLE_COUNT)
  const activeInHidden = hidden.some(t => isTokenActive(t, activeValue))

  const dropdownItems = hidden
    .map(t => renderDropdownItem(t, isTokenActive(t, activeValue), propKey, direction))
    .join('')

  const moreClass = `token-btn token-more-btn${activeInHidden ? ' has-active' : ''}`
  const moreDir = direction ? ` data-${propKey}-dir="${direction}"` : ''
  const dropdownDir = direction ? ` data-${propKey}-dir="${direction}"` : ''
  const dropdownExtraClass = dropdownClass ? ` token-dropdown-${dropdownClass}` : ''

  return `${visible.join('')}
      <div class="token-more-container">
        <button class="${moreClass}"${moreDir} title="${hidden.length} more tokens">${CHEVRON_SVG}</button>
        <div class="token-dropdown${dropdownExtraClass}"${dropdownDir}>
          ${dropdownItems}
        </div>
      </div>${trailing}`
}
