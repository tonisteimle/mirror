/**
 * Compiler Verification — Real-World Components
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 40. Real-World Components
// =============================================================================

export const realWorldComponentTests: TestCase[] = describe('Real-World Components', [
  testWithSetup(
    'Login form',
    `Frame w 350, pad 24, bg #1a1a1a, rad 12, gap 20, center
  Text "Welcome Back", col white, fs 24, weight bold, center
  Text "Sign in to continue", col #888, fs 14, center
  Frame gap 16, w full
    Frame gap 4
      Text "Email", col #888, fs 12
      Input placeholder "Enter your email", bg #333, col white, pad 12, rad 6, w full
    Frame gap 4
      Text "Password", col #888, fs 12
      Input type "password", placeholder "Enter your password", bg #333, col white, pad 12, rad 6, w full
    Frame hor, spread, ver-center
      Checkbox "Remember me"
      Text "Forgot password?", col #2271C1, fs 12, cursor pointer
  Button "Sign In", bg #2271C1, col white, pad 14 0, rad 6, w full, weight 500
  Frame hor, gap 4, center
    Text "Don't have an account?", col #888, fs 14
    Text "Sign up", col #2271C1, fs 14, cursor pointer`,
    async (api: TestAPI) => {
      const title = api.preview.findByText('Welcome Back')
      const signIn = api.preview.findByText('Sign In')

      api.assert.ok(title !== null, 'Title should exist')
      api.assert.ok(signIn !== null, 'Sign In button should exist')
    }
  ),

  testWithSetup(
    'Product card',
    `Frame w 280, bg #1a1a1a, rad 12, clip
  Frame w full, h 180, bg #333
    Image src "https://via.placeholder.com/280x180", w full, h full
  Frame pad 16, gap 12
    Frame hor, spread, ver-center
      Text "Product Name", col white, weight 500
      Frame hor, gap 4, ver-center
        Icon "star", ic #f59e0b, is 14, fill
        Text "4.8", col #f59e0b, fs 12
    Text "A great product description that explains the key features.", col #888, fs 14, line 1.4
    Frame hor, spread, ver-center
      Text "$99.00", col white, fs 20, weight bold
      Button "Add to Cart", bg #2271C1, col white, pad 8 16, rad 6, fs 14`,
    async (api: TestAPI) => {
      const productName = api.preview.findByText('Product Name')
      const addToCart = api.preview.findByText('Add to Cart')

      api.assert.ok(productName !== null, 'Product name should exist')
      api.assert.ok(addToCart !== null, 'Add to Cart button should exist')
    }
  ),

  testWithSetup(
    'Notification item',
    `Frame hor, gap 12, pad 12, bg #1a1a1a, rad 8, ver-center
  Frame w 40, h 40, bg #2271C1, rad 99, center, shrink
    Icon "bell", ic white, is 18
  Frame gap 2, grow
    Frame hor, spread, ver-center
      Text "New message", col white, weight 500
      Text "2m ago", col #666, fs 12
    Text "You have received a new message from John.", col #888, fs 14, truncate
  Button pad 8, bg transparent, rad 6
    Icon "x", ic #666, is 16
    hover:
      bg #333`,
    async (api: TestAPI) => {
      const title = api.preview.findByText('New message')
      api.assert.ok(title !== null, 'Notification title should exist')
    }
  ),

  testWithSetup(
    'Settings toggle list',
    `Frame gap 0, bg #1a1a1a, rad 8, clip, w 350
  Frame hor, spread, ver-center, pad 16, bor 0 0 1 0, boc #333
    Frame gap 2
      Text "Dark Mode", col white
      Text "Use dark theme throughout the app", col #666, fs 12
    Switch checked
  Frame hor, spread, ver-center, pad 16, bor 0 0 1 0, boc #333
    Frame gap 2
      Text "Notifications", col white
      Text "Receive push notifications", col #666, fs 12
    Switch
  Frame hor, spread, ver-center, pad 16, bor 0 0 1 0, boc #333
    Frame gap 2
      Text "Auto-save", col white
      Text "Automatically save changes", col #666, fs 12
    Switch checked
  Frame hor, spread, ver-center, pad 16
    Frame gap 2
      Text "Analytics", col white
      Text "Share anonymous usage data", col #666, fs 12
    Switch`,
    async (api: TestAPI) => {
      const darkMode = api.preview.findByText('Dark Mode')
      const notifications = api.preview.findByText('Notifications')
      const autoSave = api.preview.findByText('Auto-save')

      api.assert.ok(darkMode !== null, 'Dark Mode setting should exist')
      api.assert.ok(notifications !== null, 'Notifications setting should exist')
      api.assert.ok(autoSave !== null, 'Auto-save setting should exist')
    }
  ),

  testWithSetup(
    'Pricing card',
    `Frame w 300, bg #1a1a1a, rad 12, pad 24, gap 20
  Frame gap 4, center
    Text "Pro Plan", col #2271C1, fs 14, weight 500, uppercase
    Frame hor, gap 2, ver-center, center
      Text "$", col white, fs 18
      Text "29", col white, fs 48, weight bold
      Text "/month", col #888, fs 14
    Text "Perfect for growing businesses", col #888, fs 14, center
  Divider
  Frame gap 12
    Frame hor, gap 8, ver-center
      Icon "check", ic #10b981, is 16
      Text "Unlimited projects", col white, fs 14
    Frame hor, gap 8, ver-center
      Icon "check", ic #10b981, is 16
      Text "Priority support", col white, fs 14
    Frame hor, gap 8, ver-center
      Icon "check", ic #10b981, is 16
      Text "Advanced analytics", col white, fs 14
    Frame hor, gap 8, ver-center
      Icon "check", ic #10b981, is 16
      Text "Custom integrations", col white, fs 14
  Button "Get Started", bg #2271C1, col white, pad 14 0, rad 6, w full, weight 500`,
    async (api: TestAPI) => {
      const planName = api.preview.findByText('Pro Plan')
      const getStarted = api.preview.findByText('Get Started')

      api.assert.ok(planName !== null, 'Plan name should exist')
      api.assert.ok(getStarted !== null, 'Get Started button should exist')
    }
  ),
])
