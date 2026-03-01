import { z } from 'zod';

/**
 * Schema for Form Expert
 *
 * MVP Scope:
 * - Form-Level: layout (vertical), labelPosition (top), requiredStyle, density
 * - Field types: text, email, password, textarea
 * - Field options: label, placeholder, helper, error, required, disabled
 * - Actions: submit, cancel
 *
 * Phase 2+: See plan for grid, sections, select, checkbox, radio, etc.
 */

// =============================================================================
// ENUMS - Form-Level Dimensions
// =============================================================================

export const FormLayout = z.enum(['vertical', 'horizontal', 'inline', 'grid']);
export type FormLayoutType = z.infer<typeof FormLayout>;

export const LabelPosition = z.enum(['top', 'left', 'floating', 'hidden']);
export type LabelPositionType = z.infer<typeof LabelPosition>;

export const RequiredStyle = z.enum(['asterisk', 'text', 'dot', 'none']);
export type RequiredStyleType = z.infer<typeof RequiredStyle>;

export const ErrorDisplay = z.enum(['below', 'inline', 'tooltip', 'summary']);
export type ErrorDisplayType = z.infer<typeof ErrorDisplay>;

export const Density = z.enum(['compact', 'default', 'spacious']);
export type DensityType = z.infer<typeof Density>;

export const SubmitPosition = z.enum(['bottom', 'inline', 'sticky', 'none']);
export type SubmitPositionType = z.infer<typeof SubmitPosition>;

// =============================================================================
// ENUMS - Field-Level Dimensions
// =============================================================================

export const FieldSize = z.enum(['sm', 'md', 'lg']);
export type FieldSizeType = z.infer<typeof FieldSize>;

export const FieldVariant = z.enum(['outline', 'filled', 'underline']);
export type FieldVariantType = z.infer<typeof FieldVariant>;

export const IconPosition = z.enum(['left', 'right', 'none']);
export type IconPositionType = z.infer<typeof IconPosition>;

export const FieldWidth = z.enum(['full', 'auto', 'fixed']);
export type FieldWidthType = z.infer<typeof FieldWidth>;

// Field types - MVP focuses on text-based inputs
export const FieldType = z.enum([
  // MVP
  'text', 'email', 'password', 'textarea',
  // Phase 2
  'number', 'tel', 'url',
  'select', 'checkbox', 'radio', 'switch',
  // Phase 3
  'date', 'time', 'datetime',
  'multiselect', 'combobox',
  'file', 'hidden'
]);
export type FieldTypeType = z.infer<typeof FieldType>;

// Action button types
export const ActionType = z.enum(['submit', 'cancel', 'reset', 'custom']);
export type ActionTypeType = z.infer<typeof ActionType>;

export const ActionVariant = z.enum(['primary', 'secondary', 'ghost', 'danger']);
export type ActionVariantType = z.infer<typeof ActionVariant>;

// =============================================================================
// FIELD SCHEMA
// =============================================================================

export const FormFieldSchema = z.object({
  // Identity
  type: FieldType,
  name: z.string(),

  // Labels & Text
  label: z.string().optional(),
  placeholder: z.string().optional(),
  helper: z.string().optional(),
  error: z.string().optional(),

  // Validation
  required: z.boolean().optional(),
  disabled: z.boolean().optional(),
  readonly: z.boolean().optional(),

  // Field-Level Styling (overrides form defaults)
  size: FieldSize.optional(),
  variant: FieldVariant.optional(),
  width: FieldWidth.optional(),
  colSpan: z.number().optional(),

  // Icons & Addons (Phase 2)
  icon: z.string().optional(),
  iconPosition: IconPosition.optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),

  // Password specific
  showToggle: z.boolean().optional(),

  // Textarea specific
  rows: z.number().optional(),
  resize: z.boolean().optional(),
  counter: z.boolean().optional(),
  maxLength: z.number().optional(),

  // Number specific (Phase 2)
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  stepper: z.boolean().optional(),

  // Select specific (Phase 2)
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
    disabled: z.boolean().optional()
  })).optional(),
  searchable: z.boolean().optional(),
  clearable: z.boolean().optional(),

  // Conditional (Phase 3)
  showIf: z.string().optional()
});

export type FormField = z.infer<typeof FormFieldSchema>;

// =============================================================================
// SECTION SCHEMA (Phase 2)
// =============================================================================

export const FormSectionSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  collapsible: z.boolean().optional(),
  collapsed: z.boolean().optional(),
  columns: z.number().optional(),
  fields: z.array(FormFieldSchema).min(1)
});

export type FormSection = z.infer<typeof FormSectionSchema>;

// =============================================================================
// ACTION SCHEMA
// =============================================================================

