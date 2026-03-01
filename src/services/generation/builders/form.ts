/**
 * Form Builder
 *
 * Transforms a validated FormInput into Mirror code.
 * Uses primitives and patterns for consistent generation.
 *
 * Architecture:
 * - primitives/button.ts → Button definitions
 * - patterns/field.ts → Field definitions (Label + Input + Error)
 * - This file → Form container + instances
 */

import type {
  FormInput,
  NormalizedForm,
  NormalizedFormField,
  NormalizedFormAction,
} from '../schemas/form';
import {
  parseForm,
  validateFormInput,
  DENSITY_SPACING
} from '../schemas/form';
import {
  resolveBackground,
  resolveSpacing,
  resolveRadius,
} from '../design-defaults';
import { buildButtons, type ButtonVariant } from '../primitives/button';
import { buildFields, type InputType, type LabelPosition } from '../patterns/field';

// =============================================================================
// TYPES
// =============================================================================

type Density = 'compact' | 'default' | 'spacious';

// =============================================================================
// MAIN BUILDER
// =============================================================================

/**
 * Build Mirror code from form input
 */
export function buildForm(input: FormInput): string {
  const config = parseForm(input);
  const lines: string[] = [];

  // 1. Collect what we need
  const inputTypes = collectInputTypes(config);
  const buttonVariants = collectButtonVariants(config);
  const hasRequired = config.fields.some(f => f.required);
  const hasHelper = config.fields.some(f => f.helper);
  const hasPasswordToggle = config.fields.some(f => f.type === 'password' && f.showToggle);

  // 2. Build fields (includes labels + inputs)
  // Map 'floating' to 'top' since floating is not implemented yet
  const labelPosition: LabelPosition = config.labelPosition === 'floating'
    ? 'top'
    : config.labelPosition as LabelPosition;

  const fieldResult = buildFields({
    inputTypes,
    requiredStyle: hasRequired ? config.requiredStyle : 'none',
    density: config.density as Density,
    labelPosition,
    withHelper: hasHelper,
    withPasswordToggle: hasPasswordToggle,
  });

  // 3. Build buttons
  const buttonResult = buildButtons({
    variants: buttonVariants,
    density: config.density as Density,
  });

  // 4. Merge tokens
  const allTokens = new Map<string, string>();

  // Add background token for form container
  allTokens.set('$bg', resolveBackground(config.container.background));

  // Add field tokens
  for (const [key, value] of fieldResult.tokens) {
    allTokens.set(key, value);
  }

  // Add button tokens
  for (const [key, value] of buttonResult.tokens) {
    allTokens.set(key, value);
  }

  // 5. Generate output

  // Tokens
  for (const [name, value] of allTokens) {
    lines.push(`${name}: ${value}`);
  }
  lines.push('');

  // Field definitions (from pattern)
  lines.push(...fieldResult.definitions);
  lines.push('');

  // Button definitions (from primitive)
  lines.push(...buttonResult.definitions);
  lines.push('');

  // Form container with instances
  lines.push(...buildFormContainer(config));

  return lines.join('\n');
}

// =============================================================================
// HELPERS
// =============================================================================

function collectInputTypes(config: NormalizedForm): InputType[] {
  const types = new Set<InputType>();

  for (const field of config.fields) {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'url':
        types.add('text');
        break;
      case 'password':
        types.add('password');
        break;
      case 'textarea':
        types.add('textarea');
        break;
      case 'select':
        types.add('select');
        break;
      case 'number':
        types.add('number');
        break;
      case 'checkbox':
        types.add('checkbox');
        break;
      case 'radio':
        types.add('radio');
        break;
      case 'switch':
        types.add('switch');
        break;
    }
  }

  return Array.from(types);
}

function collectButtonVariants(config: NormalizedForm): ButtonVariant[] {
  const variants = new Set<ButtonVariant>();

  for (const action of config.actions) {
    switch (action.variant) {
      case 'primary':
        variants.add('primary');
        break;
      case 'secondary':
        variants.add('secondary');
        break;
      case 'ghost':
        variants.add('ghost');
        break;
      case 'danger':
        variants.add('danger');
        break;
      default:
        // Default based on action type
        if (action.type === 'submit') {
          variants.add('primary');
        } else if (action.type === 'cancel') {
          variants.add('ghost');
        }
    }
  }

  // Default to primary if no actions
  if (variants.size === 0) {
    variants.add('primary');
  }

  return Array.from(variants);
}

