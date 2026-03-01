/**
 * Inheritance Arbitraries for Mirror DSL
 *
 * Generates random inheritance patterns: Child: Parent
 */

import * as fc from 'fast-check'
import {
  componentName,
  anyComponentName,
  hexColor,
  smallPixelValue
} from './primitives'

// =============================================================================
// Simple Inheritance
// =============================================================================

/** Basic inheritance: Child: Parent */
export const simpleInheritance = fc.record({
  child: anyComponentName,
  parent: componentName
}).map(({ child, parent }) => `${child}: ${parent}`)

/** Inheritance with property overrides */
export const inheritanceWithOverrides = fc.record({
  child: anyComponentName,
  parent: componentName,
  bg: fc.option(hexColor, { nil: undefined }),
  pad: fc.option(smallPixelValue, { nil: undefined }),
  rad: fc.option(smallPixelValue, { nil: undefined })
}).map(({ child, parent, bg, pad, rad }) => {
  const props: string[] = []
  if (bg) props.push(`bg ${bg}`)
  if (pad !== undefined) props.push(`pad ${pad}`)
  if (rad !== undefined) props.push(`rad ${rad}`)
  const propsStr = props.length > 0 ? ` ${props.join(', ')}` : ''
  return `${child}: ${parent}${propsStr}`
})

// =============================================================================
// Child Overrides (Semicolon Syntax)
// =============================================================================

/** Inheritance with child overrides: Child: Parent childName property */
export const inheritanceWithChildOverrides = fc.record({
  child: anyComponentName,
  parent: componentName,
  slotName: fc.constantFrom('Icon', 'Label', 'Title', 'Content'),
  property: fc.constantFrom('hidden', 'visible', 'col #FFF', 'bg #333')
}).map(({ child, parent, slotName, property }) =>
  `${child}: ${parent} ${slotName.toLowerCase()} ${property}`
)

/** Multiple child overrides */
export const multipleChildOverrides = fc.record({
  child: anyComponentName,
  parent: componentName,
  overrides: fc.array(
    fc.record({
      slot: fc.constantFrom('Icon', 'Label', 'Title', 'Description'),
      prop: fc.constantFrom('hidden', 'visible', '"new text"')
    }),
    { minLength: 1, maxLength: 3 }
  )
}).map(({ child, parent, overrides }) => {
  const overrideStrs = overrides.map(o => `${o.slot.toLowerCase()} ${o.prop}`)
  return `${child}: ${parent} ${overrideStrs.join('; ')}`
})

// =============================================================================
// Button Variants (Common Pattern)
// =============================================================================

/** Button base and variants */
export const buttonVariants = fc.record({
  baseBg: hexColor,
  basePad: smallPixelValue,
  baseRad: smallPixelValue,
  variants: fc.array(
    fc.record({
      name: fc.constantFrom('Primary', 'Secondary', 'Danger', 'Ghost', 'Outline'),
      bg: fc.option(hexColor, { nil: undefined }),
      bor: fc.option(smallPixelValue, { nil: undefined })
    }),
    { minLength: 1, maxLength: 4 }
  )
}).map(({ baseBg, basePad, baseRad, variants }) => {
  let code = `Button: pad ${basePad}, bg ${baseBg}, rad ${baseRad}\n\n`
  variants.forEach(v => {
    const props: string[] = []
    if (v.bg) props.push(`bg ${v.bg}`)
    if (v.bor !== undefined) props.push(`bor ${v.bor}`)
    code += `${v.name}Button: Button${props.length > 0 ? ' ' + props.join(', ') : ''}\n`
  })
  return code.trimEnd()
})

