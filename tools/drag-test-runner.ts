#!/usr/bin/env npx tsx
/**
 * Mirror Studio Test Runner
 *
 * This file is a compatibility wrapper. The actual implementation
 * is in the test-runner/ directory with clean, modular code.
 *
 * Usage:
 *   npx tsx tools/drag-test-runner.ts [options]
 *
 * For full documentation:
 *   npx tsx tools/drag-test-runner.ts --help
 */

// Re-export and run the new CLI
import './test-runner/cli'
