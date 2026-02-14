/**
 * Primitive Renderers Module
 *
 * Renders HTML primitives: Input, Textarea, Link, Icon, Image, H1-H6
 */

import React from 'react'
import type { ASTNode } from '../../parser/parser'
import { resolveImageSrc } from '../utils'
import { renderDynamicIcon } from '../components'
import { sanitizeHref, sanitizePlaceholder } from '../../utils/sanitize'
import { getHeadingLevel } from '../../parser/sugar/component-type-matcher'
import { isImageComponent } from './primitive-checkers'

interface PrimitiveProps {
  node: ASTNode
  style: React.CSSProperties
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onClick?: (e: React.MouseEvent) => void
}

/**
 * Render Input primitive.
 */
export function renderInput({ node, style, onMouseEnter, onMouseLeave, onClick }: PrimitiveProps): React.JSX.Element {
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
export function renderTextarea({ node, style, onMouseEnter, onMouseLeave, onClick }: PrimitiveProps): React.JSX.Element {
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
): React.JSX.Element {
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
      {renderDynamicIcon(iconName, iconSize, iconColor)}
      {children}
    </a>
  )
}

/**
 * Render Icon component.
 */
export function renderIcon({ node, style, onMouseEnter, onMouseLeave, onClick }: PrimitiveProps): React.JSX.Element | null {
  const iconName = node.properties.icon as string | undefined

  if (!iconName) return null

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
      {renderDynamicIcon(iconName, iconSize, iconColor)}
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
 */
export function renderHeading(
  { node, style, onMouseEnter, onMouseLeave, onClick }: PrimitiveProps,
  children: React.ReactNode
): React.JSX.Element {
  const level = getHeadingLevel(node) || 1
  const Tag = `h${level}` as keyof React.JSX.IntrinsicElements

  return React.createElement(
    Tag,
    {
      key: node.id,
      'data-id': node.id,
      className: node.name,
      style,
      onMouseEnter,
      onMouseLeave,
      onClick,
    },
    children
  )
}
