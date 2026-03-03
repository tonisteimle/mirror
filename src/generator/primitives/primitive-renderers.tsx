/**
 * Primitive Renderers Module
 *
 * Renders HTML primitives: Input, Textarea, Link, Icon, Image, H1-H6
 *
 * Dark UI defaults are applied automatically. User styles override defaults.
 * Typography can be inherited from App (font, size, color, line-height).
 */

import React, { useEffect, useCallback } from 'react'
import type { ASTNode } from '../../parser/parser'
import { resolveImageSrc } from '../utils'
import { renderDynamicIcon } from '../components'
import { sanitizeHref, sanitizePlaceholder } from '../../utils/sanitize'
import { getHeadingLevel } from '../../parser/sugar/component-type-matcher'
import { isImageComponent } from './primitive-checkers'
import { useTypography, type TypographyContextValue } from '../contexts/typography-context'
import { useStateOverride, useHoverContext, useFilledContext } from '../contexts'

/**
 * Dark UI Default Styles
 * These are applied when user doesn't specify styles.
 * User-provided styles always override these defaults.
 * Design: Grayscale only, flat surfaces (no borders), refined typography.
 *
 * Typography Scale (for fine UI):
 * - Base: 15px
 * - Small: 13px (inputs, labels)
 * - H1: 28px, H2: 22px, H3: 18px, H4: 16px, H5: 14px, H6: 13px
 */
