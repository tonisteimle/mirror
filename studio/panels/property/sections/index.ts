/**
 * Property Panel Sections
 *
 * Each section is responsible for rendering and handling a specific
 * category of properties.
 */

export { LayoutSection, createLayoutSection } from './layout-section'
export { SizingSection, createSizingSection } from './sizing-section'
export { SpacingSection, createSpacingSection, parseSpacingValue, buildSpacingValue } from './spacing-section'

// Future sections to be extracted:
// export { ColorSection, createColorSection } from './color-section'
// export { BorderSection, createBorderSection } from './border-section'
// export { TypographySection, createTypographySection } from './typography-section'
// export { IconSection, createIconSection } from './icon-section'
// export { VisualSection, createVisualSection } from './visual-section'
// export { BehaviorSection, createBehaviorSection } from './behavior-section'
// export { InteractionsSection, createInteractionsSection } from './interactions-section'
// export { EventsSection, createEventsSection } from './events-section'
// export { ActionsSection, createActionsSection } from './actions-section'
