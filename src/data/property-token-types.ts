/**
 * Property to token type mapping.
 * Defines which token types are valid for each DSL property.
 */

import type { TokenValueType } from '../types/token-types'

/**
 * Maps property names to the token types they accept.
 * Properties not listed accept any token type.
 */
export const PROPERTY_TOKEN_TYPES: Record<string, TokenValueType[]> = {
  // Color properties
  bg: ['color'],
  background: ['color'],
  col: ['color'],
  color: ['color'],
  boc: ['color'],  // border color
  'border-color': ['color'],
  ic: ['color'],   // icon color
  'icon-color': ['color'],
  'hover-bg': ['color'],
  'hover-col': ['color'],
  'hover-background': ['color'],
  'hover-color': ['color'],
  'hover-boc': ['color'],
  'hover-border-color': ['color'],

  // Spacing properties
  pad: ['spacing'],
  padding: ['spacing'],
  mar: ['spacing'],
  margin: ['spacing'],
  gap: ['spacing'],
  g: ['spacing'],

  // Size properties
  w: ['spacing', 'size'],
  width: ['spacing', 'size'],
  h: ['spacing', 'size'],
  height: ['spacing', 'size'],
  minw: ['spacing', 'size'],
  'min-width': ['spacing', 'size'],
  minh: ['spacing', 'size'],
  'min-height': ['spacing', 'size'],
  maxw: ['spacing', 'size'],
  'max-width': ['spacing', 'size'],
  maxh: ['spacing', 'size'],
  'max-height': ['spacing', 'size'],

  // Border properties
  bor: ['border', 'spacing', 'color'],
  border: ['border', 'spacing', 'color'],
  bow: ['spacing'],  // border width
  'border-width': ['spacing'],
  rad: ['radius', 'spacing'],
  radius: ['radius', 'spacing'],
  'hover-rad': ['radius', 'spacing'],
  'hover-radius': ['radius', 'spacing'],

  // Typography properties
  font: ['font'],
  'font-family': ['font'],
  fs: ['size', 'spacing'],     // font size
  'font-size': ['size', 'spacing'],
  fw: ['weight'],              // font weight
  weight: ['weight'],
  'font-weight': ['weight'],
  lh: ['size', 'spacing'],     // line height
  line: ['size', 'spacing'],
  'line-height': ['size', 'spacing'],
  ls: ['spacing'],             // letter spacing
  'letter-spacing': ['spacing'],
  is: ['size', 'spacing'],     // icon size
  'icon-size': ['size', 'spacing'],
  iw: ['weight'],              // icon weight
  'icon-weight': ['weight'],

  // Shadow
  shadow: ['shadow'],
  bs: ['shadow'],  // box shadow
  'box-shadow': ['shadow'],

  // Opacity
  op: ['opacity'],
  o: ['opacity'],
  opacity: ['opacity'],
  'hover-op': ['opacity'],
  'hover-opa': ['opacity'],
  'hover-opacity': ['opacity'],
}

/**
 * Get the accepted token types for a property.
 * Returns null if the property accepts any token type.
 */
export function getAcceptedTokenTypes(property: string): TokenValueType[] | null {
  return PROPERTY_TOKEN_TYPES[property] || null
}

/**
 * Check if a token type is valid for a given property.
 */
export function isTokenTypeValidForProperty(
  property: string,
  tokenType: TokenValueType
): boolean {
  const acceptedTypes = PROPERTY_TOKEN_TYPES[property]
  if (!acceptedTypes) {
    return true // Property accepts any type
  }
  return acceptedTypes.includes(tokenType)
}
