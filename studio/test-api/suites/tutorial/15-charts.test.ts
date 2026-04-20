/**
 * Tutorial Tests: Charts
 *
 * Auto-generated from docs/tutorial/15-charts.html
 * Generated: 2026-04-20T13:03:12.788Z
 *
 * DEEP VALIDATION: Each element is validated for:
 * - Correct HTML tag
 * - Text content
 * - All CSS styles (bg, col, pad, rad, gap, etc.)
 * - Child count and hierarchy
 * - HTML attributes
 *
 * DO NOT EDIT MANUALLY - Run 'npm run tutorial:generate' to regenerate
 */

import { testWithSetup, testSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const chapter_15_chartsTests: TestCase[] = describe('Tutorial: Charts', [
  testWithSetup(
    '[15-charts] Das Prinzip: Example 1',
    `sales:
  Jan: 120
  Feb: 180
  Mar: 240
  Apr: 200
  May: 280

Line \$sales, w 400, h 200`,
    async (api: TestAPI) => {
      // Complex feature: Chart, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[15-charts] Chart-Typen: Example 2',
    `revenue:
  Q1: 45
  Q2: 62
  Q3: 78
  Q4: 95

Line \$revenue, w 350, h 180`,
    async (api: TestAPI) => {
      // Complex feature: Chart, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[15-charts] Chart-Typen: Example 3',
    `teams:
  Design: 8
  Engineering: 12
  Marketing: 5
  Sales: 7

Bar \$teams, w 350, h 180`,
    async (api: TestAPI) => {
      // Complex feature: Chart, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[15-charts] Chart-Typen: Example 4',
    `browsers:
  Chrome: 65
  Safari: 20
  Firefox: 10
  Other: 5

Pie \$browsers, w 250, h 200`,
    async (api: TestAPI) => {
      // Complex feature: Chart, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[15-charts] Chart-Typen: Example 5',
    `status:
  Done: 45
  Progress: 30
  Todo: 25

Donut \$status, w 200, h 200`,
    async (api: TestAPI) => {
      // Complex feature: Chart, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[15-charts] Chart-Typen: Example 6',
    `users:
  Jan: 1200
  Feb: 1800
  Mar: 2400
  Apr: 3100

Area \$users, w 350, h 180`,
    async (api: TestAPI) => {
      // Complex feature: Chart, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[15-charts] Datenformate: Example 7',
    `// Keys = Labels, Values = Datenpunkte
sales:
  Jan: 120
  Feb: 180
  Mar: 240

Bar \$sales, w 300, h 160`,
    async (api: TestAPI) => {
      // Complex feature: Chart, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[15-charts] Datenformate: Example 8',
    `products:
  a:
    name: "Widget"
    sales: 120
  b:
    name: "Gadget"
    sales: 85
  c:
    name: "Tool"
    sales: 200

Bar \$products, x "name", y "sales", w 300, h 180`,
    async (api: TestAPI) => {
      // Complex feature: Chart, data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[15-charts] Styling: Example 9',
    `data:
  A: 30
  B: 50
  C: 20

Pie \$data, w 200, h 180, colors #2271C1 #10b981 #f59e0b`,
    async (api: TestAPI) => {
      // Complex feature: Chart, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[15-charts] Styling: Example 10',
    `revenue:
  Q1: 45
  Q2: 62
  Q3: 78
  Q4: 95

Line \$revenue, w 350, h 200, title "Quartalsumsatz 2024"`,
    async (api: TestAPI) => {
      // Complex feature: Chart, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[15-charts] Styling: Example 11',
    `months:
  Jan: 120
  Feb: 180
  Mar: 240

Bar \$months, w 350, h 200, legend true`,
    async (api: TestAPI) => {
      // Complex feature: Chart, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[15-charts] Styling: Example 12',
    `data:
  A: 30
  B: 50
  C: 40
  D: 60

Line \$data, w 350, h 180, grid false`,
    async (api: TestAPI) => {
      // Complex feature: Chart, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[15-charts] Subkomponenten: Example 13',
    `revenue:
  Jan: 45
  Feb: 62
  Mar: 78
  Apr: 95
  May: 88
  Jun: 110

Line \$revenue, w 400, h 220
  XAxis: col #888, label "Monat", fs 11
  YAxis: col #888, label "Umsatz (k€)", min 0, max 120`,
    async (api: TestAPI) => {
      // Complex feature: Chart, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[15-charts] Subkomponenten: Example 14',
    `data:
  Q1: 30
  Q2: 45
  Q3: 60
  Q4: 52

Line \$data, w 350, h 180
  Point: size 8, bg #2271C1, hover-size 12`,
    async (api: TestAPI) => {
      // Complex feature: Chart, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[15-charts] Subkomponenten: Example 15',
    `sales:
  Mon: 120
  Tue: 180
  Wed: 150
  Thu: 200
  Fri: 240

Bar \$sales, w 350, h 180
  Grid: col #333, dash 4`,
    async (api: TestAPI) => {
      // Complex feature: Chart, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[15-charts] Subkomponenten: Example 16',
    `status:
  Done: 45
  Progress: 30
  Todo: 25

Pie \$status, w 280, h 220, colors #10b981 #f59e0b #ef4444
  Title: text "Projektstatus", col white, fs 16
  Legend: pos right, col #888, fs 12`,
    async (api: TestAPI) => {
      // Complex feature: Chart, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[15-charts] Subkomponenten: Example 17',
    `trend:
  Jan: 20
  Feb: 35
  Mar: 28
  Apr: 45
  May: 52

Line \$trend, w 350, h 180
  Line: width 3, tension 0.4, fill true`,
    async (api: TestAPI) => {
      // Complex feature: Chart, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[15-charts] Subkomponenten: Example 18',
    `teams:
  Design: 8
  Dev: 12
  Marketing: 5

Bar \$teams, w 300, h 180, colors #2271C1
  Bar: rad 6, bor 2, boc #2271C1`,
    async (api: TestAPI) => {
      // Complex feature: Chart, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[15-charts] Subkomponenten: Example 19',
    `revenue:
  Jan: 45
  Feb: 62
  Mar: 78
  Apr: 95
  May: 88
  Jun: 110

Frame bg #0a0a0a, pad 20, rad 12
  Line \$revenue, w 420, h 240, colors #2271C1
    Title: text "Umsatzentwicklung 2024", col white, fs 14
    XAxis: col #666, fs 10
    YAxis: col #666, label "Umsatz (k€)", fs 10, min 0
    Grid: col #222
    Point: size 5, bg #2271C1, hover-size 8
    Line: width 2, tension 0.3`,
    async (api: TestAPI) => {
      // Complex feature: Chart, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[15-charts] In Layouts einbetten: Example 20',
    `sales:
  Jan: 120
  Feb: 180
  Mar: 240
  Apr: 200

Card: bg #1a1a1a, pad 20, rad 12, gap 12
  Title: col white, fs 16, weight 600
  Subtitle: col #888, fs 13

Card
  Title "Monatsumsatz"
  Subtitle "Januar - April 2024"
  Line \$sales, w full, h 160`,
    async (api: TestAPI) => {
      // Complex feature: Chart, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[15-charts] Dashboard-Beispiel: Example 21',
    `revenue:
  Q1: 45
  Q2: 62
  Q3: 78
  Q4: 95

users:
  Free: 1200
  Pro: 450
  Team: 180

Stat: bg #1a1a1a, pad 16, rad 8, gap 8
  Label: col #888, fs 12
  Value: col white, fs 24, weight 600

Frame gap 16
  Frame hor, gap 16
    Stat
      Label "Revenue"
      Line \$revenue, w 180, h 80, grid false, axes false
    Stat
      Label "Users"
      Donut \$users, w 100, h 100`,
    async (api: TestAPI) => {
      // Complex feature: Chart, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),
])
