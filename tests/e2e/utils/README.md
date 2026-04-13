# E2E Test Utilities

## HTML5 Drag-Drop (`html5-drag.ts`)

Playwright's built-in `dragTo()` doesn't support custom MIME types in `dataTransfer`. This utility provides proper HTML5 drag-and-drop simulation.

### The Problem

```typescript
// This DOESN'T work with custom MIME types:
await source.dragTo(target)

// Playwright's mouse events don't trigger HTML5 drag events properly:
await page.mouse.move(x1, y1)
await page.mouse.down()
await page.mouse.move(x2, y2)
await page.mouse.up()
```

### The Solution

```typescript
import { simulateHtml5Drag, simulateMirrorComponentDrag } from './utils/html5-drag'

// Generic HTML5 drag with custom MIME type:
await simulateHtml5Drag(page, {
  mimeType: 'application/json',
  data: { type: 'custom', value: 42 },
  targetSelector: '#drop-zone',
})

// Mirror-specific component drag:
await simulateMirrorComponentDrag(page, {
  componentName: 'Button',
  targetNodeId: 'frame-1',
})
```

### Critical Insight: Two Dragovers Required

The browser's drag-drop system requires **two** dragover events before a drop:

1. **First dragover** → Starts the drag operation
2. **Second dragover** → Triggers target detection
3. **Drop** → Executes the action (only works with valid target)

This utility handles this automatically.

### API

#### `simulateHtml5Drag(page, options)`

Generic HTML5 drag-drop simulation.

```typescript
interface DragOptions {
  mimeType: string // e.g., 'application/json'
  data: unknown // Will be JSON.stringified
  targetSelector: string // CSS selector
  position?: { x; y } // Optional drop position
  dragoverCount?: number // Default: 2
  eventDelay?: number // Default: 50ms
}
```

#### `simulateMirrorComponentDrag(page, options)`

Specialized for Mirror's component panel drag.

```typescript
await simulateMirrorComponentDrag(page, {
  componentName: 'Button',
  componentId: 'button', // Optional, defaults to lowercase name
  targetNodeId: 'frame-1',
  position: { x: 100, y: 50 }, // Optional
})
```

#### `simulateMirrorElementMove(page, options)`

For moving elements within the preview.

```typescript
await simulateMirrorElementMove(page, {
  sourceNodeId: 'button-1',
  targetNodeId: 'frame-2',
  duplicate: false, // Set true for Alt+drag
})
```

#### Helper Functions

```typescript
// Get element bounds
const rect = await getMirrorElementRect(page, 'frame-1')

// Get all node IDs in preview
const ids = await getMirrorNodeIds(page)

// Wait for element to appear
await waitForMirrorNode(page, 'button-1', 5000)
```

### Related Playwright Issue

https://github.com/microsoft/playwright/issues/13855
