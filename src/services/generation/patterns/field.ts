/**
 * Field Pattern
 *
 * Combines: Label + Input + Helper + Error
 * Used by: Form Expert
 *
 * Generates field components that wrap inputs with labels and validation.
 */

import { buildInputs, type InputType } from '../primitives/input';
import { buildLabels, type RequiredStyle } from '../primitives/label';
import { getDensity, getInputDensity, getLabelDensity, type Density } from '../dimensions';

// =============================================================================
// TYPES
// =============================================================================

export type { Density };
export type { InputType };

export type LabelPosition = 'top' | 'left' | 'hidden';

export interface FieldConfig {
  inputTypes: InputType[];
  requiredStyle: RequiredStyle;
  density: Density;
  labelPosition?: LabelPosition;
  withHelper?: boolean;
  withPasswordToggle?: boolean;
  withStepper?: boolean;
}

export interface FieldResult {
  tokens: Map<string, string>;
  definitions: string[];
}

// =============================================================================
// DENSITY SETTINGS
// =============================================================================

const FIELD_DENSITY = {
  compact: {
    gap: 3,
    errorFontSize: 11,
    helperFontSize: 11,
    labelWidth: 100,
    horizontalGap: 12,
  },
  default: {
    gap: 4,
    errorFontSize: 12,
    helperFontSize: 12,
    labelWidth: 120,
    horizontalGap: 16,
  },
  spacious: {
    gap: 6,
    errorFontSize: 13,
    helperFontSize: 13,
    labelWidth: 140,
    horizontalGap: 20,
  },
};

// =============================================================================
// TOKEN MERGER
// =============================================================================

function mergeTokens(...maps: Map<string, string>[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const map of maps) {
    for (const [key, value] of map) {
      result.set(key, value);
    }
  }
  return result;
}

// =============================================================================
// FIELD BUILDERS
// =============================================================================

/**
 * Build standard text field (Label + TextInput + Error)
 */
function buildTextField(config: FieldConfig, isRequired: boolean): string[] {
  const fd = FIELD_DENSITY[config.density];
  const id = getInputDensity(config.density);
  const lines: string[] = [];

  const fieldName = isRequired ? 'FieldRequired' : 'Field';
  const labelName = isRequired ? 'LabelRequired' : 'Label';

  lines.push(`${fieldName}:`);
  lines.push(`  ver, gap ${fd.gap}`);
  lines.push(`  ${labelName}`);
  lines.push(`  TextInput`);

  if (config.withHelper) {
    lines.push(`  Helper "", fs ${fd.helperFontSize}, col $muted`);
  }

  lines.push(`  Error "", fs ${fd.errorFontSize}, col $error, hidden`);
  lines.push('  state invalid');
  lines.push('    TextInput invalid');
  if (config.withHelper) {
    lines.push('    Helper hidden');
  }
  lines.push('    Error visible');

  return lines;
}

/**
 * Build password field (Label + PasswordInput + Error)
 */
function buildPasswordField(config: FieldConfig, isRequired: boolean): string[] {
  const fd = FIELD_DENSITY[config.density];
  const lines: string[] = [];

  const fieldName = isRequired ? 'PasswordFieldRequired' : 'PasswordField';
  const labelName = isRequired ? 'LabelRequired' : 'Label';

  lines.push(`${fieldName}:`);
  lines.push(`  ver, gap ${fd.gap}`);
  lines.push(`  ${labelName}`);
  lines.push(`  PasswordInput`);

  if (config.withHelper) {
    lines.push(`  Helper "", fs ${fd.helperFontSize}, col $muted`);
  }

  lines.push(`  Error "", fs ${fd.errorFontSize}, col $error, hidden`);
  lines.push('  state invalid');
  lines.push('    PasswordInput invalid');
  if (config.withHelper) {
    lines.push('    Helper hidden');
  }
  lines.push('    Error visible');

  return lines;
}

/**
 * Build textarea field (Label + TextareaInput + Error)
 */
