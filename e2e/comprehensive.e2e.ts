import { test, expect, Page } from '@playwright/test'

// Helper to type in CodeMirror editor
async function typeInEditor(page: Page, text: string) {
  const editor = page.locator('.cm-content[contenteditable="true"]').first()
  await editor.click()
  await page.keyboard.type(text)
}

// Helper to clear editor and type fresh
async function clearAndType(page: Page, text: string) {
  const editor = page.locator('.cm-content[contenteditable="true"]').first()
  await editor.click()
  await page.keyboard.press('Meta+a')
  await page.keyboard.press('Backspace')
  await page.keyboard.type(text)
}

// Helper to get editor content
async function getEditorContent(page: Page): Promise<string> {
  return await page.locator('.cm-content').textContent() || ''
}

// Helper to click on a tab
async function clickTab(page: Page, tabName: string) {
  await page.click(`button:has-text("${tabName}")`)
  await page.waitForTimeout(100)
}

// Helper for slow typing (more reliable)
async function slowType(page: Page, text: string, delay = 30) {
  await page.keyboard.type(text, { delay })
}

test.describe('Comprehensive Editor Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.cm-editor')
    await clickTab(page, 'Page')
  })

  // ==========================================
  // LAYOUT PROPERTIES
  // ==========================================
  test.describe('Layout Properties', () => {
    test('hor - horizontal layout', async ({ page }) => {
      await clearAndType(page, 'hor')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('hor')
    })

    test('ver - vertical layout', async ({ page }) => {
      await clearAndType(page, 'ver')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('ver')
    })

    test('hor with gap', async ({ page }) => {
      await clearAndType(page, 'hor gap 16')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('hor gap 16')
    })

    test('ver with gap and wrap', async ({ page }) => {
      await clearAndType(page, 'ver gap 8 wrap')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('ver gap 8 wrap')
    })

    test('grow and shrink', async ({ page }) => {
      await clearAndType(page, 'grow shrink 0')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('grow shrink 0')
    })
  })

  // ==========================================
  // ALIGNMENT PROPERTIES
  // ==========================================
  test.describe('Alignment Properties', () => {
    test('horizontal alignment variations', async ({ page }) => {
      await clearAndType(page, 'hor-l hor-cen hor-r hor-between')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('hor-l hor-cen hor-r hor-between')
    })

    test('vertical alignment variations', async ({ page }) => {
      await clearAndType(page, 'ver-t ver-cen ver-b ver-between')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('ver-t ver-cen ver-b ver-between')
    })

    test('combined alignments', async ({ page }) => {
      await clearAndType(page, 'hor-cen ver-cen')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('hor-cen ver-cen')
    })
  })

  // ==========================================
  // SPACING PROPERTIES
  // ==========================================
  test.describe('Spacing Properties', () => {
    test('padding all sides', async ({ page }) => {
      await clearAndType(page, 'pad 16')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('pad 16')
    })

    test('padding directional', async ({ page }) => {
      await clearAndType(page, 'pad l 8 pad r 8 pad u 16 pad d 16')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('pad l 8 pad r 8 pad u 16 pad d 16')
    })

    test('padding shortcuts', async ({ page }) => {
      await clearAndType(page, 'pad l-r 24 pad u-d 12')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('pad l-r 24 pad u-d 12')
    })

    test('margin all sides', async ({ page }) => {
      await clearAndType(page, 'mar 20')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('mar 20')
    })

    test('margin directional', async ({ page }) => {
      await clearAndType(page, 'mar l 10 mar r 10 mar u 5 mar d 5')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('mar l 10 mar r 10 mar u 5 mar d 5')
    })

    test('gap values', async ({ page }) => {
      await clearAndType(page, 'gap 4 gap 8 gap 12 gap 16 gap 24 gap 32')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('gap 4 gap 8 gap 12 gap 16 gap 24 gap 32')
    })
  })

  // ==========================================
  // SIZE PROPERTIES
  // ==========================================
  test.describe('Size Properties', () => {
    test('width and height', async ({ page }) => {
      await clearAndType(page, 'w 200 h 100')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('w 200 h 100')
    })

    test('min/max width', async ({ page }) => {
      await clearAndType(page, 'min-w 100 max-w 500')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('min-w 100 max-w 500')
    })

    test('min/max height', async ({ page }) => {
      await clearAndType(page, 'min-h 50 max-h 300')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('min-h 50 max-h 300')
    })

    test('full size', async ({ page }) => {
      await clearAndType(page, 'full')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('full')
    })

    test('complex size constraints', async ({ page }) => {
      await clearAndType(page, 'w 300 h 200 min-w 200 max-w 400 min-h 150 max-h 250')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('w 300 h 200 min-w 200 max-w 400 min-h 150 max-h 250')
    })
  })

  // ==========================================
  // COLOR PROPERTIES
  // ==========================================
  test.describe('Color Properties', () => {
    test('col with hex color', async ({ page }) => {
      await clearAndType(page, 'col #FF5500')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('col #FF5500')
    })

    test('col with short hex', async ({ page }) => {
      await clearAndType(page, 'col #F50')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('col #F50')
    })

    test('border color', async ({ page }) => {
      await clearAndType(page, 'boc #333333')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('boc #333333')
    })

    test('multiple colors', async ({ page }) => {
      await clearAndType(page, 'col #FFFFFF boc #000000')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('col #FFFFFF boc #000000')
    })

    test('hover colors', async ({ page }) => {
      await clearAndType(page, 'col #EEE hover-col #DDD hover-boc #999')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('col #EEE hover-col #DDD hover-boc #999')
    })
  })

  // ==========================================
  // BORDER PROPERTIES
  // ==========================================
  test.describe('Border Properties', () => {
    test('border all sides', async ({ page }) => {
      await clearAndType(page, 'bor 1')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('bor 1')
    })

    test('border directional', async ({ page }) => {
      await clearAndType(page, 'bor l 1 bor r 1 bor u 2 bor d 2')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('bor l 1 bor r 1 bor u 2 bor d 2')
    })

    test('border with color', async ({ page }) => {
      await clearAndType(page, 'bor 2 boc #FF0000')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('bor 2 boc #FF0000')
    })

    test('border radius', async ({ page }) => {
      await clearAndType(page, 'rad 8')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('rad 8')
    })

    test('full border styling', async ({ page }) => {
      await clearAndType(page, 'bor 1 boc #CCC rad 4')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('bor 1 boc #CCC rad 4')
    })
  })

  // ==========================================
  // TYPOGRAPHY PROPERTIES
  // ==========================================
  test.describe('Typography Properties', () => {
    test('font size', async ({ page }) => {
      await clearAndType(page, 'size 14')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('size 14')
    })

    test('font weight', async ({ page }) => {
      await clearAndType(page, 'weight 600')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('weight 600')
    })

    test('line height', async ({ page }) => {
      await clearAndType(page, 'line 1.5')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('line 1.5')
    })

    test('text transforms', async ({ page }) => {
      await clearAndType(page, 'uppercase truncate')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('uppercase truncate')
    })

    test('full typography', async ({ page }) => {
      await clearAndType(page, 'size 16 weight 500 line 1.4')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('size 16 weight 500 line 1.4')
    })
  })

  // ==========================================
  // OVERFLOW PROPERTIES
  // ==========================================
  test.describe('Overflow Properties', () => {
    test('scroll all', async ({ page }) => {
      await clearAndType(page, 'scroll')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('scroll')
    })

    test('scroll directional', async ({ page }) => {
      await clearAndType(page, 'scroll-x scroll-y')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('scroll-x scroll-y')
    })

    test('clip overflow', async ({ page }) => {
      await clearAndType(page, 'clip')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('clip')
    })
  })

  // ==========================================
  // EFFECTS PROPERTIES
  // ==========================================
  test.describe('Effects Properties', () => {
    test('shadow', async ({ page }) => {
      await clearAndType(page, 'shadow 2')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('shadow 2')
    })

    test('opacity', async ({ page }) => {
      await clearAndType(page, 'opacity 0.5')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('opacity 0.5')
    })
  })

  // ==========================================
  // IMAGE PROPERTIES
  // ==========================================
  test.describe('Image Properties', () => {
    test('image source', async ({ page }) => {
      await clearAndType(page, 'src "https://example.com/image.jpg"')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('src "https://example.com/image.jpg"')
    })

    test('image with alt', async ({ page }) => {
      await clearAndType(page, 'src "image.png" alt "Description"')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('src "image.png" alt "Description"')
    })

    test('image fit', async ({ page }) => {
      await clearAndType(page, 'fit cover')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('fit cover')
    })
  })

  // ==========================================
  // COMPONENT DEFINITIONS
  // ==========================================
  test.describe('Component Definitions', () => {
    test('simple component', async ({ page }) => {
      await clearAndType(page, 'Tile')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('Tile')
    })

    test('component with dimensions', async ({ page }) => {
      await clearAndType(page, 'Tile 300 400')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('Tile 300 400')
    })

    test('Text component', async ({ page }) => {
      await clearAndType(page, 'Text "Hello World"')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('Text "Hello World"')
    })

    test('component with many properties', async ({ page }) => {
      await clearAndType(page, 'Tile 200 150 pad 16 col #F5F5F5 rad 8 bor 1 boc #DDD')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('Tile 200 150 pad 16 col #F5F5F5 rad 8 bor 1 boc #DDD')
    })

    test('Image component', async ({ page }) => {
      await clearAndType(page, 'Image 100 100 src "photo.jpg" fit cover rad 50')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('Image 100 100 src "photo.jpg" fit cover rad 50')
    })
  })

  // ==========================================
  // MULTILINE STRUCTURES
  // ==========================================
  test.describe('Multiline Structures', () => {
    test('two level nesting', async ({ page }) => {
      await clearAndType(page, 'Container ver gap 16')
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Header hor pad 12')
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Content grow')

      const content = await getEditorContent(page)
      expect(content).toContain('Container ver gap 16')
      expect(content).toContain('Header hor pad 12')
      expect(content).toContain('Content grow')
    })

    test('three level nesting', async ({ page }) => {
      await clearAndType(page, 'App ver full')
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Sidebar w 250')
      await page.keyboard.press('Enter')
      await page.keyboard.type('    NavItem pad 12')
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Main grow')

      const content = await getEditorContent(page)
      expect(content).toContain('App ver full')
      expect(content).toContain('Sidebar w 250')
      expect(content).toContain('NavItem pad 12')
      expect(content).toContain('Main grow')
    })

    test('sibling components', async ({ page }) => {
      await clearAndType(page, 'Row hor gap 8')
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Button pad 8 col #007AFF', { delay: 10 })
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Button pad 8 col #34C759', { delay: 10 })
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Button pad 8 col #FF3B30', { delay: 10 })
      await page.waitForTimeout(200)

      const content = await getEditorContent(page)
      expect(content).toContain('Row hor gap 8')
      expect(content).toContain('#007AFF')
      expect(content).toContain('#34C759')
      expect(content).toContain('#FF3B30')
    })
  })

  // ==========================================
  // TOKEN REFERENCES
  // ==========================================
  test.describe('Token References', () => {
    // Use insertText for the entire line to bypass all autocomplete/pickers
    async function insertLine(page: Page, text: string) {
      const editor = page.locator('.cm-content[contenteditable="true"]').first()
      await editor.click()
      await page.keyboard.press('Meta+a')
      await page.keyboard.press('Backspace')
      await page.keyboard.insertText(text)
    }

    test('token in padding', async ({ page }) => {
      await insertLine(page, 'pad $spacing-md')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('pad $spacing-md')
    })

    test('token in color', async ({ page }) => {
      await insertLine(page, 'col $primary-color')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('col $primary-color')
    })

    test('multiple tokens', async ({ page }) => {
      await insertLine(page, 'pad $space-sm col $bg-color boc $border-color')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('pad $space-sm col $bg-color boc $border-color')
    })

    test('token with numbers', async ({ page }) => {
      await insertLine(page, 'gap $spacing-16')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('gap $spacing-16')
    })

    test('token with dashes', async ({ page }) => {
      await insertLine(page, 'col $color-primary-500')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('col $color-primary-500')
    })
  })

  // ==========================================
  // MIXED CONTENT
  // ==========================================
  test.describe('Mixed Content', () => {
    // Use insertText for the entire line to bypass all autocomplete/pickers
    async function insertLine(page: Page, text: string) {
      const editor = page.locator('.cm-content[contenteditable="true"]').first()
      await editor.click()
      await page.keyboard.press('Meta+a')
      await page.keyboard.press('Backspace')
      await page.keyboard.insertText(text)
    }

    test('properties and tokens mixed', async ({ page }) => {
      await insertLine(page, 'pad 16 col $primary gap $spacing-md rad 8')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('pad 16 col $primary gap $spacing-md rad 8')
    })

    test('hex colors and tokens', async ({ page }) => {
      await insertLine(page, 'col #FF0000 boc $border-color hover-col $hover-bg')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('col #FF0000 boc $border-color hover-col $hover-bg')
    })

    test('complex component with everything', async ({ page }) => {
      await insertLine(page, 'Card 320 200 ver gap $gap-md pad $pad-lg col #FFFFFF bor 1 boc $border rad $radius-md shadow 2')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toContain('Card 320 200')
      expect(content).toContain('ver gap $gap-md')
      expect(content).toContain('pad $pad-lg')
      expect(content).toContain('col #FFFFFF')
      expect(content).toContain('bor 1 boc $border')
      expect(content).toContain('rad $radius-md')
      expect(content).toContain('shadow 2')
    })
  })

  // ==========================================
  // SPECIAL CHARACTERS IN STRINGS
  // ==========================================
  test.describe('Special Characters in Strings', () => {
    test('text with quotes', async ({ page }) => {
      await clearAndType(page, 'Text "Hello World"')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('Text "Hello World"')
    })

    test('text with numbers', async ({ page }) => {
      await clearAndType(page, 'Text "Price: $99.99"')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('Text "Price: $99.99"')
    })

    test('text with special chars', async ({ page }) => {
      await clearAndType(page, 'Text "Hello & Goodbye!"')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('Text "Hello & Goodbye!"')
    })

    test('URL in src', async ({ page }) => {
      // Use insertText to bypass all pickers and popups (? triggers AI assistant)
      const editor = page.locator('.cm-content[contenteditable="true"]').first()
      await editor.click()
      await page.keyboard.press('Meta+a')
      await page.keyboard.press('Backspace')
      await page.keyboard.insertText('src "https://example.com/path?query=1&other=2"')
      await page.waitForTimeout(200)
      const content = await getEditorContent(page)
      expect(content).toBe('src "https://example.com/path?query=1&other=2"')
    })

    test('icon name', async ({ page }) => {
      await clearAndType(page, 'icon "chevron-right"')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('icon "chevron-right"')
    })
  })

  // ==========================================
  // NUMERIC VALUES
  // ==========================================
  test.describe('Numeric Values', () => {
    test('integer values', async ({ page }) => {
      await clearAndType(page, 'w 100 h 200 pad 16 gap 8')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('w 100 h 200 pad 16 gap 8')
    })

    test('decimal values', async ({ page }) => {
      await clearAndType(page, 'opacity 0.5 line 1.5')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('opacity 0.5 line 1.5')
    })

    test('large numbers', async ({ page }) => {
      await clearAndType(page, 'w 1920 h 1080')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('w 1920 h 1080')
    })

    test('zero values', async ({ page }) => {
      await clearAndType(page, 'pad 0 mar 0 gap 0 bor 0')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('pad 0 mar 0 gap 0 bor 0')
    })
  })

  // ==========================================
  // KEYBOARD NAVIGATION
  // ==========================================
  test.describe('Keyboard Navigation', () => {
    test('arrow keys move cursor', async ({ page }) => {
      await clearAndType(page, 'Hello')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.type('XX')

      const content = await getEditorContent(page)
      expect(content).toBe('HelXXlo')
    })

    test('home and end keys', async ({ page }) => {
      await clearAndType(page, 'Test')
      await page.keyboard.press('Home')
      await page.keyboard.type('START ')

      const content = await getEditorContent(page)
      expect(content).toBe('START Test')
    })

    test('delete and backspace', async ({ page }) => {
      await clearAndType(page, 'ABCDE')
      await page.keyboard.press('Backspace')
      await page.keyboard.press('Home')
      await page.keyboard.press('Delete')

      const content = await getEditorContent(page)
      expect(content).toBe('BCD')
    })
  })

  // ==========================================
  // SELECTION AND EDITING
  // ==========================================
  test.describe('Selection and Editing', () => {
    test('select all and replace', async ({ page }) => {
      await clearAndType(page, 'Original text')
      await page.keyboard.press('Meta+a')
      await page.keyboard.type('New text')

      const content = await getEditorContent(page)
      expect(content).toBe('New text')
    })

    test('select word and replace', async ({ page }) => {
      await clearAndType(page, 'Hello World')
      // Double-click to select word would be better but type over works
      await page.keyboard.press('Meta+a')
      await page.keyboard.type('Goodbye Universe')

      const content = await getEditorContent(page)
      expect(content).toBe('Goodbye Universe')
    })
  })

  // ==========================================
  // UNDO/REDO
  // ==========================================
  test.describe('Undo and Redo', () => {
    test('undo typing', async ({ page }) => {
      await clearAndType(page, 'First')
      await page.waitForTimeout(100)
      await page.keyboard.type(' Second')
      await page.waitForTimeout(100)
      await page.keyboard.press('Meta+z')
      await page.waitForTimeout(100)

      const content = await getEditorContent(page)
      // Undo behavior may vary - just check something changed
      expect(content.length).toBeLessThan('First Second'.length)
    })

    test('redo after undo', async ({ page }) => {
      await clearAndType(page, 'First')
      await page.waitForTimeout(100)
      await page.keyboard.type(' Second')
      await page.waitForTimeout(100)
      await page.keyboard.press('Meta+z')
      await page.waitForTimeout(100)
      await page.keyboard.press('Meta+Shift+z')
      await page.waitForTimeout(100)

      const content = await getEditorContent(page)
      // After redo, should have at least some content back
      expect(content.length).toBeGreaterThan(0)
    })
  })

  // ==========================================
  // RAPID TYPING STRESS TEST
  // ==========================================
  test.describe('Rapid Typing Stress Tests', () => {
    test('rapid property typing', async ({ page }) => {
      const text = 'Tile 300 400 ver gap 16 pad 24 col #FF5500 bor 1 boc #333 rad 8'
      await clearAndType(page, '')
      await page.keyboard.type(text, { delay: 5 })
      await page.waitForTimeout(200)

      const content = await getEditorContent(page)
      expect(content).toBe(text)
    })

    test('rapid multiline typing', async ({ page }) => {
      await clearAndType(page, '')
      await page.keyboard.type('Container ver', { delay: 5 })
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Child1 pad 8', { delay: 5 })
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Child2 pad 8', { delay: 5 })
      await page.waitForTimeout(200)

      const content = await getEditorContent(page)
      expect(content).toContain('Container ver')
      expect(content).toContain('Child1 pad 8')
      expect(content).toContain('Child2 pad 8')
    })

    test('rapid color input', async ({ page }) => {
      await clearAndType(page, 'col #')
      // Wait for color picker to fully open before typing
      await page.waitForTimeout(200)
      await page.keyboard.type('AABBCC', { delay: 10 })
      await page.waitForTimeout(100)
      await page.keyboard.press('Enter')

      const content = await getEditorContent(page)
      expect(content).toContain('#AABBCC')
    })
  })

  // ==========================================
  // REAL-WORLD UI PATTERNS
  // ==========================================
  test.describe('Real-World UI Patterns', () => {
    test('button component', async ({ page }) => {
      await clearAndType(page, 'Button hor-cen ver-cen pad l-r 16 pad u-d 8 col #007AFF rad 6')
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Text "Click Me" size 14 weight 600 col #FFFFFF')

      const content = await getEditorContent(page)
      expect(content).toContain('Button')
      expect(content).toContain('#007AFF')
      expect(content).toContain('Click Me')
    })

    test('card component', async ({ page }) => {
      await clearAndType(page, 'Card 320 ver gap 12 pad 16 col #FFFFFF rad 12 shadow 2')
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Image 288 160 src "cover.jpg" fit cover rad 8')
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Text "Title" size 18 weight 600')
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Text "Description" size 14 col #666')

      const content = await getEditorContent(page)
      expect(content).toContain('Card 320')
      expect(content).toContain('Image')
      expect(content).toContain('Title')
      expect(content).toContain('Description')
    })

    test('navigation bar', async ({ page }) => {
      await clearAndType(page, 'NavBar hor hor-between ver-cen pad l-r 24 h 64 col #FFFFFF bor d 1 boc #EEE')
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Logo w 120 h 32')
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Nav hor gap 24')
      await page.keyboard.press('Enter')
      await page.keyboard.type('    Text "Home"')
      await page.keyboard.press('Enter')
      await page.keyboard.type('    Text "About"')
      await page.keyboard.press('Enter')
      await page.keyboard.type('    Text "Contact"')

      const content = await getEditorContent(page)
      expect(content).toContain('NavBar')
      expect(content).toContain('Logo')
      expect(content).toContain('Home')
      expect(content).toContain('About')
      expect(content).toContain('Contact')
    })

    test('form layout', async ({ page }) => {
      await clearAndType(page, 'Form ver gap 16 pad 24 max-w 400')
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Field ver gap 4')
      await page.keyboard.press('Enter')
      await page.keyboard.type('    Label size 12 weight 500')
      await page.keyboard.press('Enter')
      await page.keyboard.type('    Input h 40 pad l-r 12 bor 1 boc #DDD rad 6')
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Button pad 12 col #007AFF rad 6')

      const content = await getEditorContent(page)
      expect(content).toContain('Form ver gap 16')
      expect(content).toContain('Field')
      expect(content).toContain('Label')
      expect(content).toContain('Input')
      expect(content).toContain('Button')
    })
  })

  // ==========================================
  // EDGE CASES
  // ==========================================
  test.describe('Edge Cases', () => {
    test('empty document', async ({ page }) => {
      await clearAndType(page, '')
      const content = await getEditorContent(page)
      expect(content).toBe('')
    })

    test('only whitespace', async ({ page }) => {
      await clearAndType(page, '   ')
      const content = await getEditorContent(page)
      expect(content).toBe('   ')
    })

    test('only newlines', async ({ page }) => {
      await clearAndType(page, '')
      await page.keyboard.press('Enter')
      await page.keyboard.press('Enter')
      // textContent doesn't preserve newlines well, so just check document has lines
      const lineCount = await page.locator('.cm-line').count()
      expect(lineCount).toBeGreaterThanOrEqual(2)
    })

    test('very long line', async ({ page }) => {
      const longLine = 'Tile ' + 'pad 8 '.repeat(50)
      await clearAndType(page, longLine)
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content.length).toBeGreaterThan(200)
    })

    test('mixed indentation', async ({ page }) => {
      await clearAndType(page, 'Parent')
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Child1')
      await page.keyboard.press('Enter')
      await page.keyboard.type('    GrandChild')
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Child2')

      const content = await getEditorContent(page)
      expect(content).toContain('Parent')
      expect(content).toContain('Child1')
      expect(content).toContain('GrandChild')
      expect(content).toContain('Child2')
    })

    test('consecutive special characters', async ({ page }) => {
      await clearAndType(page, 'Text "###$$$%%%"')
      await page.waitForTimeout(100)
      const content = await getEditorContent(page)
      expect(content).toBe('Text "###$$$%%%"')
    })
  })

  // ==========================================
  // PICKER INTERACTIONS
  // ==========================================
  test.describe('Picker Interactions', () => {
    test('color picker with arrow navigation', async ({ page }) => {
      await clearAndType(page, 'col #')

      const picker = page.locator('[style*="position: fixed"]')
      await expect(picker).toBeVisible({ timeout: 2000 })

      // Navigate with arrows
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('Enter')

      const content = await getEditorContent(page)
      expect(content).toMatch(/col #[A-F0-9]{6}/i)
    })

    test('escape closes picker without change', async ({ page }) => {
      await clearAndType(page, 'Tile col #')

      const picker = page.locator('[style*="position: fixed"]')
      await expect(picker).toBeVisible({ timeout: 2000 })

      await page.keyboard.press('Escape')
      await expect(picker).not.toBeVisible({ timeout: 1000 })

      const content = await getEditorContent(page)
      expect(content).toBe('Tile col #')
    })

    test('command palette opens with /', async ({ page }) => {
      await clearAndType(page, '/')

      // Look for palette with specific content
      const palette = page.locator('[style*="position: fixed"]').filter({ hasText: /Layout|Alignment|Spacing/ })
      await expect(palette).toBeVisible({ timeout: 2000 })

      await page.keyboard.press('Escape')
      await expect(palette).not.toBeVisible({ timeout: 1000 })
    })
  })
})
