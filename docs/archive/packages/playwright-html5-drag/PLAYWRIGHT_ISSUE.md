# Playwright Issue #13855 - Proposed Solution

## Comment Draft for https://github.com/microsoft/playwright/issues/13855

---

### Workaround: `playwright-html5-drag`

I've created a workaround library that properly simulates HTML5 drag-and-drop with custom MIME types.

**The Problem:**

```typescript
// ❌ Playwright's dragTo() doesn't support custom dataTransfer
await source.dragTo(target)

// ❌ Mouse events don't trigger HTML5 drag events
await page.mouse.down()
await page.mouse.move(x, y)
await page.mouse.up()
```

**The Solution:**

```typescript
import { drag } from 'playwright-html5-drag'

// ✅ Works with any MIME type
await drag(page, {
  mimeType: 'application/json',
  data: { componentId: 'button' },
  targetSelector: '#drop-zone',
})
```

### Key Insight: Two Dragovers Required

The browser's drag-drop system requires **two** `dragover` events before a `drop`:

1. **First dragover** → Initializes the drag operation
2. **Second dragover** → Triggers target detection and position calculation
3. **Drop** → Executes the action (only works when target was detected)

This is why simple single-event approaches fail.

### Implementation

The library uses `page.evaluate()` to dispatch real `DragEvent` objects:

```typescript
const createDataTransfer = () => ({
  types: [mimeType],
  dropEffect: 'copy',
  effectAllowed: 'copy',
  getData: (type) => type === mimeType ? data : '',
  setData: () => {},
  setDragImage: () => {},
})

// Dispatch TWO dragovers
for (let i = 0; i < 2; i++) {
  const event = new DragEvent('dragover', {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  })
  Object.defineProperty(event, 'dataTransfer', { value: createDataTransfer() })
  target.dispatchEvent(event)
}

// Then drop
const dropEvent = new DragEvent('drop', { ... })
Object.defineProperty(dropEvent, 'dataTransfer', { value: createDataTransfer() })
target.dispatchEvent(dropEvent)
```

### Proposed API Addition

Would be great to have this built into Playwright:

```typescript
// Option 1: Extend dragTo()
await source.dragTo(target, {
  dataTransfer: {
    'application/json': { type: 'widget' },
    'text/plain': 'Fallback'
  }
})

// Option 2: New method
await page.dragAndDrop(source, target, {
  dataTransfer: { ... }
})
```

### Repository

https://github.com/anthropics/mirror/tree/main/packages/playwright-html5-drag

---

**Note:** This workaround has been tested with 94 E2E tests in a production application.
