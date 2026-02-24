/**
 * Typography Context
 *
 * Provides inherited typography settings from App to all children.
 * When App has `font "Inter"` or `size 16`, these values cascade
 * down to all child components as defaults.
 *
 * CSS naturally inherits font-family, font-size, color, and line-height.
 * This context enables the same behavior in Mirror's preview.
 */

import { createContext, useContext, type ReactNode } from 'react'

/**
 * Typography values that can be inherited from App.
 * All values are optional - undefined means "use component defaults".
 */
export interface TypographyContextValue {
  /** Font family (e.g., "Inter", "system-ui") */
  fontFamily?: string
  /** Font size in pixels */
  fontSize?: number
  /** Line height (e.g., 1.5) */
  lineHeight?: number
  /** Text color (e.g., "#E0E0E0") */
  color?: string
}

/**
 * Default context value - all undefined.
 * Components use their DARK_DEFAULTS when values are undefined.
 */
export const TypographyContext = createContext<TypographyContextValue>({})

/**
 * Hook to access inherited typography settings.
 * Returns the context value with all inherited properties.
 *
 * @example
 * const typography = useTypography()
 * const fontSize = typography.fontSize ?? DARK_DEFAULTS.input.fontSize
 */
export function useTypography(): TypographyContextValue {
  return useContext(TypographyContext)
}

interface TypographyProviderProps {
  children: ReactNode
  /** Typography values to inherit */
  typography: TypographyContextValue
}

/**
 * Provider for typography inheritance.
 * Wrap preview content to enable font/size inheritance from App.
 */
export function TypographyProvider({ children, typography }: TypographyProviderProps) {
  return (
    <TypographyContext.Provider value={typography}>
      {children}
    </TypographyContext.Provider>
  )
}

/**
 * Extract typography properties from AST node properties.
 * Converts DSL properties to CSS-compatible values.
 */
export function extractTypography(properties: Record<string, unknown>): TypographyContextValue {
  const result: TypographyContextValue = {}

  // Font family: font "Inter" or font-family "Inter"
  if (typeof properties.font === 'string') {
    result.fontFamily = properties.font
  }

  // Font size: font-size 16 (new) or size 16 (legacy)
  const fontSize = properties['font-size'] ?? properties.size
  if (typeof fontSize === 'number') {
    result.fontSize = fontSize
  }

  // Line height: line 1.5
  if (typeof properties.line === 'number') {
    result.lineHeight = properties.line
  }

  // Text color: col #E0E0E0 or color #E0E0E0
  if (typeof properties.col === 'string') {
    result.color = properties.col
  } else if (typeof properties.color === 'string') {
    result.color = properties.color
  }

  return result
}
