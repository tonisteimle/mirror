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

export interface TypedToken {
  name: string
  value: string
  type: TokenValueType
}