function buildTextareaField(config: FieldConfig, isRequired: boolean): string[] {
  const fd = FIELD_DENSITY[config.density];
  const lines: string[] = [];

  const fieldName = isRequired ? 'TextareaFieldRequired' : 'TextareaField';
  const labelName = isRequired ? 'LabelRequired' : 'Label';

  lines.push(`${fieldName}:`);
  lines.push(`  ver, gap ${fd.gap}`);
  lines.push(`  ${labelName}`);
  lines.push(`  TextareaInput`);

  if (config.withHelper) {
    lines.push(`  Helper "", fs ${fd.helperFontSize}, col $muted`);
  }

  lines.push(`  Error "", fs ${fd.errorFontSize}, col $error, hidden`);
  lines.push('  state invalid');
  lines.push('    TextareaInput invalid');
  if (config.withHelper) {
    lines.push('    Helper hidden');
  }
  lines.push('    Error visible');

  return lines;
}

// =============================================================================
// HORIZONTAL LABEL FIELD BUILDERS (Label left, Input right)
// =============================================================================

/**
 * Build horizontal text field (Label left, TextInput right)
 */
function buildTextFieldHorizontal(config: FieldConfig, isRequired: boolean): string[] {
  const fd = FIELD_DENSITY[config.density];
  const ld = getLabelDensity(config.density);
  const lines: string[] = [];

  const fieldName = isRequired ? 'FieldHorizontalRequired' : 'FieldHorizontal';
  const labelName = isRequired ? 'LabelRequired' : 'Label';

  lines.push(`${fieldName}:`);
  lines.push(`  hor, ver-center, gap ${fd.horizontalGap}`);
  lines.push(`  ${labelName} width ${fd.labelWidth}, right`);
  lines.push(`  FieldContent ver, gap ${fd.gap}, width full`);
  lines.push(`    TextInput`);

  if (config.withHelper) {
    lines.push(`    Helper "", fs ${fd.helperFontSize}, col $muted`);
  }

  lines.push(`    Error "", fs ${fd.errorFontSize}, col $error, hidden`);
  lines.push('  state invalid');
  lines.push('    TextInput invalid');
  if (config.withHelper) {
    lines.push('    Helper hidden');
  }
  lines.push('    Error visible');

  return lines;
}

/**
 * Build horizontal password field (Label left, PasswordInput right)
 */
function buildPasswordFieldHorizontal(config: FieldConfig, isRequired: boolean): string[] {
  const fd = FIELD_DENSITY[config.density];
  const lines: string[] = [];

  const fieldName = isRequired ? 'PasswordFieldHorizontalRequired' : 'PasswordFieldHorizontal';
  const labelName = isRequired ? 'LabelRequired' : 'Label';

  lines.push(`${fieldName}:`);
  lines.push(`  hor, ver-center, gap ${fd.horizontalGap}`);
  lines.push(`  ${labelName} width ${fd.labelWidth}, right`);
  lines.push(`  FieldContent ver, gap ${fd.gap}, width full`);
  lines.push(`    PasswordInput`);

  if (config.withHelper) {
    lines.push(`    Helper "", fs ${fd.helperFontSize}, col $muted`);
  }

  lines.push(`    Error "", fs ${fd.errorFontSize}, col $error, hidden`);
  lines.push('  state invalid');
  lines.push('    PasswordInput invalid');
  if (config.withHelper) {
    lines.push('    Helper hidden');
  }
  lines.push('    Error visible');

  return lines;
}

/**
 * Build horizontal textarea field (Label left, TextareaInput right)
 */
function buildTextareaFieldHorizontal(config: FieldConfig, isRequired: boolean): string[] {
  const fd = FIELD_DENSITY[config.density];
  const lines: string[] = [];

  const fieldName = isRequired ? 'TextareaFieldHorizontalRequired' : 'TextareaFieldHorizontal';
  const labelName = isRequired ? 'LabelRequired' : 'Label';

  lines.push(`${fieldName}:`);
  lines.push(`  hor, top, gap ${fd.horizontalGap}`);
  lines.push(`  ${labelName} width ${fd.labelWidth}, right`);
  lines.push(`  FieldContent ver, gap ${fd.gap}, width full`);
  lines.push(`    TextareaInput`);

  if (config.withHelper) {
    lines.push(`    Helper "", fs ${fd.helperFontSize}, col $muted`);
  }

  lines.push(`    Error "", fs ${fd.errorFontSize}, col $error, hidden`);
  lines.push('  state invalid');
  lines.push('    TextareaInput invalid');
  if (config.withHelper) {
    lines.push('    Helper hidden');
  }
  lines.push('    Error visible');

  return lines;
}

