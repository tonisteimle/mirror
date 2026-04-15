#!/usr/bin/env npx tsx
/**
 * Mirror Browser Test Runner
 *
 * Runs browser-based tests for Mirror Studio using CDP (Chrome DevTools Protocol).
 *
 * Usage:
 *   npx tsx tools/test.ts [options]
 *   npm run test:browser [-- options]
 *
 * Examples:
 *   npm run test:browser              # All browser tests
 *   npm run test:browser:drag         # Only drag & drop tests
 *   npm run test:browser:mirror       # Only mirror tests
 *   npm run test:browser -- --headed  # With visible browser
 *
 * For full documentation:
 *   npx tsx tools/test.ts --help
 */

import './test-runner/cli'
