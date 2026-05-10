/**
 * Property Panel Sections
 *
 * All standardized section components for the property panel, plus a
 * single registry the view iterates over so adding a new section is
 * a one-line change here (no edit in view.ts).
 */

import type { BaseSection, SectionDependencies } from '../base/section'
import { createContentSection } from './content-section'
import { createPositionSection } from './position-section'
import { createEventsSection } from './events-section'
import { createSpacingSection } from './spacing-section'
import { createMarginSection } from './margin-section'
import { createBorderSection } from './border-section'
import { createColorSection } from './color-section'
import { createTypographySection } from './typography-section'
import { createLayoutSection } from './layout-section'
import { createSizingSection } from './sizing-section'
import { createBehaviorSection } from './behavior-section'
import { createVisualSection } from './visual-section'

export * from './content-section'
export * from './position-section'
export * from './events-section'
export * from './spacing-section'
export * from './margin-section'
export * from './border-section'
export * from './color-section'
export * from './typography-section'
export * from './layout-section'
export * from './sizing-section'
export * from './behavior-section'
export * from './visual-section'

/**
 * Section factory registry.
 *
 * Map order is the canonical render order — keep the entries in the
 * order they should appear in the panel. Adding a new section: write
 * the file, add the import + one row here.
 */
export const SECTION_FACTORIES: Record<string, (deps: SectionDependencies) => BaseSection> = {
  content: createContentSection,
  position: createPositionSection,
  events: createEventsSection,
  layout: createLayoutSection,
  sizing: createSizingSection,
  spacing: createSpacingSection,
  margin: createMarginSection,
  border: createBorderSection,
  color: createColorSection,
  typography: createTypographySection,
  behavior: createBehaviorSection,
  visual: createVisualSection,
}
