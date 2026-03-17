# Click-to-Draw Feature

**Status:** 🔵 Planned
**Priority:** High
**Owner:** Studio Team
**Created:** 2026-03-16

## Overview

Click-to-Draw enables users to create components in absolute containers by clicking and dragging to define position and size, similar to design tools like Figma or Sketch. Instead of drag-and-drop from the component panel, users can click a component and then draw a rectangle in the preview to instantly create elements with exact dimensions.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **User Action** | Click component → Draw rectangle in preview → Component created with x, y, w, h |
| **Supported Layouts** | Absolute containers only (`stacked`, `abs`) |
| **Components** | All primitives (Box, Button, Input, Text, etc.) |
| **Snapping** | Grid snapping + Smart guides (alignment) |
| **Visual Feedback** | Live rectangle, dimension labels, position coordinates, alignment guides |
| **Keyboard** | ESC (cancel), Shift (square), Alt (from center), Cmd (no snap) |

## Use Cases

### Primary Use Case
**Precise Layout in Absolute Containers**

User wants to create a login form centered in an absolute container:
```
1. Click "Box" in component panel
2. Cursor becomes crosshair ✛
3. Draw rectangle in center of container
4. Box created: Box x 100, y 50, w 400, h 300
```

### Secondary Use Cases

- **Rapid Prototyping**: Draw multiple elements quickly without drag-drop
- **Pixel-Perfect Design**: Set exact dimensions while drawing
- **Design Tool Familiarity**: Matches Figma/Sketch interaction patterns
- **Mobile Layouts**: Precise positioning for responsive breakpoints

## Benefits

✅ **Faster workflow** - No drag from panel required
✅ **More precise** - Define size and position in one action
✅ **Familiar UX** - Matches standard design tools
✅ **Snapping support** - Grid and alignment assistance
✅ **Visual feedback** - See exact dimensions while drawing

## Integration with Existing Systems

This feature builds on:
- ✅ **DragDropManager** - Uses same code modification paths
- ✅ **SmartGuides** - Reuses alignment snapping system
- ✅ **LayoutDetection** - Validates absolute containers
- ✅ **DropIndicator** - Position and dimension labels
- ✅ **ComponentPanel** - Click handler integration

## Documentation

- [REQUIREMENTS.md](./REQUIREMENTS.md) - Detailed requirements and user stories
- [SPECIFICATION.md](./SPECIFICATION.md) - Technical specification
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture and integration
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Implementation plan (phases)
- [TESTING.md](./TESTING.md) - Test strategy and test cases

## Related Features

- [canvas-drag-drop](../canvas-drag-drop/) - Existing drag & drop system
- [visual-code-system](../visual-code-system/) - Smart guides, snapping, resize
- [components-panel](../components-panel/) - Component palette

## Demo

```mirror
App w full, h full, bg #000, abs
  Container w 800, h 600, bg #1a1a1a, x 100, y 100, abs
    # User clicks "Box" → draws rectangle → creates:
    Box x 50, y 50, w 200, h 150, bg #3b82f6
```

## Status

- [ ] Requirements defined
- [ ] Architecture designed
- [ ] Implementation plan created
- [ ] Phase 1 (MVP) implemented
- [ ] Phase 2 (Snapping) implemented
- [ ] Phase 3 (Polish) implemented
- [ ] Tests written
- [ ] Documentation complete
- [ ] User testing done

---

**Next Steps:** Review REQUIREMENTS.md and ARCHITECTURE.md, then proceed with Phase 1 implementation.
