/**
 * Zag Form Component Emitters
 *
 * Switch, Checkbox, RadioGroup, Slider, Editable, PinInput, PasswordInput, TagsInput, NumberInput, DateInput, Form
 */

import type { IRZagNode, IRSlot, IRNode, IRItem } from '../../../ir/types'
import type { ZagEmitterContext, ZagEmitterFn } from '../zag-emitter-context'
import { emitSlotStyles, emitComponentHeader, emitMachineConfig, emitRuntimeInit } from './helpers'

export function emitSwitchComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
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

export function emitCheckboxComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
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

export function emitRadioGroupComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
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
  const extractSlotStateStyles = (
    slot: IRSlot | undefined
  ): Record<string, Record<string, string>> => {
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
  ctx.emit(
    `items: ${JSON.stringify(
      node.items.map((item: IRItem) => ({
        value: item.value,
        label: item.label,
        disabled: item.disabled,
      }))
    )},`
  )
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

export function emitSliderComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
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

export function emitEditableComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
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
  const defaultValue =
    (node.machineConfig?.defaultValue as string) || (node.machineConfig?.value as string) || ''
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

export function emitPinInputComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
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

export function emitPasswordInputComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
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

export function emitTagsInputComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
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

export function emitNumberInputComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
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
  ctx.emit(
    `${decrementVar}.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>'`
  )
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
  ctx.emit(
    `${incrementVar}.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'`
  )
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

export function emitDateInputComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
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

export function emitFormComponent(
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
): void {
  const varName = ctx.sanitizeVarName(node.id)
  const collectionName = (node.machineConfig?.collection as string) || ''
  const normalizedCollection = collectionName.startsWith('$')
    ? collectionName.slice(1)
    : collectionName

  ctx.emit(`// Form Component: ${node.name}`)
  ctx.emit(`const ${varName} = document.createElement('form')`)
  ctx.emit(`_elements['${node.id}'] = ${varName}`)
  ctx.emit(`${varName}.dataset.mirrorId = '${node.id}'`)
  ctx.emit(`${varName}.dataset.zagComponent = 'form'`)
  if (node.name) {
    ctx.emit(`${varName}.dataset.mirrorName = '${node.name}'`)
  }
  if (normalizedCollection) {
    ctx.emit(`${varName}.dataset.collection = '${normalizedCollection}'`)
  }
  ctx.emit('')

  // Emit machine configuration
  ctx.emit(`${varName}._zagConfig = {`)
  ctx.indentIn()
  ctx.emit(`type: 'form',`)
  ctx.emit(`id: '${node.id}',`)
  ctx.emit(`collection: '${normalizedCollection}',`)
  ctx.emit(`machineConfig: ${JSON.stringify(node.machineConfig)},`)
  ctx.indentOut()
  ctx.emit(`}`)
  ctx.emit('')

  // Apply form styles
  emitSlotStyles(ctx, varName, node.slots['Root'])

  // Process Field items
  const items = node.items || []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const fieldName = (item.name as string) || `field_${i}`
    const fieldLabel = (item.label as string) || formatFieldLabel(fieldName)
    const fieldPlaceholder = (item.placeholder as string) || ''
    const fieldType = (item.display as string) || 'text'
    const isMultiline = item.multiline === true
    const isRequired = item.required === true

    const fieldVar = `${varName}_field_${i}`
    const labelVar = `${fieldVar}_label`
    const inputVar = `${fieldVar}_input`

    ctx.emit(`// Field: ${fieldName}`)
    ctx.emit(`const ${fieldVar} = document.createElement('div')`)
    ctx.emit(`${fieldVar}.dataset.slot = 'Field'`)
    ctx.emit(`${fieldVar}.dataset.fieldName = '${ctx.escapeString(fieldName)}'`)

    // Apply field slot styles if defined
    emitSlotStyles(ctx, fieldVar, node.slots['Field'])

    // Label
    ctx.emit(`const ${labelVar} = document.createElement('label')`)
    ctx.emit(`${labelVar}.dataset.slot = 'FieldLabel'`)
    ctx.emit(`${labelVar}.textContent = '${ctx.escapeString(fieldLabel)}'`)
    ctx.emit(`${labelVar}.htmlFor = '${node.id}_${fieldName}'`)
    ctx.emit(`${fieldVar}.appendChild(${labelVar})`)

    // Input element
    if (isMultiline) {
      ctx.emit(`const ${inputVar} = document.createElement('textarea')`)
    } else if (fieldType === 'checkbox' || fieldType === 'switch') {
      ctx.emit(`const ${inputVar} = document.createElement('input')`)
      ctx.emit(`${inputVar}.type = 'checkbox'`)
    } else if (fieldType === 'number' || fieldType === 'slider') {
      ctx.emit(`const ${inputVar} = document.createElement('input')`)
      ctx.emit(`${inputVar}.type = 'number'`)
    } else {
      ctx.emit(`const ${inputVar} = document.createElement('input')`)
      ctx.emit(`${inputVar}.type = 'text'`)
    }

    ctx.emit(`${inputVar}.id = '${node.id}_${fieldName}'`)
    ctx.emit(`${inputVar}.name = '${ctx.escapeString(fieldName)}'`)
    ctx.emit(`${inputVar}.dataset.slot = 'FieldInput'`)
    if (fieldPlaceholder) {
      ctx.emit(`${inputVar}.placeholder = '${ctx.escapeString(fieldPlaceholder)}'`)
    }
    if (isRequired) {
      ctx.emit(`${inputVar}.required = true`)
    }

    // Apply FieldInput slot styles
    emitSlotStyles(ctx, inputVar, node.slots['FieldInput'])

    ctx.emit(`${fieldVar}.appendChild(${inputVar})`)

    // Error span
    const errorVar = `${fieldVar}_error`
    ctx.emit(`const ${errorVar} = document.createElement('span')`)
    ctx.emit(`${errorVar}.dataset.slot = 'FieldError'`)
    ctx.emit(`${errorVar}.style.display = 'none'`)
    ctx.emit(`${fieldVar}.appendChild(${errorVar})`)

    ctx.emit(`${varName}.appendChild(${fieldVar})`)
    ctx.emit('')
  }

  // Actions slot
  const actionsSlot = node.slots['Actions']
  if (actionsSlot) {
    const actionsVar = `${varName}_actions`
    ctx.emit(`// Actions`)
    ctx.emit(`const ${actionsVar} = document.createElement('div')`)
    ctx.emit(`${actionsVar}.dataset.slot = 'Actions'`)
    emitSlotStyles(ctx, actionsVar, actionsSlot)

    // Emit Actions slot children
    const actionsChildren = actionsSlot.children || []
    for (const child of actionsChildren) {
      ctx.emitNode(child as IRNode, actionsVar)
    }

    ctx.emit(`${varName}.appendChild(${actionsVar})`)
    ctx.emit('')
  }

  // Prevent default form submission
  ctx.emit(`${varName}.addEventListener('submit', function(e) { e.preventDefault() })`)
  ctx.emit('')

  // Append to parent
  ctx.emit(`${parentVar}.appendChild(${varName})`)
  ctx.emit('')

  // Initialize Form via runtime
  emitRuntimeInit(ctx, varName, 'initFormComponent')
}

/**
 * Registry entries for form components
 */
export const formemittersRegistry: [string, ZagEmitterFn][] = [
  ['switch', emitSwitchComponent],
  ['checkbox', emitCheckboxComponent],
  ['radio-group', emitRadioGroupComponent],
  ['radiogroup', emitRadioGroupComponent],
  ['slider', emitSliderComponent],
  ['rangeslider', emitSliderComponent],
  ['editable', emitEditableComponent],
  ['pin-input', emitPinInputComponent],
  ['pininput', emitPinInputComponent],
  ['password-input', emitPasswordInputComponent],
  ['passwordinput', emitPasswordInputComponent],
  ['tags-input', emitTagsInputComponent],
  ['tagsinput', emitTagsInputComponent],
  ['number-input', emitNumberInputComponent],
  ['numberinput', emitNumberInputComponent],
  ['date-input', emitDateInputComponent],
  ['dateinput', emitDateInputComponent],
  ['form', emitFormComponent],
]
