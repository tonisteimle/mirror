import { test } from '@playwright/test'

test('debug DOM structure', async ({ page }) => {
  await page.goto('/docs/tutorial/11-navigation.html', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-playground]', { timeout: 10000 })
  await page.waitForTimeout(2000)

  const structure = await page.evaluate(() => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const playground = playgrounds[17]  // TreeView (17)
    const preview = playground?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return 'No shadow root'

    const root = shadow.querySelector('.mirror-root')
    if (!root) return 'No mirror-root'

    function getStructure(el: Element, depth: number = 0): string {
      if (depth > 8) return ''

      const attrs: string[] = []
      for (let i = 0; i < (el.attributes?.length || 0); i++) {
        const a = el.attributes[i]
        if (a.name.startsWith('data-') || a.name === 'role' || a.name === 'aria-selected') {
          attrs.push(a.name + '="' + a.value + '"')
        }
      }
      const attrsStr = attrs.join(' ')

      const tag = el.tagName?.toLowerCase() || 'text'
      let text = ''
      if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
        text = (el.textContent || '').trim().substring(0, 30)
      }

      let result = '  '.repeat(depth) + '<' + tag
      if (attrsStr) result += ' ' + attrsStr
      result += '>'
      if (text) result += ' "' + text + '"'
      result += '\n'

      for (let k = 0; k < (el.children?.length || 0); k++) {
        result += getStructure(el.children[k], depth + 1)
      }
      return result
    }

    // Also show info about root.children
    const childrenInfo = Array.from(root.children).map((c, i) => ({
      index: i,
      tag: c.tagName?.toLowerCase(),
      hasSlot: c.querySelector('[data-slot]') ? 'yes' : 'no'
    }))

    return {
      structure: getStructure(root),
      childCount: root.children.length,
      children: childrenInfo
    }
  })

  console.log('\n\n=== DOM Structure of playground ===\n')
  console.log('Root children:', JSON.stringify((structure as any).children, null, 2))
  console.log('\nStructure:')
  console.log((structure as any).structure)
  console.log('\n=== END ===\n')
})