// =============================================================================
// FORM CONTAINER BUILDER
// =============================================================================

function buildFormContainer(config: NormalizedForm): string[] {
  const lines: string[] = [];
  const density = DENSITY_SPACING[config.density];

  // Form container properties
  const formProps: string[] = [
    'ver',
    `gap ${density.fieldGap}`,
    `pad ${resolveSpacing(config.container.padding as 'xs' | 'sm' | 'md' | 'lg' | 'xl')}`,
    `bg $bg`,
    `rad ${resolveRadius(config.container.radius)}`
  ];

  if (config.container.shadow !== 'none') {
    formProps.push(`shadow ${config.container.shadow}`);
  }

  lines.push(`Form ${formProps.join(', ')}`);

  // Check if we need grid layout
  const useGrid = config.layout === 'grid' || config.columns > 1;

  if (useGrid) {
    // Grid container for fields
    lines.push(`  FieldGrid grid ${config.columns}, gap ${density.fieldGap}`);

    // Field instances inside grid
    for (const field of config.fields) {
      const fieldLines = buildFieldInstance(field, config);
      // Add extra indentation for grid children
      for (const line of fieldLines) {
        // Check if field spans multiple columns
        if (field.colSpan && field.colSpan > 1) {
          // First line gets grid-column property
          if (line === fieldLines[0]) {
            const trimmed = line.trim();
            lines.push(`    ${trimmed}, grid-column span ${field.colSpan}`);
          } else {
            lines.push(`  ${line}`);
          }
        } else {
          lines.push(`  ${line}`);
        }
      }
    }
  } else {
    // Simple vertical layout
    for (const field of config.fields) {
      lines.push(...buildFieldInstance(field, config));
    }
  }

  // Action buttons
  if (config.actions.length > 0 && config.submitPosition !== 'none') {
    lines.push(...buildActionInstances(config));
  }

  return lines;
}

/**
 * Build a field instance line
 */