const DEFAULTS = {
  input: {
    backgroundColor: '#2A2A2A',
    color: '#E0E0E0',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 10px',
    fontSize: '13px',
    lineHeight: 1.4,
    fontWeight: 400,
    outline: 'none',
    minWidth: '120px',
  } as React.CSSProperties,

  textarea: {
    backgroundColor: '#2A2A2A',
    color: '#E0E0E0',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 10px',
    fontSize: '13px',
    lineHeight: 1.5,
    fontWeight: 400,
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: '60px',
  } as React.CSSProperties,

  link: {
    color: '#A0A0A0',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: 500,
  } as React.CSSProperties,

  heading: {
    color: '#E8E8E8',
    margin: 0,
    fontWeight: 500,
    lineHeight: 1.3,
  } as React.CSSProperties,

  // Heading sizes - refined scale for UI
  h1: { fontSize: '28px', fontWeight: 600, letterSpacing: '-0.5px' } as React.CSSProperties,
  h2: { fontSize: '22px', fontWeight: 600, letterSpacing: '-0.3px' } as React.CSSProperties,
  h3: { fontSize: '18px', fontWeight: 500 } as React.CSSProperties,
  h4: { fontSize: '16px', fontWeight: 500 } as React.CSSProperties,
  h5: { fontSize: '14px', fontWeight: 500 } as React.CSSProperties,
  h6: { fontSize: '13px', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.5px' } as React.CSSProperties,

  icon: {
    color: '#C0C0C0',
  } as React.CSSProperties,

  button: {
    backgroundColor: '#333333',
    color: '#E0E0E0',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    outline: 'none',
    lineHeight: 1.4,
  } as React.CSSProperties,
}

interface PrimitiveProps {
  node: ASTNode
  style: React.CSSProperties
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onClick?: (e: React.MouseEvent) => void
  /** Inherited typography from App (font, size, color, line-height) */
  typography?: TypographyContextValue
}

/**
 * Apply inherited typography to primitive defaults.
 * Merge order: DARK_DEFAULTS < inherited typography < user styles
 */
function applyInheritedTypography(
  defaults: React.CSSProperties,
  typography: TypographyContextValue
): React.CSSProperties {
  const result = { ...defaults }

  // Apply inherited typography (overrides defaults, but user styles will override these)
  if (typography.fontFamily) {
    result.fontFamily = typography.fontFamily
  }
  if (typography.fontSize) {
    result.fontSize = `${typography.fontSize}px`
  }
  if (typography.lineHeight) {
    result.lineHeight = typography.lineHeight
  }
  if (typography.color) {
    result.color = typography.color
  }

  return result
}

/**
 * Render Button primitive.
 * Uses native <button> for accessibility (focusable, Enter/Space activation).
 * Dark UI defaults applied, user styles override.
 * Typography can be inherited from App.
 */
export function renderButton(
  { node, style, onMouseEnter, onMouseLeave, onClick, typography = {} }: PrimitiveProps,
  children: React.ReactNode
): React.JSX.Element {
  const baseDefaults = applyInheritedTypography(DEFAULTS.button, typography)
  return (
    <button
      key={node.id}
      data-id={node.id}
      data-source-line={node.line}
      className={node.name}
      type={(node.properties.type as 'button' | 'submit' | 'reset') || 'button'}
      disabled={node.properties.disabled as boolean}
      tabIndex={node.properties.tabindex !== undefined ? Number(node.properties.tabindex) : undefined}
      style={{ ...baseDefaults, ...style }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

/**
 * Render Input primitive.
 * Dark UI defaults applied, user styles override.
 * Typography can be inherited from App.
 * Supports state overrides for Value and Placeholder children.
 */
export function renderInput({ node, style, onMouseEnter, onMouseLeave, onClick, typography = {} }: PrimitiveProps): React.JSX.Element {
  return <InputPrimitive node={node} style={style} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onClick} typography={typography} />
}

function InputPrimitive({ node, style, onMouseEnter, onMouseLeave, onClick, typography = {} }: PrimitiveProps): React.JSX.Element {
  const baseDefaults = applyInheritedTypography(DEFAULTS.input, typography)

  // Get hover context from parent InteractiveComponent
  const hoverContext = useHoverContext()

  // Get filled context for reporting filled state to parent
  const filledContext = useFilledContext()

  // Get state overrides for Value and Placeholder children
  const valueOverride = useStateOverride('Value')
  const placeholderOverride = useStateOverride('Placeholder')

  // Extract Placeholder and Value from children
  const placeholderChild = node.children.find(c => c.name === 'Placeholder')
  const valueChild = node.children.find(c => c.name === 'Value')

  // Helper to get text content from a child (checks content or _text child)
  const getChildContent = (child: typeof placeholderChild): string | undefined => {
    if (!child) return undefined
    // Check direct content first
    if (child.content) return child.content
    // Check for _text child (how strings are parsed for generic components)
    const textChild = child.children?.find(c => c.name === '_text')
    return textChild?.content
  }

  // Get placeholder text and color (state override takes precedence)
  const placeholderText = getChildContent(placeholderChild) || node.properties.placeholder as string
  const placeholderColor = placeholderOverride?.col || placeholderOverride?.color ||
    placeholderChild?.properties?.col || placeholderChild?.properties?.color

  // Get value text and color (state override takes precedence)
  const valueText = getChildContent(valueChild) || node.properties.value as string | undefined
  const valueColor = valueOverride?.col || valueOverride?.color ||
    valueChild?.properties?.col || valueChild?.properties?.color

  // Initialize filled state on mount and when valueText changes
  useEffect(() => {
    const isFilled = !!(valueText && valueText.length > 0)
    filledContext?.setIsFilled(isFilled)
  }, [valueText, filledContext])

  // Handle input changes to track filled state
  const handleInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value
    filledContext?.setIsFilled(newValue.length > 0)
  }, [filledContext])

  // Generate unique ID for placeholder styling
  const inputId = `input-${node.id}`

  // Build final style with value color if specified
  // Apply hover styles from parent InteractiveComponent when hovered
  const finalStyle: React.CSSProperties = {
    ...baseDefaults,
    ...style,
    ...(valueColor ? { color: String(valueColor) } : {}),
    ...(hoverContext?.isHovered ? hoverContext.hoverStyles : {})
  }

  return (
    <>
      {placeholderColor && (
        <style>{`#${inputId}::placeholder { color: ${placeholderColor}; opacity: 1; }`}</style>
      )}
      <input
        id={inputId}
        key={node.id}
        data-id={node.id}
        data-source-line={node.line}
        className={node.name}
        type={(node.properties.type as string) || 'text'}
        placeholder={sanitizePlaceholder(placeholderText)}
        defaultValue={valueText}
        tabIndex={node.properties.tabindex !== undefined ? Number(node.properties.tabindex) : undefined}
        style={finalStyle}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        onInput={handleInput}
      />
    </>
  )
}

/**
 * Render Textarea primitive.
 * Dark UI defaults applied, user styles override.
 * Typography can be inherited from App.
 * Supports state overrides for Value and Placeholder children.
 */
export function renderTextarea({ node, style, onMouseEnter, onMouseLeave, onClick, typography = {} }: PrimitiveProps): React.JSX.Element {
  return <TextareaPrimitive node={node} style={style} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onClick} typography={typography} />
}

