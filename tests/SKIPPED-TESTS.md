# Skipped Tests Documentation

This document tracks all skipped tests in the Mirror test suite and explains why they are skipped.

## Summary

| Category             | Count | Status                    |
| -------------------- | ----- | ------------------------- |
| Bugs/Known Issues    | 4     | Fix in future sprints     |
| Not Yet Implemented  | 14    | Feature work needed       |
| Environment-Specific | 3     | Requires browser/live API |
| Conditional          | 2     | Run with flags            |

**Total Skipped: 23 tests**

---

## Bugs / Known Issues

### `tests/studio/file-delete.test.ts`

```
it.skip('should remove all folder files from cache (BUG: currently fails)')
```

**Reason:** Bug in folder deletion logic - files in subfolders not properly removed from cache.
**Fix:** Investigate `FileManager.deleteFolder()` recursive cache cleanup.

### `tests/integration/two-way-binding-integration.test.ts`

```
test.skip('Text element updates when input changes')
test.skip('Nested data path binding')
test.skip('Special characters in value')
```

**Reason:** Two-way binding integration tests failing due to DOM update timing issues.
**Fix:** Review `SyncCoordinator` binding update propagation.

---

## Not Yet Implemented

### Motion One Integration

**Files:** `tests/compiler/motion-one-ir.test.ts`, `tests/compiler/motion-one-codegen.test.ts`

```
describe.skip('Motion One IR Transformation')
describe.skip('Motion One Code Generation')
```

**Reason:** Motion One animation library integration not complete.
**Status:** Low priority - current `anim` property covers basic use cases.

### Validator Event/Action Parsing

**File:** `tests/compiler/validator-error-codes.test.ts`

```
it.skip('errors on unknown event name (parsing issue with property-style events)')
it.skip('errors on typo in event name (parsing issue)')
it.skip('errors on unknown key in keyboard event (parsing issue)')
it.skip('errors on typo in key name (parsing issue)')
it.skip('warns when key used on non-keyboard event (parsing issue)')
it.skip('warns when key used on hover event (parsing issue)')
it.skip('errors on unknown action name (parsing issue)')
it.skip('errors on typo in action name (parsing issue)')
it.skip('detects direct circular reference (parsing issue)')
it.skip('detects indirect circular reference (parsing issue)')
it.skip('warns on duplicate property with alias (NOT YET IMPLEMENTED)')
```

**Reason:** Parser doesn't yet provide enough context for these validations.
**Fix:** Enhance parser to track event/action metadata for validator.

### Slot IR Transformation

**File:** `tests/compiler/ir-slot-ir.test.ts`

```
it.skip('transforms slot with full width in horizontal parent')
```

**Reason:** Edge case in slot width calculation within horizontal layouts.
**Fix:** Review `SlotTransformer` width inheritance logic.

### HTML DOM Output

**File:** `tests/compiler/backend-html-dom-output.test.ts`

```
it.skip('each rendert items aus daten')
```

**Reason:** `each` loop HTML output format changed.
**Fix:** Update expected output to match current implementation.

---

## Environment-Specific

### Browser-Required Tests

**File:** `tests/runtime/test-api.test.ts`

```
describe.skip('Key Mapping (requires browser)')
```

**Reason:** Keyboard event handling requires real browser environment.
**Run:** Use Playwright E2E tests for keyboard testing.

### Live API Tests

**File:** `tests/studio/agent-agent-loop.test.ts`

```
describe.skipIf(!RUN_LIVE_TESTS)('Agent Loop Tests')
```

**Reason:** Requires live Anthropic API access.
**Run:** Set `RUN_LIVE_TESTS=true` environment variable.

---

## Conditional Skips

### Tutorial DOM Structure Tests

**File:** `tests/compiler/tutorial/tutorial-dom-structure.test.ts`

```
const testFn = shouldSkip ? it.skip : it
```

**Reason:** Some tutorial examples conditionally skipped based on feature flags.
**Status:** Working as intended - skip logic is data-driven.

---

## How to Run Skipped Tests

```bash
# Run all tests including skipped (will show failures)
npm test -- --run

# Run specific skipped test file
npm test -- tests/compiler/motion-one-ir.test.ts --run

# Run live API tests
RUN_LIVE_TESTS=true npm test -- tests/studio/agent-agent-loop.test.ts
```

---

## Priority for Fixing

### High Priority (Bugs)

1. File delete cache bug
2. Two-way binding timing issues

### Medium Priority (Features)

1. Validator event/action parsing
2. Slot width in horizontal layouts

### Low Priority (Nice to Have)

1. Motion One integration
2. HTML DOM output format
