/**
 * Workflow Test Suite Index
 */

import type { TestCase } from '../../types'
import { projectWithCodeTests } from './project-with-code.test'
import { projectWithDragDropTests } from './project-with-drag-drop.test'
import { applicationTests } from './application.test'

export { projectWithCodeTests, projectWithDragDropTests, applicationTests }

export const allWorkflowTests: TestCase[] = [
  ...projectWithCodeTests,
  ...projectWithDragDropTests,
  ...applicationTests,
]

// Dashboard E2E test (comprehensive visual editing test)
export { dashboardE2ETests, allDashboardE2ETests } from './dashboard-e2e.test'
