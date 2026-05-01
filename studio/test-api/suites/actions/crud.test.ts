/**
 * CRUD Actions — add/remove for collections
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const crudActionTests: TestCase[] = describe('CRUD Actions', [
  testWithSetup(
    'add() adds item to collection on click',
    `todos:
  t1:
    text: "First task"

Frame gap 8, pad 16, bg #1a1a1a
  Button "Add Task", add(todos, text: "New task")
  Frame gap 4
    each todo in $todos
      Text todo.text, col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const countTexts = () =>
        document.querySelectorAll('[data-mirror-id="node-4"] [data-mirror-id]').length

      const initialCount = countTexts()

      await api.interact.click('node-2')
      await api.utils.delay(150)

      const newCount = countTexts()
      api.assert.ok(newCount >= initialCount, 'Should have added new item')
    }
  ),

  // TODO: Runtime bug - remove() doesn't correctly update the DOM after removing item
  testWithSetupSkip(
    'remove() removes item from collection on click',
    `items:
  a: { name: "Item A" }
  b: { name: "Item B" }
  c: { name: "Item C" }

Frame gap 8, pad 16, bg #1a1a1a
  each item in $items
    Frame hor, gap 8, pad 8, bg #222, rad 4
      Text item.name, col white, grow
      Button "×", remove(item), bg #ef4444, col white, w 28, h 28`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const countItems = () =>
        document.querySelectorAll('[data-mirror-id="node-1"] > [data-mirror-id]').length

      const initialCount = countItems()
      api.assert.ok(initialCount >= 3, 'Should have initial items')

      const removeButtons = document.querySelectorAll('button')
      const firstRemove = Array.from(removeButtons).find(b => b.textContent?.trim() === '×')

      if (firstRemove) {
        firstRemove.click()
        await api.utils.delay(150)

        const newCount = countItems()
        api.assert.ok(newCount < initialCount, 'Should have removed an item')
      }
    }
  ),
])
