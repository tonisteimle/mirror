/**
 * Real Screen Tests
 *
 * Tests the combined pipeline with realistic UI screens
 * that represent common application patterns.
 */

import { ImageToMirrorTestRunner, createTestCase } from '../../runner'
import { NestedRectangleAnalyzer } from '../../analyzers/nested-rectangle-analyzer'
import type { SemanticAnalysis } from '../schema'
import { runCombinedPipeline } from './index'

// =============================================================================
// Realistic Screen Test Cases
// =============================================================================

interface ScreenTestCase {
  name: string
  description: string
  inputCode: string
  semanticAnalysis: SemanticAnalysis
}

const REAL_SCREENS: ScreenTestCase[] = [
  // =============================================================================
  // 1. DASHBOARD SCREEN
  // =============================================================================
  {
    name: 'Dashboard Overview',
    description: 'Dashboard mit Stats-Cards, Quick Actions und Recent Activity',
    inputCode: `Frame w 800, h 600, bg #0a0a0a, pad 24, gap 24
  Frame hor, spread, ver-center
    Frame gap 4
      Text "Dashboard", col white, fs 24, weight bold
      Text "Welcome back, Max", col #666666, fs 14
    Frame hor, gap 12
      Frame w 120, h 40, bg #2271C1, rad 8, center
        Text "New Project", col white, fs 14
      Frame w 40, h 40, bg #1a1a1a, rad 8, center, bor 1, boc #333333
        Icon "bell", ic #888888, is 20
  Frame hor, gap 16
    Frame w 180, h 100, bg #1a1a1a, rad 12, pad 16, gap 8
      Frame hor, spread, ver-center
        Text "Revenue", col #888888, fs 12
        Icon "trending-up", ic #10b981, is 16
      Text "$24,500", col white, fs 28, weight bold
      Text "+12% from last month", col #10b981, fs 12
    Frame w 180, h 100, bg #1a1a1a, rad 12, pad 16, gap 8
      Frame hor, spread, ver-center
        Text "Users", col #888888, fs 12
        Icon "users", ic #2271C1, is 16
      Text "1,234", col white, fs 28, weight bold
      Text "+8% from last week", col #2271C1, fs 12
    Frame w 180, h 100, bg #1a1a1a, rad 12, pad 16, gap 8
      Frame hor, spread, ver-center
        Text "Orders", col #888888, fs 12
        Icon "shopping-cart", ic #f59e0b, is 16
      Text "456", col white, fs 28, weight bold
      Text "-3% from yesterday", col #ef4444, fs 12
    Frame w 180, h 100, bg #1a1a1a, rad 12, pad 16, gap 8
      Frame hor, spread, ver-center
        Text "Conversion", col #888888, fs 12
        Icon "percent", ic #8b5cf6, is 16
      Text "3.2%", col white, fs 28, weight bold
      Text "Same as last week", col #888888, fs 12
  Frame hor, gap 16, grow
    Frame grow, bg #1a1a1a, rad 12, pad 20, gap 16
      Frame hor, spread, ver-center
        Text "Recent Activity", col white, fs 16, weight 500
        Text "View all", col #2271C1, fs 14
      Frame gap 12
        Frame hor, gap 12, ver-center
          Frame w 40, h 40, bg #2271C1, rad 99, center
            Text "JD", col white, fs 14, weight 500
          Frame gap 2, grow
            Text "John Doe created a new project", col white, fs 14
            Text "2 minutes ago", col #666666, fs 12
        Frame hor, gap 12, ver-center
          Frame w 40, h 40, bg #10b981, rad 99, center
            Text "AS", col white, fs 14, weight 500
          Frame gap 2, grow
            Text "Anna Smith completed task #234", col white, fs 14
            Text "15 minutes ago", col #666666, fs 12
        Frame hor, gap 12, ver-center
          Frame w 40, h 40, bg #f59e0b, rad 99, center
            Text "TW", col white, fs 14, weight 500
          Frame gap 2, grow
            Text "Tom Weber uploaded 3 files", col white, fs 14
            Text "1 hour ago", col #666666, fs 12
    Frame w 280, bg #1a1a1a, rad 12, pad 20, gap 16
      Text "Quick Actions", col white, fs 16, weight 500
      Frame gap 8
        Frame hor, gap 12, pad 12, bg #252525, rad 8, ver-center
          Icon "plus", ic #2271C1, is 20
          Text "Create Task", col white, fs 14
        Frame hor, gap 12, pad 12, bg #252525, rad 8, ver-center
          Icon "upload", ic #10b981, is 20
          Text "Upload Files", col white, fs 14
        Frame hor, gap 12, pad 12, bg #252525, rad 8, ver-center
          Icon "users", ic #f59e0b, is 20
          Text "Invite Team", col white, fs 14
        Frame hor, gap 12, pad 12, bg #252525, rad 8, ver-center
          Icon "settings", ic #888888, is 20
          Text "Settings", col white, fs 14`,
    semanticAnalysis: {
      description: 'Dashboard mit Übersicht, Stats und Quick Actions',
      componentType: 'Dashboard',
      layout: 'vertical',
      children: [
        {
          type: 'Header',
          layout: 'horizontal',
          alignment: ['spread', 'ver-center'],
          children: [
            {
              type: 'Container',
              children: [
                { type: 'Text', role: 'heading', text: 'Dashboard' },
                { type: 'Text', role: 'description', text: 'Welcome back, Max' },
              ],
            },
            {
              type: 'ButtonGroup',
              layout: 'horizontal',
              children: [
                { type: 'Button', role: 'primary', text: 'New Project' },
                { type: 'IconButton', iconName: 'bell' },
              ],
            },
          ],
        },
        {
          type: 'Container',
          layout: 'horizontal',
          children: [
            {
              type: 'MetricCard',
              role: 'stat',
              children: [
                { type: 'Text', role: 'label', text: 'Revenue' },
                { type: 'Text', role: 'value', text: '$24,500' },
                { type: 'Text', role: 'trend', text: '+12% from last month' },
              ],
            },
            {
              type: 'MetricCard',
              role: 'stat',
              children: [
                { type: 'Text', role: 'label', text: 'Users' },
                { type: 'Text', role: 'value', text: '1,234' },
                { type: 'Text', role: 'trend', text: '+8% from last week' },
              ],
            },
            {
              type: 'MetricCard',
              role: 'stat',
              children: [
                { type: 'Text', role: 'label', text: 'Orders' },
                { type: 'Text', role: 'value', text: '456' },
                { type: 'Text', role: 'trend', text: '-3% from yesterday' },
              ],
            },
            {
              type: 'MetricCard',
              role: 'stat',
              children: [
                { type: 'Text', role: 'label', text: 'Conversion' },
                { type: 'Text', role: 'value', text: '3.2%' },
                { type: 'Text', role: 'trend', text: 'Same as last week' },
              ],
            },
          ],
        },
        {
          type: 'Container',
          layout: 'horizontal',
          grow: true,
          children: [
            {
              type: 'Card',
              grow: true,
              children: [
                { type: 'Text', role: 'heading', text: 'Recent Activity' },
                {
                  type: 'Container',
                  children: [
                    { type: 'ChatMessage' },
                    { type: 'ChatMessage' },
                    { type: 'ChatMessage' },
                  ],
                },
              ],
            },
            {
              type: 'Card',
              children: [
                { type: 'Text', role: 'heading', text: 'Quick Actions' },
                {
                  type: 'Navigation',
                  children: [
                    { type: 'NavItem', iconName: 'plus', text: 'Create Task' },
                    { type: 'NavItem', iconName: 'upload', text: 'Upload Files' },
                    { type: 'NavItem', iconName: 'users', text: 'Invite Team' },
                    { type: 'NavItem', iconName: 'settings', text: 'Settings' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },

  // =============================================================================
  // 2. SETTINGS SCREEN
  // =============================================================================
  {
    name: 'Settings Page',
    description: 'Settings mit Sections, Toggles und Form Fields',
    inputCode: `Frame w 600, h 700, bg #0a0a0a, pad 32, gap 32
  Frame gap 8
    Text "Settings", col white, fs 28, weight bold
    Text "Manage your account settings and preferences", col #666666, fs 14
  Frame gap 24
    Frame gap 16
      Text "Profile", col white, fs 18, weight 500
      Frame bg #1a1a1a, rad 12, pad 20, gap 16
        Frame hor, gap 16, ver-center
          Frame w 64, h 64, bg #2271C1, rad 99, center
            Text "MS", col white, fs 20, weight bold
          Frame gap 4, grow
            Text "Max Schmidt", col white, fs 16, weight 500
            Text "max@example.com", col #888888, fs 14
          Frame w 100, h 36, bg #252525, rad 6, center, bor 1, boc #333333
            Text "Edit", col white, fs 14
        Divider bg #333333
        Frame gap 12
          Frame gap 4
            Text "Display Name", col #888888, fs 12
            Frame w full, h 44, bg #252525, rad 6, pad 0 12, bor 1, boc #333333, ver-center
              Text "Max Schmidt", col white, fs 14
          Frame gap 4
            Text "Email Address", col #888888, fs 12
            Frame w full, h 44, bg #252525, rad 6, pad 0 12, bor 1, boc #333333, ver-center
              Text "max@example.com", col white, fs 14
    Frame gap 16
      Text "Notifications", col white, fs 18, weight 500
      Frame bg #1a1a1a, rad 12, pad 20, gap 12
        Frame hor, spread, ver-center
          Frame gap 2
            Text "Email Notifications", col white, fs 14
            Text "Receive email updates about your activity", col #666666, fs 12
          Switch checked
        Divider bg #333333
        Frame hor, spread, ver-center
          Frame gap 2
            Text "Push Notifications", col white, fs 14
            Text "Receive push notifications on your device", col #666666, fs 12
          Switch checked
        Divider bg #333333
        Frame hor, spread, ver-center
          Frame gap 2
            Text "Marketing Emails", col white, fs 14
            Text "Receive emails about new features and offers", col #666666, fs 12
          Switch
    Frame gap 16
      Text "Appearance", col white, fs 18, weight 500
      Frame bg #1a1a1a, rad 12, pad 20, gap 12
        Frame hor, spread, ver-center
          Frame gap 2
            Text "Dark Mode", col white, fs 14
            Text "Use dark theme throughout the app", col #666666, fs 12
          Switch checked
        Divider bg #333333
        Frame gap 4
          Text "Accent Color", col white, fs 14
          Frame hor, gap 8
            Frame w 32, h 32, bg #2271C1, rad 6, bor 2, boc white
            Frame w 32, h 32, bg #10b981, rad 6
            Frame w 32, h 32, bg #f59e0b, rad 6
            Frame w 32, h 32, bg #ef4444, rad 6
            Frame w 32, h 32, bg #8b5cf6, rad 6
  Frame hor, gap 12, spread
    Frame w 120, h 44, bg #252525, rad 8, center, bor 1, boc #333333
      Text "Cancel", col white, fs 14
    Frame w 120, h 44, bg #2271C1, rad 8, center
      Text "Save Changes", col white, fs 14`,
    semanticAnalysis: {
      description: 'Einstellungsseite mit Profil, Benachrichtigungen und Erscheinungsbild',
      componentType: 'SettingsPanel',
      layout: 'vertical',
      children: [
        {
          type: 'Container',
          children: [
            { type: 'Text', role: 'heading', text: 'Settings' },
            {
              type: 'Text',
              role: 'description',
              text: 'Manage your account settings and preferences',
            },
          ],
        },
        {
          type: 'Container',
          children: [
            {
              type: 'Container',
              children: [
                { type: 'Text', role: 'subheading', text: 'Profile' },
                {
                  type: 'Card',
                  children: [
                    {
                      type: 'ProfileCard',
                      layout: 'horizontal',
                      children: [
                        { type: 'Avatar', text: 'MS' },
                        {
                          type: 'UserInfo',
                          children: [
                            { type: 'Text', role: 'name', text: 'Max Schmidt' },
                            { type: 'Text', role: 'email', text: 'max@example.com' },
                          ],
                        },
                        { type: 'Button', role: 'secondary', text: 'Edit' },
                      ],
                    },
                    { type: 'Divider' },
                    {
                      type: 'Form',
                      children: [
                        {
                          type: 'FormField',
                          children: [
                            { type: 'Text', role: 'label', text: 'Display Name' },
                            { type: 'Input', text: 'Max Schmidt' },
                          ],
                        },
                        {
                          type: 'FormField',
                          children: [
                            { type: 'Text', role: 'label', text: 'Email Address' },
                            { type: 'Input', text: 'max@example.com' },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: 'Container',
              children: [
                { type: 'Text', role: 'subheading', text: 'Notifications' },
                {
                  type: 'Card',
                  children: [
                    {
                      type: 'ToggleRow',
                      children: [
                        {
                          type: 'Container',
                          children: [
                            { type: 'Text', role: 'title', text: 'Email Notifications' },
                            {
                              type: 'Text',
                              role: 'description',
                              text: 'Receive email updates about your activity',
                            },
                          ],
                        },
                        { type: 'Switch', state: 'checked' },
                      ],
                    },
                    { type: 'Divider' },
                    {
                      type: 'ToggleRow',
                      children: [
                        {
                          type: 'Container',
                          children: [
                            { type: 'Text', role: 'title', text: 'Push Notifications' },
                            {
                              type: 'Text',
                              role: 'description',
                              text: 'Receive push notifications on your device',
                            },
                          ],
                        },
                        { type: 'Switch', state: 'checked' },
                      ],
                    },
                    { type: 'Divider' },
                    {
                      type: 'ToggleRow',
                      children: [
                        {
                          type: 'Container',
                          children: [
                            { type: 'Text', role: 'title', text: 'Marketing Emails' },
                            {
                              type: 'Text',
                              role: 'description',
                              text: 'Receive emails about new features and offers',
                            },
                          ],
                        },
                        { type: 'Switch' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'ButtonGroup',
          layout: 'horizontal',
          alignment: 'spread',
          children: [
            { type: 'Button', role: 'cancel', text: 'Cancel' },
            { type: 'Button', role: 'submit', text: 'Save Changes' },
          ],
        },
      ],
    },
  },

  // =============================================================================
  // 3. USER LIST / TABLE
  // =============================================================================
  {
    name: 'User Management Table',
    description: 'Benutzerliste mit Suche, Filter und Aktionen',
    inputCode: `Frame w 800, h 500, bg #0a0a0a, pad 24, gap 20
  Frame hor, spread, ver-center
    Frame gap 4
      Text "Users", col white, fs 24, weight bold
      Text "Manage team members and their permissions", col #666666, fs 14
    Frame w 140, h 40, bg #2271C1, rad 8, center
      Frame hor, gap 8, ver-center
        Icon "plus", ic white, is 16
        Text "Add User", col white, fs 14
  Frame hor, gap 12
    Frame grow, h 44, bg #1a1a1a, rad 8, pad 0 16, bor 1, boc #333333, hor, gap 12, ver-center
      Icon "search", ic #666666, is 20
      Text "Search users...", col #666666, fs 14
    Frame w 140, h 44, bg #1a1a1a, rad 8, pad 0 16, bor 1, boc #333333, hor, spread, ver-center
      Text "All Roles", col white, fs 14
      Icon "chevron-down", ic #888888, is 16
    Frame w 140, h 44, bg #1a1a1a, rad 8, pad 0 16, bor 1, boc #333333, hor, spread, ver-center
      Text "Status", col white, fs 14
      Icon "chevron-down", ic #888888, is 16
  Frame bg #1a1a1a, rad 12, clip, grow
    Frame hor, bg #252525, pad 16, bor 0 0 1 0, boc #333333
      Text "Name", col #888888, fs 12, w 200
      Text "Email", col #888888, fs 12, w 220
      Text "Role", col #888888, fs 12, w 100
      Text "Status", col #888888, fs 12, w 100
      Text "Actions", col #888888, fs 12, w 100
    Frame hor, pad 16, bor 0 0 1 0, boc #333333, ver-center
      Frame hor, gap 12, w 200, ver-center
        Frame w 36, h 36, bg #2271C1, rad 99, center
          Text "MS", col white, fs 12, weight 500
        Text "Max Schmidt", col white, fs 14
      Text "max@example.com", col #888888, fs 14, w 220
      Frame w 100
        Frame pad 4 8, bg #2271C1, rad 4, w hug
          Text "Admin", col white, fs 11
      Frame w 100
        Frame hor, gap 6, ver-center
          Frame w 8, h 8, bg #10b981, rad 99
          Text "Active", col #10b981, fs 12
      Frame hor, gap 8, w 100
        Icon "edit", ic #888888, is 16
        Icon "trash", ic #888888, is 16
    Frame hor, pad 16, bor 0 0 1 0, boc #333333, ver-center
      Frame hor, gap 12, w 200, ver-center
        Frame w 36, h 36, bg #10b981, rad 99, center
          Text "AS", col white, fs 12, weight 500
        Text "Anna Smith", col white, fs 14
      Text "anna@example.com", col #888888, fs 14, w 220
      Frame w 100
        Frame pad 4 8, bg #8b5cf6, rad 4, w hug
          Text "Editor", col white, fs 11
      Frame w 100
        Frame hor, gap 6, ver-center
          Frame w 8, h 8, bg #10b981, rad 99
          Text "Active", col #10b981, fs 12
      Frame hor, gap 8, w 100
        Icon "edit", ic #888888, is 16
        Icon "trash", ic #888888, is 16
    Frame hor, pad 16, bor 0 0 1 0, boc #333333, ver-center
      Frame hor, gap 12, w 200, ver-center
        Frame w 36, h 36, bg #f59e0b, rad 99, center
          Text "TW", col white, fs 12, weight 500
        Text "Tom Weber", col white, fs 14
      Text "tom@example.com", col #888888, fs 14, w 220
      Frame w 100
        Frame pad 4 8, bg #666666, rad 4, w hug
          Text "Viewer", col white, fs 11
      Frame w 100
        Frame hor, gap 6, ver-center
          Frame w 8, h 8, bg #888888, rad 99
          Text "Pending", col #888888, fs 12
      Frame hor, gap 8, w 100
        Icon "edit", ic #888888, is 16
        Icon "trash", ic #888888, is 16
    Frame hor, pad 16, ver-center
      Frame hor, gap 12, w 200, ver-center
        Frame w 36, h 36, bg #ef4444, rad 99, center
          Text "LK", col white, fs 12, weight 500
        Text "Lisa König", col white, fs 14
      Text "lisa@example.com", col #888888, fs 14, w 220
      Frame w 100
        Frame pad 4 8, bg #666666, rad 4, w hug
          Text "Viewer", col white, fs 11
      Frame w 100
        Frame hor, gap 6, ver-center
          Frame w 8, h 8, bg #ef4444, rad 99
          Text "Inactive", col #ef4444, fs 12
      Frame hor, gap 8, w 100
        Icon "edit", ic #888888, is 16
        Icon "trash", ic #888888, is 16`,
    semanticAnalysis: {
      description: 'Benutzerverwaltung mit Tabelle',
      componentType: 'Container',
      layout: 'vertical',
      children: [
        {
          type: 'Header',
          layout: 'horizontal',
          alignment: ['spread', 'ver-center'],
          children: [
            {
              type: 'Container',
              children: [
                { type: 'Text', role: 'heading', text: 'Users' },
                {
                  type: 'Text',
                  role: 'description',
                  text: 'Manage team members and their permissions',
                },
              ],
            },
            { type: 'Button', role: 'primary', iconName: 'plus', text: 'Add User' },
          ],
        },
        {
          type: 'SearchBar',
          layout: 'horizontal',
          children: [
            { type: 'Input', role: 'search', placeholder: 'Search users...' },
            { type: 'Select', role: 'filter', text: 'All Roles' },
            { type: 'Select', role: 'filter', text: 'Status' },
          ],
        },
        {
          type: 'Table',
          grow: true,
          children: [
            {
              type: 'Container',
              role: 'heading',
              layout: 'horizontal',
              children: [
                { type: 'Text', role: 'label', text: 'Name' },
                { type: 'Text', role: 'label', text: 'Email' },
                { type: 'Text', role: 'label', text: 'Role' },
                { type: 'Text', role: 'label', text: 'Status' },
                { type: 'Text', role: 'label', text: 'Actions' },
              ],
            },
            {
              type: 'TableRow',
              layout: 'horizontal',
              children: [
                {
                  type: 'Container',
                  children: [{ type: 'Avatar' }, { type: 'Text', text: 'Max Schmidt' }],
                },
                { type: 'Text', text: 'max@example.com' },
                { type: 'Badge', text: 'Admin' },
                { type: 'Badge', role: 'status', text: 'Active' },
                {
                  type: 'ActionBar',
                  children: [
                    { type: 'Icon', iconName: 'edit' },
                    { type: 'Icon', iconName: 'trash' },
                  ],
                },
              ],
            },
            { type: 'TableRow', layout: 'horizontal' },
            { type: 'TableRow', layout: 'horizontal' },
            { type: 'TableRow', layout: 'horizontal' },
          ],
        },
      ],
    },
  },

  // =============================================================================
  // 4. CHAT / MESSAGING INTERFACE
  // =============================================================================
  {
    name: 'Chat Interface',
    description: 'Chat-Ansicht mit Nachrichtenverlauf und Eingabe',
    inputCode: `Frame w 400, h 600, bg #0a0a0a, gap 0
  Frame hor, pad 16, bg #1a1a1a, gap 12, ver-center, bor 0 0 1 0, boc #333333
    Frame w 40, h 40, bg #2271C1, rad 99, center
      Text "AS", col white, fs 14, weight 500
    Frame gap 2, grow
      Text "Anna Smith", col white, fs 14, weight 500
      Frame hor, gap 6, ver-center
        Frame w 8, h 8, bg #10b981, rad 99
        Text "Online", col #10b981, fs 12
    Frame hor, gap 12
      Icon "phone", ic #888888, is 20
      Icon "video", ic #888888, is 20
      Icon "more-vertical", ic #888888, is 20
  Frame pad 16, gap 16, grow, scroll
    Frame gap 4
      Frame hor, gap 8
        Frame w 32, h 32, bg #2271C1, rad 99, center
          Text "AS", col white, fs 11
        Frame bg #1a1a1a, rad 12, pad 12, maxw 280
          Text "Hey! How's the project going?", col white, fs 14
      Text "10:30 AM", col #666666, fs 11, mar 0 0 0 40
    Frame gap 4, right
      Frame bg #2271C1, rad 12, pad 12, maxw 280
        Text "Going great! Just finished the design phase. Ready for your feedback.", col white, fs 14
      Text "10:32 AM", col #666666, fs 11
    Frame gap 4
      Frame hor, gap 8
        Frame w 32, h 32, bg #2271C1, rad 99, center
          Text "AS", col white, fs 11
        Frame bg #1a1a1a, rad 12, pad 12, maxw 280
          Text "Awesome! Can you share the Figma link?", col white, fs 14
      Text "10:33 AM", col #666666, fs 11, mar 0 0 0 40
    Frame gap 4, right
      Frame bg #2271C1, rad 12, pad 12, maxw 280
        Text "Sure, here it is:", col white, fs 14
      Text "10:34 AM", col #666666, fs 11
    Frame gap 4, right
      Frame bg #252525, rad 12, pad 12, maxw 280, hor, gap 12, ver-center
        Icon "link", ic #2271C1, is 20
        Frame gap 2
          Text "Design System v2", col #2271C1, fs 14
          Text "figma.com/file/abc123", col #888888, fs 12
      Text "10:34 AM", col #666666, fs 11
    Frame gap 4
      Frame hor, gap 8
        Frame w 32, h 32, bg #2271C1, rad 99, center
          Text "AS", col white, fs 11
        Frame bg #1a1a1a, rad 12, pad 12, maxw 280
          Text "Perfect! I'll review it today and get back to you with notes.", col white, fs 14
      Text "10:35 AM", col #666666, fs 11, mar 0 0 0 40
  Frame pad 16, bg #1a1a1a, bor 1 0 0 0, boc #333333
    Frame hor, gap 12, ver-center
      Icon "paperclip", ic #888888, is 20
      Frame grow, h 44, bg #252525, rad 22, pad 0 16, hor, ver-center
        Text "Type a message...", col #666666, fs 14
      Frame w 44, h 44, bg #2271C1, rad 99, center
        Icon "send", ic white, is 20`,
    semanticAnalysis: {
      description: 'Chat-Interface mit Header, Nachrichten und Eingabefeld',
      componentType: 'Container',
      layout: 'vertical',
      children: [
        {
          type: 'Header',
          layout: 'horizontal',
          children: [
            { type: 'Avatar', text: 'AS' },
            {
              type: 'UserInfo',
              children: [
                { type: 'Text', role: 'name', text: 'Anna Smith' },
                { type: 'Badge', role: 'status', text: 'Online' },
              ],
            },
            {
              type: 'ActionBar',
              children: [
                { type: 'Icon', iconName: 'phone' },
                { type: 'Icon', iconName: 'video' },
                { type: 'Icon', iconName: 'more-vertical' },
              ],
            },
          ],
        },
        {
          type: 'Container',
          grow: true,
          children: [
            {
              type: 'ChatMessage',
              role: 'received',
              children: [
                { type: 'Avatar' },
                { type: 'Bubble', text: "Hey! How's the project going?" },
              ],
            },
            {
              type: 'ChatMessage',
              role: 'sent',
              children: [{ type: 'Bubble', text: 'Going great! Just finished the design phase.' }],
            },
            { type: 'ChatMessage', role: 'received' },
            { type: 'ChatMessage', role: 'sent' },
            { type: 'ChatMessage', role: 'received' },
          ],
        },
        {
          type: 'Container',
          layout: 'horizontal',
          children: [
            { type: 'Icon', iconName: 'paperclip' },
            { type: 'Input', placeholder: 'Type a message...' },
            { type: 'IconButton', role: 'primary', iconName: 'send' },
          ],
        },
      ],
    },
  },

  // =============================================================================
  // 5. E-COMMERCE PRODUCT GRID
  // =============================================================================
  {
    name: 'Product Grid',
    description: 'E-Commerce Produktübersicht mit Filter und Grid',
    inputCode: `Frame w 900, h 600, bg #0a0a0a, hor, gap 0
  Frame w 220, bg #1a1a1a, pad 20, gap 24, bor 0 1 0 0, boc #333333
    Frame gap 16
      Text "Categories", col white, fs 14, weight 500
      Frame gap 8
        Frame hor, gap 8, pad 10, bg #252525, rad 6, ver-center
          Frame w 8, h 8, bg #2271C1, rad 2
          Text "Electronics", col white, fs 14
        Frame hor, gap 8, pad 10, ver-center
          Frame w 8, h 8, bg transparent, rad 2, bor 1, boc #666666
          Text "Clothing", col #888888, fs 14
        Frame hor, gap 8, pad 10, ver-center
          Frame w 8, h 8, bg transparent, rad 2, bor 1, boc #666666
          Text "Home & Garden", col #888888, fs 14
        Frame hor, gap 8, pad 10, ver-center
          Frame w 8, h 8, bg transparent, rad 2, bor 1, boc #666666
          Text "Sports", col #888888, fs 14
    Frame gap 16
      Text "Price Range", col white, fs 14, weight 500
      Frame gap 8
        Frame hor, gap 8
          Frame grow, h 40, bg #252525, rad 6, pad 0 12, ver-center
            Text "$0", col white, fs 14
          Frame grow, h 40, bg #252525, rad 6, pad 0 12, ver-center
            Text "$500", col white, fs 14
        Slider value 50
    Frame gap 16
      Text "Rating", col white, fs 14, weight 500
      Frame gap 8
        Frame hor, gap 4
          Icon "star", ic #f59e0b, is 16, fill
          Icon "star", ic #f59e0b, is 16, fill
          Icon "star", ic #f59e0b, is 16, fill
          Icon "star", ic #f59e0b, is 16, fill
          Icon "star", ic #333333, is 16
          Text "& up", col #888888, fs 12
  Frame grow, pad 24, gap 20
    Frame hor, spread, ver-center
      Text "Products", col white, fs 20, weight 500
      Frame hor, gap 8
        Text "Sort by:", col #888888, fs 14
        Frame hor, gap 4, ver-center
          Text "Featured", col white, fs 14
          Icon "chevron-down", ic #888888, is 16
    Frame hor, gap 16, wrap
      Frame w 200, bg #1a1a1a, rad 12, clip
        Frame w 200, h 150, bg #252525, center
          Icon "image", ic #666666, is 40
        Frame pad 12, gap 8
          Text "Wireless Headphones", col white, fs 14, weight 500
          Frame hor, gap 4, ver-center
            Icon "star", ic #f59e0b, is 14, fill
            Text "4.8", col white, fs 12
            Text "(234)", col #888888, fs 12
          Frame hor, spread, ver-center
            Text "$149.99", col #2271C1, fs 16, weight bold
            Frame w 32, h 32, bg #2271C1, rad 6, center
              Icon "shopping-cart", ic white, is 16
      Frame w 200, bg #1a1a1a, rad 12, clip
        Frame w 200, h 150, bg #252525, center
          Icon "image", ic #666666, is 40
        Frame pad 12, gap 8
          Text "Smart Watch Pro", col white, fs 14, weight 500
          Frame hor, gap 4, ver-center
            Icon "star", ic #f59e0b, is 14, fill
            Text "4.6", col white, fs 12
            Text "(189)", col #888888, fs 12
          Frame hor, spread, ver-center
            Text "$299.99", col #2271C1, fs 16, weight bold
            Frame w 32, h 32, bg #2271C1, rad 6, center
              Icon "shopping-cart", ic white, is 16
      Frame w 200, bg #1a1a1a, rad 12, clip
        Frame w 200, h 150, bg #252525, center
          Icon "image", ic #666666, is 40
        Frame pad 12, gap 8
          Text "Bluetooth Speaker", col white, fs 14, weight 500
          Frame hor, gap 4, ver-center
            Icon "star", ic #f59e0b, is 14, fill
            Text "4.9", col white, fs 12
            Text "(567)", col #888888, fs 12
          Frame hor, spread, ver-center
            Text "$79.99", col #2271C1, fs 16, weight bold
            Frame w 32, h 32, bg #2271C1, rad 6, center
              Icon "shopping-cart", ic white, is 16`,
    semanticAnalysis: {
      description: 'Produktübersicht mit Sidebar-Filter und Grid',
      componentType: 'Container',
      layout: 'horizontal',
      children: [
        {
          type: 'Sidebar',
          children: [
            {
              type: 'Container',
              children: [
                { type: 'Text', role: 'heading', text: 'Categories' },
                {
                  type: 'Navigation',
                  children: [
                    { type: 'NavItem', role: 'active', text: 'Electronics' },
                    { type: 'NavItem', text: 'Clothing' },
                    { type: 'NavItem', text: 'Home & Garden' },
                    { type: 'NavItem', text: 'Sports' },
                  ],
                },
              ],
            },
            {
              type: 'Container',
              children: [
                { type: 'Text', role: 'heading', text: 'Price Range' },
                { type: 'Slider' },
              ],
            },
            { type: 'Container', children: [{ type: 'Text', role: 'heading', text: 'Rating' }] },
          ],
        },
        {
          type: 'Container',
          grow: true,
          children: [
            {
              type: 'Header',
              layout: 'horizontal',
              alignment: ['spread', 'ver-center'],
              children: [
                { type: 'Text', role: 'heading', text: 'Products' },
                { type: 'Select', text: 'Sort by: Featured' },
              ],
            },
            {
              type: 'Container',
              layout: 'horizontal',
              children: [
                {
                  type: 'Card',
                  children: [
                    { type: 'Image' },
                    { type: 'Text', role: 'title', text: 'Wireless Headphones' },
                    {
                      type: 'Container',
                      children: [
                        { type: 'Icon', iconName: 'star' },
                        { type: 'Text', text: '4.8' },
                      ],
                    },
                    { type: 'Price', text: '$149.99' },
                  ],
                },
                { type: 'Card' },
                { type: 'Card' },
              ],
            },
          ],
        },
      ],
    },
  },

  // =============================================================================
  // 6. LOGIN / AUTHENTICATION
  // =============================================================================
  {
    name: 'Login Screen',
    description: 'Login-Screen mit Formular und Social Login',
    inputCode: `Frame w 400, h 600, bg #0a0a0a, center
  Frame w 340, bg #1a1a1a, rad 16, pad 32, gap 24
    Frame gap 8, center
      Frame w 48, h 48, bg #2271C1, rad 12, center
        Icon "lock", ic white, is 24
      Text "Welcome Back", col white, fs 24, weight bold
      Text "Sign in to continue to your account", col #888888, fs 14
    Frame gap 16
      Frame gap 4
        Text "Email", col #888888, fs 12
        Frame w full, h 48, bg #252525, rad 8, pad 0 16, bor 1, boc #333333, hor, gap 12, ver-center
          Icon "mail", ic #666666, is 20
          Text "you@example.com", col #666666, fs 14
      Frame gap 4
        Text "Password", col #888888, fs 12
        Frame w full, h 48, bg #252525, rad 8, pad 0 16, bor 1, boc #333333, hor, gap 12, ver-center
          Icon "lock", ic #666666, is 20
          Text "••••••••", col #666666, fs 14
          Icon "eye-off", ic #666666, is 20
      Frame hor, spread, ver-center
        Frame hor, gap 8, ver-center
          Checkbox
          Text "Remember me", col #888888, fs 14
        Text "Forgot password?", col #2271C1, fs 14
    Frame gap 12
      Frame w full, h 48, bg #2271C1, rad 8, center
        Text "Sign In", col white, fs 16, weight 500
      Frame hor, gap 12, ver-center
        Divider grow
        Text "or continue with", col #666666, fs 12
        Divider grow
      Frame hor, gap 12
        Frame grow, h 48, bg #252525, rad 8, center, bor 1, boc #333333, hor, gap 8
          Icon "github", ic white, is 20
          Text "GitHub", col white, fs 14
        Frame grow, h 48, bg #252525, rad 8, center, bor 1, boc #333333, hor, gap 8
          Icon "google", ic white, is 20
          Text "Google", col white, fs 14
    Frame hor, gap 4, center
      Text "Don't have an account?", col #888888, fs 14
      Text "Sign up", col #2271C1, fs 14, weight 500`,
    semanticAnalysis: {
      description: 'Login-Formular mit Social-Login-Optionen',
      componentType: 'Dialog',
      alignment: 'center',
      children: [
        {
          type: 'Card',
          children: [
            {
              type: 'Container',
              alignment: 'center',
              children: [
                { type: 'Icon', iconName: 'lock' },
                { type: 'Text', role: 'heading', text: 'Welcome Back' },
                { type: 'Text', role: 'description', text: 'Sign in to continue to your account' },
              ],
            },
            {
              type: 'Form',
              children: [
                {
                  type: 'FormField',
                  children: [
                    { type: 'Text', role: 'label', text: 'Email' },
                    { type: 'Input', inputType: 'email', placeholder: 'you@example.com' },
                  ],
                },
                {
                  type: 'FormField',
                  children: [
                    { type: 'Text', role: 'label', text: 'Password' },
                    { type: 'Input', inputType: 'password', placeholder: '••••••••' },
                  ],
                },
                {
                  type: 'Container',
                  layout: 'horizontal',
                  alignment: ['spread', 'ver-center'],
                  children: [
                    { type: 'Checkbox', text: 'Remember me' },
                    { type: 'Link', role: 'link', text: 'Forgot password?' },
                  ],
                },
              ],
            },
            {
              type: 'Container',
              children: [
                { type: 'Button', role: 'submit', text: 'Sign In' },
                { type: 'Divider', text: 'or continue with' },
                {
                  type: 'ButtonGroup',
                  layout: 'horizontal',
                  children: [
                    { type: 'Button', role: 'secondary', iconName: 'github', text: 'GitHub' },
                    { type: 'Button', role: 'secondary', iconName: 'google', text: 'Google' },
                  ],
                },
              ],
            },
            {
              type: 'Container',
              layout: 'horizontal',
              alignment: 'center',
              children: [
                { type: 'Text', text: "Don't have an account?" },
                { type: 'Link', role: 'link', text: 'Sign up' },
              ],
            },
          ],
        },
      ],
    },
  },

  // =============================================================================
  // 7. KANBAN BOARD - Complex drag & drop interface
  // =============================================================================
  {
    name: 'Kanban Board',
    description: 'Projektboard mit mehreren Spalten und verschachtelten Karten',
    inputCode: `Frame w 1000, h 600, bg #0a0a0a, pad 24, gap 20
  Frame hor, spread, ver-center
    Frame gap 4
      Text "Project Alpha", col white, fs 24, weight bold
      Text "Sprint 23 · 12 tasks remaining", col #666666, fs 14
    Frame hor, gap 12
      Frame hor, gap -8
        Frame w 32, h 32, bg #2271C1, rad 99, center, bor 2, boc #0a0a0a
          Text "MS", col white, fs 11
        Frame w 32, h 32, bg #10b981, rad 99, center, bor 2, boc #0a0a0a
          Text "AS", col white, fs 11
        Frame w 32, h 32, bg #f59e0b, rad 99, center, bor 2, boc #0a0a0a
          Text "TW", col white, fs 11
        Frame w 32, h 32, bg #333333, rad 99, center, bor 2, boc #0a0a0a
          Text "+3", col #888888, fs 11
      Frame w 100, h 36, bg #2271C1, rad 6, center
        Text "Add Task", col white, fs 14
  Frame hor, gap 16, grow
    Frame w 280, bg #1a1a1a, rad 12, pad 16, gap 12
      Frame hor, spread, ver-center
        Frame hor, gap 8, ver-center
          Frame w 12, h 12, bg #f59e0b, rad 99
          Text "To Do", col white, fs 14, weight 500
        Frame w 24, h 24, bg #252525, rad 4, center
          Text "4", col #888888, fs 12
      Frame gap 12
        Frame bg #252525, rad 8, pad 12, gap 8
          Frame hor, spread, ver-center
            Frame pad 4 8, bg #ef4444, rad 4
              Text "High", col white, fs 10
            Icon "more-horizontal", ic #666666, is 16
          Text "Fix login authentication bug", col white, fs 14
          Text "Users unable to login with SSO", col #888888, fs 12
          Frame hor, spread, ver-center
            Frame hor, gap 4, ver-center
              Icon "message-square", ic #666666, is 14
              Text "3", col #666666, fs 12
            Frame w 24, h 24, bg #2271C1, rad 99, center
              Text "M", col white, fs 10
        Frame bg #252525, rad 8, pad 12, gap 8
          Frame hor, spread, ver-center
            Frame pad 4 8, bg #f59e0b, rad 4
              Text "Medium", col white, fs 10
            Icon "more-horizontal", ic #666666, is 16
          Text "Update user profile API", col white, fs 14
          Frame hor, spread, ver-center
            Frame hor, gap 4, ver-center
              Icon "message-square", ic #666666, is 14
              Text "1", col #666666, fs 12
            Frame w 24, h 24, bg #10b981, rad 99, center
              Text "A", col white, fs 10
        Frame bg #252525, rad 8, pad 12, gap 8
          Frame pad 4 8, bg #2271C1, rad 4
            Text "Low", col white, fs 10
          Text "Add dark mode toggle", col white, fs 14
          Frame hor, gap 4, ver-center
            Icon "paperclip", ic #666666, is 14
            Text "2", col #666666, fs 12
    Frame w 280, bg #1a1a1a, rad 12, pad 16, gap 12
      Frame hor, spread, ver-center
        Frame hor, gap 8, ver-center
          Frame w 12, h 12, bg #2271C1, rad 99
          Text "In Progress", col white, fs 14, weight 500
        Frame w 24, h 24, bg #252525, rad 4, center
          Text "3", col #888888, fs 12
      Frame gap 12
        Frame bg #252525, rad 8, pad 12, gap 8
          Frame hor, spread, ver-center
            Frame pad 4 8, bg #ef4444, rad 4
              Text "High", col white, fs 10
            Icon "more-horizontal", ic #666666, is 16
          Text "Implement payment gateway", col white, fs 14
          Text "Stripe integration for subscriptions", col #888888, fs 12
          Frame hor, spread, ver-center
            Frame hor, gap 8
              Frame hor, gap 4, ver-center
                Icon "message-square", ic #666666, is 14
                Text "7", col #666666, fs 12
              Frame hor, gap 4, ver-center
                Icon "paperclip", ic #666666, is 14
                Text "4", col #666666, fs 12
            Frame w 24, h 24, bg #f59e0b, rad 99, center
              Text "T", col white, fs 10
        Frame bg #252525, rad 8, pad 12, gap 8
          Frame pad 4 8, bg #f59e0b, rad 4
            Text "Medium", col white, fs 10
          Text "Design system components", col white, fs 14
          Frame hor, spread, ver-center
            Frame hor, gap 4, ver-center
              Icon "message-square", ic #666666, is 14
              Text "2", col #666666, fs 12
            Frame w 24, h 24, bg #2271C1, rad 99, center
              Text "M", col white, fs 10
    Frame w 280, bg #1a1a1a, rad 12, pad 16, gap 12
      Frame hor, spread, ver-center
        Frame hor, gap 8, ver-center
          Frame w 12, h 12, bg #10b981, rad 99
          Text "Done", col white, fs 14, weight 500
        Frame w 24, h 24, bg #252525, rad 4, center
          Text "8", col #888888, fs 12
      Frame gap 12
        Frame bg #252525, rad 8, pad 12, gap 8, opacity 0.6
          Frame hor, spread, ver-center
            Frame pad 4 8, bg #10b981, rad 4
              Text "Done", col white, fs 10
            Icon "check", ic #10b981, is 16
          Text "Setup CI/CD pipeline", col white, fs 14
          Frame hor, spread, ver-center
            Text "Completed 2 days ago", col #666666, fs 12
            Frame w 24, h 24, bg #10b981, rad 99, center
              Text "A", col white, fs 10`,
    semanticAnalysis: {
      description: 'Kanban Board mit drei Spalten und Task-Karten',
      componentType: 'Dashboard',
      layout: 'vertical',
      children: [
        {
          type: 'Header',
          layout: 'horizontal',
          alignment: ['spread', 'ver-center'],
          children: [
            {
              type: 'Container',
              children: [
                { type: 'Text', role: 'heading', text: 'Project Alpha' },
                { type: 'Text', role: 'description', text: 'Sprint 23' },
              ],
            },
            {
              type: 'Container',
              layout: 'horizontal',
              children: [
                {
                  type: 'Container',
                  children: [
                    { type: 'Avatar' },
                    { type: 'Avatar' },
                    { type: 'Avatar' },
                    { type: 'Avatar' },
                  ],
                },
                { type: 'Button', role: 'primary', text: 'Add Task' },
              ],
            },
          ],
        },
        {
          type: 'Container',
          layout: 'horizontal',
          grow: true,
          children: [
            {
              type: 'Card',
              children: [
                {
                  type: 'Container',
                  layout: 'horizontal',
                  children: [
                    { type: 'Badge', role: 'status', text: 'To Do' },
                    { type: 'Text', text: '4' },
                  ],
                },
                {
                  type: 'Container',
                  children: [
                    {
                      type: 'Card',
                      children: [
                        { type: 'Badge', role: 'danger', text: 'High' },
                        { type: 'Text', role: 'title', text: 'Fix login authentication bug' },
                        { type: 'Text', role: 'description' },
                      ],
                    },
                    { type: 'Card' },
                    { type: 'Card' },
                  ],
                },
              ],
            },
            {
              type: 'Card',
              children: [
                { type: 'Container', children: [{ type: 'Badge', text: 'In Progress' }] },
                { type: 'Container', children: [{ type: 'Card' }, { type: 'Card' }] },
              ],
            },
            {
              type: 'Card',
              children: [
                {
                  type: 'Container',
                  children: [{ type: 'Badge', role: 'completed', text: 'Done' }],
                },
                { type: 'Container', children: [{ type: 'Card' }] },
              ],
            },
          ],
        },
      ],
    },
  },

  // =============================================================================
  // 8. ANALYTICS DASHBOARD - Complex data visualization
  // =============================================================================
  {
    name: 'Analytics Dashboard',
    description: 'Daten-Dashboard mit Charts, Metriken und Trends',
    inputCode: `Frame w 1000, h 700, bg #0a0a0a, pad 24, gap 20
  Frame hor, spread, ver-center
    Frame gap 4
      Text "Analytics", col white, fs 24, weight bold
      Text "Last 30 days", col #666666, fs 14
    Frame hor, gap 8
      Frame pad 8 16, bg #252525, rad 6, hor, gap 8, ver-center
        Icon "calendar", ic #888888, is 16
        Text "Jan 1 - Jan 30, 2024", col white, fs 14
        Icon "chevron-down", ic #888888, is 16
      Frame pad 8 16, bg #2271C1, rad 6
        Text "Export", col white, fs 14
  Frame hor, gap 16
    Frame w 200, bg #1a1a1a, rad 12, pad 20, gap 12
      Frame hor, gap 8, ver-center
        Frame w 40, h 40, bg #2271C1, rad 8, center, opacity 0.2
          Icon "users", ic #2271C1, is 20
        Text "Total Users", col #888888, fs 12
      Text "24,521", col white, fs 32, weight bold
      Frame hor, gap 4, ver-center
        Icon "trending-up", ic #10b981, is 16
        Text "+12.5%", col #10b981, fs 14
        Text "vs last month", col #666666, fs 12
    Frame w 200, bg #1a1a1a, rad 12, pad 20, gap 12
      Frame hor, gap 8, ver-center
        Frame w 40, h 40, bg #10b981, rad 8, center, opacity 0.2
          Icon "dollar-sign", ic #10b981, is 20
        Text "Revenue", col #888888, fs 12
      Text "$84,254", col white, fs 32, weight bold
      Frame hor, gap 4, ver-center
        Icon "trending-up", ic #10b981, is 16
        Text "+8.2%", col #10b981, fs 14
        Text "vs last month", col #666666, fs 12
    Frame w 200, bg #1a1a1a, rad 12, pad 20, gap 12
      Frame hor, gap 8, ver-center
        Frame w 40, h 40, bg #f59e0b, rad 8, center, opacity 0.2
          Icon "shopping-cart", ic #f59e0b, is 20
        Text "Orders", col #888888, fs 12
      Text "1,893", col white, fs 32, weight bold
      Frame hor, gap 4, ver-center
        Icon "trending-down", ic #ef4444, is 16
        Text "-3.1%", col #ef4444, fs 14
        Text "vs last month", col #666666, fs 12
    Frame w 200, bg #1a1a1a, rad 12, pad 20, gap 12
      Frame hor, gap 8, ver-center
        Frame w 40, h 40, bg #8b5cf6, rad 8, center, opacity 0.2
          Icon "percent", ic #8b5cf6, is 20
        Text "Conversion", col #888888, fs 12
      Text "3.24%", col white, fs 32, weight bold
      Frame hor, gap 4, ver-center
        Icon "minus", ic #888888, is 16
        Text "0.0%", col #888888, fs 14
        Text "no change", col #666666, fs 12
  Frame hor, gap 16, grow
    Frame grow, bg #1a1a1a, rad 12, pad 20, gap 16
      Frame hor, spread, ver-center
        Text "Revenue Over Time", col white, fs 16, weight 500
        Frame hor, gap 4
          Frame pad 6 12, bg #252525, rad 4
            Text "Week", col #888888, fs 12
          Frame pad 6 12, bg #2271C1, rad 4
            Text "Month", col white, fs 12
          Frame pad 6 12, bg #252525, rad 4
            Text "Year", col #888888, fs 12
      Frame h 200, bg #252525, rad 8, center
        Text "[Chart Placeholder]", col #666666, fs 14
      Frame hor, spread
        Frame hor, gap 16
          Frame hor, gap 6, ver-center
            Frame w 12, h 12, bg #2271C1, rad 2
            Text "This Period", col #888888, fs 12
          Frame hor, gap 6, ver-center
            Frame w 12, h 12, bg #666666, rad 2
            Text "Last Period", col #888888, fs 12
        Text "Peak: $12,450 on Jan 15", col #666666, fs 12
    Frame w 320, bg #1a1a1a, rad 12, pad 20, gap 16
      Text "Top Products", col white, fs 16, weight 500
      Frame gap 12
        Frame hor, gap 12, ver-center
          Text "1", col #666666, fs 14, w 20
          Frame w 40, h 40, bg #252525, rad 6, center
            Icon "box", ic #888888, is 20
          Frame gap 2, grow
            Text "Premium Plan", col white, fs 14
            Text "245 sales", col #888888, fs 12
          Text "$12,250", col #10b981, fs 14, weight 500
        Frame hor, gap 12, ver-center
          Text "2", col #666666, fs 14, w 20
          Frame w 40, h 40, bg #252525, rad 6, center
            Icon "box", ic #888888, is 20
          Frame gap 2, grow
            Text "Basic Plan", col white, fs 14
            Text "189 sales", col #888888, fs 12
          Text "$5,670", col #10b981, fs 14, weight 500
        Frame hor, gap 12, ver-center
          Text "3", col #666666, fs 14, w 20
          Frame w 40, h 40, bg #252525, rad 6, center
            Icon "box", ic #888888, is 20
          Frame gap 2, grow
            Text "Enterprise Plan", col white, fs 14
            Text "42 sales", col #888888, fs 12
          Text "$21,000", col #10b981, fs 14, weight 500
  Frame hor, gap 16
    Frame grow, bg #1a1a1a, rad 12, pad 20, gap 16
      Text "Recent Transactions", col white, fs 16, weight 500
      Frame gap 8
        Frame hor, pad 12, bg #252525, rad 8, ver-center
          Frame w 36, h 36, bg #10b981, rad 99, center
            Icon "arrow-down-left", ic white, is 16
          Frame gap 2, grow, mar 0 0 0 12
            Text "Payment from John Doe", col white, fs 14
            Text "2 minutes ago", col #666666, fs 12
          Text "+$250.00", col #10b981, fs 14, weight 500
        Frame hor, pad 12, bg #252525, rad 8, ver-center
          Frame w 36, h 36, bg #10b981, rad 99, center
            Icon "arrow-down-left", ic white, is 16
          Frame gap 2, grow, mar 0 0 0 12
            Text "Payment from Anna Smith", col white, fs 14
            Text "15 minutes ago", col #666666, fs 12
          Text "+$89.00", col #10b981, fs 14, weight 500
        Frame hor, pad 12, bg #252525, rad 8, ver-center
          Frame w 36, h 36, bg #ef4444, rad 99, center
            Icon "arrow-up-right", ic white, is 16
          Frame gap 2, grow, mar 0 0 0 12
            Text "Refund to Mike Wilson", col white, fs 14
            Text "1 hour ago", col #666666, fs 12
          Text "-$45.00", col #ef4444, fs 14, weight 500`,
    semanticAnalysis: {
      description: 'Analytics Dashboard mit Metriken und Transaktionen',
      componentType: 'Dashboard',
      layout: 'vertical',
      children: [
        {
          type: 'Header',
          layout: 'horizontal',
          alignment: ['spread', 'ver-center'],
          children: [
            {
              type: 'Container',
              children: [
                { type: 'Text', role: 'heading', text: 'Analytics' },
                { type: 'Text', role: 'description', text: 'Last 30 days' },
              ],
            },
            {
              type: 'ButtonGroup',
              children: [
                { type: 'Dropdown', iconName: 'calendar' },
                { type: 'Button', role: 'primary', text: 'Export' },
              ],
            },
          ],
        },
        {
          type: 'Container',
          layout: 'horizontal',
          children: [
            {
              type: 'MetricCard',
              children: [
                { type: 'Icon', iconName: 'users' },
                { type: 'Text', role: 'label', text: 'Total Users' },
                { type: 'Text', role: 'value', text: '24,521' },
                { type: 'Text', role: 'trend', text: '+12.5%' },
              ],
            },
            {
              type: 'MetricCard',
              children: [
                { type: 'Icon', iconName: 'dollar-sign' },
                { type: 'Text', role: 'label', text: 'Revenue' },
                { type: 'Text', role: 'value', text: '$84,254' },
                { type: 'Text', role: 'trend', text: '+8.2%' },
              ],
            },
            {
              type: 'MetricCard',
              children: [
                { type: 'Icon', iconName: 'shopping-cart' },
                { type: 'Text', role: 'label', text: 'Orders' },
                { type: 'Text', role: 'value', text: '1,893' },
                { type: 'Text', role: 'trend', text: '-3.1%' },
              ],
            },
            {
              type: 'MetricCard',
              children: [
                { type: 'Icon', iconName: 'percent' },
                { type: 'Text', role: 'label', text: 'Conversion' },
                { type: 'Text', role: 'value', text: '3.24%' },
                { type: 'Text', role: 'trend', text: '0.0%' },
              ],
            },
          ],
        },
        {
          type: 'Container',
          layout: 'horizontal',
          grow: true,
          children: [
            {
              type: 'Card',
              grow: true,
              children: [
                { type: 'Text', role: 'heading', text: 'Revenue Over Time' },
                { type: 'Container', children: [{ type: 'Text', text: '[Chart]' }] },
              ],
            },
            {
              type: 'Card',
              children: [
                { type: 'Text', role: 'heading', text: 'Top Products' },
                {
                  type: 'Container',
                  children: [
                    { type: 'Container', layout: 'horizontal' },
                    { type: 'Container', layout: 'horizontal' },
                    { type: 'Container', layout: 'horizontal' },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'Card',
          children: [
            { type: 'Text', role: 'heading', text: 'Recent Transactions' },
            {
              type: 'Container',
              children: [
                { type: 'Container', layout: 'horizontal' },
                { type: 'Container', layout: 'horizontal' },
                { type: 'Container', layout: 'horizontal' },
              ],
            },
          ],
        },
      ],
    },
  },

  // =============================================================================
  // 9. FILE MANAGER - Complex nested tree structure
  // =============================================================================
  {
    name: 'File Manager',
    description: 'Dateimanager mit Ordnerstruktur und Detailansicht',
    inputCode: `Frame w 900, h 600, bg #0a0a0a, hor, gap 0
  Frame w 240, bg #1a1a1a, pad 16, gap 16, bor 0 1 0 0, boc #333333
    Frame hor, spread, ver-center
      Text "Files", col white, fs 16, weight 500
      Frame w 28, h 28, bg #252525, rad 4, center
        Icon "plus", ic #888888, is 14
    Frame gap 4
      Frame hor, gap 8, pad 8, bg #2271C1, rad 6, ver-center
        Icon "folder", ic white, is 16
        Text "All Files", col white, fs 14
      Frame hor, gap 8, pad 8, ver-center
        Icon "clock", ic #888888, is 16
        Text "Recent", col #888888, fs 14
      Frame hor, gap 8, pad 8, ver-center
        Icon "star", ic #888888, is 16
        Text "Starred", col #888888, fs 14
      Frame hor, gap 8, pad 8, ver-center
        Icon "trash", ic #888888, is 16
        Text "Trash", col #888888, fs 14
    Divider bg #333333
    Frame gap 4
      Text "Folders", col #888888, fs 12, uppercase
      Frame gap 2
        Frame hor, gap 8, pad 8, ver-center
          Icon "chevron-right", ic #666666, is 14
          Icon "folder", ic #f59e0b, is 16
          Text "Documents", col white, fs 14
        Frame gap 2, mar 0 0 0 22
          Frame hor, gap 8, pad 8, bg #252525, rad 4, ver-center
            Icon "chevron-down", ic #888888, is 14
            Icon "folder", ic #f59e0b, is 16
            Text "Projects", col white, fs 14
          Frame gap 2, mar 0 0 0 22
            Frame hor, gap 8, pad 8, ver-center
              Icon "folder", ic #f59e0b, is 16
              Text "2024", col #888888, fs 14
            Frame hor, gap 8, pad 8, ver-center
              Icon "folder", ic #f59e0b, is 16
              Text "Archive", col #888888, fs 14
        Frame hor, gap 8, pad 8, ver-center
          Icon "chevron-right", ic #666666, is 14
          Icon "folder", ic #f59e0b, is 16
          Text "Images", col white, fs 14
        Frame hor, gap 8, pad 8, ver-center
          Icon "chevron-right", ic #666666, is 14
          Icon "folder", ic #f59e0b, is 16
          Text "Downloads", col white, fs 14
    Frame gap 8, mar 16 0 0 0
      Text "Storage", col #888888, fs 12, uppercase
      Frame h 4, bg #333333, rad 2
        Frame h 4, bg #2271C1, rad 2, w 156
      Text "7.8 GB of 15 GB used", col #666666, fs 12
  Frame grow, pad 24, gap 16
    Frame hor, spread, ver-center
      Frame hor, gap 8, ver-center
        Icon "folder", ic #f59e0b, is 20
        Text "Projects", col white, fs 18, weight 500
        Icon "chevron-right", ic #666666, is 16
        Text "2024", col #888888, fs 18
      Frame hor, gap 8
        Frame w 200, h 36, bg #252525, rad 6, pad 0 12, hor, gap 8, ver-center, bor 1, boc #333333
          Icon "search", ic #666666, is 16
          Text "Search files...", col #666666, fs 14
        Frame hor, gap 4
          Frame w 36, h 36, bg #252525, rad 6, center
            Icon "grid", ic #888888, is 18
          Frame w 36, h 36, bg #333333, rad 6, center
            Icon "list", ic white, is 18
    Frame hor, gap 16, grow, wrap
      Frame w 140, gap 8, center
        Frame w 100, h 100, bg #252525, rad 8, center
          Icon "file-text", ic #2271C1, is 40
        Text "Report.pdf", col white, fs 13
        Text "2.4 MB", col #666666, fs 11
      Frame w 140, gap 8, center
        Frame w 100, h 100, bg #252525, rad 8, center
          Icon "image", ic #10b981, is 40
        Text "Screenshot.png", col white, fs 13
        Text "1.2 MB", col #666666, fs 11
      Frame w 140, gap 8, center
        Frame w 100, h 100, bg #252525, rad 8, center
          Icon "file-code", ic #f59e0b, is 40
        Text "index.tsx", col white, fs 13
        Text "45 KB", col #666666, fs 11
      Frame w 140, gap 8, center
        Frame w 100, h 100, bg #252525, rad 8, center
          Icon "folder", ic #f59e0b, is 40
        Text "Components", col white, fs 13
        Text "12 items", col #666666, fs 11
      Frame w 140, gap 8, center
        Frame w 100, h 100, bg #252525, rad 8, center
          Icon "file", ic #888888, is 40
        Text "notes.md", col white, fs 13
        Text "8 KB", col #666666, fs 11
      Frame w 140, gap 8, center
        Frame w 100, h 100, bg #252525, rad 8, center
          Icon "video", ic #ef4444, is 40
        Text "demo.mp4", col white, fs 13
        Text "24.5 MB", col #666666, fs 11`,
    semanticAnalysis: {
      description: 'Dateimanager mit Sidebar und Grid-Ansicht',
      componentType: 'Container',
      layout: 'horizontal',
      children: [
        {
          type: 'Sidebar',
          children: [
            {
              type: 'Header',
              children: [
                { type: 'Text', role: 'heading', text: 'Files' },
                { type: 'IconButton', iconName: 'plus' },
              ],
            },
            {
              type: 'Navigation',
              children: [
                { type: 'NavItem', role: 'active', iconName: 'folder', text: 'All Files' },
                { type: 'NavItem', iconName: 'clock', text: 'Recent' },
                { type: 'NavItem', iconName: 'star', text: 'Starred' },
                { type: 'NavItem', iconName: 'trash', text: 'Trash' },
              ],
            },
            { type: 'Divider' },
            {
              type: 'Container',
              children: [
                { type: 'Text', role: 'label', text: 'Folders' },
                {
                  type: 'Navigation',
                  children: [
                    { type: 'NavItem', iconName: 'folder', text: 'Documents' },
                    { type: 'NavItem', iconName: 'folder', text: 'Projects' },
                    { type: 'NavItem', iconName: 'folder', text: 'Images' },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'Container',
          grow: true,
          children: [
            {
              type: 'Header',
              layout: 'horizontal',
              children: [
                {
                  type: 'Breadcrumb',
                  children: [
                    { type: 'Text', text: 'Projects' },
                    { type: 'Text', text: '2024' },
                  ],
                },
                {
                  type: 'Container',
                  layout: 'horizontal',
                  children: [
                    { type: 'Input', role: 'search', placeholder: 'Search files...' },
                    { type: 'ButtonGroup' },
                  ],
                },
              ],
            },
            {
              type: 'Container',
              layout: 'horizontal',
              children: [
                { type: 'Card', alignment: 'center' },
                { type: 'Card', alignment: 'center' },
                { type: 'Card', alignment: 'center' },
                { type: 'Card', alignment: 'center' },
                { type: 'Card', alignment: 'center' },
                { type: 'Card', alignment: 'center' },
              ],
            },
          ],
        },
      ],
    },
  },

  // =============================================================================
  // 10. MOBILE APP SCREEN - Compact complex layout
  // =============================================================================
  {
    name: 'Mobile App - Social Feed',
    description: 'Mobile Social Feed mit Posts, Stories und Navigation',
    inputCode: `Frame w 375, h 812, bg #0a0a0a, gap 0
  Frame pad 16, bg #1a1a1a, hor, spread, ver-center, bor 0 0 1 0, boc #333333
    Frame w 32, h 32, bg #2271C1, rad 99, center
      Text "M", col white, fs 14, weight bold
    Text "Social", col white, fs 18, weight bold
    Frame hor, gap 16
      Icon "search", ic white, is 22
      Icon "bell", ic white, is 22
  Frame pad 16, gap 12, bor 0 0 1 0, boc #333333
    Text "Stories", col white, fs 14, weight 500
    Frame hor, gap 12, scroll
      Frame gap 4, center
        Frame w 60, h 60, bg grad #8b5cf6 #2271C1, rad 99, pad 2
          Frame w 56, h 56, bg #0a0a0a, rad 99, pad 2
            Frame w 52, h 52, bg #252525, rad 99, center
              Icon "plus", ic white, is 20
        Text "Add", col #888888, fs 11
      Frame gap 4, center
        Frame w 60, h 60, bg grad #f59e0b #ef4444, rad 99, pad 2
          Frame w 56, h 56, bg #0a0a0a, rad 99, pad 2
            Frame w 52, h 52, bg #2271C1, rad 99, center
              Text "AS", col white, fs 16
        Text "Anna", col white, fs 11
      Frame gap 4, center
        Frame w 60, h 60, bg grad #10b981 #2271C1, rad 99, pad 2
          Frame w 56, h 56, bg #0a0a0a, rad 99, pad 2
            Frame w 52, h 52, bg #10b981, rad 99, center
              Text "TW", col white, fs 16
        Text "Tom", col white, fs 11
      Frame gap 4, center
        Frame w 60, h 60, bg #333333, rad 99, pad 2
          Frame w 56, h 56, bg #0a0a0a, rad 99, pad 2
            Frame w 52, h 52, bg #f59e0b, rad 99, center
              Text "LK", col white, fs 16
        Text "Lisa", col white, fs 11
  Frame grow, pad 16, gap 16, scroll
    Frame bg #1a1a1a, rad 12, pad 16, gap 12
      Frame hor, gap 12, ver-center
        Frame w 40, h 40, bg #2271C1, rad 99, center
          Text "AS", col white, fs 14
        Frame gap 2, grow
          Text "Anna Smith", col white, fs 14, weight 500
          Text "2 hours ago", col #666666, fs 12
        Icon "more-horizontal", ic #888888, is 20
      Text "Just launched our new product! 🚀 So excited to share this with everyone. Check it out at example.com", col white, fs 14, line 1.5
      Frame h 200, bg #252525, rad 8, center
        Icon "image", ic #666666, is 40
      Frame hor, spread
        Frame hor, gap 16
          Frame hor, gap 6, ver-center
            Icon "heart", ic #888888, is 20
            Text "234", col #888888, fs 14
          Frame hor, gap 6, ver-center
            Icon "message-circle", ic #888888, is 20
            Text "56", col #888888, fs 14
          Frame hor, gap 6, ver-center
            Icon "share", ic #888888, is 20
        Icon "bookmark", ic #888888, is 20
    Frame bg #1a1a1a, rad 12, pad 16, gap 12
      Frame hor, gap 12, ver-center
        Frame w 40, h 40, bg #10b981, rad 99, center
          Text "TW", col white, fs 14
        Frame gap 2, grow
          Text "Tom Weber", col white, fs 14, weight 500
          Text "5 hours ago", col #666666, fs 12
        Icon "more-horizontal", ic #888888, is 20
      Text "Working on some exciting stuff today! Can't wait to show you all what we've been building. Stay tuned! 👀", col white, fs 14, line 1.5
      Frame hor, spread
        Frame hor, gap 16
          Frame hor, gap 6, ver-center
            Icon "heart", ic #ef4444, is 20, fill
            Text "1.2k", col #888888, fs 14
          Frame hor, gap 6, ver-center
            Icon "message-circle", ic #888888, is 20
            Text "89", col #888888, fs 14
          Frame hor, gap 6, ver-center
            Icon "share", ic #888888, is 20
        Icon "bookmark", ic #2271C1, is 20, fill
  Frame pad 8, bg #1a1a1a, hor, spread, bor 1 0 0 0, boc #333333
    Frame gap 4, center, pad 8
      Icon "home", ic #2271C1, is 24
      Text "Home", col #2271C1, fs 10
    Frame gap 4, center, pad 8
      Icon "search", ic #888888, is 24
      Text "Explore", col #888888, fs 10
    Frame w 48, h 48, bg #2271C1, rad 99, center, mar 0 0 16 0
      Icon "plus", ic white, is 24
    Frame gap 4, center, pad 8
      Icon "heart", ic #888888, is 24
      Text "Activity", col #888888, fs 10
    Frame gap 4, center, pad 8
      Icon "user", ic #888888, is 24
      Text "Profile", col #888888, fs 10`,
    semanticAnalysis: {
      description: 'Mobile Social Feed mit Stories und Posts',
      componentType: 'Container',
      layout: 'vertical',
      children: [
        {
          type: 'Header',
          layout: 'horizontal',
          alignment: ['spread', 'ver-center'],
          children: [
            { type: 'Avatar', text: 'M' },
            { type: 'Text', role: 'heading', text: 'Social' },
            {
              type: 'ActionBar',
              children: [
                { type: 'Icon', iconName: 'search' },
                { type: 'Icon', iconName: 'bell' },
              ],
            },
          ],
        },
        {
          type: 'Container',
          children: [
            { type: 'Text', role: 'heading', text: 'Stories' },
            {
              type: 'Container',
              layout: 'horizontal',
              children: [
                { type: 'Avatar', role: 'action' },
                { type: 'Avatar' },
                { type: 'Avatar' },
                { type: 'Avatar' },
              ],
            },
          ],
        },
        {
          type: 'Container',
          grow: true,
          children: [
            {
              type: 'Card',
              children: [
                {
                  type: 'Container',
                  layout: 'horizontal',
                  children: [
                    { type: 'Avatar' },
                    {
                      type: 'UserInfo',
                      children: [
                        { type: 'Text', role: 'name', text: 'Anna Smith' },
                        { type: 'Text', role: 'timestamp', text: '2 hours ago' },
                      ],
                    },
                    { type: 'Icon', iconName: 'more-horizontal' },
                  ],
                },
                { type: 'Text', role: 'body' },
                { type: 'Image' },
                {
                  type: 'ActionBar',
                  layout: 'horizontal',
                  children: [
                    {
                      type: 'Container',
                      children: [
                        { type: 'Icon', iconName: 'heart' },
                        { type: 'Text', text: '234' },
                      ],
                    },
                    {
                      type: 'Container',
                      children: [
                        { type: 'Icon', iconName: 'message-circle' },
                        { type: 'Text', text: '56' },
                      ],
                    },
                    { type: 'Icon', iconName: 'share' },
                    { type: 'Icon', iconName: 'bookmark' },
                  ],
                },
              ],
            },
            { type: 'Card' },
          ],
        },
        {
          type: 'Navigation',
          layout: 'horizontal',
          children: [
            { type: 'NavItem', role: 'active', iconName: 'home', text: 'Home' },
            { type: 'NavItem', iconName: 'search', text: 'Explore' },
            { type: 'IconButton', role: 'primary', iconName: 'plus' },
            { type: 'NavItem', iconName: 'heart', text: 'Activity' },
            { type: 'NavItem', iconName: 'user', text: 'Profile' },
          ],
        },
      ],
    },
  },

  // =============================================================================
  // 11. COMPLEX FORM - Multi-step with validation
  // =============================================================================
  {
    name: 'Multi-Step Form',
    description: 'Komplexes Formular mit Schritten und Validierung',
    inputCode: `Frame w 600, h 700, bg #0a0a0a, pad 32, gap 24
  Frame hor, spread, ver-center
    Frame gap 4
      Text "Create Account", col white, fs 24, weight bold
      Text "Step 2 of 3", col #666666, fs 14
    Frame w 100, h 36, bg #252525, rad 6, center, bor 1, boc #333333
      Text "Cancel", col white, fs 14
  Frame hor, gap 0
    Frame grow
      Frame hor, gap 8, ver-center
        Frame w 32, h 32, bg #10b981, rad 99, center
          Icon "check", ic white, is 16
        Frame h 2, bg #10b981, grow
    Frame grow
      Frame hor, gap 8, ver-center
        Frame w 32, h 32, bg #2271C1, rad 99, center
          Text "2", col white, fs 14, weight bold
        Frame h 2, bg #333333, grow
    Frame w 32
      Frame w 32, h 32, bg #333333, rad 99, center
        Text "3", col #888888, fs 14
  Frame bg #1a1a1a, rad 12, pad 24, gap 20
    Text "Personal Information", col white, fs 18, weight 500
    Frame hor, gap 16
      Frame gap 8, grow
        Text "First Name", col #888888, fs 12
        Frame h 48, bg #252525, rad 8, pad 0 16, bor 1, boc #333333, ver-center
          Text "Max", col white, fs 14
      Frame gap 8, grow
        Text "Last Name", col #888888, fs 12
        Frame h 48, bg #252525, rad 8, pad 0 16, bor 1, boc #333333, ver-center
          Text "Schmidt", col white, fs 14
    Frame gap 8
      Text "Email Address", col #888888, fs 12
      Frame h 48, bg #252525, rad 8, pad 0 16, bor 2, boc #ef4444, hor, spread, ver-center
        Frame hor, gap 12, ver-center
          Icon "mail", ic #666666, is 18
          Text "max@invalid", col white, fs 14
        Icon "alert-circle", ic #ef4444, is 18
      Text "Please enter a valid email address", col #ef4444, fs 12
    Frame gap 8
      Text "Phone Number", col #888888, fs 12
      Frame h 48, bg #252525, rad 8, pad 0 16, bor 2, boc #10b981, hor, spread, ver-center
        Frame hor, gap 12, ver-center
          Icon "phone", ic #666666, is 18
          Text "+49 123 456 7890", col white, fs 14
        Icon "check-circle", ic #10b981, is 18
    Frame gap 8
      Text "Date of Birth", col #888888, fs 12
      Frame h 48, bg #252525, rad 8, pad 0 16, bor 1, boc #333333, hor, spread, ver-center
        Text "Select date", col #666666, fs 14
        Icon "calendar", ic #888888, is 18
    Frame gap 8
      Text "Country", col #888888, fs 12
      Frame h 48, bg #252525, rad 8, pad 0 16, bor 1, boc #333333, hor, spread, ver-center
        Frame hor, gap 12, ver-center
          Text "🇩🇪", fs 18
          Text "Germany", col white, fs 14
        Icon "chevron-down", ic #888888, is 18
  Frame hor, gap 12
    Frame grow, h 48, bg #252525, rad 8, center, bor 1, boc #333333
      Frame hor, gap 8, ver-center
        Icon "arrow-left", ic white, is 18
        Text "Back", col white, fs 14
    Frame grow, h 48, bg #2271C1, rad 8, center
      Frame hor, gap 8, ver-center
        Text "Continue", col white, fs 14
        Icon "arrow-right", ic white, is 18`,
    semanticAnalysis: {
      description: 'Multi-Step Formular mit Validierung',
      componentType: 'Form',
      layout: 'vertical',
      children: [
        {
          type: 'Header',
          layout: 'horizontal',
          alignment: ['spread', 'ver-center'],
          children: [
            {
              type: 'Container',
              children: [
                { type: 'Text', role: 'heading', text: 'Create Account' },
                { type: 'Text', role: 'description', text: 'Step 2 of 3' },
              ],
            },
            { type: 'Button', role: 'cancel', text: 'Cancel' },
          ],
        },
        {
          type: 'Stepper',
          layout: 'horizontal',
          children: [
            { type: 'Step', role: 'completed' },
            { type: 'Step', role: 'active' },
            { type: 'Step', role: 'pending' },
          ],
        },
        {
          type: 'Card',
          children: [
            { type: 'Text', role: 'subheading', text: 'Personal Information' },
            {
              type: 'Container',
              layout: 'horizontal',
              children: [
                {
                  type: 'FormField',
                  children: [
                    { type: 'Text', role: 'label', text: 'First Name' },
                    { type: 'Input', text: 'Max' },
                  ],
                },
                {
                  type: 'FormField',
                  children: [
                    { type: 'Text', role: 'label', text: 'Last Name' },
                    { type: 'Input', text: 'Schmidt' },
                  ],
                },
              ],
            },
            {
              type: 'FormField',
              role: 'error',
              children: [
                { type: 'Text', role: 'label', text: 'Email Address' },
                { type: 'Input', state: 'invalid' },
                { type: 'Text', role: 'error', text: 'Please enter a valid email' },
              ],
            },
            {
              type: 'FormField',
              role: 'success',
              children: [
                { type: 'Text', role: 'label', text: 'Phone Number' },
                { type: 'Input', state: 'valid' },
              ],
            },
            {
              type: 'FormField',
              children: [
                { type: 'Text', role: 'label', text: 'Date of Birth' },
                { type: 'Input', inputType: 'date' },
              ],
            },
            {
              type: 'FormField',
              children: [{ type: 'Text', role: 'label', text: 'Country' }, { type: 'Select' }],
            },
          ],
        },
        {
          type: 'ButtonGroup',
          layout: 'horizontal',
          children: [
            { type: 'Button', role: 'secondary', iconName: 'arrow-left', text: 'Back' },
            { type: 'Button', role: 'primary', text: 'Continue', iconName: 'arrow-right' },
          ],
        },
      ],
    },
  },

  // =============================================================================
  // 12. NOTIFICATION CENTER - Complex overlay
  // =============================================================================
  {
    name: 'Notification Center',
    description: 'Benachrichtigungszentrale mit Kategorien und Actions',
    inputCode: `Frame w 400, h 600, bg #1a1a1a, rad 16, shadow lg, pad 0, clip
  Frame pad 20, gap 16, bor 0 0 1 0, boc #333333
    Frame hor, spread, ver-center
      Text "Notifications", col white, fs 18, weight 500
      Frame hor, gap 12
        Text "Mark all read", col #2271C1, fs 14
        Icon "settings", ic #888888, is 18
    Frame hor, gap 8
      Frame pad 8 16, bg #2271C1, rad 99
        Text "All", col white, fs 13
      Frame pad 8 16, bg #252525, rad 99
        Text "Unread", col #888888, fs 13
      Frame pad 8 16, bg #252525, rad 99
        Text "Mentions", col #888888, fs 13
  Frame grow, pad 0, gap 0, scroll
    Frame pad 16, gap 2, bor 0 0 1 0, boc #333333, bg #252525
      Frame hor, gap 12
        Frame w 40, h 40, bg #2271C1, rad 99, center
          Icon "message-square", ic white, is 18
        Frame gap 4, grow
          Frame hor, spread, ver-center
            Text "New message", col white, fs 14, weight 500
            Text "2m", col #666666, fs 12
          Text "Anna Smith sent you a message", col #888888, fs 13
      Frame hor, gap 8, mar 8 0 0 52
        Frame pad 6 12, bg #333333, rad 4
          Text "Reply", col white, fs 12
        Frame pad 6 12, bg #333333, rad 4
          Text "Mark read", col #888888, fs 12
    Frame pad 16, gap 2, bor 0 0 1 0, boc #333333, bg #252525
      Frame hor, gap 12
        Frame w 40, h 40, bg #10b981, rad 99, center
          Icon "check-circle", ic white, is 18
        Frame gap 4, grow
          Frame hor, spread, ver-center
            Text "Task completed", col white, fs 14, weight 500
            Text "15m", col #666666, fs 12
          Text "Your task 'Design review' was marked as done", col #888888, fs 13
    Frame pad 16, gap 2, bor 0 0 1 0, boc #333333
      Frame hor, gap 12
        Frame w 40, h 40, bg #f59e0b, rad 99, center
          Icon "alert-triangle", ic white, is 18
        Frame gap 4, grow
          Frame hor, spread, ver-center
            Text "System warning", col white, fs 14, weight 500
            Text "1h", col #666666, fs 12
          Text "Storage space is running low (85% used)", col #888888, fs 13
      Frame hor, gap 8, mar 8 0 0 52
        Frame pad 6 12, bg #2271C1, rad 4
          Text "Upgrade", col white, fs 12
        Frame pad 6 12, bg #333333, rad 4
          Text "Dismiss", col #888888, fs 12
    Frame pad 16, gap 2, bor 0 0 1 0, boc #333333
      Frame hor, gap 12
        Frame w 40, h 40, bg #8b5cf6, rad 99, center
          Icon "users", ic white, is 18
        Frame gap 4, grow
          Frame hor, spread, ver-center
            Text "Team update", col white, fs 14, weight 500
            Text "2h", col #666666, fs 12
          Text "3 new members joined your team", col #888888, fs 13
    Frame pad 16, gap 2, bor 0 0 1 0, boc #333333
      Frame hor, gap 12
        Frame w 40, h 40, bg #ef4444, rad 99, center
          Icon "alert-circle", ic white, is 18
        Frame gap 4, grow
          Frame hor, spread, ver-center
            Text "Payment failed", col white, fs 14, weight 500
            Text "3h", col #666666, fs 12
          Text "Your payment method was declined", col #888888, fs 13
      Frame hor, gap 8, mar 8 0 0 52
        Frame pad 6 12, bg #ef4444, rad 4
          Text "Update payment", col white, fs 12
    Frame pad 16, gap 2
      Frame hor, gap 12
        Frame w 40, h 40, bg #333333, rad 99, center
          Icon "bell", ic #888888, is 18
        Frame gap 4, grow
          Frame hor, spread, ver-center
            Text "Reminder", col #888888, fs 14
            Text "1d", col #666666, fs 12
          Text "Team meeting starts in 30 minutes", col #666666, fs 13
  Frame pad 16, bor 1 0 0 0, boc #333333, center
    Text "View all notifications", col #2271C1, fs 14`,
    semanticAnalysis: {
      description: 'Notification Center mit verschiedenen Benachrichtigungstypen',
      componentType: 'Card',
      layout: 'vertical',
      children: [
        {
          type: 'Header',
          children: [
            {
              type: 'Container',
              layout: 'horizontal',
              children: [
                { type: 'Text', role: 'heading', text: 'Notifications' },
                {
                  type: 'Container',
                  children: [
                    { type: 'Link', text: 'Mark all read' },
                    { type: 'Icon', iconName: 'settings' },
                  ],
                },
              ],
            },
            {
              type: 'TabBar',
              children: [
                { type: 'Tab', role: 'active', text: 'All' },
                { type: 'Tab', text: 'Unread' },
                { type: 'Tab', text: 'Mentions' },
              ],
            },
          ],
        },
        {
          type: 'Container',
          grow: true,
          children: [
            {
              type: 'Container',
              children: [
                { type: 'Avatar' },
                {
                  type: 'Container',
                  children: [
                    { type: 'Text', role: 'title', text: 'New message' },
                    { type: 'Text', role: 'description' },
                  ],
                },
                { type: 'ActionBar' },
              ],
            },
            { type: 'Container' },
            { type: 'Container' },
            { type: 'Container' },
            { type: 'Container' },
            { type: 'Container' },
          ],
        },
        {
          type: 'Container',
          alignment: 'center',
          children: [{ type: 'Link', text: 'View all notifications' }],
        },
      ],
    },
  },

  // =============================================================================
  // EDGE CASES - Unusual Layouts
  // =============================================================================

  // 13. FLOATING ELEMENTS / OVERLAYS
  {
    name: 'Floating Action Button',
    description: 'FAB-Pattern mit schwebendem Button und Overlay-Menü',
    inputCode: `Frame w 400, h 600, bg #f5f5f5
  Frame grow, pad 16, gap 16
    Text "Content Area", col #333, fs 16
    Frame h 200, bg white, rad 8, shadow md, pad 16
      Text "Main content card", col #666, fs 14
    Frame h 150, bg white, rad 8, shadow md, pad 16
      Text "Another card", col #666, fs 14
  Frame absolute, x 320, y 520, w 56, h 56, bg #2271C1, rad 99, shadow lg, center
    Icon "plus", ic white, is 24
  Frame absolute, x 270, y 450, w 120, h 140, bg white, rad 12, shadow lg, pad 8, gap 4, hidden
    Frame hor, gap 8, pad 8, rad 6, hover-bg #f0f0f0
      Icon "file", ic #666, is 16
      Text "New File", col #333, fs 14
    Frame hor, gap 8, pad 8, rad 6, hover-bg #f0f0f0
      Icon "folder", ic #666, is 16
      Text "New Folder", col #333, fs 14
    Frame hor, gap 8, pad 8, rad 6, hover-bg #f0f0f0
      Icon "upload", ic #666, is 16
      Text "Upload", col #333, fs 14`,
    semanticAnalysis: {
      componentType: 'Container',
      description: 'FAB mit Overlay-Menü',
      layout: 'stacked',
      children: [
        {
          type: 'Container',
          role: 'content',
          children: [{ type: 'Text', role: 'heading' }, { type: 'Card' }, { type: 'Card' }],
        },
        {
          type: 'Button',
          role: 'fab',
          position: { x: 320, y: 520 },
          children: [{ type: 'Icon', text: 'plus' }],
        },
        {
          type: 'Container',
          role: 'menu',
          position: { x: 270, y: 450 },
          children: [
            { type: 'Button', role: 'menu-item' },
            { type: 'Button', role: 'menu-item' },
            { type: 'Button', role: 'menu-item' },
          ],
        },
      ],
    },
  },

  // 14. BADGE OVERLAY ON ICON
  {
    name: 'Badge Overlay',
    description: 'Stacked Layout mit Badge-Overlays auf Icons',
    inputCode: `Frame w 400, h 80, bg #1a1a1a, pad 16
  Frame hor, gap 24
    Frame stacked, w 40, h 40
      Frame w 40, h 40, bg #252525, rad 8, center
        Icon "bell", ic #888, is 20
      Frame absolute, x 28, y -4, w 18, h 18, bg #ef4444, rad 99, center
        Text "5", col white, fs 10, weight bold
    Frame stacked, w 40, h 40
      Frame w 40, h 40, bg #252525, rad 8, center
        Icon "message-square", ic #888, is 20
      Frame absolute, x 28, y -4, w 18, h 18, bg #2271C1, rad 99, center
        Text "12", col white, fs 10, weight bold
    Frame stacked, w 40, h 40
      Frame w 40, h 40, bg #252525, rad 8, center
        Icon "inbox", ic #888, is 20
    Frame stacked, w 40, h 40
      Frame w 40, h 40, bg #10b981, rad 8, center
        Icon "check", ic white, is 20`,
    semanticAnalysis: {
      componentType: 'Container',
      description: 'Icon-Leiste mit Badges',
      layout: 'horizontal',
      children: [
        {
          type: 'Container',
          role: 'icon-with-badge',
          layout: 'stacked',
          children: [
            { type: 'Icon', text: 'bell' },
            { type: 'Badge', text: '5' },
          ],
        },
        {
          type: 'Container',
          role: 'icon-with-badge',
          layout: 'stacked',
          children: [
            { type: 'Icon', text: 'message-square' },
            { type: 'Badge', text: '12' },
          ],
        },
        { type: 'Icon', text: 'inbox' },
        { type: 'Icon', text: 'check' },
      ],
    },
  },

  // 15. MASONRY-LIKE GRID
  {
    name: 'Masonry Grid',
    description: 'Pinterest-Style Masonry Grid mit unterschiedlichen Kartenhöhen',
    inputCode: `Frame w 800, h 600, bg #0a0a0a, pad 16
  Frame grid 3, gap 16
    Frame w full, h 180, bg #1a1a1a, rad 12, clip
      Image src "photo1.jpg", w full, h 120, clip
      Frame pad 12, gap 4
        Text "Mountain View", col white, fs 14, weight 500
        Text "Photography", col #888, fs 12
    Frame w full, h 240, bg #1a1a1a, rad 12, clip
      Image src "photo2.jpg", w full, h 180, clip
      Frame pad 12, gap 4
        Text "City Lights", col white, fs 14, weight 500
        Text "Urban", col #888, fs 12
    Frame w full, h 160, bg #1a1a1a, rad 12, clip
      Image src "photo3.jpg", w full, h 100, clip
      Frame pad 12, gap 4
        Text "Beach", col white, fs 14, weight 500
        Text "Nature", col #888, fs 12
    Frame w full, h 200, bg #1a1a1a, rad 12, clip
      Image src "photo4.jpg", w full, h 140, clip
      Frame pad 12, gap 4
        Text "Forest Trail", col white, fs 14, weight 500
        Text "Hiking", col #888, fs 12
    Frame w full, h 180, bg #1a1a1a, rad 12, clip
      Image src "photo5.jpg", w full, h 120, clip
      Frame pad 12, gap 4
        Text "Sunset", col white, fs 14, weight 500
        Text "Nature", col #888, fs 12
    Frame w full, h 220, bg #1a1a1a, rad 12, clip
      Image src "photo6.jpg", w full, h 160, clip
      Frame pad 12, gap 4
        Text "Architecture", col white, fs 14, weight 500
        Text "Buildings", col #888, fs 12`,
    semanticAnalysis: {
      componentType: 'Grid',
      description: 'Masonry-Style Photo Grid',
      layout: 'grid',
      children: Array.from({ length: 6 }, (_, i) => ({
        type: 'Card',
        role: 'photo-card',
        children: [
          { type: 'Image' },
          {
            type: 'Container',
            children: [
              { type: 'Text', role: 'title' },
              { type: 'Text', role: 'category' },
            ],
          },
        ],
      })),
    },
  },

  // 16. NESTED CARDS (CARD-IN-CARD)
  {
    name: 'Nested Cards',
    description: 'Verschachtelte Karten mit Card-in-Card Pattern',
    inputCode: `Frame w 500, h 400, bg #0a0a0a, pad 24
  Frame bg #1a1a1a, rad 16, pad 20, gap 16
    Frame hor, spread, ver-center
      Text "Order Summary", col white, fs 18, weight bold
      Text "#12345", col #888, fs 14
    Frame bg #252525, rad 12, pad 16, gap 12
      Frame hor, spread, ver-center
        Frame hor, gap 12
          Frame w 48, h 48, bg #333, rad 8
          Frame gap 2
            Text "MacBook Pro 14", col white, fs 14
            Text "Space Gray", col #888, fs 12
        Text "$1,999", col white, fs 14, weight 500
      Frame hor, spread, ver-center
        Frame hor, gap 12
          Frame w 48, h 48, bg #333, rad 8
          Frame gap 2
            Text "Magic Keyboard", col white, fs 14
            Text "Black", col #888, fs 12
        Text "$299", col white, fs 14, weight 500
    Frame h 1, bg #333
    Frame hor, spread, ver-center
      Text "Total", col #888, fs 14
      Text "$2,298", col white, fs 20, weight bold
    Frame bg #2271C1, rad 8, pad 14, center
      Text "Checkout", col white, fs 14, weight 500`,
    semanticAnalysis: {
      componentType: 'Card',
      description: 'Order Summary mit verschachtelten Item-Cards',
      children: [
        {
          type: 'Container',
          role: 'header',
          layout: 'horizontal',
          children: [
            { type: 'Text', role: 'title', text: 'Order Summary' },
            { type: 'Text', role: 'id', text: '#12345' },
          ],
        },
        {
          type: 'Card',
          role: 'nested-card',
          children: [
            {
              type: 'Container',
              role: 'item',
              children: [
                { type: 'Image' },
                { type: 'Text', role: 'name' },
                { type: 'Text', role: 'price' },
              ],
            },
            {
              type: 'Container',
              role: 'item',
              children: [
                { type: 'Image' },
                { type: 'Text', role: 'name' },
                { type: 'Text', role: 'price' },
              ],
            },
          ],
        },
        { type: 'Divider' },
        {
          type: 'Container',
          role: 'total',
          layout: 'horizontal',
          children: [
            { type: 'Text', role: 'label' },
            { type: 'Text', role: 'value' },
          ],
        },
        { type: 'Button', role: 'cta', text: 'Checkout' },
      ],
    },
  },

  // 17. SPLIT SCREEN LAYOUT
  {
    name: 'Split Screen',
    description: 'Zweispaltiges Split-Layout mit unterschiedlichen Bereichen',
    inputCode: `Frame w 800, h 500, hor
  Frame w 320, h full, bg #1a1a1a, pad 24, gap 16
    Frame w 60, h 60, bg #2271C1, rad 12, center
      Icon "code", ic white, is 28
    Text "Welcome to Mirror", col white, fs 24, weight bold
    Text "The AI-powered design language that humans can read and AI can generate.", col #888, fs 14, line 1.6
    Frame gap 12
      Frame bg #252525, rad 8, pad 12, hor, gap 12
        Icon "check", ic #10b981, is 16
        Text "Readable syntax", col white, fs 14
      Frame bg #252525, rad 8, pad 12, hor, gap 12
        Icon "check", ic #10b981, is 16
        Text "No build tools", col white, fs 14
      Frame bg #252525, rad 8, pad 12, hor, gap 12
        Icon "check", ic #10b981, is 16
        Text "AI-friendly", col white, fs 14
    Frame bg #2271C1, rad 8, pad 14, center
      Text "Get Started", col white, fs 14, weight 500
  Frame grow, h full, bg #0a0a0a, pad 32, center
    Frame w 400, h 300, bg #1a1a1a, rad 12, shadow lg, pad 24
      Text "Preview Area", col white, fs 16, center`,
    semanticAnalysis: {
      componentType: 'Container',
      description: 'Split-Screen mit Intro und Preview',
      layout: 'horizontal',
      children: [
        {
          type: 'Container',
          role: 'sidebar',
          children: [
            { type: 'Icon', role: 'logo' },
            { type: 'Text', role: 'heading' },
            { type: 'Text', role: 'description' },
            {
              type: 'Container',
              role: 'feature-list',
              children: [
                { type: 'Container', role: 'feature-item' },
                { type: 'Container', role: 'feature-item' },
                { type: 'Container', role: 'feature-item' },
              ],
            },
            { type: 'Button', role: 'cta' },
          ],
        },
        {
          type: 'Container',
          role: 'main',
          alignment: 'center',
          children: [{ type: 'Card', role: 'preview' }],
        },
      ],
    },
  },

  // 18. COMPONENT VARIANT TEST (Multiple Button Variants)
  {
    name: 'Button Variants',
    description: 'Test für Komponenten-Varianten-Erkennung',
    inputCode: `Frame w 400, h 300, bg #0a0a0a, pad 24, gap 16, center
  Text "Button Variants", col white, fs 18, weight bold
  Frame hor, gap 12, wrap
    Button "Primary", bg #2271C1, col white, pad 12 24, rad 8
    Button "Secondary", bg #252525, col white, pad 12 24, rad 8
    Button "Danger", bg #ef4444, col white, pad 12 24, rad 8
    Button "Success", bg #10b981, col white, pad 12 24, rad 8
    Button "Ghost", bg transparent, col #888, pad 12 24, rad 8, bor 1, boc #333
    Button "Small", bg #2271C1, col white, pad 8 16, rad 6, fs 12
    Button "Large", bg #2271C1, col white, pad 16 32, rad 10, fs 16`,
    semanticAnalysis: {
      componentType: 'Container',
      description: 'Button-Varianten Demo',
      alignment: 'center',
      children: [
        { type: 'Text', role: 'heading', text: 'Button Variants' },
        {
          type: 'Container',
          layout: 'horizontal',
          children: [
            { type: 'Button', role: 'primary' },
            { type: 'Button', role: 'secondary' },
            { type: 'Button', role: 'danger' },
            { type: 'Button', role: 'success' },
            { type: 'Button', role: 'ghost' },
            { type: 'Button', role: 'small' },
            { type: 'Button', role: 'large' },
          ],
        },
      ],
    },
  },
]

// =============================================================================
// Test Runner
// =============================================================================

async function run(): Promise<boolean> {
  console.log('='.repeat(80))
  console.log('REAL SCREEN TESTS')
  console.log('Testing combined pipeline with realistic UI screens')
  console.log('='.repeat(80))
  console.log()

  const runner = new ImageToMirrorTestRunner(
    {
      headless: true,
      verbose: false,
      saveScreenshots: true,
      outputDir: 'test-output/real-screens',
    },
    new NestedRectangleAnalyzer()
  )

  let passed = 0

  try {
    await runner.start()

    for (const test of REAL_SCREENS) {
      console.log(`\n${'─'.repeat(80)}`)
      console.log(`📱 ${test.name}`)
      console.log(`   ${test.description}`)
      console.log('─'.repeat(80))

      // 1. Render and get pixel analysis
      const testCase = createTestCase(
        test.name.toLowerCase().replace(/\s+/g, '-'),
        test.name,
        test.inputCode
      )
      const result = await runner.runTest(testCase)
      const pixelCode = result.analysis?.generatedCode || ''

      console.log('\n[Pixel-Analyse] (erste 20 Zeilen):')
      pixelCode
        .split('\n')
        .slice(0, 20)
        .forEach(l => console.log(`  ${l}`))
      if (pixelCode.split('\n').length > 20) {
        console.log(`  ... (${pixelCode.split('\n').length - 20} weitere Zeilen)`)
      }

      // 2. Run combined pipeline
      console.log('\n[Combined Pipeline]:')
      const combined = runCombinedPipeline({
        semanticAnalysis: test.semanticAnalysis,
        pixelCode,
      })

      console.log('\nMirror Code (erste 25 Zeilen):')
      combined.mirrorCode
        .split('\n')
        .slice(0, 25)
        .forEach(l => console.log(`  ${l}`))
      if (combined.mirrorCode.split('\n').length > 25) {
        console.log(`  ... (${combined.mirrorCode.split('\n').length - 25} weitere Zeilen)`)
      }

      if (combined.insights.length > 0) {
        console.log('\nErkenntnisse:')
        combined.insights.forEach(i => console.log(`  ✓ ${i}`))
      }

      if (combined.derivedRules.length > 0) {
        console.log('\nAbgeleitete Tokens:')
        const highConfidence = combined.derivedRules.filter(
          r => r.confidence === 'high' || r.usageCount > 2
        )
        highConfidence.slice(0, 10).forEach(r => {
          console.log(`  ${r.name}: ${r.value} (${r.usageCount}x)`)
        })
        if (highConfidence.length > 10) {
          console.log(`  ... (${highConfidence.length - 10} weitere)`)
        }
      }

      if (combined.componentDefinitions.length > 0) {
        console.log('\nKomponenten-Definitionen:')
        combined.componentDefinitions.slice(0, 5).forEach(def => {
          console.log(
            `  ${def.name}: ${def.properties.slice(0, 3).join(', ')}${def.properties.length > 3 ? '...' : ''}`
          )
        })
      }

      // Validation - simplified for realistic screens
      const hasCode = combined.mirrorCode.length > 50
      const hasRules = combined.derivedRules.length > 0
      const hasInsights = combined.insights.length > 0

      console.log()
      if (hasCode && hasRules) {
        console.log('  ✅ PASSED - Code und Tokens generiert')
        passed++
      } else {
        console.log('  ⚠️  PARTIAL')
        if (!hasCode) console.log('     - Wenig Code generiert')
        if (!hasRules) console.log('     - Keine Regeln abgeleitet')
      }
    }
  } finally {
    await runner.stop()
  }

  console.log()
  console.log('='.repeat(80))
  console.log(`Ergebnis: ${passed}/${REAL_SCREENS.length} Screens erfolgreich`)
  console.log('='.repeat(80))

  return passed === REAL_SCREENS.length
}

// =============================================================================
// Entry Point
// =============================================================================

run()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('Error:', error)
    process.exit(1)
  })