// =============================================================================
// HIDDEN LABEL FIELD BUILDERS (Input only, no label)
// =============================================================================

/**
 * Build hidden label text field (TextInput only)
 */
function buildTextFieldHidden(config: FieldConfig): string[] {
  const fd = FIELD_DENSITY[config.density];
  const lines: string[] = [];

  lines.push('FieldHidden:');
  lines.push(`  ver, gap ${fd.gap}`);
  lines.push('  TextInput');
  lines.push(`  Error "", fs ${fd.errorFontSize}, col $error, hidden`);
  lines.push('  state invalid');
  lines.push('    TextInput invalid');
  lines.push('    Error visible');

  return lines;
}

/**
 * Build hidden label password field (PasswordInput only)
 */
function buildPasswordFieldHidden(config: FieldConfig): string[] {
  const fd = FIELD_DENSITY[config.density];
  const lines: string[] = [];

  lines.push('PasswordFieldHidden:');
  lines.push(`  ver, gap ${fd.gap}`);
  lines.push('  PasswordInput');
  lines.push(`  Error "", fs ${fd.errorFontSize}, col $error, hidden`);
  lines.push('  state invalid');
  lines.push('    PasswordInput invalid');
  lines.push('    Error visible');

  return lines;
}

/**
 * Build hidden label textarea field (TextareaInput only)
 */
function buildTextareaFieldHidden(config: FieldConfig): string[] {
  const fd = FIELD_DENSITY[config.density];
  const lines: string[] = [];

  lines.push('TextareaFieldHidden:');
  lines.push(`  ver, gap ${fd.gap}`);
  lines.push('  TextareaInput');
  lines.push(`  Error "", fs ${fd.errorFontSize}, col $error, hidden`);
  lines.push('  state invalid');
  lines.push('    TextareaInput invalid');
  lines.push('    Error visible');

  return lines;
}

// =============================================================================
// SELECT FIELD BUILDERS
// =============================================================================

/**
 * Build standard select field (Label + SelectInput + Error)
 */
function buildSelectField(config: FieldConfig, isRequired: boolean): string[] {
  const fd = FIELD_DENSITY[config.density];
  const lines: string[] = [];

  const fieldName = isRequired ? 'SelectFieldRequired' : 'SelectField';
  const labelName = isRequired ? 'LabelRequired' : 'Label';

  lines.push(`${fieldName}:`);
  lines.push(`  ver, gap ${fd.gap}`);
  lines.push(`  ${labelName}`);
  lines.push('  SelectInput');

  if (config.withHelper) {
    lines.push(`  Helper "", fs ${fd.helperFontSize}, col $muted`);
  }

  lines.push(`  Error "", fs ${fd.errorFontSize}, col $error, hidden`);
  lines.push('  state invalid');
  lines.push('    SelectInput invalid');
  if (config.withHelper) {
    lines.push('    Helper hidden');
  }
  lines.push('    Error visible');

  return lines;
}

/**
 * Build horizontal select field (Label left, SelectInput right)
 */
function buildSelectFieldHorizontal(config: FieldConfig, isRequired: boolean): string[] {
  const fd = FIELD_DENSITY[config.density];
  const lines: string[] = [];

  const fieldName = isRequired ? 'SelectFieldHorizontalRequired' : 'SelectFieldHorizontal';
  const labelName = isRequired ? 'LabelRequired' : 'Label';

  lines.push(`${fieldName}:`);
  lines.push(`  hor, ver-center, gap ${fd.horizontalGap}`);
  lines.push(`  ${labelName} width ${fd.labelWidth}, right`);
  lines.push(`  FieldContent ver, gap ${fd.gap}, width full`);
  lines.push('    SelectInput');

  if (config.withHelper) {
    lines.push(`    Helper "", fs ${fd.helperFontSize}, col $muted`);
  }

  lines.push(`    Error "", fs ${fd.errorFontSize}, col $error, hidden`);
  lines.push('  state invalid');
  lines.push('    SelectInput invalid');
  if (config.withHelper) {
    lines.push('    Helper hidden');
  }
  lines.push('    Error visible');

  return lines;
}

/**
 * Build hidden label select field (SelectInput only)
 */
