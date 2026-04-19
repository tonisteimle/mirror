/**
 * Workflow Test Suite Index
 *
 * Re-exports from the existing workflow-tests.ts file.
 */

export {
  allWorkflowTests,
  projectWithCodeTests,
  projectWithDragDropTests,
  applicationTests,
} from '../workflow-tests'

// Dashboard E2E test (comprehensive visual editing test)
export { dashboardE2ETests, allDashboardE2ETests } from './dashboard-e2e.test'