/** Card variants */
export const cardVariants = fc.record({
  baseBg: hexColor,
  basePad: smallPixelValue,
  variants: fc.integer({ min: 1, max: 3 })
}).chain(({ baseBg, basePad, variants }) =>
  fc.array(
    fc.record({
      name: fc.constantFrom('Featured', 'Compact', 'Large', 'Highlighted'),
      shadow: fc.constantFrom('sm', 'md', 'lg')
    }),
    { minLength: variants, maxLength: variants }
  ).map(variantList => {
    let code = `Card: pad ${basePad}, bg ${baseBg}, rad 8\n\n`
    variantList.forEach(v => {
      code += `${v.name}Card: Card shadow ${v.shadow}\n`
    })
    return code.trimEnd()
  })
)

// =============================================================================
// Multi-Level Inheritance
// =============================================================================

/** Two-level inheritance chain */
export const twoLevelInheritance = fc.record({
  grandparent: componentName,
  parent: anyComponentName,
  child: anyComponentName,
  gpBg: hexColor,
  pPad: smallPixelValue,
  cRad: smallPixelValue
}).map(({ grandparent, parent, child, gpBg, pPad, cRad }) =>
  `${grandparent}: bg ${gpBg}\n${parent}: ${grandparent} pad ${pPad}\n${child}: ${parent} rad ${cRad}`
)

/** Three-level inheritance chain */
export const threeLevelInheritance = fc.record({
  base: componentName,
  level1: anyComponentName,
  level2: anyComponentName,
  level3: anyComponentName
}).map(({ base, level1, level2, level3 }) =>
  `${base}: pad 8\n${level1}: ${base} bg #333\n${level2}: ${level1} rad 4\n${level3}: ${level2} col #FFF`
)

// =============================================================================
// Definition + Instance Pattern
// =============================================================================

/** Define component then use it */
export const defineAndUse = fc.record({
  name: anyComponentName,
  bg: hexColor,
  pad: smallPixelValue,
  uses: fc.integer({ min: 1, max: 3 })
}).map(({ name, bg, pad, uses }) => {
  let code = `${name}: pad ${pad}, bg ${bg}\n\n`
  for (let i = 0; i < uses; i++) {
    code += `${name} "Item ${i + 1}"\n`
  }
  return code.trimEnd()
})

/** Define with slots, then fill them */
export const defineWithSlots = fc.record({
  name: anyComponentName,
  slots: fc.array(
    fc.constantFrom('Title', 'Content', 'Footer', 'Icon', 'Label'),
    { minLength: 1, maxLength: 3 }
  )
}).map(({ name, slots }) => {
  // Definition with slots
  let code = `${name}: pad 16, bg #333\n`
  slots.forEach(slot => {
    code += `  ${slot}:\n`
  })
  code += '\n'

  // Instance filling slots
  code += `${name}\n`
  slots.forEach(slot => {
    code += `  ${slot} "Sample ${slot.toLowerCase()}"\n`
  })

  return code.trimEnd()
})

// =============================================================================
// Combined Generators
// =============================================================================

/** Any inheritance pattern */
export const anyInheritance = fc.oneof(
  simpleInheritance,
  inheritanceWithOverrides,
  inheritanceWithChildOverrides
)

/** Complete inheritance example (definition + variants + usage) */
export const completeInheritanceExample = fc.record({
  baseName: fc.constantFrom('Card', 'Button', 'Panel', 'Item'),
  variantCount: fc.integer({ min: 1, max: 3 }),
  usageCount: fc.integer({ min: 1, max: 3 })
}).chain(({ baseName, variantCount, usageCount }) =>
  fc.array(anyComponentName, { minLength: variantCount, maxLength: variantCount })
    .map(variants => {
      let code = `${baseName}: pad 12, bg #333, rad 8\n\n`

      // Variants
      variants.forEach((v, i) => {
        code += `${v}: ${baseName} bg #${(i + 4).toString(16).repeat(6).slice(0, 6)}\n`
      })
      code += '\n'

      // Usage
      code += `Container gap 16\n`
      for (let i = 0; i < usageCount; i++) {
        const variant = variants[i % variants.length]
        code += `  ${variant} "Content ${i + 1}"\n`
      }

      return code.trimEnd()
    })
)
