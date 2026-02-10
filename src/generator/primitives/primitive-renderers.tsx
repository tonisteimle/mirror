/**
 * Primitive Renderers Module
 *
 * Renders HTML primitives: Input, Textarea, Link, Icon, Image
 */

import React from 'react'
import type { ASTNode } from '../../parser/parser'
import { getIcon, resolveImageSrc } from '../utils'
import { sanitizeHref, sanitizePlaceholder, sanitizeTextContent } from '../../utils/sanitize'

interface PrimitiveProps {
  node: ASTNode
  style: React.CSSProperties
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onClick?: (e: React.MouseEvent) => void
}

/**
 * Check if node is an Input primitive.
 */
export function isInputPrimitive(node: ASTNode): boolean {
  return node.properties._primitiveType === 'Input' ||
         node.name === 'Input' ||
         node.name.endsWith('Input')
}

/**
 * Check if node is a Textarea primitive.
 */
export function isTextareaPrimitive(node: ASTNode): boolean {
  return node.properties._primitiveType === 'Textarea' ||
         node.name === 'Textarea' ||
         node.name.endsWith('Textarea')
}

/**
 * Check if node is a Link primitive.
 */
export function isLinkPrimitive(node: ASTNode): boolean {
  return node.properties._primitiveType === 'Link' ||
         node.name === 'Link' ||
         node.name.endsWith('Link')
}

/**
 * Check if node is an Icon component.
 */
export function isIconComponent(node: ASTNode): boolean {
  return node.name === 'Icon' || node.name.endsWith('Icon')
}

/**
 * Check if node is an Image component.
 */
export function isImageComponent(node: ASTNode): boolean {
  return node.properties._primitiveType === 'Image' ||
         node.name === 'Image' ||
         node.name.endsWith('Image')
}

/**
 * Render Input primitive.
 */
export function renderInput({ node, style, onMouseEnter, onMouseLeave, onClick }: PrimitiveProps): JSX.Element {
  return (
    <input
      key={node.id}
      data-id={node.id}
      className={node.name}
      type={(node.properties.type as string) || 'text'}
      placeholder={sanitizePlaceholder(node.properties.placeholder as string)}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    />
  )
}

/**
 * Render Textarea primitive.
 */
export function renderTextarea({ node, style, onMouseEnter, onMouseLeave, onClick }: PrimitiveProps): JSX.Element {
  return (
    <textarea
      key={node.id}
      data-id={node.id}
      className={node.name}
      placeholder={sanitizePlaceholder(node.properties.placeholder as string)}
      rows={(node.properties.rows as number) || 3}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    />
  )
}

/**
 * Render Link primitive.
 */
export function renderLink(
  { node, style, onMouseEnter, onMouseLeave, onClick }: PrimitiveProps,
  children: React.ReactNode,
  iconName?: string
): JSX.Element {
  const IconComponent = iconName ? getIcon(iconName) : null
  const iconSize = typeof node.properties.size === 'number' ? node.properties.size : 20
  const iconColor = typeof node.properties.col === 'string' ? node.properties.col : 'currentColor'

  return (
    <a
      key={node.id}
      data-id={node.id}
      className={node.name}
      href={sanitizeHref(node.properties.href as string)}
      target={(node.properties.target as string) || undefined}
      rel={node.properties.target === '_blank' ? 'noopener noreferrer' : undefined}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {IconComponent && <IconComponent size={iconSize} color={iconColor} />}
      {children}
    </a>
  )
}

/**
 * Render Icon component.
 */
export function renderIcon({ node, style, onMouseEnter, onMouseLeave, onClick }: PrimitiveProps): JSX.Element | null {
  const iconName = node.properties.icon as string | undefined
  const IconComponent = iconName ? getIcon(iconName) : null

  if (!IconComponent) return null

  const iconSize = typeof node.properties.size === 'number' ? node.properties.size : 20
  const iconColor = typeof node.properties.col === 'string' ? node.properties.col : 'currentColor'

  return (
    <span
      key={node.id}
      data-id={node.id}
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
      <IconComponent size={iconSize} color={iconColor} />
    </span>
  )
}

/**
 * Render Image element.
 */
export function renderImageElement(node: ASTNode): JSX.Element | null {
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
