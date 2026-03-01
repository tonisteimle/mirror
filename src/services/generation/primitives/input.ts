/**
 * Input Primitive
 *
 * Composition-based input system.
 *
 * Architecture:
 * - InputWrapper: Container with bg, radius, focus/disabled/invalid states
 * - Variants: Inherit from InputWrapper, add specific content
 * - Content: Slots for Input/Textarea/Value elements
 *
 * Usage by Experts:
 *   TextInput Input "placeholder"
 *   TextInput Input "email@example.com", type email
 *   PasswordInput Input "••••••••"
 *   TextareaInput Textarea "Enter description..."
 *   SelectInput Value "Choose..."; Icon "chevron-down"
 */

import {
  resolveBackground,
  resolveForeground,
} from '../design-defaults';
import { getDensity, getInputDensity, type Density } from '../dimensions';

// =============================================================================
// TYPES
// =============================================================================

export type InputType = 'text' | 'email' | 'password' | 'textarea' | 'select' | 'number' | 'checkbox' | 'radio' | 'switch';
export type { Density };

export interface InputConfig {
  /** Which input types to generate */
  types: InputType[];
  /** Include number stepper variant */
  withStepper?: boolean;
  /** Density level */
  density: Density;
  /** Generate password toggle (eye icon) */
  withPasswordToggle?: boolean;
}

export interface InputResult {
  /** Required tokens */
  tokens: Map<string, string>;
  /** Component definitions */
  definitions: string[];
}

// =============================================================================
// TOKEN BUILDER
// =============================================================================

function buildInputTokens(types: InputType[]): Map<string, string> {
  const tokens = new Map<string, string>();

  // Input backgrounds (surface-based, no borders)
  tokens.set('$input', resolveBackground('elevated'));
  tokens.set('$input-focus', resolveBackground('hover'));

  // Text colors
  tokens.set('$text', resolveForeground('default'));
  tokens.set('$muted', resolveForeground('muted'));

  // Error color for invalid state
  tokens.set('$error', resolveForeground('danger'));

  return tokens;
}

// =============================================================================
// BASE INPUT WRAPPER
// =============================================================================

/**
 * Builds the base InputWrapper component.
 *
 * This is the container that provides:
 * - Background color
 * - Border radius
 * - Focus state (background change)
 * - Disabled state (opacity)
 * - Invalid state (error border)
 *
 * Content (Input, Textarea, etc.) is added by variants.
 */
function buildInputWrapper(density: Density): string[] {
  const d = getInputDensity(density);
  const general = getDensity(density);

  const lines: string[] = [];

  // InputWrapper: container with states
  // - width full: inputs typically fill their container
  // - bg, rad: visual styling
  // - States: focus, disabled, invalid
  lines.push('InputWrapper:');
  lines.push(`  width full, bg $input, rad ${general.radius}`);

  // Focus state
  lines.push('  focus');
  lines.push('    bg $input-focus');

  // Disabled state
  lines.push('  state disabled');
  lines.push('    opacity 0.5');

  // Invalid state (error border)
  lines.push('  state invalid');
  lines.push('    bor 1, boc $error');

  return lines;
}

// =============================================================================
// VARIANT BUILDERS
// =============================================================================

/**
 * TextInput: InputWrapper with an Input slot
 */
function buildTextInput(density: Density): string[] {
  const d = getInputDensity(density);
  const lines: string[] = [];

  lines.push('');
  lines.push('TextInput from InputWrapper:');
  lines.push(`  Input "", pad ${d.paddingVertical} ${d.paddingHorizontal}, bg transparent, col $text, width full`);

  return lines;
}

/**
 * TextareaInput: InputWrapper with a Textarea slot
 */
function buildTextareaInput(density: Density): string[] {
  const d = getInputDensity(density);
  const lines: string[] = [];

  lines.push('');
  lines.push('TextareaInput from InputWrapper:');
  lines.push(`  Textarea "", pad ${d.paddingVertical} ${d.paddingHorizontal}, bg transparent, col $text, width full, minh ${d.minHeight}`);

  return lines;
}

/**
 * PasswordInput: InputWrapper with Input + optional Toggle
 */
