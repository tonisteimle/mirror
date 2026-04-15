#!/usr/bin/env npx tsx
/**
 * @deprecated Use `npm run test:browser` or `npx tsx tools/test.ts` instead.
 *
 * This file is kept for backwards compatibility only.
 */

console.log(
  '\x1b[33m⚠️  Deprecation notice: Use "npm run test:browser" or "npx tsx tools/test.ts" instead.\x1b[0m\n'
)

// Dynamic import to ensure deprecation message shows first
await import('./test-runner/cli.js')
