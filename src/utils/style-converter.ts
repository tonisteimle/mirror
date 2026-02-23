/**
 * Shared utility for converting DSL properties to CSS styles.
 * Used by both react-generator.tsx and behaviors/index.ts to avoid duplication.
 *
 * Color System:
 * - col → always text color (style.color)
 * - bg → always background color (style.backgroundColor)
 *
 * Typography System:
 * - text-size / ts / fs → fontSize (normalized to 'ts')
 * - icon-size / is → fontSize for icons (normalized to 'is')
 * - size → fontSize (legacy, ambiguous - prefer ts/is)
 *
 * Sizing System:
 * - w / width → width (px, %, 'min', 'max')
 * - h / height → height (px, %, 'min', 'max')
 * - 'min' / 'hug' → fit-content
 * - 'max' / 'full' → 100% + flex-grow
 *
 * Auto-Contrast:
 * - For interactive components (Button, Btn, etc.) with bg but no col,
 *   automatically set a contrasting text color (white on dark, black on light)
 */

import type React from 'react'
import type { DSLProperties } from '../types/dsl-properties'
import { getContrastTextColor } from './color'
import { normalizePropertyToShort } from '../dsl/properties'

// Re-export for backwards compatibility
export type { DSLProperties }

/**
 * Check if a value is a token reference object
 */
function isTokenReference(value: unknown): value is { type: 'token'; name: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>).type === 'token' &&
    typeof (value as Record<string, unknown>).name === 'string'
  )
}

/**
 * Property to token suffix mapping for context-aware resolution.
 * When resolving $s for 'pad', first try $s.pad, then $s
 */
const PROPERTY_TOKEN_SUFFIXES: Record<string, string[]> = {
  // Spacing
  'pad': ['pad', 'padding'],
  'padding': ['pad', 'padding'],
  'p': ['pad', 'padding'],
  'mar': ['mar', 'margin'],
  'margin': ['mar', 'margin'],
  'm': ['mar', 'margin'],
  'gap': ['gap'],
  'g': ['gap'],
  // Radius
  'rad': ['rad', 'radius'],
  'radius': ['rad', 'radius'],
  // Size (font-size)
  'size': ['size'],
  'fs': ['size'],
  'font-size': ['size'],
  // Icon Size
  'is': ['is', 'icon-size'],
  'icon-size': ['is', 'icon-size'],
  // Border
  'bor': ['bor.width', 'bor', 'border.width', 'border'],
  'border': ['bor.width', 'bor', 'border.width', 'border'],
  'border-width': ['bor.width', 'border.width'],
  // Font
  'font': ['font'],
  'font-family': ['font'],
}

/**
 * Resolve a token name with context-aware fallback.
 * For property 'pad' and token '$s', tries: $s.pad, $s.padding, $s
 */
function resolveTokenWithContext(
  tokenName: string,
  propertyKey: string,
  tokens: Map<string, unknown>
): unknown {
  const suffixes = PROPERTY_TOKEN_SUFFIXES[propertyKey.toLowerCase()]

  if (suffixes) {
    // Try property-specific tokens first
    for (const suffix of suffixes) {
      const contextualName = `${tokenName}.${suffix}`
      const value = tokens.get(contextualName)
      if (value !== undefined) {
        return value
      }
    }
  }

  // Fall back to direct token name
  return tokens.get(tokenName)
}

/**
 * Resolve token references in properties using the provided tokens map.
 * Token references have the format: { type: 'token', name: 'tokenName' }
 *
 * Context-aware resolution: For property 'pad' with token '$s',
 * first tries $s.pad, then falls back to $s.
 */
export function resolveTokensInProperties(
  properties: DSLProperties,
  tokens?: Map<string, unknown>
): DSLProperties {
  if (!tokens || tokens.size === 0) {
    return properties
  }

  const resolved: DSLProperties = {}

  for (const [key, value] of Object.entries(properties)) {
    if (isTokenReference(value)) {
      const tokenValue = resolveTokenWithContext(value.name, key, tokens)
      if (tokenValue !== undefined) {
        resolved[key] = tokenValue as DSLProperties[string]
      } else {
        // Token not found - keep original (will be handled as error elsewhere)
        resolved[key] = value as DSLProperties[string]
      }
    } else {
      resolved[key] = value as DSLProperties[string]
    }
  }

  return resolved
}

