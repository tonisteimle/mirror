import { describe, it, expect } from 'vitest'
import {
  findIconForComponent,
  extractKeywords,
  getIconPath,
  generateIconSVG,
  findIconsForComponents,
} from '../../studio/component-icon-matcher'

describe('ComponentIconMatcher', () => {
  describe('extractKeywords', () => {
    it('extracts keywords from CamelCase', () => {
      expect(extractKeywords('UserProfile')).toEqual(['user', 'profile'])
      expect(extractKeywords('ShoppingCart')).toEqual(['shopping', 'cart'])
      expect(extractKeywords('NavItem')).toEqual(['nav', 'item'])
    })

    it('extracts keywords from PascalCase with acronyms', () => {
      expect(extractKeywords('HTMLParser')).toEqual(['html', 'parser'])
      expect(extractKeywords('APIClient')).toEqual(['api', 'client'])
    })

    it('handles kebab-case', () => {
      expect(extractKeywords('user-profile')).toEqual(['user', 'profile'])
      expect(extractKeywords('nav-item')).toEqual(['nav', 'item'])
    })

    it('handles snake_case', () => {
      expect(extractKeywords('user_profile')).toEqual(['user', 'profile'])
      expect(extractKeywords('nav_item')).toEqual(['nav', 'item'])
    })

    it('handles single words', () => {
      expect(extractKeywords('Button')).toEqual(['button'])
      expect(extractKeywords('card')).toEqual(['card'])
    })
  })

  describe('findIconForComponent', () => {
    describe('direct Lucide icon matches', () => {
      it('matches exact Lucide icon names', () => {
        expect(findIconForComponent('Heart')).toBe('heart')
        expect(findIconForComponent('Star')).toBe('star')
        expect(findIconForComponent('User')).toBe('user')
        expect(findIconForComponent('Search')).toBe('search')
        expect(findIconForComponent('Settings')).toBe('settings')
      })
    })

    describe('keyword mappings', () => {
      it('matches navigation components', () => {
        expect(findIconForComponent('NavBar')).toBe('menu')
        expect(findIconForComponent('Sidebar')).toBe('sidebar') // direct Lucide match
        expect(findIconForComponent('MenuButton')).toBe('menu')
        expect(findIconForComponent('BreadcrumbItem')).toBe('chevrons-right')
      })

      it('matches button components', () => {
        expect(findIconForComponent('Button')).toBe('mouse-pointer-click')
        expect(findIconForComponent('SubmitBtn')).toBe('send')
        expect(findIconForComponent('DeleteButton')).toBe('trash-2')
        expect(findIconForComponent('AddButton')).toBe('plus')
        expect(findIconForComponent('CloseButton')).toBe('x')
      })

      it('matches form components', () => {
        expect(findIconForComponent('TextInput')).toBe('text-cursor-input')
        expect(findIconForComponent('EmailField')).toBe('mail')
        expect(findIconForComponent('PasswordInput')).toBe('lock')
        expect(findIconForComponent('SearchBar')).toBe('search')
        expect(findIconForComponent('DatePicker')).toBe('calendar')
        expect(findIconForComponent('Checkbox')).toBe('check-square')
        expect(findIconForComponent('RadioButton')).toBe('circle-dot')
        expect(findIconForComponent('Toggle')).toBe('toggle-left')
        expect(findIconForComponent('Dropdown')).toBe('chevron-down')
      })

      it('matches layout components', () => {
        expect(findIconForComponent('Card')).toBe('square')
        expect(findIconForComponent('Container')).toBe('square')
        expect(findIconForComponent('Grid')).toBe('grid') // direct Lucide match
        expect(findIconForComponent('List')).toBe('list')
        expect(findIconForComponent('Stack')).toBe('layers')
      })

      it('matches media components', () => {
        expect(findIconForComponent('Avatar')).toBe('user')
        expect(findIconForComponent('ProfilePic')).toBe('user')
        expect(findIconForComponent('ImageGallery')).toBe('image') // 'image' keyword matched first
        expect(findIconForComponent('VideoPlayer')).toBe('play-circle')
      })

      it('matches text components', () => {
        expect(findIconForComponent('Title')).toBe('heading')
        expect(findIconForComponent('Heading')).toBe('heading')
        expect(findIconForComponent('Paragraph')).toBe('pilcrow')
        expect(findIconForComponent('CodeBlock')).toBe('code')
        expect(findIconForComponent('Link')).toBe('link')
      })

      it('matches feedback components', () => {
        expect(findIconForComponent('Alert')).toBe('alert-triangle')
        expect(findIconForComponent('Notification')).toBe('bell')
        expect(findIconForComponent('Toast')).toBe('message-square')
        expect(findIconForComponent('Badge')).toBe('badge')
        expect(findIconForComponent('Rating')).toBe('star')
      })

      it('matches overlay components', () => {
        expect(findIconForComponent('Modal')).toBe('square')
        expect(findIconForComponent('Dialog')).toBe('message-square')
        expect(findIconForComponent('Tooltip')).toBe('message-circle')
        expect(findIconForComponent('Popover')).toBe('message-square')
      })

      it('matches user components', () => {
        expect(findIconForComponent('UserCard')).toBe('user')
        expect(findIconForComponent('LoginForm')).toBe('log-in')
        expect(findIconForComponent('SignupButton')).toBe('user-plus')
        expect(findIconForComponent('AccountMenu')).toBe('user')
      })

      it('matches e-commerce components', () => {
        expect(findIconForComponent('ShoppingCart')).toBe('shopping-cart')
        expect(findIconForComponent('CartItem')).toBe('shopping-cart')
        expect(findIconForComponent('CheckoutButton')).toBe('credit-card')
        expect(findIconForComponent('PriceTag')).toBe('tag')
        expect(findIconForComponent('ProductCard')).toBe('box')
      })

      it('matches data display components', () => {
        expect(findIconForComponent('DataTable')).toBe('table')
        expect(findIconForComponent('Dashboard')).toBe('layout-dashboard')
        expect(findIconForComponent('Chart')).toBe('bar-chart-2')
        expect(findIconForComponent('ProgressBar')).toBe('loader')
        expect(findIconForComponent('Timeline')).toBe('git-commit-horizontal')
      })

      it('matches settings components', () => {
        expect(findIconForComponent('SettingsPanel')).toBe('settings')
        expect(findIconForComponent('ThemeToggle')).toBe('palette')
        expect(findIconForComponent('LanguageSelector')).toBe('globe')
        expect(findIconForComponent('PrivacySettings')).toBe('shield')
      })

      it('matches file components', () => {
        expect(findIconForComponent('FileUpload')).toBe('upload')
        expect(findIconForComponent('DocumentList')).toBe('file-text')
        expect(findIconForComponent('FolderTree')).toBe('folder')
        expect(findIconForComponent('Attachment')).toBe('paperclip')
      })

      it('matches communication components', () => {
        expect(findIconForComponent('EmailForm')).toBe('mail')
        expect(findIconForComponent('ChatMessage')).toBe('message-circle')
        expect(findIconForComponent('PhoneNumber')).toBe('phone')
        expect(findIconForComponent('ContactCard')).toBe('contact')
      })

      it('matches social components', () => {
        expect(findIconForComponent('LikeButton')).toBe('heart')
        expect(findIconForComponent('ShareButton')).toBe('share-2')
        expect(findIconForComponent('BookmarkIcon')).toBe('bookmark')
        expect(findIconForComponent('FollowButton')).toBe('user-plus')
      })

      it('matches status components', () => {
        expect(findIconForComponent('ActiveIndicator')).toBe('check-circle')
        expect(findIconForComponent('PendingStatus')).toBe('clock')
        expect(findIconForComponent('ErrorMessage')).toBe('alert-circle')
        expect(findIconForComponent('SuccessAlert')).toBe('check-circle')
      })
    })

    describe('primitive-based fallbacks', () => {
      it('uses primitive icon when name has no match', () => {
        expect(findIconForComponent('Xyzzy', 'button')).toBe('mouse-pointer-click')
        expect(findIconForComponent('Qwop', 'input')).toBe('text-cursor-input')
        expect(findIconForComponent('Zxcv', 'frame')).toBe('square')
        expect(findIconForComponent('Asdf', 'image')).toBe('image')
      })
    })

    describe('fallback to square', () => {
      it('returns square for completely unknown names', () => {
        expect(findIconForComponent('Xyz')).toBe('square')
        expect(findIconForComponent('Qwerty')).toBe('square')
        expect(findIconForComponent('Asdf')).toBe('square')
      })
    })
  })

  describe('getIconPath', () => {
    it('returns path for known icons', () => {
      expect(getIconPath('square')).toContain('rect')
      expect(getIconPath('user')).toContain('circle')
      expect(getIconPath('search')).toContain('circle')
    })

    it('returns square path for unknown icons', () => {
      expect(getIconPath('unknown-icon')).toContain('rect')
    })
  })

  describe('generateIconSVG', () => {
    it('generates complete SVG string', () => {
      const svg = generateIconSVG('square', 24, 2)
      expect(svg).toContain('<svg')
      expect(svg).toContain('width="24"')
      expect(svg).toContain('height="24"')
      expect(svg).toContain('stroke-width="2"')
      expect(svg).toContain('</svg>')
    })

    it('uses default size and stroke', () => {
      const svg = generateIconSVG('square')
      expect(svg).toContain('width="16"')
      expect(svg).toContain('height="16"')
    })
  })

  describe('findIconsForComponents', () => {
    it('batch processes multiple components', () => {
      const components = [
        { name: 'Button' },
        { name: 'Card' },
        { name: 'UserProfile' },
        { name: 'Xyzzy', primitive: 'input' }, // unknown name, uses primitive
      ]

      const result = findIconsForComponents(components)

      expect(result.get('Button')).toBe('mouse-pointer-click')
      expect(result.get('Card')).toBe('square')
      expect(result.get('UserProfile')).toBe('user')
      expect(result.get('Xyzzy')).toBe('text-cursor-input')
    })
  })
})
