/**
 * DynamicIcon - Icon component for the generator
 *
 * Uses synchronous loading from the icon cache for SSR compatibility.
 * All Lucide icons are imported once and cached for instant access.
 */

import React, { memo } from 'react'
import { getIcon } from '../utils/icon-cache'

interface DynamicIconProps {
  name: string
  size?: number
  color?: string
}

/**
 * Dynamic Icon Component
 *
 * Renders a Lucide icon by name using synchronous loading.
 * Works in both client and SSR contexts.
 */
export const DynamicIcon = memo(function DynamicIcon({ name, size = 24, color }: DynamicIconProps) {
  const IconComponent = getIcon(name)

  if (!IconComponent) {
    return null
  }

  return <IconComponent size={size} color={color} />
})

/**
 * Render dynamic icon helper - returns JSX or null
 * Use this as a drop-in replacement for IconComponent rendering
 */
export function renderDynamicIcon(
  iconName: string | undefined,
  size: number = 24,
  color: string = 'currentColor'
): React.JSX.Element | null {
  if (!iconName) return null
  return <DynamicIcon name={iconName} size={size} color={color} />
}
