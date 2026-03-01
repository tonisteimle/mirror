/**
 * Component Arbitraries for Mirror DSL
 *
 * Generates random component definitions, instances, and nested structures.
 */

import * as fc from 'fast-check'
import {
  componentName,
  anyComponentName,
  hexColor,
  smallPixelValue,
  dimensionValue,
  quotedString,
  shortLabel,
  iconName,
  shadowSize
} from './primitives'

// =============================================================================
// Simple Component Generators
// =============================================================================

/** Simple component with just a name */
export const simpleComponent = componentName

/** Component with background color */
export const componentWithBg = fc.record({
  name: componentName,
  color: hexColor
}).map(({ name, color }) => `${name} bg ${color}`)

/** Component with padding */
export const componentWithPad = fc.record({
  name: componentName,
  pad: smallPixelValue
}).map(({ name, pad }) => `${name} pad ${pad}`)

/** Component with border radius */
export const componentWithRadius = fc.record({
  name: componentName,
  rad: smallPixelValue
}).map(({ name, rad }) => `${name} rad ${rad}`)

/** Component with gap */
export const componentWithGap = fc.record({
  name: componentName,
  gap: smallPixelValue
}).map(({ name, gap }) => `${name} gap ${gap}`)

// =============================================================================
// Multi-Property Components
// =============================================================================

/** Component with multiple optional properties */
export const componentWithProps = fc.record({
  name: componentName,
  bg: fc.option(hexColor, { nil: undefined }),
  pad: fc.option(smallPixelValue, { nil: undefined }),
  rad: fc.option(smallPixelValue, { nil: undefined }),
  col: fc.option(hexColor, { nil: undefined }),
  gap: fc.option(smallPixelValue, { nil: undefined }),
  shadow: fc.option(shadowSize, { nil: undefined })
}).map(({ name, bg, pad, rad, col, gap, shadow }) => {
  const props: string[] = []
  if (bg) props.push(`bg ${bg}`)
  if (pad !== undefined) props.push(`pad ${pad}`)
  if (rad !== undefined) props.push(`rad ${rad}`)
  if (col) props.push(`col ${col}`)
  if (gap !== undefined) props.push(`gap ${gap}`)
  if (shadow) props.push(`shadow ${shadow}`)
  return props.length > 0 ? `${name} ${props.join(', ')}` : name
})

/** Component with layout properties */
export const componentWithLayout = fc.record({
  name: componentName,
  direction: fc.constantFrom('hor', 'ver', 'horizontal', 'vertical'),
  gap: fc.option(smallPixelValue, { nil: undefined }),
  center: fc.boolean()
}).map(({ name, direction, gap, center }) => {
  const props = [direction]
  if (gap !== undefined) props.push(`gap ${gap}`)
  if (center) props.push('center')
  return `${name} ${props.join(', ')}`
})

/** Component with sizing */
export const componentWithSize = fc.record({
  name: componentName,
  width: fc.option(dimensionValue, { nil: undefined }),
  height: fc.option(dimensionValue, { nil: undefined })
}).map(({ name, width, height }) => {
  const props: string[] = []
  if (width !== undefined) props.push(`w ${width}`)
  if (height !== undefined) props.push(`h ${height}`)
  return props.length > 0 ? `${name} ${props.join(', ')}` : name
})

// =============================================================================
// Component with Content
// =============================================================================

/** Component with text content */
export const componentWithText = fc.record({
  name: componentName,
  text: shortLabel
}).map(({ name, text }) => `${name} "${text}"`)

/** Button with label */
export const buttonComponent = fc.record({
  label: shortLabel,
  bg: fc.option(hexColor, { nil: undefined }),
  pad: fc.option(smallPixelValue, { nil: undefined }),
  rad: fc.option(smallPixelValue, { nil: undefined })
}).map(({ label, bg, pad, rad }) => {
  const props: string[] = []
  if (bg) props.push(`bg ${bg}`)
  if (pad !== undefined) props.push(`pad ${pad}`)
  if (rad !== undefined) props.push(`rad ${rad}`)
  props.push(`"${label}"`)
  return `Button ${props.join(', ')}`
})

/** Icon component */
export const iconComponent = fc.record({
  icon: iconName,
  size: fc.option(smallPixelValue, { nil: undefined }),
  col: fc.option(hexColor, { nil: undefined }),
  material: fc.boolean()
}).map(({ icon, size, col, material }) => {
  const props = [`"${icon}"`]
  if (size !== undefined) props.push(`size ${size}`)
  if (col) props.push(`col ${col}`)
  if (material) props.push('material')
  return `Icon ${props.join(', ')}`
})

/** Input component */
export const inputComponent = fc.record({
  placeholder: fc.option(shortLabel, { nil: undefined }),
  type: fc.option(fc.constantFrom('text', 'email', 'password', 'number'), { nil: undefined }),
  pad: fc.option(smallPixelValue, { nil: undefined })
}).map(({ placeholder, type, pad }) => {
  const props: string[] = []
  if (type) props.push(`type ${type}`)
  if (pad !== undefined) props.push(`pad ${pad}`)
  if (placeholder) props.push(`"${placeholder}"`)
  return `Input ${props.join(', ')}`.trim()
})

