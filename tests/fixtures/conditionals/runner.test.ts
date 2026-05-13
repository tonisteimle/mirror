/**
 * Conditionals Fixtures (Schicht 1 — Golden Files) — runner (delegates to shared runSingleFileFixtureCategory).
 *
 * Per-fixture layout, normalization, and golden-file diff logic live in
 * tests/utils/fixture-runner.ts. Update via UPDATE_GOLDEN=1.
 *
 * @vitest-environment jsdom
 */

import { runSingleFileFixtureCategory } from '../../utils/fixture-runner'

runSingleFileFixtureCategory('Conditionals Fixtures (Schicht 1 — Golden Files)', __dirname)
