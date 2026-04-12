/**
 * Zag Component Emitters
 *
 * Extracted from DOMGenerator for better maintainability.
 * Each emitter generates DOM manipulation code for a specific Zag component.
 *
 * TUTORIAL SET (10 components):
 * - Forms: Checkbox, Switch, RadioGroup, Slider, Select, DatePicker
 * - Navigation: Tabs, SideNav
 * - Overlays: Dialog, Tooltip
 *
 * MIGRATION STATUS:
 * - [x] Switch
 * - [x] Checkbox
 * - [x] RadioGroup
 * - [x] Slider
 * - [x] Tabs
 * - [x] Select
 * - [x] Tooltip
 * - [x] Dialog
 * - [x] SideNav
 * - [x] DatePicker
 *
 * ALL TUTORIAL SET COMPONENTS MIGRATED!
 */

import type { IRZagNode, IRSlot, IRNode, IRItem } from '../../ir/types'
import type { ZagEmitterContext, ZagEmitterFn } from './zag-emitter-context'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Emit styles for a slot element
 */
function emitSlotStyles(ctx: ZagEmitterContext, varName: string, slot: IRSlot | undefined): void {
  if (slot?.styles && slot.styles.length > 0) {
    ctx.emit(`${varName}.setAttribute('data-styled', 'true')`)
    ctx.emit(`Object.assign(${varName}.style, {`)
    ctx.indentIn()
    for (const style of slot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
}

/**
 * Emit the common component header
 */
function emitComponentHeader(
  ctx: ZagEmitterContext,
  node: IRZagNode,
  varName: string,
  tagName: string,
  zagType: string
): void {
  ctx.emit(`// ${node.name || zagType} Component`)
  ctx.emit(`const ${varName} = document.createElement('${tagName}')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = '${zagType}'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }
}

/**
 * Emit the machine configuration
 */
function emitMachineConfig(
  ctx: ZagEmitterContext,
  varName: string,
  zagType: string,
  nodeId: string,
  machineConfig: Record<string, unknown>,
  extra?: string
): void {
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: '${zagType}',`)
  ctx.emit(`id: '${nodeId}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(machineConfig)},`)
  if (extra) {
    ctx.emit(extra)
  }
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')
}

/**
 * Emit runtime initialization
 */
function emitRuntimeInit(ctx: ZagEmitterContext, varName: string, initFn: string): void {
  ctx.emit(`// Initialize ${initFn.replace('init', '').replace('Component', '')}`)
  ctx.emit(`if (typeof _runtime !== 'undefined' && _runtime.${initFn}) {`)
  ctx.indentIn()
  ctx.emit(`_runtime.${initFn}(${varName})`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')
}

// =============================================================================
// Component Emitters (Tutorial Set)
// =============================================================================

/**
 * Emit Switch component (slots-only pattern)
 * Structure: label > [track > thumb] [labelText]
 */
function emitSwitchComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  // Header
  emitComponentHeader(ctx, node, varName, 'label', 'switch')

  // Machine configuration
  emitMachineConfig(ctx, varName, 'switch', node.id, node.machineConfig || {})

  // Create Track (the sliding background)
  const trackSlot = node.slots['Track']
  const trackVar = `${varName}_track`
  ctx.emit(`// Track (background)`)
  ctx.emit(`const ${trackVar} = document.createElement('span')`)
  ctx.emit(`${trackVar}.dataset.slot = 'Track'`)
  if (trackSlot?.styles && trackSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${trackVar}.style, {`)
    ctx.indentIn()
    for (const style of trackSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
  ctx.emit(`${varName}.appendChild(${trackVar})`)
  ctx.emit('')

  // Create Thumb (the sliding circle)
  const thumbSlot = node.slots['Thumb']
  const thumbVar = `${varName}_thumb`
  ctx.emit(`// Thumb (slider)`)
  ctx.emit(`const ${thumbVar} = document.createElement('span')`)
  ctx.emit(`${thumbVar}.dataset.slot = 'Thumb'`)
  if (thumbSlot?.styles && thumbSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${thumbVar}.style, {`)
    ctx.indentIn()
    for (const style of thumbSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
  ctx.emit(`${trackVar}.appendChild(${thumbVar})`)
  ctx.emit('')

  // Create Label (text)
  const labelText = (node.machineConfig?.label as string) || ''
  if (labelText) {
    const labelSlot = node.slots['Label']
    const labelVar = `${varName}_label`
    ctx.emit(`// Label text`)
    ctx.emit(`const ${labelVar} = document.createElement('span')`)
    ctx.emit(`${labelVar}.dataset.slot = 'Label'`)
    ctx.emit(`${labelVar}.textContent = '${ctx.escapeString(labelText)}'`)
    if (labelSlot?.styles && labelSlot.styles.length > 0) {
      ctx.emit(`Object.assign(${labelVar}.style, {`)
      ctx.indentIn()
      for (const style of labelSlot.styles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
      ctx.indentOut()
      ctx.emit('})')
    }
    ctx.emit(`${varName}.appendChild(${labelVar})`)
    ctx.emit('')
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Switch via runtime
  emitRuntimeInit(ctx, varName, 'initSwitchComponent')
}

/**
 * Emit Checkbox component
 * Structure: label > [hiddenInput] [control > indicator] [label]
 */
function emitCheckboxComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  // Header - checkbox root is a label for accessibility
  emitComponentHeader(ctx, node, varName, 'label', 'checkbox')

  // Machine configuration
  emitMachineConfig(ctx, varName, 'checkbox', node.id, node.machineConfig || {})

  // Apply root styles
  const rootSlot = node.slots['Root']
  if (rootSlot?.styles && rootSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${varName}.style, {`)
    ctx.indentIn()
    for (const style of rootSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }

  // Create HiddenInput (for form submission)
  const hiddenInputVar = `${varName}_hiddenInput`
  ctx.emit(`// HiddenInput (form submission)`)
  ctx.emit(`const ${hiddenInputVar} = document.createElement('input')`)
  ctx.emit(`${hiddenInputVar}.type = 'checkbox'`)
  ctx.emit(`${hiddenInputVar}.dataset.slot = 'HiddenInput'`)
  ctx.emit(`${hiddenInputVar}.style.position = 'absolute'`)
  ctx.emit(`${hiddenInputVar}.style.width = '1px'`)
  ctx.emit(`${hiddenInputVar}.style.height = '1px'`)
  ctx.emit(`${hiddenInputVar}.style.padding = '0'`)
  ctx.emit(`${hiddenInputVar}.style.margin = '-1px'`)
  ctx.emit(`${hiddenInputVar}.style.overflow = 'hidden'`)
  ctx.emit(`${hiddenInputVar}.style.clip = 'rect(0, 0, 0, 0)'`)
  ctx.emit(`${hiddenInputVar}.style.whiteSpace = 'nowrap'`)
  ctx.emit(`${hiddenInputVar}.style.border = '0'`)
  const formName = (node.machineConfig?.name as string) || ''
  if (formName) {
    ctx.emit(`${hiddenInputVar}.name = '${ctx.escapeString(formName)}'`)
  }
  ctx.emit(`${varName}.appendChild(${hiddenInputVar})`)
  ctx.emit('')

  // Create Control (the visual checkbox box)
  const controlSlot = node.slots['Control']
  const controlVar = `${varName}_control`
  ctx.emit(`// Control (visual checkbox)`)
  ctx.emit(`const ${controlVar} = document.createElement('div')`)
  ctx.emit(`${controlVar}.dataset.slot = 'Control'`)
  if (controlSlot?.styles && controlSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${controlVar}.style, {`)
    ctx.indentIn()
    for (const style of controlSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
  ctx.emit(`${varName}.appendChild(${controlVar})`)
  ctx.emit('')

  // Create Indicator (checkmark icon inside Control)
  const indicatorSlot = node.slots['Indicator']
  const indicatorVar = `${varName}_indicator`
  ctx.emit(`// Indicator (checkmark)`)
  ctx.emit(`const ${indicatorVar} = document.createElement('span')`)
  ctx.emit(`${indicatorVar}.dataset.slot = 'Indicator'`)
  const checkboxIcon = node.machineConfig?.icon || 'check'
  ctx.emit(`${indicatorVar}.dataset.icon = '${ctx.escapeString(String(checkboxIcon))}'`)
  if (indicatorSlot?.styles && indicatorSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${indicatorVar}.style, {`)
    ctx.indentIn()
    for (const style of indicatorSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
  ctx.emit(`${controlVar}.appendChild(${indicatorVar})`)
  ctx.emit('')

  // Create Label (text)
  const labelText = (node.machineConfig?.label as string) || ''
  if (labelText) {
    const labelSlot = node.slots['Label']
    const labelVar = `${varName}_label`
    ctx.emit(`// Label`)
    ctx.emit(`const ${labelVar} = document.createElement('span')`)
    ctx.emit(`${labelVar}.dataset.slot = 'Label'`)
    ctx.emit(`${labelVar}.textContent = '${ctx.escapeString(labelText)}'`)
    if (labelSlot?.styles && labelSlot.styles.length > 0) {
      ctx.emit(`Object.assign(${labelVar}.style, {`)
      ctx.indentIn()
      for (const style of labelSlot.styles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
      ctx.indentOut()
      ctx.emit('})')
    }
    ctx.emit(`${varName}.appendChild(${labelVar})`)
    ctx.emit('')
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Checkbox via runtime
  emitRuntimeInit(ctx, varName, 'initCheckboxComponent')
}

/**
 * Emit RadioGroup component
 * Structure: root > [label] [items (label > control + text)]
 */
function emitRadioGroupComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// RadioGroup Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'radio-group'`)
  ctx.emit(`${varName}.setAttribute('role', 'radiogroup')`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Extract state styles from slot children
  // Filter out container defaults that were automatically added by IR transformation
  const CONTAINER_DEFAULTS = new Set([
    'display:flex',
    'flex-direction:column',
    'width:fit-content',
    'align-items:flex-start',
  ])
  const extractSlotStateStyles = (slot: IRSlot | undefined): Record<string, Record<string, string>> => {
    const stateStyles: Record<string, Record<string, string>> = {}
    if (slot?.children) {
      for (const child of slot.children) {
        if (child.primitive && child.styles) {
          const stateName = child.primitive
          stateStyles[stateName] = {}
          for (const style of child.styles) {
            if (style.property && style.value) {
              // Skip container defaults that were added automatically
              const styleKey = `${style.property}:${style.value}`
              if (!CONTAINER_DEFAULTS.has(styleKey)) {
                stateStyles[stateName][style.property] = style.value
              }
            }
          }
        }
      }
    }
    return stateStyles
  }

  const itemSlotStateStyles = extractSlotStateStyles(node.slots['Item'])
  const controlSlotStateStyles = extractSlotStateStyles(node.slots['ItemControl'])
  const textSlotStateStyles = extractSlotStateStyles(node.slots['ItemText'])

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'radio-group',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.emit(`items: ${JSON.stringify(node.items.map((item: IRItem) => ({
    value: item.value,
    label: item.label,
    disabled: item.disabled
  })))},`)
  // Include slot state styles for runtime
  if (Object.keys(itemSlotStateStyles).length > 0) {
    ctx.emit(`itemStateStyles: ${JSON.stringify(itemSlotStateStyles)},`)
  }
  if (Object.keys(controlSlotStateStyles).length > 0) {
    ctx.emit(`controlStateStyles: ${JSON.stringify(controlSlotStateStyles)},`)
  }
  if (Object.keys(textSlotStateStyles).length > 0) {
    ctx.emit(`textStateStyles: ${JSON.stringify(textSlotStateStyles)},`)
  }
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Apply root styles
  const rootSlot = node.slots['Root']
  if (rootSlot?.styles && rootSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${varName}.style, {`)
    ctx.indentIn()
    for (const style of rootSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }

  // Create Label if exists
  const labelText = node.machineConfig.label as string
  if (labelText) {
    const labelSlot = node.slots['Label']
    const labelVar = `${varName}_label`
    ctx.emit(`// Group Label`)
    ctx.emit(`const ${labelVar} = document.createElement('span')`)
    ctx.emit(`${labelVar}.dataset.slot = 'Label'`)
    ctx.emit(`${labelVar}.textContent = '${ctx.escapeString(labelText)}'`)
    if (labelSlot?.styles && labelSlot.styles.length > 0) {
      ctx.emit(`Object.assign(${labelVar}.style, {`)
      ctx.indentIn()
      for (const style of labelSlot.styles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
      ctx.indentOut()
      ctx.emit('})')
    }
    ctx.emit(`${varName}.appendChild(${labelVar})`)
    ctx.emit('')
  }

  // Create Items
  const itemSlot = node.slots['Item']
  const controlSlot = node.slots['ItemControl']
  const textSlot = node.slots['ItemText']

  for (let i = 0; i < node.items.length; i++) {
    const item = node.items[i]
    const itemVar = `${varName}_item${i}`
    const itemValue = item.value || item.label || `item-${i}`
    const itemLabel = item.label || itemValue

    ctx.emit(`// Radio Item: ${itemLabel}`)
    ctx.emit(`const ${itemVar} = document.createElement('label')`)
    ctx.emit(`${itemVar}.dataset.slot = 'Item'`)
    ctx.emit(`${itemVar}.dataset.value = '${ctx.escapeString(String(itemValue))}'`)
    if (item.disabled) {
      ctx.emit(`${itemVar}.setAttribute('data-disabled', 'true')`)
    }
    if (itemSlot?.styles && itemSlot.styles.length > 0) {
      ctx.emit(`Object.assign(${itemVar}.style, {`)
      ctx.indentIn()
      for (const style of itemSlot.styles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
      ctx.indentOut()
      ctx.emit('})')
    }

    // ItemControl (the radio circle)
    const controlVar = `${itemVar}_control`
    ctx.emit(`const ${controlVar} = document.createElement('div')`)
    ctx.emit(`${controlVar}.dataset.slot = 'ItemControl'`)
    ctx.emit(`${controlVar}.setAttribute('role', 'radio')`)
    ctx.emit(`${controlVar}.setAttribute('aria-checked', 'false')`)
    if (controlSlot?.styles && controlSlot.styles.length > 0) {
      ctx.emit(`Object.assign(${controlVar}.style, {`)
      ctx.indentIn()
      for (const style of controlSlot.styles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
      ctx.indentOut()
      ctx.emit('})')
    }
    ctx.emit(`${itemVar}.appendChild(${controlVar})`)

    // ItemText
    const textVar = `${itemVar}_text`
    ctx.emit(`const ${textVar} = document.createElement('span')`)
    ctx.emit(`${textVar}.dataset.slot = 'ItemText'`)
    ctx.emit(`${textVar}.textContent = '${ctx.escapeString(String(itemLabel))}'`)
    if (textSlot?.styles && textSlot.styles.length > 0) {
      ctx.emit(`Object.assign(${textVar}.style, {`)
      ctx.indentIn()
      for (const style of textSlot.styles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
      ctx.indentOut()
      ctx.emit('})')
    }
    ctx.emit(`${itemVar}.appendChild(${textVar})`)

    ctx.emit(`${varName}.appendChild(${itemVar})`)
    ctx.emit('')
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize RadioGroup via runtime
  emitRuntimeInit(ctx, varName, 'initRadioGroupComponent')
}

/**
 * Emit Slider component
 * Structure: root > [label] [track > range + thumb] [valueText]
 */
function emitSliderComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// Slider Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  const isRangeSlider = node.name === 'RangeSlider'
  ctx.emit(`${varName}.dataset.zagComponent = '${isRangeSlider ? 'rangeslider' : 'slider'}'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'slider',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Apply root styles
  const rootSlot = node.slots['Root']
  if (rootSlot?.styles && rootSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${varName}.style, {`)
    ctx.indentIn()
    for (const style of rootSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }

  // Create Label if exists
  const labelText = node.machineConfig.label as string
  if (labelText) {
    const labelSlot = node.slots['Label']
    const labelVar = `${varName}_label`
    ctx.emit(`// Label`)
    ctx.emit(`const ${labelVar} = document.createElement('label')`)
    ctx.emit(`${labelVar}.dataset.slot = 'Label'`)
    ctx.emit(`${labelVar}.textContent = '${ctx.escapeString(labelText)}'`)
    if (labelSlot?.styles && labelSlot.styles.length > 0) {
      ctx.emit(`Object.assign(${labelVar}.style, {`)
      ctx.indentIn()
      for (const style of labelSlot.styles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
      ctx.indentOut()
      ctx.emit('})')
    }
    ctx.emit(`${varName}.appendChild(${labelVar})`)
    ctx.emit('')
  }

  // Create Track
  const trackSlot = node.slots['Track']
  const trackVar = `${varName}_track`
  ctx.emit(`// Track`)
  ctx.emit(`const ${trackVar} = document.createElement('div')`)
  ctx.emit(`${trackVar}.dataset.slot = 'Track'`)
  if (trackSlot?.styles && trackSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${trackVar}.style, {`)
    ctx.indentIn()
    for (const style of trackSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }

  // Create Range (filled portion)
  const rangeSlot = node.slots['Range']
  const rangeVar = `${varName}_range`
  ctx.emit(`// Range (filled portion)`)
  ctx.emit(`const ${rangeVar} = document.createElement('div')`)
  ctx.emit(`${rangeVar}.dataset.slot = 'Range'`)
  if (rangeSlot?.styles && rangeSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${rangeVar}.style, {`)
    ctx.indentIn()
    for (const style of rangeSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
  ctx.emit(`${trackVar}.appendChild(${rangeVar})`)

  // Create Thumb
  const thumbSlot = node.slots['Thumb']
  const thumbVar = `${varName}_thumb`
  ctx.emit(`// Thumb`)
  ctx.emit(`const ${thumbVar} = document.createElement('div')`)
  ctx.emit(`${thumbVar}.dataset.slot = 'Thumb'`)
  ctx.emit(`${thumbVar}.setAttribute('role', 'slider')`)
  ctx.emit(`${thumbVar}.setAttribute('tabindex', '0')`)
  if (thumbSlot?.styles && thumbSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${thumbVar}.style, {`)
    ctx.indentIn()
    for (const style of thumbSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
  ctx.emit(`${trackVar}.appendChild(${thumbVar})`)

  ctx.emit(`${varName}.appendChild(${trackVar})`)
  ctx.emit('')

  // Create ValueText if needed
  const valueTextSlot = node.slots['ValueText']
  if (valueTextSlot) {
    const valueTextVar = `${varName}_valueText`
    ctx.emit(`// ValueText`)
    ctx.emit(`const ${valueTextVar} = document.createElement('span')`)
    ctx.emit(`${valueTextVar}.dataset.slot = 'ValueText'`)
    if (valueTextSlot.styles && valueTextSlot.styles.length > 0) {
      ctx.emit(`Object.assign(${valueTextVar}.style, {`)
      ctx.indentIn()
      for (const style of valueTextSlot.styles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
      ctx.indentOut()
      ctx.emit('})')
    }
    ctx.emit(`${varName}.appendChild(${valueTextVar})`)
    ctx.emit('')
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Slider via runtime
  if (isRangeSlider) {
    emitRuntimeInit(ctx, varName, 'initRangeSliderComponent')
  } else {
    emitRuntimeInit(ctx, varName, 'initSliderComponent')
  }
}

/**
 * Emit Tabs component with content-items pattern
 * Structure: Root > List (contains Triggers + Indicator) + Content panels
 */
function emitTabsComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// Tabs Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'tabs'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'tabs',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.emit(`items: ${JSON.stringify(node.items.map((item: IRItem) => ({
    value: item.value,
    label: item.label,
    disabled: item.disabled
  })))},`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Create List slot (contains triggers)
  const listVar = `${varName}_list`
  const listSlot = node.slots['List']
  ctx.emit(`// List slot (tab bar)`)
  ctx.emit(`const ${listVar} = document.createElement('div')`)
  ctx.emit(`${listVar}.dataset.slot = 'List'`)
  ctx.emit(`${listVar}.setAttribute('role', 'tablist')`)
  if (listSlot?.styles && listSlot.styles.length > 0) {
    ctx.emit(`${listVar}.setAttribute('data-styled', 'true')`)
    ctx.emit(`Object.assign(${listVar}.style, {`)
    ctx.indentIn()
    for (const style of listSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
  ctx.emit(`${varName}.appendChild(${listVar})`)
  ctx.emit('')

  // Create Trigger for each item (inside List)
  const triggerSlot = node.slots['Trigger']
  for (let i = 0; i < node.items.length; i++) {
    const item = node.items[i]
    const triggerVar = `${varName}_trigger${i}`
    ctx.emit(`// Tab trigger: ${item.label}`)
    ctx.emit(`const ${triggerVar} = document.createElement('button')`)
    ctx.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
    ctx.emit(`${triggerVar}.dataset.value = '${ctx.escapeString(item.value)}'`)
    ctx.emit(`${triggerVar}.setAttribute('role', 'tab')`)
    ctx.emit(`${triggerVar}.setAttribute('type', 'button')`)
    ctx.emit(`${triggerVar}.textContent = '${ctx.escapeString(item.label)}'`)
    if (item.disabled) {
      ctx.emit(`${triggerVar}.disabled = true`)
      ctx.emit(`${triggerVar}.setAttribute('data-disabled', 'true')`)
    }
    if (triggerSlot?.styles && triggerSlot.styles.length > 0) {
      ctx.emit(`${triggerVar}.setAttribute('data-styled', 'true')`)
      ctx.emit(`Object.assign(${triggerVar}.style, {`)
      ctx.indentIn()
      for (const style of triggerSlot.styles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
      ctx.indentOut()
      ctx.emit('})')
    }
    ctx.emit(`${listVar}.appendChild(${triggerVar})`)
    ctx.emit('')
  }

  // Create Indicator (inside List, after triggers)
  const indicatorSlot = node.slots['Indicator']
  const indicatorVar = `${varName}_indicator`
  ctx.emit(`// Tab indicator`)
  ctx.emit(`const ${indicatorVar} = document.createElement('div')`)
  ctx.emit(`${indicatorVar}.dataset.slot = 'Indicator'`)
  if (indicatorSlot?.styles && indicatorSlot.styles.length > 0) {
    ctx.emit(`${indicatorVar}.setAttribute('data-styled', 'true')`)
    ctx.emit(`Object.assign(${indicatorVar}.style, {`)
    ctx.indentIn()
    for (const style of indicatorSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
  // Render custom indicator children if present
  if (indicatorSlot?.children && indicatorSlot.children.length > 0) {
    ctx.emit(`${indicatorVar}.setAttribute('data-custom-indicator', 'true')`)
    for (const child of indicatorSlot.children) {
      ctx.emitNode(child, indicatorVar)
    }
  }
  ctx.emit(`${listVar}.appendChild(${indicatorVar})`)
  ctx.emit('')

  // Create Content panel for each item (after List)
  const contentSlot = node.slots['Content']
  for (let i = 0; i < node.items.length; i++) {
    const item = node.items[i]
    const contentVar = `${varName}_content${i}`
    ctx.emit(`// Tab content: ${item.label}`)
    ctx.emit(`const ${contentVar} = document.createElement('div')`)
    ctx.emit(`${contentVar}.dataset.slot = 'Content'`)
    ctx.emit(`${contentVar}.dataset.value = '${ctx.escapeString(item.value)}'`)
    ctx.emit(`${contentVar}.setAttribute('role', 'tabpanel')`)
    ctx.emit(`${contentVar}.setAttribute('tabindex', '0')`)
    if (contentSlot?.styles && contentSlot.styles.length > 0) {
      ctx.emit(`${contentVar}.setAttribute('data-styled', 'true')`)
      ctx.emit(`Object.assign(${contentVar}.style, {`)
      ctx.indentIn()
      for (const style of contentSlot.styles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
      ctx.indentOut()
      ctx.emit('})')
    }
    // Render children content or load from file
    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        ctx.emitNode(child, contentVar)
      }
    } else if (item.shows) {
      // "show X [from Y]" syntax
      ctx.emit(`${contentVar}.dataset.shows = '${ctx.escapeString(item.shows)}'`)
      if (item.showsFrom) {
        ctx.emit(`${contentVar}.dataset.showsFrom = '${ctx.escapeString(item.showsFrom)}'`)
      }
    } else if (item.loadFromFile) {
      // Legacy: Mark for lazy loading from external file
      ctx.emit(`${contentVar}.dataset.loadFromFile = '${ctx.escapeString(item.loadFromFile)}'`)
    }
    ctx.emit(`${varName}.appendChild(${contentVar})`)
    ctx.emit('')
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Tabs via runtime
  emitRuntimeInit(ctx, varName, 'initTabsComponent')
}

// =============================================================================
// SELECT COMPONENT
// =============================================================================

/**
 * Emit Select Component
 * A dropdown select with keyboard navigation and full accessibility
 */
function emitSelectComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// Select Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'select'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'select',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.emit(`items: ${JSON.stringify(node.items.map((item: IRItem) => ({
    value: item.value,
    label: item.label,
    disabled: item.disabled,
    icon: item.icon
  })))},`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Apply root styles
  emitSlotStyles(ctx, varName, node.slots['Root'])

  // Create Trigger
  const triggerSlot = node.slots['Trigger']
  const triggerVar = `${varName}_trigger`
  const placeholder = node.machineConfig.placeholder || 'Select...'
  ctx.emit(`// Trigger`)
  ctx.emit(`const ${triggerVar} = document.createElement('button')`)
  ctx.emit(`${triggerVar}.type = 'button'`)
  ctx.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
  ctx.emit(`${triggerVar}.setAttribute('role', 'combobox')`)
  ctx.emit(`${triggerVar}.setAttribute('aria-haspopup', 'listbox')`)
  ctx.emit(`${triggerVar}.setAttribute('aria-expanded', 'false')`)
  emitSlotStyles(ctx, triggerVar, triggerSlot)

  // Trigger text (value display)
  const triggerTextVar = `${triggerVar}_text`
  ctx.emit(`const ${triggerTextVar} = document.createElement('span')`)
  ctx.emit(`${triggerTextVar}.dataset.slot = 'TriggerText'`)
  ctx.emit(`${triggerTextVar}.textContent = '${ctx.escapeString(String(placeholder))}'`)
  ctx.emit(`${triggerVar}.appendChild(${triggerTextVar})`)

  // Trigger arrow icon
  const triggerArrowVar = `${triggerVar}_arrow`
  ctx.emit(`const ${triggerArrowVar} = document.createElement('span')`)
  ctx.emit(`${triggerArrowVar}.dataset.slot = 'TriggerArrow'`)
  ctx.emit(`${triggerArrowVar}.dataset.icon = 'chevron-down'`)
  ctx.emit(`${triggerVar}.appendChild(${triggerArrowVar})`)

  ctx.emit(`${varName}.appendChild(${triggerVar})`)
  ctx.emit('')

  // Create Content (dropdown)
  const contentSlot = node.slots['Content']
  const contentVar = `${varName}_content`
  ctx.emit(`// Content (dropdown)`)
  ctx.emit(`const ${contentVar} = document.createElement('div')`)
  ctx.emit(`${contentVar}.dataset.slot = 'Content'`)
  ctx.emit(`${contentVar}.setAttribute('role', 'listbox')`)
  emitSlotStyles(ctx, contentVar, contentSlot)
  ctx.emit('')

  // Create Items
  const itemSlot = node.slots['Item']
  const indicatorSlot = node.slots['ItemIndicator']
  const selectIcon = node.machineConfig.icon || 'check'

  for (let i = 0; i < node.items.length; i++) {
    const item = node.items[i]
    const itemVar = `${varName}_item${i}`
    const itemValue = item.value || item.label || `item-${i}`
    const itemLabel = item.label || itemValue

    ctx.emit(`// Item: ${itemLabel}`)
    ctx.emit(`const ${itemVar} = document.createElement('div')`)
    ctx.emit(`${itemVar}.dataset.slot = 'Item'`)
    ctx.emit(`${itemVar}.dataset.value = '${ctx.escapeString(String(itemValue))}'`)
    ctx.emit(`${itemVar}.setAttribute('role', 'option')`)
    if (item.disabled) {
      ctx.emit(`${itemVar}.setAttribute('data-disabled', 'true')`)
    }
    // Set icon for this item (item-specific or global)
    const itemIcon = item.icon || selectIcon
    ctx.emit(`${itemVar}.dataset.icon = '${ctx.escapeString(String(itemIcon))}'`)

    emitSlotStyles(ctx, itemVar, itemSlot)

    // Item text
    const itemTextVar = `${itemVar}_text`
    ctx.emit(`const ${itemTextVar} = document.createElement('span')`)
    ctx.emit(`${itemTextVar}.dataset.slot = 'ItemText'`)
    ctx.emit(`${itemTextVar}.textContent = '${ctx.escapeString(String(itemLabel))}'`)
    ctx.emit(`${itemVar}.appendChild(${itemTextVar})`)

    // Item indicator (checkmark)
    const indicatorVar = `${itemVar}_indicator`
    ctx.emit(`const ${indicatorVar} = document.createElement('span')`)
    ctx.emit(`${indicatorVar}.dataset.slot = 'ItemIndicator'`)
    emitSlotStyles(ctx, indicatorVar, indicatorSlot)
    ctx.emit(`${itemVar}.appendChild(${indicatorVar})`)

    ctx.emit(`${contentVar}.appendChild(${itemVar})`)
    ctx.emit('')
  }

  ctx.emit(`${varName}.appendChild(${contentVar})`)

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Select via runtime
  emitRuntimeInit(ctx, varName, 'initSelectComponent')
}

// =============================================================================
// TOOLTIP COMPONENT
// =============================================================================

/**
 * Emit Tooltip Component
 * Hover tooltip with positioning support
 */
function emitTooltipComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// Tooltip Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'tooltip'`)
  ctx.emit(`${varName}.style.display = 'inline-block'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  emitMachineConfig(ctx, varName, node, 'tooltip')

  // Trigger element
  const triggerSlot = node.slots['Trigger']
  const triggerVar = `${varName}_trigger`
  ctx.emit(`// Trigger`)
  ctx.emit(`const ${triggerVar} = document.createElement('button')`)
  ctx.emit(`${triggerVar}.type = 'button'`)
  ctx.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
  emitSlotStyles(ctx, triggerVar, triggerSlot)
  const triggerLabel = node.machineConfig.label || node.machineConfig.trigger || 'Hover me'
  ctx.emit(`${triggerVar}.textContent = '${ctx.escapeString(String(triggerLabel))}'`)
  ctx.emit(`${varName}.appendChild(${triggerVar})`)
  ctx.emit('')

  // Content (tooltip popup)
  const contentSlot = node.slots['Content']
  const contentVar = `${varName}_content`
  ctx.emit(`// Content (tooltip popup)`)
  ctx.emit(`const ${contentVar} = document.createElement('div')`)
  ctx.emit(`${contentVar}.dataset.slot = 'Content'`)
  ctx.emit(`${contentVar}.setAttribute('role', 'tooltip')`)
  emitSlotStyles(ctx, contentVar, contentSlot)

  // Check if we have slot children to emit, otherwise use text content
  const contentSlotChildren = node.slots['Content']?.children || []
  if (contentSlotChildren.length > 0) {
    // Emit Content slot children (children defined inside Content: in DSL)
    for (const child of contentSlotChildren) {
      ctx.emitNode(child as IRNode, contentVar)
    }
  } else {
    // Fallback to simple text content from machineConfig
    const tooltipText = node.machineConfig.content || node.machineConfig.text || 'Tooltip content'
    ctx.emit(`${contentVar}.textContent = '${ctx.escapeString(String(tooltipText))}'`)
  }
  ctx.emit(`${varName}.appendChild(${contentVar})`)
  ctx.emit('')

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Tooltip via runtime
  emitRuntimeInit(ctx, varName, 'initTooltipComponent')
}

// =============================================================================
// DIALOG COMPONENT
// =============================================================================

/**
 * Emit Dialog Component
 * Modal dialog with trigger, backdrop, and content
 */
function emitDialogComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// Dialog Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'dialog'`)
  ctx.emit(`${varName}.style.display = 'inline-block'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  emitMachineConfig(ctx, varName, node, 'dialog')

  // Trigger button
  const triggerSlot = node.slots['Trigger']
  const triggerVar = `${varName}_trigger`
  ctx.emit(`// Trigger`)
  ctx.emit(`const ${triggerVar} = document.createElement('button')`)
  ctx.emit(`${triggerVar}.type = 'button'`)
  ctx.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
  ctx.emit(`${triggerVar}.setAttribute('aria-haspopup', 'dialog')`)
  emitSlotStyles(ctx, triggerVar, triggerSlot)
  const triggerLabel = node.machineConfig.label || node.machineConfig.trigger || 'Open Dialog'
  ctx.emit(`${triggerVar}.textContent = '${ctx.escapeString(String(triggerLabel))}'`)
  ctx.emit(`${varName}.appendChild(${triggerVar})`)
  ctx.emit('')

  // Backdrop
  const backdropSlot = node.slots['Backdrop']
  const backdropVar = `${varName}_backdrop`
  ctx.emit(`// Backdrop`)
  ctx.emit(`const ${backdropVar} = document.createElement('div')`)
  ctx.emit(`${backdropVar}.dataset.slot = 'Backdrop'`)
  emitSlotStyles(ctx, backdropVar, backdropSlot)
  ctx.emit(`${varName}.appendChild(${backdropVar})`)
  ctx.emit('')

  // Content container (the modal)
  const contentSlot = node.slots['Content']
  const contentVar = `${varName}_content`
  ctx.emit(`// Content (modal)`)
  ctx.emit(`const ${contentVar} = document.createElement('div')`)
  ctx.emit(`${contentVar}.dataset.slot = 'Content'`)
  ctx.emit(`${contentVar}.setAttribute('role', 'dialog')`)
  ctx.emit(`${contentVar}.setAttribute('aria-modal', 'true')`)
  emitSlotStyles(ctx, contentVar, contentSlot)
  ctx.emit(`${varName}.appendChild(${contentVar})`)
  ctx.emit('')

  // Title
  const titleSlot = node.slots['Title']
  if (node.machineConfig.title) {
    const titleVar = `${varName}_title`
    ctx.emit(`// Title`)
    ctx.emit(`const ${titleVar} = document.createElement('h2')`)
    ctx.emit(`${titleVar}.dataset.slot = 'Title'`)
    ctx.emit(`${titleVar}.textContent = '${ctx.escapeString(String(node.machineConfig.title))}'`)
    emitSlotStyles(ctx, titleVar, titleSlot)
    ctx.emit(`${contentVar}.appendChild(${titleVar})`)
    ctx.emit('')
  }

  // Description
  const descSlot = node.slots['Description']
  if (node.machineConfig.description) {
    const descVar = `${varName}_desc`
    ctx.emit(`// Description`)
    ctx.emit(`const ${descVar} = document.createElement('p')`)
    ctx.emit(`${descVar}.dataset.slot = 'Description'`)
    ctx.emit(`${descVar}.textContent = '${ctx.escapeString(String(node.machineConfig.description))}'`)
    emitSlotStyles(ctx, descVar, descSlot)
    ctx.emit(`${contentVar}.appendChild(${descVar})`)
    ctx.emit('')
  }

  // CloseTrigger - only created if explicitly defined as slot (not auto-generated)
  const closeSlot = node.slots['CloseTrigger']
  if (closeSlot && closeSlot.children && closeSlot.children.length > 0) {
    const closeVar = `${varName}_close`
    ctx.emit(`// Close trigger (user-defined)`)
    ctx.emit(`const ${closeVar} = document.createElement('div')`)
    ctx.emit(`${closeVar}.dataset.slot = 'CloseTrigger'`)
    emitSlotStyles(ctx, closeVar, closeSlot)
    for (const child of closeSlot.children) {
      ctx.emitNode(child, closeVar)
    }
    ctx.emit(`${contentVar}.appendChild(${closeVar})`)
    ctx.emit('')
  }

  // Emit Content slot children (children defined inside Content: in DSL)
  const contentSlotChildren = node.slots['Content']?.children || []
  if (contentSlotChildren.length > 0) {
    for (const child of contentSlotChildren) {
      ctx.emitNode(child as IRNode, contentVar)
    }
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Dialog via runtime
  emitRuntimeInit(ctx, varName, 'initDialogComponent')
}

// =============================================================================
// SIDENAV COMPONENT
// =============================================================================

/**
 * Emit SideNav items (NavItems and NavGroups) - helper function
 */
function emitSideNavItems(
  ctx: ZagEmitterContext,
  items: IRItem[],
  rootVar: string,
  parentVar: string,
  collapsed: boolean,
  indexOffset: number = 0
): void {
  let itemIndex = indexOffset

  for (const item of items) {
    if (item.isGroup) {
      // Render NavGroup
      const groupVar = `${rootVar}_group${itemIndex}`
      ctx.emit(`// NavGroup: ${item.label || 'Unnamed'}`)
      ctx.emit(`const ${groupVar} = document.createElement('div')`)
      ctx.emit(`${groupVar}.dataset.slot = 'Group'`)
      ctx.emit(`${groupVar}.setAttribute('role', 'group')`)
      if (item.collapsible) {
        ctx.emit(`${groupVar}.setAttribute('data-collapsible', 'true')`)
        const isOpen = item.defaultOpen !== false
        ctx.emit(`${groupVar}.setAttribute('data-state', '${isOpen ? 'open' : 'closed'}')`)
      }
      ctx.emit(`${parentVar}.appendChild(${groupVar})`)
      ctx.emit('')

      // Group Label
      const labelVar = `${groupVar}_label`
      ctx.emit(`const ${labelVar} = document.createElement('div')`)
      ctx.emit(`${labelVar}.dataset.slot = 'GroupLabel'`)
      if (item.collapsible) {
        ctx.emit(`${labelVar}.setAttribute('role', 'button')`)
        ctx.emit(`${labelVar}.setAttribute('tabindex', '0')`)
        ctx.emit(`${labelVar}.style.cursor = 'pointer'`)
      }
      ctx.emit(`${labelVar}.textContent = '${ctx.escapeString(item.label || '')}'`)
      ctx.emit(`${groupVar}.appendChild(${labelVar})`)
      ctx.emit('')

      // Group Arrow (if collapsible)
      if (item.collapsible) {
        const arrowVar = `${groupVar}_arrow`
        ctx.emit(`const ${arrowVar} = document.createElement('span')`)
        ctx.emit(`${arrowVar}.dataset.slot = 'GroupArrow'`)
        ctx.emit(`${labelVar}.appendChild(${arrowVar})`)
        ctx.emit('')
      }

      // Group Content
      const contentVar = `${groupVar}_content`
      ctx.emit(`const ${contentVar} = document.createElement('div')`)
      ctx.emit(`${contentVar}.dataset.slot = 'GroupContent'`)
      ctx.emit(`${groupVar}.appendChild(${contentVar})`)
      ctx.emit('')

      // Render group items
      if (item.items && item.items.length > 0) {
        emitSideNavItems(ctx, item.items, rootVar, contentVar, collapsed, itemIndex * 100)
      }

      itemIndex++
    } else {
      // Render NavItem
      const itemVar = `${rootVar}_item${itemIndex}`
      ctx.emit(`// NavItem: ${item.label || item.value}`)
      ctx.emit(`const ${itemVar} = document.createElement('a')`)
      ctx.emit(`${itemVar}.dataset.slot = 'Item'`)
      ctx.emit(`${itemVar}.dataset.value = '${ctx.escapeString(item.value || '')}'`)
      ctx.emit(`${itemVar}.setAttribute('role', 'menuitem')`)
      ctx.emit(`${itemVar}.setAttribute('tabindex', '0')`)
      if (item.shows) {
        ctx.emit(`${itemVar}.dataset.shows = '${ctx.escapeString(item.shows)}'`)
        if (item.showsFrom) {
          ctx.emit(`${itemVar}.dataset.showsFrom = '${ctx.escapeString(item.showsFrom)}'`)
        }
      } else if (item.loadFromFile) {
        // Legacy: Mark for lazy loading from external file
        ctx.emit(`${itemVar}.dataset.loadFromFile = '${ctx.escapeString(item.loadFromFile)}'`)
      }
      if (item.disabled) {
        ctx.emit(`${itemVar}.setAttribute('data-disabled', 'true')`)
        ctx.emit(`${itemVar}.setAttribute('aria-disabled', 'true')`)
      }
      ctx.emit(`${parentVar}.appendChild(${itemVar})`)
      ctx.emit('')

      // Icon
      if (item.icon) {
        const iconVar = `${itemVar}_icon`
        ctx.emit(`const ${iconVar} = document.createElement('span')`)
        ctx.emit(`${iconVar}.dataset.slot = 'ItemIcon'`)
        ctx.emit(`${iconVar}.dataset.icon = '${ctx.escapeString(item.icon)}'`)
        ctx.emit(`${itemVar}.appendChild(${iconVar})`)
        ctx.emit('')
      }

      // Label (only show if not collapsed)
      if (!collapsed && item.label) {
        const labelVar = `${itemVar}_label`
        ctx.emit(`const ${labelVar} = document.createElement('span')`)
        ctx.emit(`${labelVar}.dataset.slot = 'ItemLabel'`)
        ctx.emit(`${labelVar}.textContent = '${ctx.escapeString(item.label)}'`)
        ctx.emit(`${itemVar}.appendChild(${labelVar})`)
        ctx.emit('')
      }

      // Badge
      if (!collapsed && item.badge) {
        const badgeVar = `${itemVar}_badge`
        ctx.emit(`const ${badgeVar} = document.createElement('span')`)
        ctx.emit(`${badgeVar}.dataset.slot = 'ItemBadge'`)
        ctx.emit(`${badgeVar}.textContent = '${ctx.escapeString(item.badge)}'`)
        ctx.emit(`${itemVar}.appendChild(${badgeVar})`)
        ctx.emit('')
      }

      // Arrow
      if (!collapsed && item.arrow) {
        const arrowVar = `${itemVar}_arrow`
        ctx.emit(`const ${arrowVar} = document.createElement('span')`)
        ctx.emit(`${arrowVar}.dataset.slot = 'ItemArrow'`)
        ctx.emit(`${itemVar}.appendChild(${arrowVar})`)
        ctx.emit('')
      }

      itemIndex++
    }
  }
}

/**
 * Emit SideNav Component
 * Sidebar navigation with items, groups, and collapsible sections
 */
function emitSideNavComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// SideNav Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('nav')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'sidenav'`)
  ctx.emit(`${varName}.setAttribute('role', 'navigation')`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Check collapsed mode
  const isCollapsed = node.machineConfig.collapsed === true

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'sidenav',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.emit(`items: ${JSON.stringify(node.items.map((item: IRItem) => ({
    value: item.value,
    label: item.label,
    icon: item.icon,
    badge: item.badge,
    arrow: item.arrow,
    shows: item.shows,
    disabled: item.disabled,
    isGroup: item.isGroup,
    collapsible: item.collapsible,
    defaultOpen: item.defaultOpen,
    items: item.items,
  })))},`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Apply root styles
  emitSlotStyles(ctx, varName, node.slots['Root'])

  if (isCollapsed) {
    ctx.emit(`${varName}.setAttribute('data-collapsed', 'true')`)
  }

  // Header slot (optional)
  const headerSlot = node.slots['Header']
  if (headerSlot && (headerSlot.children?.length > 0 || headerSlot.styles?.length > 0)) {
    const headerVar = `${varName}_header`
    ctx.emit(`// Header`)
    ctx.emit(`const ${headerVar} = document.createElement('div')`)
    ctx.emit(`${headerVar}.dataset.slot = 'Header'`)
    emitSlotStyles(ctx, headerVar, headerSlot)
    // Render header children
    if (headerSlot.children && headerSlot.children.length > 0) {
      for (const child of headerSlot.children) {
        ctx.emitNode(child as IRNode, headerVar)
      }
    }
    ctx.emit(`${varName}.appendChild(${headerVar})`)
    ctx.emit('')
  }

  // ItemList container
  const itemListVar = `${varName}_itemlist`
  const itemListSlot = node.slots['ItemList']
  ctx.emit(`// ItemList`)
  ctx.emit(`const ${itemListVar} = document.createElement('div')`)
  ctx.emit(`${itemListVar}.dataset.slot = 'ItemList'`)
  ctx.emit(`${itemListVar}.setAttribute('role', 'menubar')`)
  emitSlotStyles(ctx, itemListVar, itemListSlot)
  ctx.emit(`${varName}.appendChild(${itemListVar})`)
  ctx.emit('')

  // Store slot styles for runtime use
  ctx.emit(`${varName}._slotStyles = {`)
  ctx.indentIn()
  for (const slotName of ['Item', 'ItemIcon', 'ItemLabel', 'ItemBadge', 'ItemArrow', 'Group', 'GroupLabel', 'GroupArrow', 'GroupContent']) {
    const slot = node.slots[slotName]
    if (slot?.styles && slot.styles.length > 0) {
      ctx.emit(`'${slotName}': {`)
      ctx.indentIn()
      for (const style of slot.styles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
      ctx.indentOut()
      ctx.emit(`},`)
    }
  }
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Emit items (NavItems and NavGroups)
  emitSideNavItems(ctx, node.items, varName, itemListVar, isCollapsed)

  // Footer slot (optional)
  const footerSlot = node.slots['Footer']
  if (footerSlot && (footerSlot.children?.length > 0 || footerSlot.styles?.length > 0)) {
    const footerVar = `${varName}_footer`
    ctx.emit(`// Footer`)
    ctx.emit(`const ${footerVar} = document.createElement('div')`)
    ctx.emit(`${footerVar}.dataset.slot = 'Footer'`)
    emitSlotStyles(ctx, footerVar, footerSlot)
    // Render footer children
    if (footerSlot.children && footerSlot.children.length > 0) {
      for (const child of footerSlot.children) {
        ctx.emitNode(child as IRNode, footerVar)
      }
    }
    ctx.emit(`${varName}.appendChild(${footerVar})`)
    ctx.emit('')
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize SideNav via runtime
  emitRuntimeInit(ctx, varName, 'initSideNavComponent')
}

// =============================================================================
// POPOVER COMPONENT
// =============================================================================

/**
 * Emit Popover Component
 * Click-triggered popup with optional title, description, and close trigger
 */
function emitPopoverComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// Popover Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'popover'`)
  ctx.emit(`${varName}.style.display = 'inline-block'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Machine configuration
  emitMachineConfig(ctx, varName, 'popover', node.id, node.machineConfig || {})

  // Trigger button
  const triggerSlot = node.slots['Trigger']
  const triggerVar = `${varName}_trigger`
  ctx.emit(`// Trigger`)
  ctx.emit(`const ${triggerVar} = document.createElement('button')`)
  ctx.emit(`${triggerVar}.type = 'button'`)
  ctx.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
  ctx.emit(`${triggerVar}.setAttribute('aria-haspopup', 'dialog')`)
  ctx.emit(`${triggerVar}.setAttribute('aria-expanded', 'false')`)
  emitSlotStyles(ctx, triggerVar, triggerSlot)
  const triggerLabel = node.machineConfig.label || node.machineConfig.trigger || 'Open Popover'
  ctx.emit(`${triggerVar}.textContent = '${ctx.escapeString(String(triggerLabel))}'`)
  ctx.emit(`${varName}.appendChild(${triggerVar})`)
  ctx.emit('')

  // Content container
  const contentSlot = node.slots['Content']
  const contentVar = `${varName}_content`
  ctx.emit(`// Content (popover panel)`)
  ctx.emit(`const ${contentVar} = document.createElement('div')`)
  ctx.emit(`${contentVar}.dataset.slot = 'Content'`)
  ctx.emit(`${contentVar}.setAttribute('role', 'dialog')`)
  emitSlotStyles(ctx, contentVar, contentSlot)
  ctx.emit(`${varName}.appendChild(${contentVar})`)
  ctx.emit('')

  // Title (optional)
  const titleSlot = node.slots['Title']
  if (node.machineConfig.title) {
    const titleVar = `${varName}_title`
    ctx.emit(`// Title`)
    ctx.emit(`const ${titleVar} = document.createElement('h3')`)
    ctx.emit(`${titleVar}.dataset.slot = 'Title'`)
    ctx.emit(`${titleVar}.textContent = '${ctx.escapeString(String(node.machineConfig.title))}'`)
    emitSlotStyles(ctx, titleVar, titleSlot)
    ctx.emit(`${contentVar}.appendChild(${titleVar})`)
    ctx.emit('')
  }

  // Description (optional)
  const descSlot = node.slots['Description']
  if (node.machineConfig.description) {
    const descVar = `${varName}_desc`
    ctx.emit(`// Description`)
    ctx.emit(`const ${descVar} = document.createElement('p')`)
    ctx.emit(`${descVar}.dataset.slot = 'Description'`)
    ctx.emit(`${descVar}.textContent = '${ctx.escapeString(String(node.machineConfig.description))}'`)
    emitSlotStyles(ctx, descVar, descSlot)
    ctx.emit(`${contentVar}.appendChild(${descVar})`)
    ctx.emit('')
  }

  // CloseTrigger - only created if explicitly defined as slot
  const closeSlot = node.slots['CloseTrigger']
  if (closeSlot && closeSlot.children && closeSlot.children.length > 0) {
    const closeVar = `${varName}_close`
    ctx.emit(`// Close trigger (user-defined)`)
    ctx.emit(`const ${closeVar} = document.createElement('div')`)
    ctx.emit(`${closeVar}.dataset.slot = 'CloseTrigger'`)
    emitSlotStyles(ctx, closeVar, closeSlot)
    for (const child of closeSlot.children) {
      ctx.emitNode(child as IRNode, closeVar)
    }
    ctx.emit(`${contentVar}.appendChild(${closeVar})`)
    ctx.emit('')
  }

  // Emit Content slot children
  const contentSlotChildren = node.slots['Content']?.children || []
  if (contentSlotChildren.length > 0) {
    for (const child of contentSlotChildren) {
      ctx.emitNode(child as IRNode, contentVar)
    }
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Popover via runtime
  emitRuntimeInit(ctx, varName, 'initPopoverComponent')
}

// =============================================================================
// HOVERCARD COMPONENT
// =============================================================================

/**
 * Emit HoverCard Component
 * Hover-triggered card with trigger and content
 */
function emitHoverCardComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// HoverCard Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'hover-card'`)
  ctx.emit(`${varName}.style.display = 'inline-block'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Machine configuration
  emitMachineConfig(ctx, varName, 'hover-card', node.id, node.machineConfig || {})

  // Trigger element
  const triggerSlot = node.slots['Trigger']
  const triggerVar = `${varName}_trigger`
  ctx.emit(`// Trigger`)
  ctx.emit(`const ${triggerVar} = document.createElement('a')`)
  ctx.emit(`${triggerVar}.href = '#'`)
  ctx.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
  emitSlotStyles(ctx, triggerVar, triggerSlot)
  const triggerLabel = node.machineConfig.label || node.machineConfig.trigger || 'Hover me'
  ctx.emit(`${triggerVar}.textContent = '${ctx.escapeString(String(triggerLabel))}'`)
  ctx.emit(`${varName}.appendChild(${triggerVar})`)
  ctx.emit('')

  // Content (hover card popup)
  const contentSlot = node.slots['Content']
  const contentVar = `${varName}_content`
  ctx.emit(`// Content (hover card)`)
  ctx.emit(`const ${contentVar} = document.createElement('div')`)
  ctx.emit(`${contentVar}.dataset.slot = 'Content'`)
  emitSlotStyles(ctx, contentVar, contentSlot)
  ctx.emit(`${varName}.appendChild(${contentVar})`)
  ctx.emit('')

  // Emit Content slot children
  const contentSlotChildren = node.slots['Content']?.children || []
  if (contentSlotChildren.length > 0) {
    for (const child of contentSlotChildren) {
      ctx.emitNode(child as IRNode, contentVar)
    }
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize HoverCard via runtime
  emitRuntimeInit(ctx, varName, 'initHoverCardComponent')
}

// =============================================================================
// COLLAPSIBLE COMPONENT
// =============================================================================

/**
 * Emit Collapsible Component
 * Expandable/collapsible content section with trigger
 */
function emitCollapsibleComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  // Header
  emitComponentHeader(ctx, node, varName, 'div', 'collapsible')

  // Machine configuration
  emitMachineConfig(ctx, varName, 'collapsible', node.id, node.machineConfig || {})

  // Apply root styles
  emitSlotStyles(ctx, varName, node.slots['Root'])

  // Trigger
  const triggerSlot = node.slots['Trigger']
  const triggerVar = `${varName}_trigger`
  ctx.emit(`// Trigger`)
  ctx.emit(`const ${triggerVar} = document.createElement('div')`)
  ctx.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
  ctx.emit(`${triggerVar}.setAttribute('role', 'button')`)
  ctx.emit(`${triggerVar}.setAttribute('tabindex', '0')`)
  ctx.emit(`${triggerVar}.setAttribute('aria-expanded', 'false')`)
  ctx.emit(`${triggerVar}.style.cursor = 'pointer'`)
  emitSlotStyles(ctx, triggerVar, triggerSlot)

  // Emit trigger children
  if (triggerSlot?.children && triggerSlot.children.length > 0) {
    for (const child of triggerSlot.children) {
      ctx.emitNode(child as IRNode, triggerVar)
    }
  } else {
    // Fallback text if no children
    const triggerLabel = node.machineConfig.label || node.machineConfig.trigger || 'Toggle'
    ctx.emit(`${triggerVar}.textContent = '${ctx.escapeString(String(triggerLabel))}'`)
  }
  ctx.emit(`${varName}.appendChild(${triggerVar})`)
  ctx.emit('')

  // Content container
  const contentSlot = node.slots['Content']
  const contentVar = `${varName}_content`
  ctx.emit(`// Content`)
  ctx.emit(`const ${contentVar} = document.createElement('div')`)
  ctx.emit(`${contentVar}.dataset.slot = 'Content'`)
  ctx.emit(`${contentVar}.setAttribute('role', 'region')`)
  emitSlotStyles(ctx, contentVar, contentSlot)
  ctx.emit(`${varName}.appendChild(${contentVar})`)
  ctx.emit('')

  // Emit content children
  if (contentSlot?.children && contentSlot.children.length > 0) {
    for (const child of contentSlot.children) {
      ctx.emitNode(child as IRNode, contentVar)
    }
  } else if (node.children && node.children.length > 0) {
    // Fallback to node.children if no slot children
    for (const child of node.children) {
      ctx.emitNode(child as IRNode, contentVar)
    }
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Collapsible via runtime
  emitRuntimeInit(ctx, varName, 'initCollapsibleComponent')
}

// =============================================================================
// DatePicker Component
// =============================================================================

function emitDatePickerComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// DatePicker Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'datepicker'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'datepicker',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Create Control (wrapper for Input + Trigger)
  const controlSlot = node.slots['Control']
  const controlVar = `${varName}_control`
  ctx.emit(`// Control (Input + Trigger wrapper)`)
  ctx.emit(`const ${controlVar} = document.createElement('div')`)
  ctx.emit(`${controlVar}.dataset.slot = 'Control'`)
  if (controlSlot?.styles && controlSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${controlVar}.style, {`)
    ctx.indentIn()
    for (const style of controlSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
  ctx.emit(`${varName}.appendChild(${controlVar})`)
  ctx.emit('')

  // Create Input
  const inputSlot = node.slots['Input']
  const inputVar = `${varName}_input`
  ctx.emit(`// Input`)
  ctx.emit(`const ${inputVar} = document.createElement('input')`)
  ctx.emit(`${inputVar}.type = 'text'`)
  ctx.emit(`${inputVar}.dataset.slot = 'Input'`)
  const placeholder = (node.machineConfig?.placeholder as string) || 'Select date...'
  ctx.emit(`${inputVar}.placeholder = '${ctx.escapeString(placeholder)}'`)
  if (inputSlot?.styles && inputSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${inputVar}.style, {`)
    ctx.indentIn()
    for (const style of inputSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
  ctx.emit(`${controlVar}.appendChild(${inputVar})`)
  ctx.emit('')

  // Create Trigger (calendar icon button)
  const triggerSlot = node.slots['Trigger']
  const triggerVar = `${varName}_trigger`
  ctx.emit(`// Trigger (calendar button)`)
  ctx.emit(`const ${triggerVar} = document.createElement('button')`)
  ctx.emit(`${triggerVar}.type = 'button'`)
  ctx.emit(`${triggerVar}.dataset.slot = 'Trigger'`)
  ctx.emit(`${triggerVar}.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'`)
  if (triggerSlot?.styles && triggerSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${triggerVar}.style, {`)
    ctx.indentIn()
    for (const style of triggerSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
  ctx.emit(`${controlVar}.appendChild(${triggerVar})`)
  ctx.emit('')

  // Create Content (calendar popup - will be populated by runtime)
  const contentSlot = node.slots['Content']
  const contentVar = `${varName}_content`
  ctx.emit(`// Content (calendar popup)`)
  ctx.emit(`const ${contentVar} = document.createElement('div')`)
  ctx.emit(`${contentVar}.dataset.slot = 'Content'`)
  if (contentSlot?.styles && contentSlot.styles.length > 0) {
    ctx.emit(`Object.assign(${contentVar}.style, {`)
    ctx.indentIn()
    for (const style of contentSlot.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
  ctx.emit(`${varName}.appendChild(${contentVar})`)
  ctx.emit('')

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize DatePicker via runtime
  emitRuntimeInit(ctx, varName, 'initDatePickerComponent')
}

// =============================================================================
// TOGGLEGROUP COMPONENT
// =============================================================================

/**
 * Emit ToggleGroup Component
 * Group of toggle buttons where one or more can be selected
 */
function emitToggleGroupComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// ToggleGroup Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'toggle-group'`)
  ctx.emit(`${varName}.setAttribute('role', 'group')`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'toggle-group',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.emit(`items: ${JSON.stringify(node.items.map((item: IRItem) => ({
    value: item.value,
    label: item.label,
    disabled: item.disabled
  })))},`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Apply root styles
  emitSlotStyles(ctx, varName, node.slots['Root'])

  // Create Items
  const itemSlot = node.slots['Item']

  for (let i = 0; i < node.items.length; i++) {
    const item = node.items[i]
    const itemVar = `${varName}_item${i}`
    const itemValue = item.value || item.label || `item-${i}`
    const itemLabel = item.label || itemValue

    ctx.emit(`// Toggle Item: ${itemLabel}`)
    ctx.emit(`const ${itemVar} = document.createElement('button')`)
    ctx.emit(`${itemVar}.dataset.slot = 'Item'`)
    ctx.emit(`${itemVar}.dataset.value = '${ctx.escapeString(String(itemValue))}'`)
    ctx.emit(`${itemVar}.setAttribute('type', 'button')`)
    ctx.emit(`${itemVar}.textContent = '${ctx.escapeString(String(itemLabel))}'`)
    if (item.disabled) {
      ctx.emit(`${itemVar}.setAttribute('data-disabled', 'true')`)
      ctx.emit(`${itemVar}.disabled = true`)
    }
    emitSlotStyles(ctx, itemVar, itemSlot)

    ctx.emit(`${varName}.appendChild(${itemVar})`)
    ctx.emit('')
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize ToggleGroup via runtime
  emitRuntimeInit(ctx, varName, 'initToggleGroupComponent')
}

// =============================================================================
// SEGMENTEDCONTROL COMPONENT
// =============================================================================

/**
 * Emit SegmentedControl Component
 * Group of mutually exclusive options with sliding indicator
 */
function emitSegmentedControlComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// SegmentedControl Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'segmented-control'`)
  ctx.emit(`${varName}.setAttribute('role', 'radiogroup')`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'segmented-control',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.emit(`items: ${JSON.stringify(node.items.map((item: IRItem) => ({
    value: item.value,
    label: item.label,
    disabled: item.disabled
  })))},`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Apply root styles
  emitSlotStyles(ctx, varName, node.slots['Root'])

  // Create Indicator (slides behind active item)
  const indicatorSlot = node.slots['Indicator']
  const indicatorVar = `${varName}_indicator`
  ctx.emit(`// Indicator`)
  ctx.emit(`const ${indicatorVar} = document.createElement('div')`)
  ctx.emit(`${indicatorVar}.dataset.slot = 'Indicator'`)
  emitSlotStyles(ctx, indicatorVar, indicatorSlot)
  ctx.emit(`${varName}.appendChild(${indicatorVar})`)
  ctx.emit('')

  // Create Items
  const itemSlot = node.slots['Item']
  const textSlot = node.slots['ItemText']

  for (let i = 0; i < node.items.length; i++) {
    const item = node.items[i]
    const itemVar = `${varName}_item${i}`
    const itemValue = item.value || item.label || `item-${i}`
    const itemLabel = item.label || itemValue

    ctx.emit(`// Segment Item: ${itemLabel}`)
    ctx.emit(`const ${itemVar} = document.createElement('label')`)
    ctx.emit(`${itemVar}.dataset.slot = 'Item'`)
    ctx.emit(`${itemVar}.dataset.value = '${ctx.escapeString(String(itemValue))}'`)
    if (item.disabled) {
      ctx.emit(`${itemVar}.setAttribute('data-disabled', 'true')`)
    }
    emitSlotStyles(ctx, itemVar, itemSlot)

    // ItemText
    const textVar = `${itemVar}_text`
    ctx.emit(`const ${textVar} = document.createElement('span')`)
    ctx.emit(`${textVar}.dataset.slot = 'ItemText'`)
    ctx.emit(`${textVar}.textContent = '${ctx.escapeString(String(itemLabel))}'`)
    emitSlotStyles(ctx, textVar, textSlot)
    ctx.emit(`${itemVar}.appendChild(${textVar})`)

    ctx.emit(`${varName}.appendChild(${itemVar})`)
    ctx.emit('')
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize SegmentedControl via runtime
  emitRuntimeInit(ctx, varName, 'initSegmentedControlComponent')
}

// =============================================================================
// EDITABLE COMPONENT
// =============================================================================

/**
 * Emit Editable Component
 * Inline editable text field with preview and edit modes
 */
function emitEditableComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// Editable Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'editable'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'editable',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Create Area (contains Preview and Input)
  const areaSlot = node.slots['Area']
  const areaVar = `${varName}_area`
  ctx.emit(`// Area (Preview + Input container)`)
  ctx.emit(`const ${areaVar} = document.createElement('div')`)
  ctx.emit(`${areaVar}.dataset.slot = 'Area'`)
  emitSlotStyles(ctx, areaVar, areaSlot)
  ctx.emit(`${varName}.appendChild(${areaVar})`)
  ctx.emit('')

  // Create Preview
  const previewSlot = node.slots['Preview']
  const previewVar = `${varName}_preview`
  ctx.emit(`// Preview (display text)`)
  ctx.emit(`const ${previewVar} = document.createElement('span')`)
  ctx.emit(`${previewVar}.dataset.slot = 'Preview'`)
  const defaultValue = (node.machineConfig?.defaultValue as string) || (node.machineConfig?.value as string) || ''
  const placeholder = (node.machineConfig?.placeholder as string) || 'Click to edit...'
  ctx.emit(`${previewVar}.textContent = '${ctx.escapeString(defaultValue || placeholder)}'`)
  emitSlotStyles(ctx, previewVar, previewSlot)
  ctx.emit(`${areaVar}.appendChild(${previewVar})`)
  ctx.emit('')

  // Create Input (hidden initially)
  const inputSlot = node.slots['Input']
  const inputVar = `${varName}_input`
  ctx.emit(`// Input (edit mode)`)
  ctx.emit(`const ${inputVar} = document.createElement('input')`)
  ctx.emit(`${inputVar}.type = 'text'`)
  ctx.emit(`${inputVar}.dataset.slot = 'Input'`)
  ctx.emit(`${inputVar}.value = '${ctx.escapeString(defaultValue)}'`)
  ctx.emit(`${inputVar}.placeholder = '${ctx.escapeString(placeholder)}'`)
  emitSlotStyles(ctx, inputVar, inputSlot)
  ctx.emit(`${areaVar}.appendChild(${inputVar})`)
  ctx.emit('')

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Editable via runtime
  emitRuntimeInit(ctx, varName, 'initEditableComponent')
}

// =============================================================================
// PININPUT COMPONENT
// =============================================================================

/**
 * Emit PinInput Component
 * Multi-digit input field (e.g., for verification codes)
 */
function emitPinInputComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// PinInput Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'pin-input'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'pin-input',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Apply root styles
  emitSlotStyles(ctx, varName, node.slots['Root'])

  // Create Label if exists
  const labelText = node.machineConfig.label as string
  if (labelText) {
    const labelSlot = node.slots['Label']
    const labelVar = `${varName}_label`
    ctx.emit(`// Label`)
    ctx.emit(`const ${labelVar} = document.createElement('label')`)
    ctx.emit(`${labelVar}.dataset.slot = 'Label'`)
    ctx.emit(`${labelVar}.textContent = '${ctx.escapeString(labelText)}'`)
    emitSlotStyles(ctx, labelVar, labelSlot)
    ctx.emit(`${varName}.appendChild(${labelVar})`)
    ctx.emit('')
  }

  // Create Control container
  const controlSlot = node.slots['Control']
  const controlVar = `${varName}_control`
  ctx.emit(`// Control (input container)`)
  ctx.emit(`const ${controlVar} = document.createElement('div')`)
  ctx.emit(`${controlVar}.dataset.slot = 'Control'`)
  emitSlotStyles(ctx, controlVar, controlSlot)

  // Create input fields based on length
  const length = (node.machineConfig.length as number) || 4
  const inputSlot = node.slots['Input']
  ctx.emit(`// Input fields`)
  ctx.emit(`for (let i = 0; i < ${length}; i++) {`)
  ctx.indentIn()
  ctx.emit(`const input = document.createElement('input')`)
  ctx.emit(`input.dataset.slot = 'Input'`)
  ctx.emit(`input.dataset.index = String(i)`)
  ctx.emit(`input.type = 'text'`)
  ctx.emit(`input.maxLength = 1`)
  ctx.emit(`input.inputMode = 'numeric'`)
  ctx.emit(`input.autocomplete = 'one-time-code'`)
  emitSlotStyles(ctx, 'input', inputSlot)
  ctx.emit(`${controlVar}.appendChild(input)`)
  ctx.indentOut()
  ctx.emit(`}`)

  ctx.emit(`${varName}.appendChild(${controlVar})`)
  ctx.emit('')

  // Create hidden input for form submission
  const hiddenInputVar = `${varName}_hiddenInput`
  ctx.emit(`// Hidden input for form submission`)
  ctx.emit(`const ${hiddenInputVar} = document.createElement('input')`)
  ctx.emit(`${hiddenInputVar}.type = 'hidden'`)
  ctx.emit(`${hiddenInputVar}.dataset.slot = 'HiddenInput'`)
  const name = node.machineConfig.name as string
  if (name) {
    ctx.emit(`${hiddenInputVar}.name = '${ctx.escapeString(name)}'`)
  }
  ctx.emit(`${varName}.appendChild(${hiddenInputVar})`)
  ctx.emit('')

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize PinInput via runtime
  emitRuntimeInit(ctx, varName, 'initPinInputComponent')
}

// =============================================================================
// PASSWORDINPUT COMPONENT
// =============================================================================

/**
 * Emit PasswordInput Component
 * Password input field with visibility toggle
 */
function emitPasswordInputComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// PasswordInput Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'password-input'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'password-input',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Apply root styles
  emitSlotStyles(ctx, varName, node.slots['Root'])

  // Create Label if exists
  const labelText = node.machineConfig.label as string
  if (labelText) {
    const labelSlot = node.slots['Label']
    const labelVar = `${varName}_label`
    ctx.emit(`// Label`)
    ctx.emit(`const ${labelVar} = document.createElement('label')`)
    ctx.emit(`${labelVar}.dataset.slot = 'Label'`)
    ctx.emit(`${labelVar}.textContent = '${ctx.escapeString(labelText)}'`)
    emitSlotStyles(ctx, labelVar, labelSlot)
    ctx.emit(`${varName}.appendChild(${labelVar})`)
    ctx.emit('')
  }

  // Create Control container
  const controlSlot = node.slots['Control']
  const controlVar = `${varName}_control`
  ctx.emit(`// Control (input container)`)
  ctx.emit(`const ${controlVar} = document.createElement('div')`)
  ctx.emit(`${controlVar}.dataset.slot = 'Control'`)
  emitSlotStyles(ctx, controlVar, controlSlot)

  // Create Input
  const inputSlot = node.slots['Input']
  const inputVar = `${varName}_input`
  ctx.emit(`// Input`)
  ctx.emit(`const ${inputVar} = document.createElement('input')`)
  ctx.emit(`${inputVar}.type = 'password'`)
  ctx.emit(`${inputVar}.dataset.slot = 'Input'`)
  const placeholder = node.machineConfig.placeholder as string
  if (placeholder) {
    ctx.emit(`${inputVar}.placeholder = '${ctx.escapeString(placeholder)}'`)
  }
  emitSlotStyles(ctx, inputVar, inputSlot)
  ctx.emit(`${controlVar}.appendChild(${inputVar})`)

  // Create VisibilityTrigger
  const visibilitySlot = node.slots['VisibilityTrigger']
  const visibilityVar = `${varName}_visibility`
  ctx.emit(`// VisibilityTrigger`)
  ctx.emit(`const ${visibilityVar} = document.createElement('button')`)
  ctx.emit(`${visibilityVar}.type = 'button'`)
  ctx.emit(`${visibilityVar}.dataset.slot = 'VisibilityTrigger'`)
  ctx.emit(`${visibilityVar}.setAttribute('aria-label', 'Toggle password visibility')`)
  emitSlotStyles(ctx, visibilityVar, visibilitySlot)
  ctx.emit(`${controlVar}.appendChild(${visibilityVar})`)

  ctx.emit(`${varName}.appendChild(${controlVar})`)
  ctx.emit('')

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize PasswordInput via runtime
  emitRuntimeInit(ctx, varName, 'initPasswordInputComponent')
}

// =============================================================================
// TREEVIEW COMPONENT
// =============================================================================

/**
 * Emit TreeView Component
 * Hierarchical tree structure with expandable branches
 */
function emitTreeViewComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// TreeView Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'tree-view'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'tree-view',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Apply root styles
  emitSlotStyles(ctx, varName, node.slots['Root'])

  // Create Tree element (ul)
  const treeSlot = node.slots['Tree']
  const treeVar = `${varName}_tree`
  ctx.emit(`// Tree`)
  ctx.emit(`const ${treeVar} = document.createElement('ul')`)
  ctx.emit(`${treeVar}.dataset.slot = 'Tree'`)
  ctx.emit(`${treeVar}.setAttribute('role', 'tree')`)
  emitSlotStyles(ctx, treeVar, treeSlot)
  ctx.emit(`${varName}.appendChild(${treeVar})`)
  ctx.emit('')

  // Store slot styles for runtime use
  ctx.emit(`${varName}._slotStyles = {`)
  ctx.indentIn()
  for (const slotName of ['Branch', 'BranchTrigger', 'BranchContent', 'BranchIndicator', 'Item', 'ItemText']) {
    const slot = node.slots[slotName]
    if (slot?.styles && slot.styles.length > 0) {
      ctx.emit(`'${slotName}': {`)
      ctx.indentIn()
      for (const style of slot.styles) {
        ctx.emit(`'${style.property}': '${style.value}',`)
      }
      ctx.indentOut()
      ctx.emit(`},`)
    }
  }
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize TreeView via runtime
  emitRuntimeInit(ctx, varName, 'initTreeViewComponent')
}

// =============================================================================
// TAGSINPUT COMPONENT
// =============================================================================

/**
 * Emit TagsInput Component
 * Structure: Root > Control (Tags + Input) + HiddenInput
 */
function emitTagsInputComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// TagsInput Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'tagsinput'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'tagsinput',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Create Label if present
  const labelText = (node.machineConfig?.label as string) || ''
  if (labelText) {
    const labelSlot = node.slots['Label']
    const labelVar = `${varName}_label`
    ctx.emit(`// Label`)
    ctx.emit(`const ${labelVar} = document.createElement('label')`)
    ctx.emit(`${labelVar}.dataset.slot = 'Label'`)
    ctx.emit(`${labelVar}.textContent = '${ctx.escapeString(labelText)}'`)
    emitSlotStyles(ctx, labelVar, labelSlot)
    ctx.emit(`${varName}.appendChild(${labelVar})`)
    ctx.emit('')
  }

  // Create Control (wrapper for tags + input)
  const controlSlot = node.slots['Control']
  const controlVar = `${varName}_control`
  ctx.emit(`// Control (tags container)`)
  ctx.emit(`const ${controlVar} = document.createElement('div')`)
  ctx.emit(`${controlVar}.dataset.slot = 'Control'`)
  emitSlotStyles(ctx, controlVar, controlSlot)
  ctx.emit(`${varName}.appendChild(${controlVar})`)
  ctx.emit('')

  // Create Input
  const inputSlot = node.slots['Input']
  const inputVar = `${varName}_input`
  ctx.emit(`// Input`)
  ctx.emit(`const ${inputVar} = document.createElement('input')`)
  ctx.emit(`${inputVar}.type = 'text'`)
  ctx.emit(`${inputVar}.dataset.slot = 'Input'`)
  const placeholder = (node.machineConfig?.placeholder as string) || 'Add tag...'
  ctx.emit(`${inputVar}.placeholder = '${ctx.escapeString(placeholder)}'`)
  emitSlotStyles(ctx, inputVar, inputSlot)
  ctx.emit(`${controlVar}.appendChild(${inputVar})`)
  ctx.emit('')

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize TagsInput via runtime
  emitRuntimeInit(ctx, varName, 'initTagsInputComponent')
}

// =============================================================================
// NUMBERINPUT COMPONENT
// =============================================================================

/**
 * Emit NumberInput Component
 * Structure: Root > Control (DecrementTrigger + Input + IncrementTrigger)
 */
function emitNumberInputComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// NumberInput Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'numberinput'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'numberinput',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Create Label if present
  const labelText = (node.machineConfig?.label as string) || ''
  if (labelText) {
    const labelSlot = node.slots['Label']
    const labelVar = `${varName}_label`
    ctx.emit(`// Label`)
    ctx.emit(`const ${labelVar} = document.createElement('label')`)
    ctx.emit(`${labelVar}.dataset.slot = 'Label'`)
    ctx.emit(`${labelVar}.textContent = '${ctx.escapeString(labelText)}'`)
    emitSlotStyles(ctx, labelVar, labelSlot)
    ctx.emit(`${varName}.appendChild(${labelVar})`)
    ctx.emit('')
  }

  // Create Control (wrapper)
  const controlSlot = node.slots['Control']
  const controlVar = `${varName}_control`
  ctx.emit(`// Control (wrapper)`)
  ctx.emit(`const ${controlVar} = document.createElement('div')`)
  ctx.emit(`${controlVar}.dataset.slot = 'Control'`)
  emitSlotStyles(ctx, controlVar, controlSlot)
  ctx.emit(`${varName}.appendChild(${controlVar})`)
  ctx.emit('')

  // Create Decrement Trigger
  const decrementSlot = node.slots['DecrementTrigger']
  const decrementVar = `${varName}_decrement`
  ctx.emit(`// Decrement Trigger`)
  ctx.emit(`const ${decrementVar} = document.createElement('button')`)
  ctx.emit(`${decrementVar}.type = 'button'`)
  ctx.emit(`${decrementVar}.dataset.slot = 'DecrementTrigger'`)
  ctx.emit(`${decrementVar}.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>'`)
  ctx.emit(`${decrementVar}.setAttribute('aria-label', 'Decrease value')`)
  emitSlotStyles(ctx, decrementVar, decrementSlot)
  ctx.emit(`${controlVar}.appendChild(${decrementVar})`)
  ctx.emit('')

  // Create Input
  const inputSlot = node.slots['Input']
  const inputVar = `${varName}_input`
  ctx.emit(`// Input`)
  ctx.emit(`const ${inputVar} = document.createElement('input')`)
  ctx.emit(`${inputVar}.type = 'text'`)
  ctx.emit(`${inputVar}.inputMode = 'decimal'`)
  ctx.emit(`${inputVar}.dataset.slot = 'Input'`)
  const placeholder = (node.machineConfig?.placeholder as string) || ''
  if (placeholder) {
    ctx.emit(`${inputVar}.placeholder = '${ctx.escapeString(placeholder)}'`)
  }
  emitSlotStyles(ctx, inputVar, inputSlot)
  ctx.emit(`${controlVar}.appendChild(${inputVar})`)
  ctx.emit('')

  // Create Increment Trigger
  const incrementSlot = node.slots['IncrementTrigger']
  const incrementVar = `${varName}_increment`
  ctx.emit(`// Increment Trigger`)
  ctx.emit(`const ${incrementVar} = document.createElement('button')`)
  ctx.emit(`${incrementVar}.type = 'button'`)
  ctx.emit(`${incrementVar}.dataset.slot = 'IncrementTrigger'`)
  ctx.emit(`${incrementVar}.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'`)
  ctx.emit(`${incrementVar}.setAttribute('aria-label', 'Increase value')`)
  emitSlotStyles(ctx, incrementVar, incrementSlot)
  ctx.emit(`${controlVar}.appendChild(${incrementVar})`)
  ctx.emit('')

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize NumberInput via runtime
  emitRuntimeInit(ctx, varName, 'initNumberInputComponent')
}

// =============================================================================
// DATEINPUT COMPONENT
// =============================================================================

/**
 * Emit DateInput Component
 * Structure: Root > Label + Control (Segments + Separators)
 */
function emitDateInputComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// DateInput Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'dateinput'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'dateinput',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Apply root styles
  emitSlotStyles(ctx, varName, node.slots['Root'])

  // Create Label if present
  const labelText = (node.machineConfig?.label as string) || ''
  if (labelText) {
    const labelSlot = node.slots['Label']
    const labelVar = `${varName}_label`
    ctx.emit(`// Label`)
    ctx.emit(`const ${labelVar} = document.createElement('label')`)
    ctx.emit(`${labelVar}.dataset.slot = 'Label'`)
    ctx.emit(`${labelVar}.textContent = '${ctx.escapeString(labelText)}'`)
    emitSlotStyles(ctx, labelVar, labelSlot)
    ctx.emit(`${varName}.appendChild(${labelVar})`)
    ctx.emit('')
  }

  // Create Control container
  const controlSlot = node.slots['Control']
  const controlVar = `${varName}_control`
  ctx.emit(`// Control (segment container)`)
  ctx.emit(`const ${controlVar} = document.createElement('div')`)
  ctx.emit(`${controlVar}.dataset.slot = 'Control'`)
  emitSlotStyles(ctx, controlVar, controlSlot)
  ctx.emit(`${varName}.appendChild(${controlVar})`)
  ctx.emit('')

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize DateInput via runtime
  emitRuntimeInit(ctx, varName, 'initDateInputComponent')
}

// =============================================================================
// ACCORDION COMPONENT
// =============================================================================

/**
 * Emit Accordion Component
 * Structure: Root > Item (ItemTrigger + ItemContent) for each item
 * Uses emitNode for rendering children inside ItemContent
 */
function emitAccordionComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// Accordion Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'accordion'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'accordion',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.emit(`items: ${JSON.stringify(node.items.map((item: IRItem) => ({
    value: item.value,
    label: item.label,
    disabled: item.disabled
  })))},`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Apply root styles
  emitSlotStyles(ctx, varName, node.slots['Root'])

  // Create Item containers for each accordion item
  const itemSlot = node.slots['Item']
  const triggerSlot = node.slots['ItemTrigger']
  const contentSlot = node.slots['ItemContent']
  const indicatorSlot = node.slots['ItemIndicator']

  for (let i = 0; i < node.items.length; i++) {
    const item = node.items[i]
    const itemVar = `${varName}_item${i}`
    const itemValue = item.value || `item-${i}`

    // Item container
    ctx.emit(`// Accordion Item: ${item.label || itemValue}`)
    ctx.emit(`const ${itemVar} = document.createElement('div')`)
    ctx.emit(`${itemVar}.dataset.slot = 'Item'`)
    ctx.emit(`${itemVar}.dataset.value = '${ctx.escapeString(itemValue)}'`)
    if (item.disabled) {
      ctx.emit(`${itemVar}.setAttribute('data-disabled', 'true')`)
    }
    emitSlotStyles(ctx, itemVar, itemSlot)

    // ItemTrigger (header/button)
    const triggerVar = `${itemVar}_trigger`
    ctx.emit(`const ${triggerVar} = document.createElement('button')`)
    ctx.emit(`${triggerVar}.type = 'button'`)
    ctx.emit(`${triggerVar}.dataset.slot = 'ItemTrigger'`)
    ctx.emit(`${triggerVar}.dataset.value = '${ctx.escapeString(itemValue)}'`)
    ctx.emit(`${triggerVar}.setAttribute('aria-expanded', 'false')`)
    if (item.disabled) {
      ctx.emit(`${triggerVar}.disabled = true`)
    }
    emitSlotStyles(ctx, triggerVar, triggerSlot)

    // Trigger text
    const triggerTextVar = `${triggerVar}_text`
    ctx.emit(`const ${triggerTextVar} = document.createElement('span')`)
    ctx.emit(`${triggerTextVar}.textContent = '${ctx.escapeString(item.label || itemValue)}'`)
    ctx.emit(`${triggerVar}.appendChild(${triggerTextVar})`)

    // ItemIndicator (icon loaded via runtime)
    const indicatorVar = `${itemVar}_indicator`
    const accordionIcon = node.machineConfig.icon || 'chevron-down'
    ctx.emit(`const ${indicatorVar} = document.createElement('span')`)
    ctx.emit(`${indicatorVar}.dataset.slot = 'ItemIndicator'`)
    ctx.emit(`${indicatorVar}.dataset.icon = '${ctx.escapeString(String(accordionIcon))}'`)
    emitSlotStyles(ctx, indicatorVar, indicatorSlot)
    ctx.emit(`${triggerVar}.appendChild(${indicatorVar})`)

    ctx.emit(`${itemVar}.appendChild(${triggerVar})`)

    // ItemContent (collapsible body)
    const contentVar = `${itemVar}_content`
    ctx.emit(`const ${contentVar} = document.createElement('div')`)
    ctx.emit(`${contentVar}.dataset.slot = 'ItemContent'`)
    ctx.emit(`${contentVar}.dataset.value = '${ctx.escapeString(itemValue)}'`)
    ctx.emit(`${contentVar}.setAttribute('role', 'region')`)
    emitSlotStyles(ctx, contentVar, contentSlot)

    // Render item children inside content
    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        ctx.emitNode(child, contentVar)
      }
    }

    ctx.emit(`${itemVar}.appendChild(${contentVar})`)
    ctx.emit(`${varName}.appendChild(${itemVar})`)
    ctx.emit('')
  }

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Accordion via runtime
  emitRuntimeInit(ctx, varName, 'initAccordionComponent')
}

// =============================================================================
// Listbox Component
// =============================================================================

function emitListboxComponent(node: IRZagNode, parentVar: string, ctx: ZagEmitterContext): void {
  const varName = ctx.sanitizeVarName(node.id)

  ctx.emit(`// Listbox Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('div')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'listbox'`)
  ctx.emit(`${varName}.setAttribute('role', 'listbox')`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }

  // Emit machine configuration
  emitMachineConfig(ctx, varName, 'listbox', node)

  // Apply root styles
  emitSlotStyles(ctx, varName, node.slots['Root'])

  // Create Label if provided
  const labelSlot = node.slots['Label']
  if (labelSlot && node.machineConfig.label) {
    const labelVar = `${varName}_label`
    ctx.emit(`const ${labelVar} = document.createElement('label')`)
    ctx.emit(`${labelVar}.dataset.slot = 'Label'`)
    ctx.emit(`${labelVar}.textContent = '${ctx.escapeString(String(node.machineConfig.label))}'`)
    emitSlotStyles(ctx, labelVar, labelSlot)
    ctx.emit(`${varName}.appendChild(${labelVar})`)
  }

  // Create Content container
  const contentVar = `${varName}_content`
  const contentSlot = node.slots['Content']
  ctx.emit(`const ${contentVar} = document.createElement('div')`)
  ctx.emit(`${contentVar}.dataset.slot = 'Content'`)
  emitSlotStyles(ctx, contentVar, contentSlot)

  // Create items
  const itemSlot = node.slots['Item']
  const textSlot = node.slots['ItemText']
  const indicatorSlot = node.slots['ItemIndicator']

  for (let i = 0; i < node.items.length; i++) {
    const item = node.items[i]
    const itemVar = `${varName}_item${i}`
    const itemValue = item.value || `item-${i}`

    // Item container
    ctx.emit(`// Listbox Item: ${item.label || itemValue}`)
    ctx.emit(`const ${itemVar} = document.createElement('div')`)
    ctx.emit(`${itemVar}.dataset.slot = 'Item'`)
    ctx.emit(`${itemVar}.dataset.value = '${ctx.escapeString(itemValue)}'`)
    ctx.emit(`${itemVar}.setAttribute('role', 'option')`)
    ctx.emit(`${itemVar}.setAttribute('tabindex', '${i === 0 ? "0" : "-1"}')`)
    if (item.disabled) {
      ctx.emit(`${itemVar}.setAttribute('data-disabled', 'true')`)
      ctx.emit(`${itemVar}.setAttribute('aria-disabled', 'true')`)
    }
    emitSlotStyles(ctx, itemVar, itemSlot)

    // Item indicator (checkmark for selected)
    const indicatorVar = `${itemVar}_indicator`
    ctx.emit(`const ${indicatorVar} = document.createElement('span')`)
    ctx.emit(`${indicatorVar}.dataset.slot = 'ItemIndicator'`)
    // Icon can be customized per-item or globally via machineConfig
    const itemIcon = item.icon || node.machineConfig.icon || 'check'
    ctx.emit(`${indicatorVar}.dataset.icon = '${ctx.escapeString(String(itemIcon))}'`)
    emitSlotStyles(ctx, indicatorVar, indicatorSlot)
    ctx.emit(`${itemVar}.appendChild(${indicatorVar})`)

    // Item text
    const textVar = `${itemVar}_text`
    ctx.emit(`const ${textVar} = document.createElement('span')`)
    ctx.emit(`${textVar}.dataset.slot = 'ItemText'`)
    ctx.emit(`${textVar}.textContent = '${ctx.escapeString(item.label || itemValue)}'`)
    emitSlotStyles(ctx, textVar, textSlot)
    ctx.emit(`${itemVar}.appendChild(${textVar})`)

    // Render item children if any
    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        ctx.emitNode(child, itemVar)
      }
    }

    ctx.emit(`${contentVar}.appendChild(${itemVar})`)
    ctx.emit('')
  }

  ctx.emit(`${varName}.appendChild(${contentVar})`)

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Listbox via runtime
  emitRuntimeInit(ctx, varName, 'initListboxComponent')
}

// =============================================================================
// Dispatcher
// =============================================================================

/**
 * Registry of Zag component emitters
 * Maps zagType to emitter function
 */
const emitterRegistry = new Map<string, ZagEmitterFn>([
  ['switch', emitSwitchComponent],
  ['checkbox', emitCheckboxComponent],
  ['radio-group', emitRadioGroupComponent],
  ['radiogroup', emitRadioGroupComponent],
  ['slider', emitSliderComponent],
  ['rangeslider', emitSliderComponent],
  ['tabs', emitTabsComponent],
  ['select', emitSelectComponent],
  ['tooltip', emitTooltipComponent],
  ['dialog', emitDialogComponent],
  ['sidenav', emitSideNavComponent],
  ['side-nav', emitSideNavComponent],
  ['popover', emitPopoverComponent],
  ['hover-card', emitHoverCardComponent],
  ['hovercard', emitHoverCardComponent],
  ['collapsible', emitCollapsibleComponent],
  ['datepicker', emitDatePickerComponent],
  ['date-picker', emitDatePickerComponent],
  ['toggle-group', emitToggleGroupComponent],
  ['togglegroup', emitToggleGroupComponent],
  ['segmented-control', emitSegmentedControlComponent],
  ['segmentedcontrol', emitSegmentedControlComponent],
  ['tree-view', emitTreeViewComponent],
  ['treeview', emitTreeViewComponent],
  ['password-input', emitPasswordInputComponent],
  ['passwordinput', emitPasswordInputComponent],
  ['pin-input', emitPinInputComponent],
  ['pininput', emitPinInputComponent],
  ['editable', emitEditableComponent],
  ['tags-input', emitTagsInputComponent],
  ['tagsinput', emitTagsInputComponent],
  ['number-input', emitNumberInputComponent],
  ['numberinput', emitNumberInputComponent],
  ['date-input', emitDateInputComponent],
  ['dateinput', emitDateInputComponent],
  ['accordion', emitAccordionComponent],
  ['listbox', emitListboxComponent],
])

/**
 * Dispatch to the appropriate Zag component emitter
 * Returns true if handled, false if component should use generic handling
 */
export function dispatchZagEmitter(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): boolean {
  const emitter = emitterRegistry.get(node.zagType)
  if (emitter) {
    emitter(node, parentVar, ctx)
    return true
  }

  // Also check with normalized names
  const normalizedType = node.zagType.replace(/-/g, '')
  const normalizedEmitter = emitterRegistry.get(normalizedType)
  if (normalizedEmitter) {
    normalizedEmitter(node, parentVar, ctx)
    return true
  }

  return false
}

/**
 * Register a Zag component emitter
 */
export function registerZagEmitter(zagType: string, emitter: ZagEmitterFn): void {
  emitterRegistry.set(zagType, emitter)
}

// =============================================================================
// Exports
// =============================================================================

export {
  emitSlotStyles,
  emitComponentHeader,
  emitMachineConfig,
  emitRuntimeInit,
}