/** Image component */
export const imageComponent = fc.record({
  src: fc.constantFrom(
    'https://example.com/image.jpg',
    '/images/photo.png',
    'placeholder.svg'
  ),
  fit: fc.option(fc.constantFrom('cover', 'contain', 'fill'), { nil: undefined }),
  width: fc.option(smallPixelValue, { nil: undefined }),
  height: fc.option(smallPixelValue, { nil: undefined })
}).map(({ src, fit, width, height }) => {
  const props = [`"${src}"`]
  if (fit) props.push(`fit ${fit}`)
  if (width !== undefined) props.push(`w ${width}`)
  if (height !== undefined) props.push(`h ${height}`)
  return `Image ${props.join(', ')}`
})

// =============================================================================
// Nested Components
// =============================================================================

/** Generate nested component structure */
export const nestedComponents = fc.record({
  parent: componentName,
  childCount: fc.integer({ min: 1, max: 5 })
}).chain(({ parent, childCount }) =>
  fc.array(componentWithProps, { minLength: childCount, maxLength: childCount })
    .map(children => `${parent}\n${children.map(c => `  ${c}`).join('\n')}`)
)

/** Card-like structure with title and content */
export const cardStructure = fc.record({
  title: shortLabel,
  description: fc.option(shortLabel, { nil: undefined }),
  bg: fc.option(hexColor, { nil: undefined }),
  pad: fc.option(smallPixelValue, { nil: undefined }),
  rad: fc.option(smallPixelValue, { nil: undefined })
}).map(({ title, description, bg, pad, rad }) => {
  const cardProps: string[] = []
  if (bg) cardProps.push(`bg ${bg}`)
  if (pad !== undefined) cardProps.push(`pad ${pad}`)
  if (rad !== undefined) cardProps.push(`rad ${rad}`)

  let code = `Card${cardProps.length > 0 ? ' ' + cardProps.join(', ') : ''}\n`
  code += `  Title "${title}"\n`
  if (description) {
    code += `  Description "${description}"`
  }
  return code.trimEnd()
})

/** List structure with items */
export const listStructure = fc.record({
  itemCount: fc.integer({ min: 2, max: 6 })
}).chain(({ itemCount }) =>
  fc.array(shortLabel, { minLength: itemCount, maxLength: itemCount })
    .map(items => {
      let code = 'List ver, gap 8\n'
      items.forEach(item => {
        code += `  Item "${item}"\n`
      })
      return code.trimEnd()
    })
)

/** Deep nesting (configurable depth) */
export function deepNesting(maxDepth: number): fc.Arbitrary<string> {
  return fc.integer({ min: 1, max: maxDepth }).chain(depth => {
    let code = ''
    let indent = ''
    for (let i = 0; i < depth; i++) {
      code += `${indent}Box pad ${8 + i * 4}\n`
      indent += '  '
    }
    code += `${indent}Text "Nested content"`
    return fc.constant(code)
  })
}

// =============================================================================
// Component Definition Generators
// =============================================================================

/** Component definition (Name: properties) */
export const componentDefinition = fc.record({
  name: anyComponentName,
  bg: fc.option(hexColor, { nil: undefined }),
  pad: fc.option(smallPixelValue, { nil: undefined }),
  rad: fc.option(smallPixelValue, { nil: undefined })
}).map(({ name, bg, pad, rad }) => {
  const props: string[] = []
  if (bg) props.push(`bg ${bg}`)
  if (pad !== undefined) props.push(`pad ${pad}`)
  if (rad !== undefined) props.push(`rad ${rad}`)
  return `${name}: ${props.join(', ')}`
})

/** Component definition with children (slots) */
export const componentDefinitionWithSlots = fc.record({
  name: anyComponentName,
  slotCount: fc.integer({ min: 1, max: 3 }),
  bg: fc.option(hexColor, { nil: undefined }),
  pad: fc.option(smallPixelValue, { nil: undefined })
}).chain(({ name, slotCount, bg, pad }) =>
  fc.array(anyComponentName, { minLength: slotCount, maxLength: slotCount })
    .map(slots => {
      const props: string[] = []
      if (bg) props.push(`bg ${bg}`)
      if (pad !== undefined) props.push(`pad ${pad}`)

      let code = `${name}: ${props.join(', ')}\n`
      slots.forEach(slot => {
        code += `  ${slot}:\n`
      })
      return code.trimEnd()
    })
)

// =============================================================================
// Named Instance Generators
// =============================================================================

/** Named instance (Component named Name) */
export const namedInstance = fc.record({
  component: componentName,
  instanceName: anyComponentName,
  text: fc.option(shortLabel, { nil: undefined })
}).map(({ component, instanceName, text }) => {
  let code = `${component} named ${instanceName}`
  if (text) code += ` "${text}"`
  return code
})

/** Inline define + render (Name as Type) */
export const inlineDefineRender = fc.record({
  name: anyComponentName,
  type: componentName,
  pad: fc.option(smallPixelValue, { nil: undefined }),
  bg: fc.option(hexColor, { nil: undefined })
}).map(({ name, type, pad, bg }) => {
  const props: string[] = []
  if (pad !== undefined) props.push(`pad ${pad}`)
  if (bg) props.push(`bg ${bg}`)
  return `${name} as ${type}${props.length > 0 ? ', ' + props.join(', ') : ''}`
})

// =============================================================================
// Export combined generators
// =============================================================================

/** Any simple component (single line) */
export const anySimpleComponent = fc.oneof(
  simpleComponent,
  componentWithBg,
  componentWithPad,
  componentWithProps,
  componentWithText,
  buttonComponent,
  iconComponent
)

/** Any valid Mirror code (simple) */
export const validMirrorCode = fc.oneof(
  simpleComponent,
  componentWithBg,
  componentWithPad,
  componentWithProps,
  componentWithText
)