function buildSelectFieldHidden(config: FieldConfig): string[] {
  const fd = FIELD_DENSITY[config.density];
  const lines: string[] = [];

  lines.push('SelectFieldHidden:');
  lines.push(`  ver, gap ${fd.gap}`);
  lines.push('  SelectInput');
  lines.push(`  Error "", fs ${fd.errorFontSize}, col $error, hidden`);
  lines.push('  state invalid');
  lines.push('    SelectInput invalid');
  lines.push('    Error visible');

  return lines;
}

// =============================================================================
// NUMBER FIELD BUILDERS
// =============================================================================

/**
 * Build standard number field (Label + NumberInput + Error)
 */
function buildNumberField(config: FieldConfig, isRequired: boolean): string[] {
  const fd = FIELD_DENSITY[config.density];
  const lines: string[] = [];

  const fieldName = isRequired ? 'NumberFieldRequired' : 'NumberField';
  const labelName = isRequired ? 'LabelRequired' : 'Label';

  lines.push(`${fieldName}:`);
  lines.push(`  ver, gap ${fd.gap}`);
  lines.push(`  ${labelName}`);
  lines.push('  NumberInput');

  if (config.withHelper) {
    lines.push(`  Helper "", fs ${fd.helperFontSize}, col $muted`);
  }

  lines.push(`  Error "", fs ${fd.errorFontSize}, col $error, hidden`);
  lines.push('  state invalid');
  lines.push('    NumberInput invalid');
  if (config.withHelper) {
    lines.push('    Helper hidden');
  }
  lines.push('    Error visible');

  return lines;
}

/**
 * Build horizontal number field (Label left, NumberInput right)
 */
function buildNumberFieldHorizontal(config: FieldConfig, isRequired: boolean): string[] {
  const fd = FIELD_DENSITY[config.density];
  const lines: string[] = [];

  const fieldName = isRequired ? 'NumberFieldHorizontalRequired' : 'NumberFieldHorizontal';
  const labelName = isRequired ? 'LabelRequired' : 'Label';

  lines.push(`${fieldName}:`);
  lines.push(`  hor, ver-center, gap ${fd.horizontalGap}`);
  lines.push(`  ${labelName} width ${fd.labelWidth}, right`);
  lines.push(`  FieldContent ver, gap ${fd.gap}, width full`);
  lines.push('    NumberInput');

  if (config.withHelper) {
    lines.push(`    Helper "", fs ${fd.helperFontSize}, col $muted`);
  }

  lines.push(`    Error "", fs ${fd.errorFontSize}, col $error, hidden`);
  lines.push('  state invalid');
  lines.push('    NumberInput invalid');
  if (config.withHelper) {
    lines.push('    Helper hidden');
  }
  lines.push('    Error visible');

  return lines;
}

/**
 * Build hidden label number field (NumberInput only)
 */
function buildNumberFieldHidden(config: FieldConfig): string[] {
  const fd = FIELD_DENSITY[config.density];
  const lines: string[] = [];

  lines.push('NumberFieldHidden:');
  lines.push(`  ver, gap ${fd.gap}`);
  lines.push('  NumberInput');
  lines.push(`  Error "", fs ${fd.errorFontSize}, col $error, hidden`);
  lines.push('  state invalid');
  lines.push('    NumberInput invalid');
  lines.push('    Error visible');

  return lines;
}

// =============================================================================
// CHECKBOX FIELD BUILDERS
// =============================================================================

/**
 * Build checkbox field (CheckboxInput + Label, side by side)
 * Note: Checkbox/Radio/Switch have control BEFORE label
 */
function buildCheckboxField(config: FieldConfig, isRequired: boolean): string[] {
  const fd = FIELD_DENSITY[config.density];
  const lines: string[] = [];

  const fieldName = isRequired ? 'CheckboxFieldRequired' : 'CheckboxField';

  lines.push(`${fieldName}:`);
  lines.push(`  hor, ver-center, gap 8, cursor pointer`);
  lines.push('  CheckboxInput');
  lines.push(`  Text "", fs 13, col $text`);
  if (isRequired) {
    lines.push('    Asterisk " *", col $error');
  }
  lines.push('  onclick toggle-state CheckboxInput');

  return lines;
}

// =============================================================================
// RADIO FIELD BUILDERS
// =============================================================================

/**
 * Build radio field (RadioInput + Label, side by side)
 */
