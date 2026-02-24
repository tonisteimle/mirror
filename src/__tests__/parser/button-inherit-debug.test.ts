import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'

describe('Button Inheritance with Child Overrides', () => {
  it('should test user exact syntax with colon before from', () => {
    // User's EXACT syntax - colon BEFORE from
    const code = `
Button: hor, cen, size hug 32, pad left 8 right 12, bg #2E2E2E, rad 6
  icon "circle-check", pad right 4, col #B7B7B7, is 16, hidden
  label "Label", pad left 4, font "DM Sans", weight 500, fs 16, col #B7B7B7

Label-Button: from Button
Icon-Label-Button: from Button icon visible
Icon-Button: from Button icon visible; label hidden

App ver, size full, pad 32, gap 16
  Label-Button
  Icon-Label-Button
  Icon-Button
`
    const result = parse(code)

    console.log('=== ERRORS ===')
    console.log(result.errors)

    console.log('\n=== ALL DEFINITIONS ===')
    for (const [name, template] of result.registry) {
      if (['Button', 'Label-Button', 'Icon-Label-Button', 'Icon-Button'].includes(name)) {
        console.log(`\n${name}:`)
        console.log('  children count:', template.children.length)
        for (const child of template.children) {
          console.log(`  > ${child.name}: hidden=${child.properties.hidden}`)
        }
      }
    }

    console.log('\n=== RENDERED NODES (FULL TREE) ===')
    function printTree(node: any, indent = 0) {
      const prefix = '  '.repeat(indent)
      console.log(`${prefix}${node.name}: hidden=${node.properties?.hidden}`)
      for (const child of node.children || []) {
        printTree(child, indent + 1)
      }
    }
    for (const node of result.nodes) {
      if (!(node as any)._isExplicitDefinition) {
        printTree(node)
      }
    }

    // Check Icon-Button instance inside App
    const app = result.nodes.find(n => n.name === 'App')
    const iconBtnInApp = app?.children.find(c => c.name === 'Icon-Button')
    console.log('\n=== Icon-Button in App ===')
    console.log('Icon-Button children:', iconBtnInApp?.children.length)
    for (const child of iconBtnInApp?.children || []) {
      console.log(`  > ${child.name}: hidden=${child.properties.hidden}`)
    }

    // Verify label is hidden
    const labelInIconBtn = iconBtnInApp?.children.find(c => c.name === 'label')
    expect(labelInIconBtn?.properties.hidden).toBe(true)
  })

  it('should work with correct syntax: from before colon', () => {
    // CORRECT syntax - from BEFORE colon
    const code = `
Button: hor, cen, size hug 32, pad left 8 right 12, bg #2E2E2E, rad 6
  icon "circle-check", pad right 4, col #B7B7B7, is 16, hidden
  label "Label", pad left 4, font "DM Sans", weight 500, fs 16, col #B7B7B7

Label-Button from Button:
Icon-Label-Button from Button: icon visible
Icon-Button from Button: icon visible; label hidden

App ver, size full, pad 32, gap 16
  Label-Button
  Icon-Label-Button
  Icon-Button
`
    const result = parse(code)

    console.log('=== CORRECT SYNTAX RESULTS ===')
    for (const [name, template] of result.registry) {
      if (['Button', 'Label-Button', 'Icon-Label-Button', 'Icon-Button'].includes(name)) {
        console.log(`\n${name}:`)
        console.log('  children count:', template.children.length)
        for (const child of template.children) {
          console.log(`  > ${child.name}: hidden=${child.properties.hidden}`)
        }
      }
    }

    // Test Icon-Button: icon visible, label hidden
    const iconBtnTemplate = result.registry.get('Icon-Button')
    expect(iconBtnTemplate).toBeDefined()
    expect(iconBtnTemplate!.children.find(c => c.name === 'icon')?.properties.hidden).toBe(false)
    expect(iconBtnTemplate!.children.find(c => c.name === 'label')?.properties.hidden).toBe(true)
  })
})
