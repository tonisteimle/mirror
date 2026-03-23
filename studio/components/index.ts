/**
 * Property Panel Components
 *
 * Reusable UI components for the property panel.
 *
 * @example
 * ```ts
 * import { Section, PropRow, ToggleGroup, createInput } from './components'
 *
 * const section = new Section({ label: 'Layout', icon: 'layout' })
 *
 * const row = new PropRow({ label: 'Direction' })
 * row.append(
 *   new ToggleGroup({
 *     options: [
 *       { value: 'hor', icon: ICONS.horizontal, title: 'Horizontal' },
 *       { value: 'ver', icon: ICONS.vertical, title: 'Vertical' },
 *     ],
 *     value: 'hor',
 *     onChange: (v) => console.log(v),
 *   })
 * )
 *
 * section.append(row)
 * container.appendChild(section.getElement())
 * ```
 */

// Types
export * from './types'

// Icons
export { ICONS, getIcon, createIconElement, type IconName } from './icons'

// Components
export { Section, createSection } from './section'
export { PropRow, createPropRow, propRow } from './prop-row'
export { ToggleGroup, createToggleGroup, iconToggleGroup, textToggleGroup } from './toggle-group'
export { ColorInput, createColorInput } from './color-input'
export { AlignGrid, createAlignGrid, alignGrid } from './align-grid'
export { Select, createSelect, select } from './select'
export { Input, createInput, textInput, numberInput } from './input'
export { IconButton, createIconButton, iconButton } from './icon-button'
export { Slider, createSlider, slider } from './slider'
export { Toggle, createToggle, toggle } from './toggle'

// Re-export NumericInput from visual/position-controls
export { NumericInput } from '../visual/position-controls/numeric-input'
export type { NumericInputConfig } from '../visual/position-controls/types'

// ============================================
// Component Factory (convenience API)
// ============================================

import type {
  SectionConfig,
  PropRowConfig,
  ToggleGroupConfig,
  ColorInputConfig,
  AlignGridConfig,
  SelectConfig,
  InputConfig,
  IconButtonConfig,
  SliderConfig,
  ToggleConfig,
  AlignPosition,
} from './types'

import { Section } from './section'
import { PropRow } from './prop-row'
import { ToggleGroup } from './toggle-group'
import { ColorInput } from './color-input'
import { AlignGrid } from './align-grid'
import { Select } from './select'
import { Input } from './input'
import { IconButton } from './icon-button'
import { Slider } from './slider'
import { Toggle } from './toggle'
import { ICONS } from './icons'

/**
 * Component Factory
 *
 * Provides static methods to create components with less boilerplate.
 *
 * @example
 * ```ts
 * import { PP } from './components'
 *
 * const section = PP.section('Layout', 'layout')
 *   .append(
 *     PP.row('Direction')
 *       .append(PP.toggleIcons([
 *         { value: 'hor', icon: 'horizontal' },
 *         { value: 'ver', icon: 'vertical' },
 *       ], 'hor', onChange))
 *   )
 * ```
 */
export const PP = {
  /**
   * Create a collapsible section
   */
  section(label: string, icon?: string, collapsed?: boolean): Section {
    return new Section({ label, icon, collapsed })
  },

  /**
   * Create a property row
   */
  row(label: string, tooltip?: string): PropRow {
    return new PropRow({ label, tooltip })
  },

  /**
   * Create a toggle group with icons
   */
  toggleIcons<T = string>(
    options: Array<{ value: T; icon: string; title?: string }>,
    value: T,
    onChange: (value: T) => void
  ): ToggleGroup<T> {
    return new ToggleGroup({
      options: options.map(o => ({
        ...o,
        icon: ICONS[o.icon as keyof typeof ICONS] || o.icon,
      })),
      value,
      onChange,
    })
  },

  /**
   * Create a toggle group with text labels
   */
  toggleText<T = string>(
    options: Array<{ value: T; label: string }>,
    value: T,
    onChange: (value: T) => void
  ): ToggleGroup<T> {
    return new ToggleGroup({ options, value, onChange })
  },

  /**
   * Create a color input
   */
  color(
    value: string,
    onChange: (color: string) => void,
    onPickerOpen?: (anchor: HTMLElement) => void
  ): ColorInput {
    return new ColorInput({ value, onChange, onPickerOpen })
  },

  /**
   * Create an alignment grid
   */
  align(
    value: AlignPosition | null,
    onChange: (position: AlignPosition) => void,
    cornersOnly?: boolean
  ): AlignGrid {
    return new AlignGrid({ value, onChange, cornersOnly })
  },

  /**
   * Create a select dropdown
   */
  select<T = string>(
    options: Array<{ value: T; label: string }>,
    value: T | null,
    onChange: (value: T) => void,
    placeholder?: string
  ): Select<T> {
    return new Select({ options, value, onChange, placeholder })
  },

  /**
   * Create a text input
   */
  input(
    value: string,
    onChange: (value: string) => void,
    placeholder?: string
  ): Input {
    return new Input({ value, onChange, placeholder })
  },

  /**
   * Create a number input with unit
   */
  number(
    value: number | string,
    onChange: (value: string) => void,
    unit?: string
  ): Input {
    return new Input({ value: String(value), onChange, unit })
  },

  /**
   * Create an icon button
   */
  iconBtn(
    icon: string,
    title: string,
    onClick: () => void,
    active?: boolean
  ): IconButton {
    const iconSvg = ICONS[icon as keyof typeof ICONS] || icon
    return new IconButton({ icon: iconSvg, title, onClick, active })
  },

  /**
   * Create a slider
   */
  slider(
    value: number,
    min: number,
    max: number,
    onChange: (value: number) => void,
    step?: number
  ): Slider {
    return new Slider({ value, min, max, onChange, step })
  },

  /**
   * Create a toggle switch
   */
  toggle(value: boolean, onChange: (value: boolean) => void): Toggle {
    return new Toggle({ value, onChange })
  },
}

// Default export
export default PP