function buildRadioField(config: FieldConfig, isRequired: boolean): string[] {
  const fd = FIELD_DENSITY[config.density];
  const lines: string[] = [];

  const fieldName = isRequired ? 'RadioFieldRequired' : 'RadioField';

  lines.push(`${fieldName}:`);
  lines.push(`  hor, ver-center, gap 8, cursor pointer`);
  lines.push('  RadioInput');
  lines.push(`  Text "", fs 13, col $text`);
  if (isRequired) {
    lines.push('    Asterisk " *", col $error');
  }
  lines.push('  onclick select self');

  return lines;
}

/**
 * Build radio group (container for multiple radio fields)
 */
function buildRadioGroup(config: FieldConfig, isRequired: boolean): string[] {
  const fd = FIELD_DENSITY[config.density];
  const lines: string[] = [];

  const groupName = isRequired ? 'RadioGroupRequired' : 'RadioGroup';
  const labelName = isRequired ? 'LabelRequired' : 'Label';

  lines.push(`${groupName}:`);
  lines.push(`  ver, gap ${fd.gap}`);
  lines.push(`  ${labelName}`);
  lines.push(`  RadioOptions ver, gap 8`);
  lines.push(`  Error "", fs ${fd.errorFontSize}, col $error, hidden`);
  lines.push('  state invalid');
  lines.push('    Error visible');

  return lines;
}

// =============================================================================
// SWITCH FIELD BUILDERS
// =============================================================================

/**
 * Build switch field (SwitchInput + Label, side by side)
 */
function buildSwitchField(config: FieldConfig): string[] {
  const lines: string[] = [];

  lines.push('SwitchField:');
  lines.push('  hor, ver-center, gap 12, cursor pointer');
  lines.push('  SwitchInput');
  lines.push('  Text "", fs 13, col $text');
  lines.push('  onclick toggle-state SwitchInput');

  return lines;
}

/**
 * Build switch field with label on left (Label + SwitchInput)
 */
function buildSwitchFieldReverse(config: FieldConfig): string[] {
  const lines: string[] = [];

  lines.push('SwitchFieldReverse:');
  lines.push('  hor, ver-center, spread, cursor pointer');
  lines.push('  Text "", fs 13, col $text, width full');
  lines.push('  SwitchInput');
  lines.push('  onclick toggle-state SwitchInput');

  return lines;
}

// =============================================================================
// MAIN BUILDER
// =============================================================================

