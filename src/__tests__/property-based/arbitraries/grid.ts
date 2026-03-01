/**
 * Grid Arbitraries for Mirror DSL
 *
 * Generates random grid layouts with various column configurations.
 */

import * as fc from 'fast-check'
import {
  componentName,
  hexColor,
  smallPixelValue,
  shortLabel
} from './primitives'

// =============================================================================
// Grid Column Configurations
// =============================================================================

/** Fixed number of columns */
export const gridFixedColumns = fc.integer({ min: 1, max: 6 }).map(cols =>
  `grid ${cols}`
)

/** Auto-fill with min width */
export const gridAutoFill = fc.integer({ min: 100, max: 400 }).map(minWidth =>
  `grid auto ${minWidth}`
)

/** Percentage columns */
export const gridPercentColumns = fc.record({
  col1: fc.integer({ min: 20, max: 80 }),
  col2: fc.integer({ min: 20, max: 80 })
}).filter(({ col1, col2 }) => col1 + col2 === 100)
  .map(({ col1, col2 }) => `grid ${col1}% ${col2}%`)

/** Three-column percentage */
export const gridThreeColumnPercent = fc.record({
  col1: fc.integer({ min: 20, max: 40 }),
  col2: fc.integer({ min: 20, max: 40 }),
  col3: fc.integer({ min: 20, max: 40 })
}).filter(({ col1, col2, col3 }) => col1 + col2 + col3 === 100)
  .map(({ col1, col2, col3 }) => `grid ${col1}% ${col2}% ${col3}%`)

/** Any grid configuration */
export const anyGridConfig = fc.oneof(
  gridFixedColumns,
  gridAutoFill,
  gridPercentColumns
)

// =============================================================================
// Grid with Gap
// =============================================================================

/** Grid with gap */
export const gridWithGap = fc.record({
  columns: fc.integer({ min: 2, max: 4 }),
  gap: smallPixelValue
}).map(({ columns, gap }) =>
  `grid ${columns}, gap ${gap}`
)

/** Grid with separate row/column gap */
export const gridWithRowColGap = fc.record({
  columns: fc.integer({ min: 2, max: 4 }),
  rowGap: smallPixelValue,
  colGap: smallPixelValue
}).map(({ columns, rowGap, colGap }) =>
  `grid ${columns}, gap-row ${rowGap}, gap-col ${colGap}`
)

// =============================================================================
// Grid Containers
// =============================================================================

/** Simple grid container */
export const simpleGridContainer = fc.record({
  columns: fc.integer({ min: 2, max: 4 }),
  gap: smallPixelValue,
  itemCount: fc.integer({ min: 2, max: 8 })
}).chain(({ columns, gap, itemCount }) =>
  fc.array(shortLabel, { minLength: itemCount, maxLength: itemCount })
    .map(items => {
      let code = `Grid grid ${columns}, gap ${gap}\n`
      items.forEach(item => {
        code += `  Card pad 16, "${item}"\n`
      })
      return code.trimEnd()
    })
)

/** Grid with styled items */
export const styledGridContainer = fc.record({
  columns: fc.integer({ min: 2, max: 3 }),
  gap: smallPixelValue,
  bg: hexColor,
  itemCount: fc.integer({ min: 3, max: 6 })
}).chain(({ columns, gap, bg, itemCount }) =>
  fc.array(
    fc.record({
      label: shortLabel,
      itemBg: hexColor
    }),
    { minLength: itemCount, maxLength: itemCount }
  ).map(items => {
    let code = `Grid grid ${columns}, gap ${gap}, bg ${bg}, pad 16\n`
    items.forEach(item => {
      code += `  Card pad 16, bg ${item.itemBg}, rad 8, "${item.label}"\n`
    })
    return code.trimEnd()
  })
)

/** Auto-fill grid */
export const autoFillGrid = fc.record({
  minWidth: fc.integer({ min: 150, max: 300 }),
  gap: smallPixelValue,
  itemCount: fc.integer({ min: 4, max: 12 })
}).map(({ minWidth, gap, itemCount }) => {
  let code = `Grid grid auto ${minWidth}, gap ${gap}\n`
  for (let i = 0; i < itemCount; i++) {
    code += `  Card pad 16, bg #333, rad 8, "Item ${i + 1}"\n`
  }
  return code.trimEnd()
})

