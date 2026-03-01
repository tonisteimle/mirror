/**
 * Generation Module
 *
 * LLM-powered UI component generation with:
 * - Pattern-based prompts
 * - Schema validation
 * - Deterministic code generation
 */

// Design system
export { DESIGN_DEFAULTS } from './design-defaults';
export type {
  BackgroundRole,
  ForegroundRole,
  SpacingRole,
  RadiusRole
} from './design-defaults';

// Sidebar Navigation Expert
export {
  generateSidebarNavigation,
  generateSidebarNavigationFromSchema,
  getSystemPrompt as getSidebarNavigationSystemPrompt,
  getUserPrompt as getSidebarNavigationUserPrompt
} from './experts/sidebar-navigation';
export type { SidebarNavigationResult } from './experts/sidebar-navigation';

// Direct builder access (for testing)
export { buildSidebarNavigation } from './builders/sidebar-navigation';

// Schema types
export type {
  SidebarNavigation,
  SidebarNavigationInput,
  SidebarNavigationItem,
  SidebarNavigationGroup,
  NavItem,
  NavGroup
} from './schemas/sidebar-navigation';

// Schema enums and constants
export {
  VisibilityMode,
  StructureMode,
  CONTAINER_DEFAULTS,
  VISIBILITY_DEFAULT,
  STRUCTURE_DEFAULT
} from './schemas/sidebar-navigation';

// =============================================================================
// Form Expert
// =============================================================================

export {
  generateForm,
  generateFormFromSchema,
  getFormSystemPrompt,
  getFormUserPrompt
} from './experts/form';
export type { FormResult } from './experts/form';

// Direct builder access (for testing)
export { buildForm } from './builders/form';

// Schema types
export type {
  FormInput,
  FormField,
  FormAction,
  FormSection,
  NormalizedForm,
  NormalizedFormField,
  NormalizedFormAction
} from './schemas/form';

// Schema enums and constants
export {
  FormLayout,
  LabelPosition,
  RequiredStyle,
  ErrorDisplay,
  Density,
  SubmitPosition,
  FieldType,
  FieldSize,
  FieldVariant,
  ActionType,
  ActionVariant,
  FORM_DEFAULTS,
  FIELD_DEFAULTS,
  CONTAINER_DEFAULTS as FORM_CONTAINER_DEFAULTS,
  INPUT_DEFAULTS,
  DENSITY_SPACING
} from './schemas/form';
