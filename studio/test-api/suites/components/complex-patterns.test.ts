/**
 * Complex Component Pattern Tests (FormField, Navigation, Avatar, Alert)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const complexComponentTests: TestCase[] = describe('Complex Component Patterns', [
  testWithSetup(
    'Form field component',
    `FormField: gap 4
  Label: fs 12, col #888, weight 500, uppercase
  Input: pad 12, bg #222, col white, rad 6, bor 1, boc #444
  Error: fs 11, col #ef4444, hidden

FormField
  Label "Email"
  Input placeholder "Enter email..."`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Navigation component',
    `NavItem: pad 12 16, col #888, rad 6, cursor pointer
  hover:
    bg #222
    col white
  selected:
    bg #2271C1
    col white

Frame gap 4, w 200, bg #1a1a1a, pad 8
  NavItem "Dashboard", selected
  NavItem "Projects"
  NavItem "Settings"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')
    }
  ),

  testWithSetup(
    'Avatar component with sizes',
    `Avatar: rad 99, center, bg #333, col white, weight 500
SmallAvatar as Avatar: w 32, h 32, fs 12
MediumAvatar as Avatar: w 40, h 40, fs 14
LargeAvatar as Avatar: w 56, h 56, fs 18

Frame hor, gap 12, ver-center
  SmallAvatar
    Text "S"
  MediumAvatar
    Text "M"
  LargeAvatar
    Text "L"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-4')
      api.assert.exists('node-6')
    }
  ),

  testWithSetup(
    'Alert component with icon',
    `Alert: hor, pad 12 16, rad 6, gap 12, ver-center
  AlertIcon: is 20
  AlertContent: grow

SuccessAlert as Alert: bg #10b98120, bor 1, boc #10b981
ErrorAlert as Alert: bg #ef444420, bor 1, boc #ef4444

Frame gap 8
  SuccessAlert
    AlertIcon
      Icon "check-circle", ic #10b981
    AlertContent
      Text "Operation successful", col #10b981
  ErrorAlert
    AlertIcon
      Icon "x-circle", ic #ef4444
    AlertContent
      Text "Something went wrong", col #ef4444`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-6')
    }
  ),
])
