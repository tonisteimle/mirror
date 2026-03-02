import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { parse } from '../../parser/parser'
import {
  generateReactElement,
  BehaviorRegistryProvider,
  ComponentRegistryProvider,
  RuntimeVariableProvider,
  OverlayRegistryProvider
} from '../../generator/react-generator'

// Wrapper component that provides all necessary contexts
function PreviewWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BehaviorRegistryProvider>
      <ComponentRegistryProvider>
        <RuntimeVariableProvider>
          <OverlayRegistryProvider>
            {children}
          </OverlayRegistryProvider>
        </RuntimeVariableProvider>
      </ComponentRegistryProvider>
    </BehaviorRegistryProvider>
  )
}

describe('Button Inheritance Rendering', () => {
  it('should render all button variants correctly', () => {
    // Original user syntax with all variants
    const code = `
Button:
  icon "check", hidden
  label "Click"

LabelButton as Button:
IconLabelButton as Button: icon visible
IconButton as Button: icon visible; label hidden

LabelButton "Label Only"
IconLabelButton "Both"
IconButton "Icon Only"
`
    const result = parse(code)

    // Find instances (not definitions)
    const labelBtn = result.nodes.find(n => n.name === 'LabelButton' && !(n as any)._isExplicitDefinition)
    const iconLabelBtn = result.nodes.find(n => n.name === 'IconLabelButton' && !(n as any)._isExplicitDefinition)
    const iconBtn = result.nodes.find(n => n.name === 'IconButton' && !(n as any)._isExplicitDefinition)

    expect(labelBtn).toBeDefined()
    expect(iconLabelBtn).toBeDefined()
    expect(iconBtn).toBeDefined()

    // Render all instances
    const element = generateReactElement([labelBtn!, iconLabelBtn!, iconBtn!], {})

    const { container } = render(
      <PreviewWrapper>
        <div>{element}</div>
      </PreviewWrapper>
    )

    // LabelButton: icon hidden, label visible
    const labelBtnEl = container.querySelector('.LabelButton')
    expect(labelBtnEl).toBeTruthy()
    expect(labelBtnEl!.querySelector('.icon')).toBeNull() // icon should not render
    expect(labelBtnEl!.querySelector('.label')).toBeTruthy() // label should render

    // IconLabelButton: both visible
    const iconLabelBtnEl = container.querySelector('.IconLabelButton')
    expect(iconLabelBtnEl).toBeTruthy()
    expect(iconLabelBtnEl!.querySelector('.icon')).toBeTruthy() // icon should render
    expect(iconLabelBtnEl!.querySelector('.label')).toBeTruthy() // label should render

    // IconButton: icon visible, label hidden
    const iconBtnEl = container.querySelector('.IconButton')
    expect(iconBtnEl).toBeTruthy()
    expect(iconBtnEl!.querySelector('.icon')).toBeTruthy() // icon should render
    expect(iconBtnEl!.querySelector('.label')).toBeNull() // label should NOT render
  })
})
