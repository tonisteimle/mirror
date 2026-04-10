# Hospital Dashboard Example

A complete hospital dashboard built with Mirror DSL, demonstrating:

- **Design Tokens** - Colors, spacing, radius
- **Custom Components** - KpiCard, StatusBadge, StaffItem, NavItem
- **Layout** - CSS Grid, Flexbox with `hor`, `spread`, `ver-center`
- **Charts** - Line chart and Pie/Donut chart with data binding
- **States** - Hover effects, animations

## Files

```
hospital-dashboard/
├── index.html        # HTML viewer (loads and compiles dashboard.mirror)
├── dashboard.mirror  # The Mirror source code
├── README.md         # This file
└── _debug/           # Debug/test files from bug investigation
```

## Running

1. Build the compiler: `npm run build`
2. Start a local server: `npx serve .` (from project root)
3. Open: `http://localhost:3000/examples/hospital-dashboard/`

## Bug Fix (2024-04-10)

During development, we discovered and fixed a parser bug:

**Before (broken):**
```mirror
Row: Frame hor, gap 8    // Parser treated "Frame" as property name
```

**After (fixed):**
```mirror
Row: Frame hor, gap 8    // Parser correctly recognizes "Frame" as primitive
```

The fix is in `compiler/parser/parser.ts` - the `parseComponentDefinitionWithDefaultPrimitive` function now checks if the token after `:` is a primitive name.
