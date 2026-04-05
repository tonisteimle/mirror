# Layout Defaults

This document describes the centralized layout defaults in Mirror.

## Single Source of Truth

All layout defaults are defined in `compiler/schema/layout-defaults.ts`. The IR code only reads from this file, never decides defaults inline.

## Key Principles

### 1. Symmetric Behavior

Both `hor` and `ver` layouts have the same default alignment:

```
Frame ver  → align-items: flex-start
Frame hor  → align-items: flex-start (NOT center!)
```

If you want vertical centering in a horizontal layout, use `center` explicitly:

```mirror
Frame hor, center  // Both axes centered
```

### 2. Explicit Center Semantics

`center` **always** means both axes:

| Property | Meaning |
|----------|---------|
| `center` | justify-content: center AND align-items: center |
| `hor-center` | Only horizontal centering |
| `ver-center` | Only vertical centering |

No context-dependent behavior.

### 3. 9-Zone Alignment

Positional shortcuts for common alignments:

```
tl  |  tc  |  tr
----+------+----
cl  |center| cr
----+------+----
bl  |  bc  |  br
```

Example:
```mirror
Frame bl  // bottom-left aligned children
```

## Migration Guide

### Breaking Change: `Frame hor`

**Before:** `Frame hor` had implicit `align-items: center`
**After:** `Frame hor` has `align-items: flex-start`

**Fix:** Add explicit centering where needed:

```mirror
// Before (children were vertically centered)
Frame hor, gap 12
  Icon "user"
  Text "Username"

// After (make centering explicit)
Frame hor, center, gap 12
  Icon "user"
  Text "Username"
```

### Finding Affected Code

Search for `Frame hor` without `center` and check if vertical centering was intended:

```bash
grep -n "Frame hor" **/*.mirror | grep -v center
```

## Constants Reference

### NON_CONTAINER_PRIMITIVES

Elements that don't get default flex layout:
- text, span, input, textarea, button
- img, image, icon, label, link
- divider, hr, spacer
- h1-h6, checkbox, radio, slot

### FLEX_DEFAULTS

```typescript
column: {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
}
row: {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'flex-start',
}
```

### NINE_ZONE

Maps position shortcuts to justify-content/align-items values.

### CENTER_ALIGNMENT

Unambiguous center semantics:
- `center`: both axes
- `hor-center`: only horizontal
- `ver-center`: only vertical