export function buildFields(config: FieldConfig): FieldResult {
  const labelPosition = config.labelPosition ?? 'top';

  // Get tokens from primitives
  const inputResult = buildInputs({
    types: config.inputTypes,
    density: config.density,
    withPasswordToggle: config.withPasswordToggle,
    withStepper: config.withStepper,
  });

  // Only need labels if not hidden
  const labelResult = labelPosition !== 'hidden'
    ? buildLabels({
        requiredStyle: config.requiredStyle,
        density: config.density,
      })
    : { tokens: new Map<string, string>(), definitions: [] };

  // Merge tokens
  const tokens = mergeTokens(inputResult.tokens, labelResult.tokens);

  // Build definitions: first primitives, then fields
  const definitions: string[] = [];

  // 1. Label definitions (if needed)
  if (labelPosition !== 'hidden') {
    definitions.push(...labelResult.definitions);
    definitions.push('');
  }

  // 2. Input definitions
  definitions.push(...inputResult.definitions);

  // 3. Field patterns based on labelPosition
  const hasText = config.inputTypes.includes('text') || config.inputTypes.includes('email');
  const hasPassword = config.inputTypes.includes('password');
  const hasTextarea = config.inputTypes.includes('textarea');
  const hasSelect = config.inputTypes.includes('select');
  const hasNumber = config.inputTypes.includes('number');
  const hasCheckbox = config.inputTypes.includes('checkbox');
  const hasRadio = config.inputTypes.includes('radio');
  const hasSwitch = config.inputTypes.includes('switch');

  if (labelPosition === 'hidden') {
    // Hidden label fields (no required variants needed)
    if (hasText) {
      definitions.push('');
      definitions.push(...buildTextFieldHidden(config));
    }

    if (hasPassword) {
      definitions.push('');
      definitions.push(...buildPasswordFieldHidden(config));
    }

    if (hasTextarea) {
      definitions.push('');
      definitions.push(...buildTextareaFieldHidden(config));
    }

    if (hasSelect) {
      definitions.push('');
      definitions.push(...buildSelectFieldHidden(config));
    }

    if (hasNumber) {
      definitions.push('');
      definitions.push(...buildNumberFieldHidden(config));
    }
  } else if (labelPosition === 'left') {
    // Horizontal label fields
    if (hasText) {
      definitions.push('');
      definitions.push(...buildTextFieldHorizontal(config, false));
    }

    if (hasPassword) {
      definitions.push('');
      definitions.push(...buildPasswordFieldHorizontal(config, false));
    }

    if (hasTextarea) {
      definitions.push('');
      definitions.push(...buildTextareaFieldHorizontal(config, false));
    }

    if (hasSelect) {
      definitions.push('');
      definitions.push(...buildSelectFieldHorizontal(config, false));
    }

    if (hasNumber) {
      definitions.push('');
      definitions.push(...buildNumberFieldHorizontal(config, false));
    }

    // Required variants
    if (config.requiredStyle !== 'none') {
      if (hasText) {
        definitions.push('');
        definitions.push(...buildTextFieldHorizontal(config, true));
      }

      if (hasPassword) {
        definitions.push('');
        definitions.push(...buildPasswordFieldHorizontal(config, true));
      }

      if (hasTextarea) {
        definitions.push('');
        definitions.push(...buildTextareaFieldHorizontal(config, true));
      }

      if (hasSelect) {
        definitions.push('');
        definitions.push(...buildSelectFieldHorizontal(config, true));
      }

      if (hasNumber) {
        definitions.push('');
        definitions.push(...buildNumberFieldHorizontal(config, true));
      }
    }
  } else {
    // Top label fields (default)
    if (hasText) {
      definitions.push('');
      definitions.push(...buildTextField(config, false));
    }

    if (hasPassword) {
      definitions.push('');
      definitions.push(...buildPasswordField(config, false));
    }

    if (hasTextarea) {
      definitions.push('');
      definitions.push(...buildTextareaField(config, false));
    }

    if (hasSelect) {
      definitions.push('');
      definitions.push(...buildSelectField(config, false));
    }

    if (hasNumber) {
      definitions.push('');
      definitions.push(...buildNumberField(config, false));
    }

    // Required variants
    if (config.requiredStyle !== 'none') {
      if (hasText) {
        definitions.push('');
        definitions.push(...buildTextField(config, true));
      }

      if (hasPassword) {
        definitions.push('');
        definitions.push(...buildPasswordField(config, true));
      }

      if (hasTextarea) {
        definitions.push('');
        definitions.push(...buildTextareaField(config, true));
      }

      if (hasSelect) {
        definitions.push('');
        definitions.push(...buildSelectField(config, true));
      }

      if (hasNumber) {
        definitions.push('');
        definitions.push(...buildNumberField(config, true));
      }
    }
  }

  // 4. Checkbox/Radio/Switch fields (always horizontal, independent of labelPosition)
  if (hasCheckbox) {
    definitions.push('');
    definitions.push(...buildCheckboxField(config, false));
    if (config.requiredStyle !== 'none') {
      definitions.push('');
      definitions.push(...buildCheckboxField(config, true));
    }
  }

  if (hasRadio) {
    definitions.push('');
    definitions.push(...buildRadioField(config, false));
    definitions.push('');
    definitions.push(...buildRadioGroup(config, false));
    if (config.requiredStyle !== 'none') {
      definitions.push('');
      definitions.push(...buildRadioField(config, true));
      definitions.push('');
      definitions.push(...buildRadioGroup(config, true));
    }
  }

  if (hasSwitch) {
    definitions.push('');
    definitions.push(...buildSwitchField(config));
    definitions.push('');
    definitions.push(...buildSwitchFieldReverse(config));
  }

  return { tokens, definitions };
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export function getFieldDefinitions(config: FieldConfig): string {
  const result = buildFields(config);
  return result.definitions.join('\n');
}

export function getFieldTokens(config: FieldConfig): string {
  const result = buildFields(config);
  const lines: string[] = [];

  for (const [name, value] of result.tokens) {
    lines.push(`${name}: ${value}`);
  }

  return lines.join('\n');
}

/**
 * Get field density settings
 */
export function getFieldDensity(density: Density) {
  return FIELD_DENSITY[density];
}