export const FormActionSchema = z.object({
  type: ActionType,
  label: z.string(),
  variant: ActionVariant.optional(),
  icon: z.string().optional(),
  disabled: z.boolean().optional(),
  loading: z.boolean().optional()
});

export type FormAction = z.infer<typeof FormActionSchema>;

// =============================================================================
// DEFAULTS
// =============================================================================

export const FORM_DEFAULTS = {
  layout: 'vertical' as const,
  labelPosition: 'top' as const,
  requiredStyle: 'asterisk' as const,
  errorDisplay: 'below' as const,
  density: 'default' as const,
  submitPosition: 'bottom' as const
};

export const FIELD_DEFAULTS = {
  type: 'text' as const,
  size: 'md' as const,
  variant: 'outline' as const,
  width: 'full' as const,
  required: false,
  disabled: false,
  readonly: false,
  showToggle: false,
  rows: 4,
  resize: true,
  counter: false
};

export const CONTAINER_DEFAULTS = {
  background: 'surface' as const,
  padding: 'lg' as const,
  radius: 'md' as const,
  gap: 'md' as const
};

export const INPUT_DEFAULTS = {
  background: 'elevated' as const,
  border: 'default' as const,
  focusBorder: 'primary' as const,
  errorBorder: 'danger' as const,
  paddingVertical: 10,
  paddingHorizontal: 12,
  radius: 'sm' as const
};

// Density-based spacing
export const DENSITY_SPACING = {
  compact: {
    fieldGap: 12,
    labelGap: 2,
    inputPadding: [6, 10] as const,
    fontSize: 12
  },
  default: {
    fieldGap: 16,
    labelGap: 4,
    inputPadding: [10, 12] as const,
    fontSize: 13
  },
  spacious: {
    fieldGap: 24,
    labelGap: 6,
    inputPadding: [14, 16] as const,
    fontSize: 14
  }
};

// =============================================================================
// FORM INPUT SCHEMA - What the LLM provides
// =============================================================================

export const FormInputSchema = z.object({
  // Form-Level Dimensions
  layout: FormLayout.optional(),
  columns: z.number().optional(),
  labelPosition: LabelPosition.optional(),
  requiredStyle: RequiredStyle.optional(),
  errorDisplay: ErrorDisplay.optional(),
  density: Density.optional(),

  // Content - either fields OR sections
  fields: z.array(FormFieldSchema).optional(),
  sections: z.array(FormSectionSchema).optional(),

  // Actions
  actions: z.array(FormActionSchema).optional(),
  submitPosition: SubmitPosition.optional(),

  // Shorthand for simple forms
  submit: z.object({
    label: z.string(),
    variant: ActionVariant.optional()
  }).optional(),
  cancel: z.object({
    label: z.string()
  }).optional(),

  // Container Styling
  container: z.object({
    background: z.enum(['app', 'surface', 'elevated', 'transparent']).optional(),
    padding: z.enum(['xs', 'sm', 'md', 'lg', 'xl']).optional(),
    radius: z.enum(['none', 'sm', 'md', 'lg']).optional(),
    border: z.boolean().optional(),
    shadow: z.enum(['none', 'sm', 'md', 'lg']).optional()
  }).optional(),

  // Advanced
  autoSave: z.boolean().optional(),
  showErrorSummary: z.boolean().optional(),
  stickyFooter: z.boolean().optional()

}).refine(
  data => (data.fields && data.fields.length > 0) ||
          (data.sections && data.sections.length > 0),
  { message: 'Either fields or sections must be provided' }
);

export type FormInput = z.infer<typeof FormInputSchema>;

// =============================================================================
// NORMALIZED FORM - After parsing with defaults applied
// =============================================================================

export interface NormalizedFormField {
  type: FieldTypeType;
  name: string;
  label?: string;
  placeholder?: string;
  helper?: string;
  error?: string;
  required: boolean;
  disabled: boolean;
  readonly: boolean;
  size: FieldSizeType;
  variant: FieldVariantType;
  width: FieldWidthType;
  colSpan?: number;
  icon?: string;
  iconPosition: IconPositionType;
  prefix?: string;
  suffix?: string;
  showToggle: boolean;
  rows: number;
  resize: boolean;
  counter: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  stepper: boolean;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  searchable: boolean;
  clearable: boolean;
  showIf?: string;
}

export interface NormalizedFormAction {
  type: ActionTypeType;
  label: string;
  variant: ActionVariantType;
  icon?: string;
  disabled: boolean;
  loading: boolean;
}

export interface NormalizedForm {
  layout: FormLayoutType;
  columns: number;
  labelPosition: LabelPositionType;
  requiredStyle: RequiredStyleType;
  errorDisplay: ErrorDisplayType;
  density: DensityType;
  submitPosition: SubmitPositionType;
  fields: NormalizedFormField[];
  actions: NormalizedFormAction[];
  container: {
    background: 'app' | 'surface' | 'elevated' | 'transparent';
    padding: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    radius: 'none' | 'sm' | 'md' | 'lg';
    border: boolean;
    shadow: 'none' | 'sm' | 'md' | 'lg';
  };
  autoSave: boolean;
  showErrorSummary: boolean;
  stickyFooter: boolean;
}