function TextareaPrimitive({ node, style, onMouseEnter, onMouseLeave, onClick, typography = {} }: PrimitiveProps): React.JSX.Element {
  const baseDefaults = applyInheritedTypography(DEFAULTS.textarea, typography)

  // Get hover context from parent InteractiveComponent
  const hoverContext = useHoverContext()

  // Get filled context for reporting filled state to parent
  const filledContext = useFilledContext()

  // Get state overrides for Value and Placeholder children
  const valueOverride = useStateOverride('Value')
  const placeholderOverride = useStateOverride('Placeholder')

  // Extract Placeholder and Value from children
  const placeholderChild = node.children.find(c => c.name === 'Placeholder')
  const valueChild = node.children.find(c => c.name === 'Value')

  // Helper to get text content from a child (checks content or _text child)
  const getChildContent = (child: typeof placeholderChild): string | undefined => {
    if (!child) return undefined
    // Check direct content first
    if (child.content) return child.content
    // Check for _text child (how strings are parsed for generic components)
    const textChild = child.children?.find(c => c.name === '_text')
    return textChild?.content
  }

  // Get placeholder text and color (state override takes precedence)
  const placeholderText = getChildContent(placeholderChild) || node.properties.placeholder as string
  const placeholderColor = placeholderOverride?.col || placeholderOverride?.color ||
    placeholderChild?.properties?.col || placeholderChild?.properties?.color

  // Get value text and color (state override takes precedence)
  const valueText = getChildContent(valueChild) || node.properties.value as string | undefined
  const valueColor = valueOverride?.col || valueOverride?.color ||
    valueChild?.properties?.col || valueChild?.properties?.color

  // Initialize filled state on mount and when valueText changes
  useEffect(() => {
    const isFilled = !!(valueText && valueText.length > 0)
    filledContext?.setIsFilled(isFilled)
  }, [valueText, filledContext])

  // Handle input changes to track filled state
  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const newValue = e.currentTarget.value
    filledContext?.setIsFilled(newValue.length > 0)
  }, [filledContext])

  // Generate unique ID for placeholder styling
  const textareaId = `textarea-${node.id}`

  // Build final style with value color if specified
  // Apply hover styles from parent InteractiveComponent when hovered
  const finalStyle: React.CSSProperties = {
    ...baseDefaults,
    ...style,
    ...(valueColor ? { color: String(valueColor) } : {}),
    ...(hoverContext?.isHovered ? hoverContext.hoverStyles : {})
  }

  return (
    <>
      {placeholderColor && (
        <style>{`#${textareaId}::placeholder { color: ${placeholderColor}; opacity: 1; }`}</style>
      )}
      <textarea
        id={textareaId}
        key={node.id}
        data-id={node.id}
        data-source-line={node.line}
        className={node.name}
        placeholder={sanitizePlaceholder(placeholderText)}
        defaultValue={valueText}
        rows={(node.properties.rows as number) || 3}
        tabIndex={node.properties.tabindex !== undefined ? Number(node.properties.tabindex) : undefined}
        style={finalStyle}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        onInput={handleInput}
      />
    </>
  )
}

/**
 * Render Link primitive.
 * Icon children are rendered as part of children (no separate icon handling).
 * Dark UI defaults applied, user styles override.
 * Typography can be inherited from App.
 */
