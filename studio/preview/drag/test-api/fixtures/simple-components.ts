/**
 * Simple Component Fixtures
 *
 * Fixtures for basic components without Zag behavior or complex slots.
 */

import type { ComponentFixture } from '../types'

/**
 * Simple components - no special behavior, straightforward code generation
 */
export const SIMPLE_COMPONENTS: Record<string, ComponentFixture> = {
  Button: {
    componentName: 'Button',
    textContent: 'Button',
    template: 'Button',
    expectedLines: ['Button "Button"'],
    category: 'simple',
  },

  Text: {
    componentName: 'Text',
    textContent: 'Text',
    template: 'Text',
    expectedLines: ['Text "Text"'],
    category: 'simple',
  },

  Frame: {
    componentName: 'Frame',
    template: 'Frame',
    expectedLines: ['Frame'],
    category: 'simple',
  },

  Icon: {
    componentName: 'Icon',
    properties: 'star',
    template: 'Icon',
    expectedLines: ['Icon "star"'],
    category: 'simple',
  },

  Image: {
    componentName: 'Image',
    properties: 'w 100, h 100, bg #e5e7eb',
    template: 'Image',
    expectedLines: ['Image w 100, h 100, bg #e5e7eb'],
    category: 'simple',
  },

  Input: {
    componentName: 'Input',
    properties: 'placeholder "Enter text..."',
    template: 'Input',
    expectedLines: ['Input placeholder "Enter text..."'],
    category: 'simple',
  },

  Textarea: {
    componentName: 'Textarea',
    properties: 'placeholder "Enter text..."',
    template: 'Textarea',
    expectedLines: ['Textarea placeholder "Enter text..."'],
    category: 'simple',
  },
}

/**
 * Layout components - container variants
 */
export const LAYOUT_COMPONENTS: Record<string, ComponentFixture> = {
  Column: {
    componentName: 'Frame',
    properties: 'ver, gap 8',
    template: 'Frame',
    expectedLines: ['Frame ver, gap 8'],
    category: 'layout',
  },

  Row: {
    componentName: 'Frame',
    properties: 'hor, gap 8',
    template: 'Frame',
    expectedLines: ['Frame hor, gap 8'],
    category: 'layout',
  },

  Grid: {
    componentName: 'Frame',
    properties: 'grid 3, gap 8',
    template: 'Frame',
    expectedLines: ['Frame grid 3, gap 8'],
    category: 'layout',
  },

  Stack: {
    componentName: 'Frame',
    properties: 'stacked',
    template: 'Frame',
    expectedLines: ['Frame stacked'],
    category: 'layout',
  },
}

/**
 * Get all simple component names
 */
export function getSimpleComponentNames(): string[] {
  return Object.keys(SIMPLE_COMPONENTS)
}

/**
 * Get all layout component names
 */
export function getLayoutComponentNames(): string[] {
  return Object.keys(LAYOUT_COMPONENTS)
}

/**
 * Get fixture by component name
 */
export function getSimpleFixture(name: string): ComponentFixture | undefined {
  return SIMPLE_COMPONENTS[name] || LAYOUT_COMPONENTS[name]
}
