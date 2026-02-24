/**
 * Browser Tests für Picker-Trigger
 *
 * Diese Tests laufen in einem echten Browser (via Playwright),
 * damit CodeMirror korrekt funktioniert (echtes DOM, Layout, Coords).
 *
 * Ausführen mit: npm run test:browser
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PromptPanel } from '../../components/PromptPanel'

describe('Picker Triggers (Browser)', () => {
  let onChange: ReturnType<typeof import('vitest').vi.fn>

  beforeEach(() => {
    onChange = () => {}
  })

  afterEach(() => {
    cleanup()
  })

  describe('Button picker', () => {
    it('opens with Layout, Font, Border tabs after "Button "', async () => {
      const user = userEvent.setup()
      render(<PromptPanel value="" onChange={onChange} />)

      const editor = screen.getByRole('textbox')
      await user.type(editor, 'Button ')

      // Warte auf das Panel
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Layout' })).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Font' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Border' })).toBeInTheDocument()
    })

    it('auto-closes when typing continues', async () => {
      const user = userEvent.setup()
      render(<PromptPanel value="" onChange={onChange} />)

      const editor = screen.getByRole('textbox')
      await user.type(editor, 'Button ')

      // Panel sollte offen sein
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Layout' })).toBeInTheDocument()
      })

      // Weiter tippen
      await user.type(editor, 'pad')

      // Panel sollte geschlossen sein
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Layout' })).not.toBeInTheDocument()
      })
    })
  })

  describe('Text picker', () => {
    it('opens with only Font tab after "Text "', async () => {
      const user = userEvent.setup()
      render(<PromptPanel value="" onChange={onChange} />)

      const editor = screen.getByRole('textbox')
      await user.type(editor, 'Text ')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Font' })).toBeInTheDocument()
      })

      // Sollte KEINE Layout oder Border tabs haben
      expect(screen.queryByRole('button', { name: 'Layout' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Border' })).not.toBeInTheDocument()
    })
  })

  describe('Box picker (default)', () => {
    it('opens with Layout and Border tabs after "Box "', async () => {
      const user = userEvent.setup()
      render(<PromptPanel value="" onChange={onChange} />)

      const editor = screen.getByRole('textbox')
      await user.type(editor, 'Box ')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Layout' })).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Border' })).toBeInTheDocument()
      // Sollte KEIN Font tab haben
      expect(screen.queryByRole('button', { name: 'Font' })).not.toBeInTheDocument()
    })
  })

  describe('Container picker (default)', () => {
    it('opens with Layout and Border tabs after "Container "', async () => {
      const user = userEvent.setup()
      render(<PromptPanel value="" onChange={onChange} />)

      const editor = screen.getByRole('textbox')
      await user.type(editor, 'Container ')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Layout' })).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Border' })).toBeInTheDocument()
    })
  })

  describe('Input picker', () => {
    it('opens with Input, Layout, Border, Font tabs after "Input "', async () => {
      const user = userEvent.setup()
      render(<PromptPanel value="" onChange={onChange} />)

      const editor = screen.getByRole('textbox')
      await user.type(editor, 'Input ')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Input' })).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Layout' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Border' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Font' })).toBeInTheDocument()
    })
  })

  describe('Image picker', () => {
    it('opens with Image, Layout, Border tabs after "Image "', async () => {
      const user = userEvent.setup()
      render(<PromptPanel value="" onChange={onChange} />)

      const editor = screen.getByRole('textbox')
      await user.type(editor, 'Image ')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Image' })).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Layout' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Border' })).toBeInTheDocument()
      // Sollte KEIN Font tab haben
      expect(screen.queryByRole('button', { name: 'Font' })).not.toBeInTheDocument()
    })
  })

  describe('Icon picker', () => {
    it('opens with Lucide/Material library tabs after "Icon "', async () => {
      const user = userEvent.setup()
      render(<PromptPanel value="" onChange={onChange} />)

      const editor = screen.getByRole('textbox')
      await user.type(editor, 'Icon ')

      // Icon picker shows library tabs (Lucide/Material) instead of panel tabs
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Lucide' })).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Material' })).toBeInTheDocument()
    })
  })

  describe('unknown components', () => {
    it('opens default picker for unknown PascalCase names', async () => {
      const user = userEvent.setup()
      render(<PromptPanel value="" onChange={onChange} />)

      const editor = screen.getByRole('textbox')
      await user.type(editor, 'Card ')

      await waitFor(() => {
        // Unbekannte Komponenten bekommen den default picker (Layout + Border)
        expect(screen.getByRole('button', { name: 'Layout' })).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Border' })).toBeInTheDocument()
    })
  })

  describe('"as Type" pattern', () => {
    it('opens correct picker for "Email as Input"', async () => {
      const user = userEvent.setup()
      render(<PromptPanel value="" onChange={onChange} />)

      const editor = screen.getByRole('textbox')
      await user.type(editor, 'Email as Input ')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Input' })).toBeInTheDocument()
      })
    })

    it('opens correct picker for "Logo as Image"', async () => {
      const user = userEvent.setup()
      render(<PromptPanel value="" onChange={onChange} />)

      const editor = screen.getByRole('textbox')
      await user.type(editor, 'Logo as Image ')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Image' })).toBeInTheDocument()
      })
    })
  })
})