function buildFieldInstance(field: NormalizedFormField, config: NormalizedForm): string[] {
  const lines: string[] = [];

  // Determine which component to use based on labelPosition
  let componentName: string;
  const isRequired = field.required && config.requiredStyle !== 'none';
  const labelPosition = config.labelPosition;

  // Handle checkbox/radio/switch separately (different structure)
  if (field.type === 'checkbox') {
    componentName = isRequired ? 'CheckboxFieldRequired' : 'CheckboxField';
    const label = field.label || '';
    const instanceLine = `  ${componentName} Text "${label}"`;
    lines.push(instanceLine);
    return lines;
  }

  if (field.type === 'switch') {
    componentName = 'SwitchField';
    const label = field.label || '';
    const instanceLine = `  ${componentName} Text "${label}"`;
    lines.push(instanceLine);
    return lines;
  }

  if (field.type === 'radio') {
    // Radio needs a group with options
    componentName = isRequired ? 'RadioGroupRequired' : 'RadioGroup';
    const label = field.label || '';
    lines.push(`  ${componentName} Label "${label}"`);
    lines.push('    RadioOptions');

    // Add radio options if provided
    if (field.options && field.options.length > 0) {
      for (const opt of field.options) {
        lines.push(`      RadioField Text "${opt.label}"`);
      }
    } else {
      // Default placeholder options
      lines.push('      RadioField Text "Option 1"');
      lines.push('      RadioField Text "Option 2"');
    }
    return lines;
  }

  // Build base component name for standard fields
  let baseName: string;
  if (field.type === 'password') {
    baseName = 'PasswordField';
  } else if (field.type === 'textarea') {
    baseName = 'TextareaField';
  } else if (field.type === 'select') {
    baseName = 'SelectField';
  } else if (field.type === 'number') {
    baseName = 'NumberField';
  } else {
    baseName = 'Field';
  }

  // Add suffix based on labelPosition
  if (labelPosition === 'hidden') {
    componentName = `${baseName}Hidden`;
    // Hidden fields don't have required variants
  } else if (labelPosition === 'left') {
    componentName = isRequired ? `${baseName}HorizontalRequired` : `${baseName}Horizontal`;
  } else {
    // 'top' or 'floating' (fallback to top)
    componentName = isRequired ? `${baseName}Required` : baseName;
  }

  // Build instance parts
  const parts: string[] = [];

  // Label - only for non-hidden label positions
  if (field.label && labelPosition !== 'hidden') {
    if (isRequired) {
      parts.push(`Text "${field.label}"`);
    } else {
      parts.push(`Label "${field.label}"`);
    }
  }

  // Handle different input types
  if (field.type === 'select') {
    // Select field uses Value slot
    const valueParts: string[] = [];
    if (field.placeholder) {
      valueParts.push(`"${field.placeholder}"`);
    } else {
      valueParts.push('"Select..."');
    }
    parts.push(`Value ${valueParts.join(', ')}`);
  } else if (field.type === 'number') {
    // Number field uses Input with type number
    const inputParts: string[] = [];

    // Placeholder
    if (field.placeholder) {
      inputParts.push(`"${field.placeholder}"`);
    } else {
      inputParts.push('""');
    }

    // Min/max/step attributes
    if (field.min !== undefined) {
      inputParts.push(`min ${field.min}`);
    }
    if (field.max !== undefined) {
      inputParts.push(`max ${field.max}`);
    }
    if (field.step !== undefined) {
      inputParts.push(`step ${field.step}`);
    }

    // Disabled state
    if (field.disabled) {
      inputParts.push('disabled');
    }

    parts.push(`Input ${inputParts.join(', ')}`);
  } else {
    // Regular input fields
    const inputName = field.type === 'textarea' ? 'Textarea' : 'Input';
    const inputParts: string[] = [];

    // Add type for email, tel, url
    if (field.type === 'email') {
      inputParts.push('type email');
    } else if (field.type === 'tel') {
      inputParts.push('type tel');
    } else if (field.type === 'url') {
      inputParts.push('type url');
    }

    // Placeholder
    if (field.placeholder) {
      inputParts.push(`"${field.placeholder}"`);
    } else {
      inputParts.push('""');
    }

    // Disabled state
    if (field.disabled) {
      inputParts.push('disabled');
    }

    parts.push(`${inputName} ${inputParts.join(', ')}`);
  }

  // Helper text (not for hidden label position)
  if (field.helper && labelPosition !== 'hidden') {
    parts.push(`Helper "${field.helper}"`);
  }

  // Build the instance line
  const instanceLine = `  ${componentName} ${parts.join('; ')}`;
  lines.push(instanceLine);

  return lines;
}

/**
 * Build action button instances
 */
function buildActionInstances(config: NormalizedForm): string[] {
  const lines: string[] = [];

  // Wrap in horizontal container if multiple actions
  if (config.actions.length > 1) {
    lines.push('  Actions hor, gap 12, width full');
    for (const action of config.actions) {
      lines.push(`    ${getButtonComponent(action)} "${action.label}"`);
    }
  } else if (config.actions.length === 1) {
    const action = config.actions[0];
    lines.push(`  ${getButtonComponent(action)} "${action.label}"`);
  }

  return lines;
}

/**
 * Get the button component name for an action
 */
function getButtonComponent(action: NormalizedFormAction): string {
  switch (action.variant) {
    case 'primary':
      return 'PrimaryButton';
    case 'secondary':
      return 'SecondaryButton';
    case 'ghost':
      return 'GhostButton';
    case 'danger':
      return 'DangerButton';
    default:
      return action.type === 'submit' ? 'PrimaryButton' : 'GhostButton';
  }
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate input without building
 */
export function validateForm(input: unknown): {
  success: boolean;
  error?: string;
  data?: NormalizedForm;
} {
  const validationResult = validateFormInput(input);

  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error
    };
  }

  try {
    const data = parseForm(input);
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}
