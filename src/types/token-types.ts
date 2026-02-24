/**
 * Token type definitions for intelligent token matching.
 * Tokens are categorized by their value type to enable context-aware filtering.
 */

export type TokenValueType =
  | 'color'     // #xxx, rgb(), hsl(), col, bg, boc
  | 'spacing'   // pad, mar, gap
  | 'border'    // bor, bow
  | 'shadow'    // sha, sdw
  | 'font'      // fon, fam
  | 'size'      // siz, fos
  | 'weight'    // fow, wei
  | 'radius'    // rad
  | 'opacity'   // opa
  | 'unknown'   // no type hint in name → shown everywhere

/**
 * DSL property binding for tokens.
 * Determines which property picker shows this token.
 */
export type TokenPropertyBinding =
  | 'bg'        // background color
  | 'col'       // foreground/text color
  | 'boc'       // border color
  | 'pad'       // padding
  | 'mar'       // margin
  | 'gap'       // gap
  | 'rad'       // radius
  | 'bor'       // border (width)
  | 'border'    // compound border (with sub-properties)
  | 'size'      // font-size
  | 'is'        // icon-size
  | 'weight'    // font-weight
  | 'opa'       // opacity
  | 'shadow'    // shadow
  | 'font'      // font-family (compound with sub-properties)

/**
 * Basic typed token interface
 */
export interface TypedToken {
  name: string
  value: string
  type: TokenValueType
}

/**
 * Extended token with property binding and component specificity.
 *
 * Token format: $name.property[.component]
 *
 * Examples:
 *   $default.bg           → background color
 *   $default.bg.button    → background color for buttons
 *   $default.col.icon     → foreground color for icons
 *   $primary.col          → primary foreground color
 *
 * Resolution order (most specific first):
 *   1. $name.property.component
 *   2. $name.property
 *   3. $name (if typed)
 */
/**
 * Known sub-properties for compound properties.
 * Used to distinguish between sub-properties and components.
 */
export type TokenSubProperty =
  | 'color'   // border.color, font.color
  | 'width'   // border.width
  | 'style'   // border.style, font.style
  | 'radius'  // border.radius
  | 'family'  // font.family
  | 'size'    // font.size
  | 'weight'  // font.weight

export interface BoundToken extends TypedToken {
  /** Base token name without property/component (e.g., "default" from "$default.bg.button") */
  baseName: string
  /** Property this token is bound to (e.g., "bg", "col", "pad", "border") */
  boundProperty?: TokenPropertyBinding
  /** Sub-property for compound properties (e.g., "color" from "$default.border.color") */
  boundSubProperty?: TokenSubProperty
  /** Component specificity (e.g., "icon", "button", "input") */
  boundComponent?: string
  /** Full token path for display (e.g., "default.border.color.button") */
  fullPath: string
  /** Original raw value before reference resolution */
  rawValue?: string
}