// =============================================================================
// Dashboard Layouts
// =============================================================================

/** Two-column sidebar layout */
export const sidebarLayout = fc.record({
  sidebarWidth: fc.constantFrom('20%', '25%', '30%', '250', '300'),
  contentWidth: fc.constantFrom('70%', '75%', '80%', 'full')
}).map(({ sidebarWidth, contentWidth }) =>
  `Container grid ${sidebarWidth} ${contentWidth}, gap 16, h full\n  Sidebar bg #1E1E2E, pad 16\n    Nav ver, gap 8\n      Item "Dashboard"\n      Item "Settings"\n  Content pad 16\n    Text "Main content"`
)

/** Dashboard card grid */
export const dashboardGrid = fc.record({
  columns: fc.constantFrom(2, 3, 4),
  cardCount: fc.integer({ min: 4, max: 8 })
}).chain(({ columns, cardCount }) =>
  fc.array(
    fc.record({
      title: shortLabel,
      value: fc.integer({ min: 0, max: 9999 }).map(String)
    }),
    { minLength: cardCount, maxLength: cardCount }
  ).map(cards => {
    let code = `Dashboard grid ${columns}, gap 16, pad 16\n`
    cards.forEach(card => {
      code += `  StatCard pad 16, bg #333, rad 8\n    Label "${card.title}"\n    Value fs 24, weight bold, "${card.value}"\n`
    })
    return code.trimEnd()
  })
)

/** Masonry-style card grid */
export const masonryGrid = fc.record({
  columns: fc.integer({ min: 2, max: 4 }),
  itemCount: fc.integer({ min: 4, max: 8 })
}).map(({ columns, itemCount }) => {
  let code = `Grid grid ${columns}, gap 16\n`
  for (let i = 0; i < itemCount; i++) {
    const height = 100 + (i % 3) * 50 // Varying heights
    code += `  Card h ${height}, pad 16, bg #333, rad 8, "Card ${i + 1}"\n`
  }
  return code.trimEnd()
})

// =============================================================================
// Photo/Media Grids
// =============================================================================

/** Photo gallery grid */
export const photoGalleryGrid = fc.record({
  columns: fc.integer({ min: 2, max: 4 }),
  gap: fc.integer({ min: 4, max: 16 }),
  imageCount: fc.integer({ min: 4, max: 12 })
}).map(({ columns, gap, imageCount }) => {
  let code = `Gallery grid ${columns}, gap ${gap}\n`
  for (let i = 0; i < imageCount; i++) {
    code += `  Image "https://picsum.photos/300/200?random=${i}", fit cover, rad 4\n`
  }
  return code.trimEnd()
})

/** Product grid */
export const productGrid = fc.record({
  columns: fc.constantFrom(3, 4),
  products: fc.array(
    fc.record({
      name: shortLabel,
      price: fc.integer({ min: 10, max: 1000 })
    }),
    { minLength: 4, maxLength: 8 }
  )
}).map(({ columns, products }) => {
  let code = `Products grid ${columns}, gap 24\n`
  products.forEach(p => {
    code += `  ProductCard ver, gap 8, bg #333, rad 8, clip\n    Image "placeholder.jpg", h 200, fit cover\n    Content pad 12\n      Name "${p.name}"\n      Price weight bold, "$${p.price}"\n`
  })
  return code.trimEnd()
})

// =============================================================================
// Combined Generators
// =============================================================================

/** Any grid layout */
export const anyGridLayout = fc.oneof(
  simpleGridContainer,
  styledGridContainer,
  autoFillGrid
)

/** Any dashboard layout */
export const anyDashboardLayout = fc.oneof(
  sidebarLayout,
  dashboardGrid,
  masonryGrid
)

/** Any media grid */
export const anyMediaGrid = fc.oneof(
  photoGalleryGrid,
  productGrid
)

/** Real-world grid patterns */
export const realWorldGridPattern = fc.oneof(
  dashboardGrid,
  photoGalleryGrid,
  productGrid,
  sidebarLayout
)