// Track Google Font loading with Promises to prevent race conditions
const fontLoadingPromises = new Map<string, Promise<void>>()

// System fonts that don't need Google Font loading
const SYSTEM_FONTS = new Set([
  'system-ui', 'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy',
  'arial', 'helvetica', 'times new roman', 'georgia', 'verdana',
  'courier new', 'monaco', 'consolas', 'ui-sans-serif', 'ui-serif'
])

/**
 * Load a Google Font dynamically with deduplication.
 * Returns a Promise that resolves when the font stylesheet is loaded.
 */
function loadGoogleFont(fontFamily: string): Promise<void> {
  // Extract font name from CSS font-family value (e.g., '"Inter"' -> 'Inter')
  const fontName = fontFamily.replace(/["']/g, '').split(',')[0].trim()
  const fontNameLower = fontName.toLowerCase()

  // Skip system fonts
  if (SYSTEM_FONTS.has(fontNameLower)) {
    return Promise.resolve()
  }

  // Return existing promise if already loading/loaded
  if (fontLoadingPromises.has(fontName)) {
    return fontLoadingPromises.get(fontName)!
  }

  // Skip SSR
  if (typeof document === 'undefined') {
    return Promise.resolve()
  }

  // Create loading promise
  const promise = new Promise<void>((resolve) => {
    const link = document.createElement('link')
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@100;200;300;400;500;600;700;800;900&display=swap`
    link.rel = 'stylesheet'
    link.onload = () => resolve()
    link.onerror = () => resolve() // Resolve anyway to not block rendering
    document.head.appendChild(link)
  })

  fontLoadingPromises.set(fontName, promise)
  return promise
}

/**
 * Components that should get automatic text contrast when bg is set.
 * This ensures text is readable on colored backgrounds.
 * The text color is inherited by all children.
 */
const AUTO_CONTRAST_COMPONENTS = new Set([
  // Interactive elements
  'Button', 'Btn', 'PrimaryBtn', 'SecondaryBtn', 'DangerBtn', 'GhostBtn',
  'Primary-Button', 'Secondary-Button', 'Danger-Button', 'Ghost-Button',
  'Tab', 'MenuItem', 'ListItem', 'Option', 'Chip', 'Badge', 'Tag',
  // Container elements - text color inherited by children
  'Box', 'Card', 'Panel', 'Tile', 'Container', 'Section', 'Header', 'Footer',
  'Sidebar', 'Content', 'Main', 'Nav', 'Menu', 'Item', 'Row', 'Column', 'Col',
  'Grid', 'Stack', 'Flex', 'Actions', 'Dashboard', 'Alert', 'Toast',
  'Dialog', 'Modal', 'Popup', 'Dropdown', 'Tooltip', 'Popover'
])

/**
 * Check if properties contain any hover styles
 */
export function hasHoverStyles(properties: DSLProperties): boolean {
  return Object.keys(properties).some(key => key.startsWith('hover-'))
}

/**
 * Extract hover properties and convert to CSS
 */
export function extractHoverStyles(properties: DSLProperties): React.CSSProperties {
  const hoverStyle: React.CSSProperties = {}

  for (const [key, value] of Object.entries(properties)) {
    if (key.startsWith('hover-')) {
      const prop = key.slice(6) // Remove 'hover-' prefix
      switch (prop) {
        // Short forms
        case 'col':
        // Long forms
        case 'color':
          // hover-col/hover-color → text color
          hoverStyle.color = String(value)
          break
        case 'bg':
        case 'background':
          // hover-bg/hover-background → background color
          hoverStyle.backgroundColor = String(value)
          break
        case 'boc':
        case 'border-color':
          hoverStyle.borderColor = String(value)
          break
        case 'bor':
        case 'border':
          hoverStyle.border = `${value}px solid`
          break
        case 'rad':
        case 'radius':
          hoverStyle.borderRadius = `${value}px`
          break
        case 'opa':
        case 'opacity':
          hoverStyle.opacity = Number(value)
          break
        case 'scale':
          hoverStyle.transform = `scale(${value})`
          break
      }
    }
  }

  return hoverStyle
}

/**
 * Check if element needs flex display
 */
export function needsFlexDisplay(properties: DSLProperties, hasChildren: boolean): boolean {
  // Explicit layout properties require flex
  if (properties.hor || properties.ver) return true
  if (properties.gap) return true
  if (properties.between) return true
  if (properties.wrap) return true
  if (properties.grow || properties.fill) return true
  // Alignment properties require flex
  if (properties.cen) return true  // cen as boolean property
  if (properties['hor-l'] || properties['hor-cen'] || properties['hor-r']) return true
  if (properties['ver-t'] || properties['ver-cen'] || properties['ver-b']) return true
  if (properties.align_main || properties.align_cross) return true
  // Elements with children typically need flex for layout
  if (hasChildren) return true
  return false
}

/**
 * Options for property-to-style conversion.
 */
export interface PropertyConversionOptions {
  /** Whether the component has children (affects flex display) */
  hasChildren?: boolean
  /** Component name (used for auto-contrast on interactive components) */
  componentName?: string
  /** Optional tokens map to resolve token references */
  tokens?: Map<string, unknown>
}

/**
 * Convert DSL properties to React CSS properties.
 * This is the single source of truth for property-to-style conversion.
 *
 * Color system:
 * - col → always text color (style.color)
 * - bg → always background color (style.backgroundColor)
 *
 * @param properties - DSL properties to convert
 * @param hasChildren - Whether the component has children (affects flex display)
 * @param componentName - Component name (used for auto-contrast on interactive components)
 * @param tokens - Optional tokens map to resolve token references
 */
export function propertiesToStyle(
  properties: DSLProperties,
  hasChildren: boolean = false,
  componentName: string = '',
  tokens?: Map<string, unknown>
): React.CSSProperties {
  // Resolve token references first
  const resolvedProps = resolveTokensInProperties(properties, tokens)

  const style: React.CSSProperties = {}

  // Only set flex display when needed
  if (needsFlexDisplay(resolvedProps, hasChildren)) {
    // Use inline-flex so containers fit their content instead of stretching
    style.display = 'inline-flex'
    // Default to vertical (column) - more natural for UI panels, cards, forms
    style.flexDirection = 'column'
  } else if (componentName && /^[A-Z]/.test(componentName)) {
    // Components without flex layout should use inline-block to fit content
    // This prevents them from stretching to full width
    style.display = 'inline-block'
  }

  // Process direction first so centering can check it
  if (resolvedProps.ver) {
    style.flexDirection = 'column'
  }

  for (const [rawKey, value] of Object.entries(resolvedProps)) {
    // Normalize property key to short form (e.g., 'margin' -> 'mar', 'padding' -> 'pad')
    const key = normalizePropertyToShort(rawKey)
    switch (key) {
      // Layout direction
      case 'hor':
        style.flexDirection = 'row'
        break
      case 'ver':
        style.flexDirection = 'column'
        break
      case 'stacked':
        // Stacked layout: all children occupy same space, stacked on top of each other
        // Uses CSS Grid with all children in cell 1/1
        style.display = 'grid'
        style.gridTemplateColumns = '1fr'
        style.gridTemplateRows = '1fr'
        break

      // Grid row: auto-creates equal columns for table rows
      // Column count is set via CSS variable --cols by the renderer
      case '_gridRow':
        if (value) {
          style.display = 'grid'
          // Use CSS variable for column count (set by renderer based on children count)
          style.gridTemplateColumns = 'repeat(var(--cols, 1), 1fr)'
          style.alignItems = 'center'
        }
        break

      // Alignment - main axis
      case 'align_main':
        if (value === 'cen') style.justifyContent = 'center'
        else if (value === 'l' || value === 'u') style.justifyContent = 'flex-start'
        else if (value === 'r' || value === 'd') style.justifyContent = 'flex-end'
        else if (value === 'between') style.justifyContent = 'space-between'
        break

      // Alignment - cross axis
      case 'align_cross':
        if (value === 'cen') style.alignItems = 'center'
        else if (value === 'l' || value === 'u') style.alignItems = 'flex-start'
        else if (value === 'r' || value === 'd') style.alignItems = 'flex-end'
        break

      case 'between':
      case 'spread':
        style.justifyContent = 'space-between'
        break
      case 'wrap':
        style.flexWrap = 'wrap'
        break

      // Center shorthand (cen or cen true)
      case 'cen':
        if (value === true) {
          style.display = 'flex'
          style.justifyContent = 'center'
          style.alignItems = 'center'
        }
        break

      // Absolute alignment (independent of flex direction)
      case 'hor-l':
        if (style.flexDirection === 'column') {
          style.alignItems = 'flex-start'
        } else {
          style.justifyContent = 'flex-start'
        }
        break
      case 'hor-cen':
        if (style.flexDirection === 'column') {
          style.alignItems = 'center'
        } else {
          style.justifyContent = 'center'
        }
        break
      case 'hor-r':
        if (style.flexDirection === 'column') {
          style.alignItems = 'flex-end'
        } else {
          style.justifyContent = 'flex-end'
        }
        break
      case 'ver-t':
        if (style.flexDirection === 'column') {
          style.justifyContent = 'flex-start'
        } else {
          style.alignItems = 'flex-start'
        }
        break
      case 'ver-cen':
        if (style.flexDirection === 'column') {
          style.justifyContent = 'center'
        } else {
          style.alignItems = 'center'
        }
        break
      case 'ver-b':
        if (style.flexDirection === 'column') {
          style.justifyContent = 'flex-end'
        } else {
          style.alignItems = 'flex-end'
        }
        break

      // Flex properties
      // Legacy: 'grow' and 'fill' are now replaced by 'width max' or 'height max'
      // Kept for backwards compatibility
      case 'grow':
      case 'fill':
        style.flexGrow = 1
        break
      case 'shrink':
        style.flexShrink = Number(value)
        break

      // Grid layout
      case 'grid': {
        style.display = 'grid'
        const gridValue = String(value)

        if (gridValue.startsWith('auto ')) {
          // Auto-fill: grid auto 250 → repeat(auto-fill, minmax(250px, 1fr))
          const minWidth = gridValue.split(' ')[1]
          const unit = minWidth.includes('%') ? '' : 'px'
          style.gridTemplateColumns = `repeat(auto-fill, minmax(${minWidth}${unit}, 1fr))`
        } else if (!gridValue.includes(' ') && !gridValue.includes('%')) {
          // Single number: column count → repeat(N, 1fr)
          style.gridTemplateColumns = `repeat(${gridValue}, 1fr)`
        } else {
          // Multiple values: convert to grid-template-columns
          const cols = gridValue.split(' ').map(v => {
            if (v.includes('%')) return v
            if (v === 'auto') return 'auto'
            return `${v}px`
          })
          style.gridTemplateColumns = cols.join(' ')
        }
        break
      }
      case 'grid_rows': {
        const rowValue = String(value)
        const rows = rowValue.split(' ').map(v => {
          if (v.includes('%')) return v
          if (v === 'auto') return 'auto'
          return `${v}px`
        })
        style.gridTemplateRows = rows.join(' ')
        break
      }
      case 'g':
      case 'gap':
        style.gap = `${value}px`
        break
      case 'gap-x':
      case 'gap-col':
        style.columnGap = `${value}px`
        break
      case 'gap-y':
      case 'gap-row':
        style.rowGap = `${value}px`
        break

      // Sizing - handle percentage values, min, max
      // Strategy: max dimensions always get flexGrow, fixed dimensions are protected by max-width/max-height
      case 'w':
        if (value === 'min') {
          style.width = 'fit-content'
          // Prevent flex stretch from overriding fit-content
          style.alignSelf = 'flex-start'
        } else if (value === 'max') {
          // Fill available width: flexGrow for main axis, alignSelf for cross axis
          style.width = '100%'
          style.flexGrow = 1
          style.flexBasis = 0
          style.alignSelf = 'stretch'
        } else if (value === 'full') {
          // Legacy support
          style.width = '100%'
        } else if (typeof value === 'string' && value.includes('%')) {
          style.width = value
          style.flexShrink = 0  // Prevent flex from overriding percentage width
        } else {
          // Fixed pixel width: use max-width to protect from flexGrow
          style.width = `${value}px`
          style.maxWidth = `${value}px`
          style.flexShrink = 0
        }
        break
      case 'h':
        if (value === 'min') {
          style.height = 'fit-content'
          // Prevent flex stretch from overriding fit-content
          style.alignSelf = 'flex-start'
        } else if (value === 'max') {
          // Fill available height: flexGrow for main axis, alignSelf for cross axis
          style.height = '100%'
          style.flexGrow = 1
          style.flexBasis = 0
          style.alignSelf = 'stretch'
        } else if (value === 'full') {
          // Legacy support
          style.height = '100%'
        } else if (typeof value === 'string' && value.includes('%')) {
          style.height = value
          style.flexShrink = 0  // Prevent flex from overriding percentage height
        } else {
          // Fixed pixel height: use max-height to protect from flexGrow
          style.height = `${value}px`
          style.maxHeight = `${value}px`
          style.flexShrink = 0
        }
        break
      case 'minw':
        style.minWidth = (typeof value === 'string' && value.includes('%')) ? value : `${value}px`
        break
      case 'maxw':
        style.maxWidth = (typeof value === 'string' && value.includes('%')) ? value : `${value}px`
        break
      case 'minh':
        style.minHeight = (typeof value === 'string' && value.includes('%')) ? value : `${value}px`
        break
      case 'maxh':
        style.maxHeight = (typeof value === 'string' && value.includes('%')) ? value : `${value}px`
        break
      case 'full':
        // Legacy: 'full' now behaves like 'max' for both dimensions
        style.width = '100%'
        style.height = '100%'
        style.flexGrow = 1
        break

      // Spacing - Padding
      case 'pad':
        style.padding = `${value}px`
        break
      case 'pad_l':
        style.paddingLeft = `${value}px`
        break
      case 'pad_r':
        style.paddingRight = `${value}px`
        break
      case 'pad_u':
        style.paddingTop = `${value}px`
        break
      case 'pad_d':
        style.paddingBottom = `${value}px`
        break

      // Spacing - Margin
      case 'mar':
        style.margin = `${value}px`
        break
      case 'mar_l':
        style.marginLeft = `${value}px`
        break
      case 'mar_r':
        style.marginRight = `${value}px`
        break
      case 'mar_u':
        style.marginTop = `${value}px`
        break
      case 'mar_d':
        style.marginBottom = `${value}px`
        break

      // Colors - Simple color system: col = text, bg = background
      case 'col':
        // col → always text color
        style.color = String(value)
        break
      case 'bg':
        // bg → always background color
        style.backgroundColor = String(value)
        break
      case 'boc':
        // Border color (standalone property)
        style.borderColor = String(value)
        break

      // Border - compound properties
      case 'rad':
        style.borderRadius = `${value}px`
        break
      case 'rad_tl':
        style.borderTopLeftRadius = `${value}px`
        break
      case 'rad_tr':
        style.borderTopRightRadius = `${value}px`
        break
      case 'rad_br':
        style.borderBottomRightRadius = `${value}px`
        break
      case 'rad_bl':
        style.borderBottomLeftRadius = `${value}px`
        break
      case 'border':
      case 'bor':
        // Legacy: bor 1 → 1px solid
        style.border = `${value}px solid`
        break
      case 'bor_width':
        // Will be combined with style and color below
        break
      case 'bor_style':
        // Will be combined with width and color below
        break
      case 'bor_color':
        // Will be combined with width and style below
        break

      // Typography
      // Note: 'size' is ambiguous (legacy) - kept for backwards compatibility
      // New code should use 'text-size' / 'ts' or 'icon-size' / 'is'
      case 'size':
      case 'text-size':
      case 'ts':
      case 'font-size':  // backwards compatibility
      case 'fs':         // backwards compatibility
        style.fontSize = `${value}px`
        break
      case 'icon-size':
      case 'is':
        // icon-size is handled by primitive-renderers.tsx for Icon components
        // For non-icon components, apply as fontSize (icons are rendered via CSS font-size)
        style.fontSize = `${value}px`
        break
      case 'weight':
        // Handle 'bold' as a special value for weight
        if (value === 'bold') {
          style.fontWeight = 700
        } else {
          style.fontWeight = Number(value)
        }
        break
      case 'font': {
        const fontValue = String(value)
        style.fontFamily = fontValue
        loadGoogleFont(fontValue)
        break
      }
      case 'line':
        style.lineHeight = Number(value)
        break
      case 'text-align':
      case 'align':
        // Handle normalized value 'cen' → 'center'
        style.textAlign = (value === 'cen' ? 'center' : String(value)) as 'left' | 'center' | 'right' | 'justify'
        break
      case 'italic':
        if (value) style.fontStyle = 'italic'
        break
      case 'underline':
        if (value) style.textDecoration = 'underline'
        break
      case 'uppercase':
        if (value) style.textTransform = 'uppercase'
        break
      case 'lowercase':
        if (value) style.textTransform = 'lowercase'
        break
      case 'truncate':
        if (value) {
          style.overflow = 'hidden'
          style.textOverflow = 'ellipsis'
          style.whiteSpace = 'nowrap'
        }
        break

      // Overflow / Scroll
      case 'scroll':
      case 'scroll-ver':
        if (value) style.overflowY = 'auto'
        break
      case 'scroll-hor':
        if (value) style.overflowX = 'auto'
        break
      case 'scroll-both':
        if (value) style.overflow = 'auto'
        break
      case 'snap':
        if (value) {
          // Determine scroll direction from other properties
          const isHorizontal = properties['scroll-hor']
          const isBoth = properties['scroll-both']
          if (isHorizontal) {
            style.scrollSnapType = 'x mandatory'
          } else if (isBoth) {
            style.scrollSnapType = 'both mandatory'
          } else {
            style.scrollSnapType = 'y mandatory'
          }
        }
        break
      case 'clip':
        if (value) style.overflow = 'hidden'
        break
      case 'snap-align':
        // For children inside a snap container
        style.scrollSnapAlign = String(value) as 'start' | 'center' | 'end'
        break

      // Effects
      case 'opacity':
      case 'opa':
      case 'op':
      case 'o':
        // Accept both 0-1 (CSS standard) and 0-100 (percentage) scales
        // Values > 1 are treated as percentages
        const opacityVal = Number(value)
        style.opacity = opacityVal > 1 ? opacityVal / 100 : opacityVal
        break
      case 'shadow':
        // Convert shadow keywords (sm, md, lg, xl) to CSS box-shadow values
        const shadowVal = String(value).toLowerCase()
        if (shadowVal === 'sm') {
          style.boxShadow = '0 1px 2px 0 rgba(0,0,0,0.05)'
        } else if (shadowVal === 'md') {
          style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)'
        } else if (shadowVal === 'lg') {
          style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)'
        } else if (shadowVal === 'xl') {
          style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)'
        } else if (shadowVal === 'none') {
          style.boxShadow = 'none'
        } else {
          // Numeric value: generate simple shadow
          const numVal = Number(value)
          if (!isNaN(numVal)) {
            style.boxShadow = `0 ${numVal}px ${numVal * 2}px rgba(0,0,0,0.15)`
          } else {
            // Pass through custom CSS value
            style.boxShadow = String(value)
          }
        }
        break
      case 'cursor':
        style.cursor = String(value)
        break
      case 'pointer':
        style.pointerEvents = String(value) as 'none' | 'auto'
        break
      case 'z':
        style.zIndex = Number(value)
        break

      // Transform
      case 'rot':
      case 'rotate':
        style.transform = `rotate(${value}deg)`
        break

      // Visibility (for overlays)
      // NOTE: visible takes precedence over hidden - if visible is explicitly true, hidden is ignored
      case 'hidden':
        // Only apply hidden if visible is not explicitly true
        if (value && resolvedProps.visible !== true) style.display = 'none'
        break
      case 'visible':
        if (value) {
          style.display = 'flex'
        } else {
          style.display = 'none'
        }
        break
    }
  }

  // Handle compound border (bor_width, bor_style, bor_color)
  // Only use compound format when style or color is explicitly specified
  // Otherwise the simple `bor 1` → `1px solid` format is used via the switch case
  if (resolvedProps.bor_style || resolvedProps.bor_color) {
    const width = resolvedProps.bor_width !== undefined ? `${resolvedProps.bor_width}px` : '1px'
    const borderStyle = (resolvedProps.bor_style as string) || 'solid'
    const color = (resolvedProps.bor_color as string) || 'currentColor'
    style.border = `${width} ${borderStyle} ${color}`
  }

  // Handle directional compound borders
  const directions = ['l', 'r', 'u', 'd'] as const
  const cssSides = { l: 'Left', r: 'Right', u: 'Top', d: 'Bottom' } as const

  for (const dir of directions) {
    const widthKey = `bor_${dir}_width`
    const styleKey = `bor_${dir}_style`
    const colorKey = `bor_${dir}_color`

    if (resolvedProps[widthKey] !== undefined || resolvedProps[styleKey] || resolvedProps[colorKey]) {
      const width = resolvedProps[widthKey] !== undefined ? `${resolvedProps[widthKey]}px` : '1px'
      const borderStyle = (resolvedProps[styleKey] as string) || 'solid'
      const color = (resolvedProps[colorKey] as string) || 'currentColor'
      const cssProp = `border${cssSides[dir]}` as keyof React.CSSProperties
      ;(style as Record<string, string>)[cssProp] = `${width} ${borderStyle} ${color}`
    }
  }

  // Legacy: Handle directional borders with old syntax (bor_l, bor_r, etc.)
  const legacyBorderColor = resolvedProps.boc ? String(resolvedProps.boc) : 'currentColor'
  if (resolvedProps.bor_l && !resolvedProps.bor_l_width) {
    style.borderLeft = `${resolvedProps.bor_l}px solid ${legacyBorderColor}`
  }
  if (resolvedProps.bor_r && !resolvedProps.bor_r_width) {
    style.borderRight = `${resolvedProps.bor_r}px solid ${legacyBorderColor}`
  }
  if (resolvedProps.bor_u && !resolvedProps.bor_u_width) {
    style.borderTop = `${resolvedProps.bor_u}px solid ${legacyBorderColor}`
  }
  if (resolvedProps.bor_d && !resolvedProps.bor_d_width) {
    style.borderBottom = `${resolvedProps.bor_d}px solid ${legacyBorderColor}`
  }

  // Add CSS transition for smooth hover effects
  if (hasHoverStyles(resolvedProps)) {
    style.transition = 'all 0.15s ease'
  }

  // Auto-contrast: For interactive components with bg but no explicit col,
  // automatically set a contrasting text color for readability
  if (
    style.backgroundColor &&
    !style.color &&
    componentName &&
    AUTO_CONTRAST_COMPONENTS.has(componentName)
  ) {
    const contrastColor = getContrastTextColor(String(style.backgroundColor))
    if (contrastColor) {
      style.color = contrastColor
    }
  }

  return style
}

/**
 * Simplified version for behavior handlers that don't need hasChildren logic.
 * col → always text color, bg → always background color.
 */
export function getStylesFromNode(properties: DSLProperties): React.CSSProperties {
  return propertiesToStyle(properties, false, 'Box')
}