function buildPasswordInput(density: Density, withToggle: boolean): string[] {
  const d = getInputDensity(density);
  const general = getDensity(density);
  const lines: string[] = [];

  if (withToggle) {
    // Password with show/hide toggle
    // Uses on/off states with named Icon for proper state coupling
    lines.push('');
    lines.push('PasswordInput from InputWrapper:');
    lines.push('  hor, ver-center');
    lines.push(`  Input "", pad ${d.paddingVertical} ${d.paddingHorizontal}, bg transparent, col $text, width full, type password`);
    lines.push(`  Toggle hug, h full, ver-center, pad 0 ${d.paddingHorizontal}, cursor pointer`);
    lines.push(`    Icon named EyeIcon, "eye", col $muted, is ${general.iconSize}`);
    lines.push('    state on');
    lines.push('      EyeIcon "eye-off"');
    lines.push('    onclick toggle-state self');
    lines.push('  state Toggle.on');
    lines.push('    Input type text');
  } else {
    // Simple password input (inherits from TextInput)
    lines.push('');
    lines.push('PasswordInput from TextInput:');
    lines.push('  Input type password');
  }

  return lines;
}

/**
 * SelectInput: InputWrapper with Value + Chevron
 */
function buildSelectInput(density: Density): string[] {
  const d = getInputDensity(density);
  const general = getDensity(density);
  const lines: string[] = [];

  lines.push('');
  lines.push('SelectInput from InputWrapper:');
  lines.push(`  hor, ver-center, pad ${d.paddingVertical} ${d.paddingHorizontal}, cursor pointer`);
  lines.push('  Value "", col $text, width full');
  lines.push(`  Icon "chevron-down", col $muted, is ${general.iconSize - 2}`);

  return lines;
}

/**
 * NumberInput: Simple number input (uses TextInput pattern)
 */
function buildNumberInput(density: Density): string[] {
  const d = getInputDensity(density);
  const lines: string[] = [];

  lines.push('');
  lines.push('NumberInput from InputWrapper:');
  lines.push(`  Input type number, "", pad ${d.paddingVertical} ${d.paddingHorizontal}, bg transparent, col $text, width full`);

  return lines;
}

/**
 * NumberStepperInput: Number input with +/- buttons
 */
function buildNumberStepperInput(density: Density): string[] {
  const d = getInputDensity(density);
  const general = getDensity(density);
  const lines: string[] = [];

  lines.push('');
  lines.push('NumberStepperInput from InputWrapper:');
  lines.push('  hor, ver-center');
  lines.push(`  StepperButton named Minus, hor, center, hug, h full, pad 0 ${d.paddingHorizontal}, cursor pointer`);
  lines.push(`    Icon "minus", col $muted, is ${general.iconSize - 2}`);
  lines.push('    hover');
  lines.push('      Icon col $text');
  lines.push(`  Input type number, "", pad ${d.paddingVertical} 0, bg transparent, col $text, width full, center`);
  lines.push(`  StepperButton named Plus, hor, center, hug, h full, pad 0 ${d.paddingHorizontal}, cursor pointer`);
  lines.push(`    Icon "plus", col $muted, is ${general.iconSize - 2}`);
  lines.push('    hover');
  lines.push('      Icon col $text');

  return lines;
}

// =============================================================================
// CHECKBOX / RADIO / SWITCH
// =============================================================================

/**
 * CheckboxInput: Custom styled checkbox
 */
function buildCheckboxInput(density: Density): string[] {
  const general = getDensity(density);
  const size = general.iconSize;
  const lines: string[] = [];

  lines.push('');
  lines.push('CheckboxInput:');
  lines.push(`  hor, center, size ${size}, rad 4, bor 1 $border, cursor pointer`);
  lines.push(`  Icon "check", col white, is ${size - 4}, hidden`);
  lines.push('  hover');
  lines.push('    bor 1 $primary');
  lines.push('  state checked');
  lines.push('    bg $primary, bor 1 $primary');
  lines.push('    Icon visible');
  lines.push('  state disabled');
  lines.push('    opacity $disabled-opacity, cursor not-allowed');

  return lines;
}

/**
 * RadioInput: Custom styled radio button
 */
