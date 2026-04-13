# playwright-html5-drag

HTML5 drag-and-drop simulation for Playwright with custom MIME type support.

## The Problem

Playwright's built-in `dragTo()` doesn't support custom `dataTransfer` MIME types:

```typescript
// ❌ This doesn't work with custom MIME types
await source.dragTo(target)

// ❌ Mouse events don't trigger HTML5 drag events
await page.mouse.down()
await page.mouse.move(x, y)
await page.mouse.up()
```

See: https://github.com/microsoft/playwright/issues/13855

## The Solution

This library dispatches real `DragEvent` objects with properly configured `dataTransfer`:

```typescript
import { drag } from 'playwright-html5-drag'

// ✅ Works with any MIME type
await drag(page, {
  mimeType: 'application/json',
  data: { type: 'widget', id: 42 },
  targetSelector: '#drop-zone',
})
```

## Installation

```bash
npm install playwright-html5-drag
```

## Usage

### Basic Drag

```typescript
import { drag } from 'playwright-html5-drag'

test('drag and drop', async ({ page }) => {
  await drag(page, {
    mimeType: 'application/json',
    data: { componentId: 'button' },
    targetSelector: '#canvas',
  })
})
```

### With Position

```typescript
await drag(page, {
  mimeType: 'text/plain',
  data: 'Hello World',
  targetSelector: '.canvas',
  position: { x: 100, y: 200 },
})
```

### Multiple MIME Types

```typescript
import { dragMultiMime } from 'playwright-html5-drag'

await dragMultiMime(page, {
  data: {
    'application/json': { type: 'widget' },
    'text/plain': 'Widget',
  },
  targetSelector: '#drop-zone',
})
```

### Check Results

```typescript
const result = await drag(page, { ... })

if (result.success) {
  console.log('Drop executed')
  console.log('Dragover prevented:', result.eventsPrevented.dragover)
  console.log('Drop prevented:', result.eventsPrevented.drop)
} else {
  console.error('Failed:', result.error)
}
```

## API

### `drag(page, options)`

Main drag-and-drop function.

| Option           | Type      | Default  | Description                          |
| ---------------- | --------- | -------- | ------------------------------------ |
| `mimeType`       | `string`  | required | MIME type (e.g., 'application/json') |
| `data`           | `unknown` | required | Data to transfer (auto-stringified)  |
| `targetSelector` | `string`  | required | CSS selector for drop target         |
| `position`       | `{x, y}`  | center   | Drop position                        |
| `dragoverCount`  | `number`  | 2        | Number of dragover events            |
| `eventDelay`     | `number`  | 50       | Delay between events (ms)            |

### `dragMultiMime(page, options)`

Drag with multiple MIME types.

### `getElementRect(page, selector)`

Get element bounding rectangle.

### `waitForElement(page, selector, timeout?)`

Wait for element to appear.

## Why Two Dragovers?

The browser's drag-drop system requires **two** dragover events:

1. **First dragover** → Initializes the drag operation
2. **Second dragover** → Triggers target detection
3. **Drop** → Executes the action (only works with valid target)

This library handles this automatically with `dragoverCount: 2`.

## License

MIT