// =============================================================================
// PARSING FUNCTIONS
// =============================================================================

/**
 * Normalize a field with defaults
 */
function normalizeField(field: FormField): NormalizedFormField {
  return {
    type: field.type,
    name: field.name,
    label: field.label,
    placeholder: field.placeholder,
    helper: field.helper,
    error: field.error,
    required: field.required ?? FIELD_DEFAULTS.required,
    disabled: field.disabled ?? FIELD_DEFAULTS.disabled,
    readonly: field.readonly ?? FIELD_DEFAULTS.readonly,
    size: field.size ?? FIELD_DEFAULTS.size,
    variant: field.variant ?? FIELD_DEFAULTS.variant,
    width: field.width ?? FIELD_DEFAULTS.width,
    colSpan: field.colSpan,
    icon: field.icon,
    iconPosition: field.iconPosition ?? 'none',
    prefix: field.prefix,
    suffix: field.suffix,
    showToggle: field.showToggle ?? FIELD_DEFAULTS.showToggle,
    rows: field.rows ?? FIELD_DEFAULTS.rows,
    resize: field.resize ?? FIELD_DEFAULTS.resize,
    counter: field.counter ?? FIELD_DEFAULTS.counter,
    maxLength: field.maxLength,
    min: field.min,
    max: field.max,
    step: field.step,
    stepper: field.stepper ?? false,
    options: field.options,
    searchable: field.searchable ?? false,
    clearable: field.clearable ?? false,
    showIf: field.showIf
  };
}

/**
 * Normalize an action with defaults
 */
function normalizeAction(action: FormAction): NormalizedFormAction {
  return {
    type: action.type,
    label: action.label,
    variant: action.variant ?? (action.type === 'submit' ? 'primary' : 'secondary'),
    icon: action.icon,
    disabled: action.disabled ?? false,
    loading: action.loading ?? false
  };
}

/**
 * Parse input and apply defaults
 */
export function parseForm(input: unknown): NormalizedForm {
  const parsed = FormInputSchema.parse(input);

  // Collect all fields (either from fields or sections)
  let allFields: FormField[] = [];
  if (parsed.fields && parsed.fields.length > 0) {
    allFields = parsed.fields;
  } else if (parsed.sections && parsed.sections.length > 0) {
    allFields = parsed.sections.flatMap(s => s.fields);
  }

  // Build actions from either actions array or shorthand
  let actions: NormalizedFormAction[] = [];
  if (parsed.actions && parsed.actions.length > 0) {
    actions = parsed.actions.map(normalizeAction);
  } else {
    if (parsed.submit) {
      actions.push({
        type: 'submit',
        label: parsed.submit.label,
        variant: parsed.submit.variant ?? 'primary',
        disabled: false,
        loading: false
      });
    }
    if (parsed.cancel) {
      actions.push({
        type: 'cancel',
        label: parsed.cancel.label,
        variant: 'ghost',
        disabled: false,
        loading: false
      });
    }
  }

  return {
    layout: parsed.layout ?? FORM_DEFAULTS.layout,
    columns: parsed.columns ?? 1,
    labelPosition: parsed.labelPosition ?? FORM_DEFAULTS.labelPosition,
    requiredStyle: parsed.requiredStyle ?? FORM_DEFAULTS.requiredStyle,
    errorDisplay: parsed.errorDisplay ?? FORM_DEFAULTS.errorDisplay,
    density: parsed.density ?? FORM_DEFAULTS.density,
    submitPosition: parsed.submitPosition ?? FORM_DEFAULTS.submitPosition,
    fields: allFields.map(normalizeField),
    actions,
    container: {
      background: parsed.container?.background ?? CONTAINER_DEFAULTS.background,
      padding: parsed.container?.padding ?? CONTAINER_DEFAULTS.padding,
      radius: parsed.container?.radius ?? CONTAINER_DEFAULTS.radius,
      border: parsed.container?.border ?? false,
      shadow: parsed.container?.shadow ?? 'none'
    },
    autoSave: parsed.autoSave ?? false,
    showErrorSummary: parsed.showErrorSummary ?? false,
    stickyFooter: parsed.stickyFooter ?? false
  };
}

/**
 * Validate input without parsing
 */
export function validateFormInput(input: unknown): {
  success: boolean;
  error?: string;
} {
  const result = FormInputSchema.safeParse(input);

  if (result.success) {
    return { success: true };
  } else {
    return {
      success: false,
      error: result.error.issues.map(i => i.message).join(', ')
    };
  }
}