function buildRadioInput(density: Density): string[] {
  const general = getDensity(density);
  const size = general.iconSize;
  const dotSize = Math.floor(size / 2);
  const lines: string[] = [];

  lines.push('');
  lines.push('RadioInput:');
  lines.push(`  hor, center, size ${size}, rad 999, bor 1 $border, cursor pointer`);
  lines.push(`  Dot size ${dotSize}, rad 999, bg $primary, hidden`);
  lines.push('  hover');
  lines.push('    bor 1 $primary');
  lines.push('  state checked');
  lines.push('    bor 1 $primary');
  lines.push('    Dot visible');
  lines.push('  state disabled');
  lines.push('    opacity $disabled-opacity, cursor not-allowed');

  return lines;
}

/**
 * SwitchInput: Toggle switch
 */
function buildSwitchInput(density: Density): string[] {
  const general = getDensity(density);
  const height = general.iconSize + 4;
  const width = height * 2 - 4;
  const thumbSize = height - 4;
  const lines: string[] = [];

  lines.push('');
  lines.push('SwitchInput:');
  lines.push(`  hor, ver-center, width ${width}, h ${height}, rad 999, bg $border, cursor pointer, pad 2`);
  lines.push(`  Thumb size ${thumbSize}, rad 999, bg white`);
  lines.push('  hover');
  lines.push('    bg $muted');
  lines.push('  state on');
  lines.push('    bg $primary');
  lines.push(`    Thumb translate ${thumbSize} 0`);
  lines.push('  state disabled');
  lines.push('    opacity $disabled-opacity, cursor not-allowed');

  return lines;
}

// =============================================================================
// MAIN BUILDER
// =============================================================================

/**
 * Build input primitives.
 *
 * @example
 * // Minimal
 * buildInputs({ types: ['text'], density: 'default' })
 *
 * // Full
 * buildInputs({
 *   types: ['text', 'password', 'textarea', 'select'],
 *   density: 'default',
 *   withPasswordToggle: true,
 * })
 */
export function buildInputs(config: InputConfig): InputResult {
  const tokens = buildInputTokens(config.types);
  const definitions: string[] = [];

  // 1. Base InputWrapper (always)
  definitions.push(...buildInputWrapper(config.density));

  // 2. Track which variants we've added
  const addedVariants = new Set<string>();

  // 3. Variants based on requested types
  for (const type of config.types) {
    switch (type) {
      case 'text':
      case 'email':
        // Text and email share TextInput (type is set on instance)
        if (!addedVariants.has('text')) {
          definitions.push(...buildTextInput(config.density));
          addedVariants.add('text');
        }
        break;

      case 'password':
        // TextInput is a dependency for simple PasswordInput
        if (!addedVariants.has('text') && !config.withPasswordToggle) {
          definitions.push(...buildTextInput(config.density));
          addedVariants.add('text');
        }
        definitions.push(...buildPasswordInput(config.density, config.withPasswordToggle ?? false));
        addedVariants.add('password');
        break;

      case 'textarea':
        definitions.push(...buildTextareaInput(config.density));
        addedVariants.add('textarea');
        break;

      case 'select':
        definitions.push(...buildSelectInput(config.density));
        addedVariants.add('select');
        break;

      case 'number':
        definitions.push(...buildNumberInput(config.density));
        if (config.withStepper) {
          definitions.push(...buildNumberStepperInput(config.density));
        }
        addedVariants.add('number');
        break;

      case 'checkbox':
        definitions.push(...buildCheckboxInput(config.density));
        addedVariants.add('checkbox');
        break;

      case 'radio':
        definitions.push(...buildRadioInput(config.density));
        addedVariants.add('radio');
        break;

      case 'switch':
        definitions.push(...buildSwitchInput(config.density));
        addedVariants.add('switch');
        break;
    }
  }

  return { tokens, definitions };
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Get input definitions as string.
 */
export function getInputDefinitions(config: InputConfig): string {
  const result = buildInputs(config);
  return result.definitions.join('\n');
}

/**
 * Get input tokens as string lines.
 */
export function getInputTokens(config: InputConfig): string {
  const result = buildInputs(config);
  const lines: string[] = [];

  for (const [name, value] of result.tokens) {
    lines.push(`${name}: ${value}`);
  }

  return lines.join('\n');
}

/**
 * Get complete input code (tokens + definitions).
 */
export function getInputCode(config: InputConfig): string {
  const result = buildInputs(config);

  const tokenLines: string[] = [];
  for (const [name, value] of result.tokens) {
    tokenLines.push(`${name}: ${value}`);
  }

  return [...tokenLines, '', ...result.definitions].join('\n');
}
