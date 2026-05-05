/**
 * Multi-File Project Tests
 *
 * Tests for realistic multi-file projects with:
 * - Multiple screens (layouts)
 * - Shared tokens and components
 * - Navigation between screens
 * - Complex nested structures
 * - Data binding across files
 *
 * Each themed *.test.ts file owns one slice of the surface area;
 * shared file fixtures and lifecycle helpers live in `_fixtures.ts`.
 */

import type { TestSuite } from '../../types'

import {
  allEmptyProjectTests,
  emptyProjectConstantTests,
  emptyProjectStateTests,
  emptyProjectPreviewTests,
  emptyProjectStorageTests,
} from './empty-project.test'

import { projectSetupTests } from './setup.test'
import { tokenComponentTests } from './token-component.test'
import { screenNavigationTests } from './screen-navigation.test'
import { complexLayoutTests } from './complex-layout.test'
import { fileSwitchingTests } from './file-switching.test'
import { tokensSidebarTests } from './tokens-sidebar.test'

export {
  allEmptyProjectTests,
  emptyProjectConstantTests,
  emptyProjectStateTests,
  emptyProjectPreviewTests,
  emptyProjectStorageTests,
  projectSetupTests,
  tokenComponentTests,
  screenNavigationTests,
  complexLayoutTests,
  fileSwitchingTests,
  tokensSidebarTests,
}

export const allProjectTests: TestSuite = [
  ...allEmptyProjectTests,
  ...projectSetupTests,
  ...tokenComponentTests,
  ...screenNavigationTests,
  ...complexLayoutTests,
  ...fileSwitchingTests,
  // MVP single-file mode: tokens sidebar (design-system panel) is
  // deactivated. Re-include when the panel returns.
  // ...tokensSidebarTests,
]

export default allProjectTests