export function renderLink(
  { node, style, onMouseEnter, onMouseLeave, onClick, typography = {} }: PrimitiveProps,
  children: React.ReactNode
): React.JSX.Element {
  const baseDefaults = applyInheritedTypography(DEFAULTS.link, typography)
  return (
    <a
      key={node.id}
      data-id={node.id}
      data-source-line={node.line}
      className={node.name}
      href={sanitizeHref(node.properties.href as string)}
      target={(node.properties.target as string) || undefined}
      rel={node.properties.target === '_blank' ? 'noopener noreferrer' : undefined}
      style={{ ...baseDefaults, ...style }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {children}
    </a>
  )
}

/**
 * Render Icon component.
 * Icon name comes from content: Icon "search" → content = "search"
 * Library detection: Icon "home" material → uses Material Icons
 * Dark UI defaults applied, user styles override.
 */
export function renderIcon({ node, style, onMouseEnter, onMouseLeave, onClick }: PrimitiveProps): React.JSX.Element | null {
  // Icon name from text content: Icon "search"
  const iconName = node.content

  if (!iconName) return null

  // icon-size: new, size: legacy
  const iconSizeValue = node.properties['icon-size'] ?? node.properties.size
  const iconSize = typeof iconSizeValue === 'number' ? iconSizeValue : 20
  // Icon color priority: icon-color/ic > color/col > default
  // This allows explicit icon coloring separate from text color
  const iconColorValue = node.properties['icon-color'] ?? node.properties.ic ?? node.properties.col
  const iconColor = typeof iconColorValue === 'string' ? iconColorValue : DEFAULTS.icon.color
  // Check for material/phosphor property: Icon "home" material, Icon "House" phosphor
  const library = node.properties.material ? 'material' : node.properties.phosphor ? 'phosphor' : 'lucide'
  // Icon weight: Lucide uses strokeWidth (mapped from 100-700), Material uses wght (100-700)
  const iconWeight = node.properties['icon-weight'] ?? node.properties.iw
  const weight = typeof iconWeight === 'number' ? iconWeight : undefined
  // Fill (Material only): true = filled, false = outlined (default)
  const fill = node.properties.fill === true

  return (
    <span
      key={node.id}
      data-id={node.id}
      data-source-line={node.line}
      className={node.name}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {renderDynamicIcon(iconName, iconSize, iconColor as string, library, weight, fill)}
    </span>
  )
}

/**
 * Render Image element.
 */
export function renderImageElement(node: ASTNode): React.JSX.Element | null {
  const imageSrcRaw = (node.properties.src as string | undefined) ||
                      (isImageComponent(node) ? node.content : undefined)

  if (!imageSrcRaw) return null

  const imageSrc = resolveImageSrc(imageSrcRaw)
  const imageAlt = (node.properties.alt as string) || ''
  const imageFit = (node.properties.fit as string) || 'cover'

  return (
    <img
      src={imageSrc}
      alt={imageAlt}
      style={{
        width: '100%',
        height: '100%',
        objectFit: imageFit as 'cover' | 'contain' | 'fill' | 'none' | 'scale-down',
        borderRadius: 'inherit',
      }}
    />
  )
}

/**
 * Get image source from node.
 */
export function getImageSrc(node: ASTNode): string | undefined {
  const imageSrcRaw = (node.properties.src as string | undefined) ||
                      (isImageComponent(node) ? node.content : undefined)
  return imageSrcRaw ? resolveImageSrc(imageSrcRaw) : undefined
}

/**
 * Render Heading element (H1-H6).
 * Dark UI defaults applied with level-specific sizing, user styles override.
 * Typography can be inherited from App.
 */
export function renderHeading(
  { node, style, onMouseEnter, onMouseLeave, onClick, typography = {} }: PrimitiveProps,
  children: React.ReactNode
): React.JSX.Element {
  const level = getHeadingLevel(node) || 1
  const Tag = `h${level}` as keyof React.JSX.IntrinsicElements

  // Get level-specific defaults
  const levelKey = `h${level}` as keyof typeof DEFAULTS
  const levelDefaults = DEFAULTS[levelKey] || {}

  // Apply inherited typography to base heading defaults
  const baseDefaults = applyInheritedTypography({ ...DEFAULTS.heading, ...levelDefaults }, typography)

  return React.createElement(
    Tag,
    {
      key: node.id,
      'data-id': node.id,
      'data-source-line': node.line,
      className: node.name,
      style: { ...baseDefaults, ...style },
      onMouseEnter,
      onMouseLeave,
      onClick,
    },
    children
  )
}
