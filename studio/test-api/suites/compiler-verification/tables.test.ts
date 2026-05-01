/**
 * Compiler Verification — Tables
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 37. Tables
// =============================================================================

export const tableTests: TestCase[] = describe('Tables', [
  testWithSetup(
    'Static table',
    `Table bg #1a1a1a, rad 8
  TableHeader hor, gap 24, pad 12 16, bg #252525
    Text "Name", col #888, fs 11, uppercase
    Text "Status", col #888, fs 11, uppercase
    Text "Action", col #888, fs 11, uppercase
  TableRow hor, gap 24, pad 12 16
    Text "Alice", col white
    Text "Active", col white
    Text "Edit", col white
  TableRow hor, gap 24, pad 12 16
    Text "Bob", col white
    Text "Pending", col white
    Text "Edit", col white
  TableRow hor, gap 24, pad 12 16
    Text "Charlie", col white
    Text "Inactive", col white
    Text "Edit", col white`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Table should render')
    }
  ),

  testWithSetup(
    'Data-driven table',
    `users:
  u1:
    name: "Alice"
    email: "alice@example.com"
    role: "Admin"
  u2:
    name: "Bob"
    email: "bob@example.com"
    role: "User"
  u3:
    name: "Charlie"
    email: "charlie@example.com"
    role: "Editor"

Table bg #1a1a1a, rad 8
  TableHeader hor, pad 12, bg #222
    Text "Name", col #888, fs 11, uppercase
    Text "Email", col #888, fs 11, uppercase
    Text "Role", col #888, fs 11, uppercase
  each user in $users
    TableRow hor, pad 12, bg #1a1a1a
      Text user.name, col white
      Text user.email, col #888
      Text user.role, col #2271C1`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Data table should render')
    }
  ),
])
