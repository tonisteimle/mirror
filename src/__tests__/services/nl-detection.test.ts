import { describe, it, expect } from 'vitest'
import { detectNaturalLanguage, shouldTranslateHybrid, isNaturalLanguageLine } from '../../services/nl-detection'

describe('NL Detection', () => {
  describe('shouldTranslateHybrid (Parser-based)', () => {
    describe('triggers LLM for natural language', () => {
      it('German request with "Bitte"', () => {
        expect(shouldTranslateHybrid('Bitte erstelle mir ein Login Formular')).toBe(true)
      })

      it('German request with "erstelle"', () => {
        expect(shouldTranslateHybrid('erstelle ein Login Formular')).toBe(true)
      })

      it('English request with "Please"', () => {
        expect(shouldTranslateHybrid('Please create a login form')).toBe(true)
      })

      it('English request with "create"', () => {
        expect(shouldTranslateHybrid('create a card with a title')).toBe(true)
      })

      it('German description', () => {
        expect(shouldTranslateHybrid('ein blauer button')).toBe(true)
      })

      it('German with prepositions', () => {
        expect(shouldTranslateHybrid('toolbar mit icon buttons')).toBe(true)
      })

      it('German with articles', () => {
        expect(shouldTranslateHybrid('eine karte mit titel')).toBe(true)
      })
    })

    describe('triggers LLM for typos', () => {
      it('component name typo: Buttn → Button', () => {
        expect(shouldTranslateHybrid('Buttn bg #333')).toBe(true)
      })

      it('component name typo: Buton → Button', () => {
        expect(shouldTranslateHybrid('Buton pad 12')).toBe(true)
      })

      it('component name typo: Crad → Card', () => {
        expect(shouldTranslateHybrid('Crad bg #1E1E2E')).toBe(true)
      })

      it('component name typo: Inputt → Input', () => {
        expect(shouldTranslateHybrid('Inputt placeholder "Email"')).toBe(true)
      })

      it('component name typo: Toogle → Toggle', () => {
        expect(shouldTranslateHybrid('Toogle bg #333')).toBe(true)
      })

      it('component name typo: Icn → Icon', () => {
        expect(shouldTranslateHybrid('Icn "home"')).toBe(true)
      })
    })

    describe('triggers LLM for property typos', () => {
      it('property typo: backgrund → background', () => {
        expect(shouldTranslateHybrid('backgrund #333')).toBe(true)
      })

      it('property typo: paddng → padding', () => {
        expect(shouldTranslateHybrid('paddng 16')).toBe(true)
      })

      it('property typo: colr → color', () => {
        expect(shouldTranslateHybrid('colr #FFF')).toBe(true)
      })
    })

    describe('does NOT trigger LLM for valid DSL', () => {
      it('simple component', () => {
        expect(shouldTranslateHybrid('Button bg #333')).toBe(false)
      })

      it('component with multiple properties', () => {
        expect(shouldTranslateHybrid('Box pad 16, bg #1E1E2E, rad 8')).toBe(false)
      })

      it('component with content', () => {
        expect(shouldTranslateHybrid('Button "Click me"')).toBe(false)
      })

      it('component definition', () => {
        expect(shouldTranslateHybrid('MyCard: bg #333')).toBe(false)
      })

      it('component inheritance', () => {
        expect(shouldTranslateHybrid('PrimaryButton: Button bg #3B82F6')).toBe(false)
      })

      it('token definition', () => {
        expect(shouldTranslateHybrid('$primary: #3B82F6')).toBe(false)
      })

      it('token with suffix', () => {
        expect(shouldTranslateHybrid('$spacing-md: 16')).toBe(false)
      })

      it('comment', () => {
        expect(shouldTranslateHybrid('// This is a comment')).toBe(false)
      })

      it('section header', () => {
        expect(shouldTranslateHybrid('--- Header ---')).toBe(false)
      })

      it('empty line', () => {
        expect(shouldTranslateHybrid('')).toBe(false)
      })

      it('whitespace only', () => {
        expect(shouldTranslateHybrid('   ')).toBe(false)
      })
    })

    describe('does NOT trigger LLM for indented lines', () => {
      it('indented child component', () => {
        expect(shouldTranslateHybrid('  Text "Hello"')).toBe(false)
      })

      it('indented property', () => {
        expect(shouldTranslateHybrid('  bg #333')).toBe(false)
      })

      it('indented state block', () => {
        expect(shouldTranslateHybrid('  hover')).toBe(false)
      })

      it('tab-indented line', () => {
        expect(shouldTranslateHybrid('\tButton "Click"')).toBe(false)
      })
    })

    describe('handles edge cases', () => {
      it('unknown but valid-looking component (no typo match)', () => {
        // "Xyz" is not similar to any known component
        expect(shouldTranslateHybrid('Xyz bg #333')).toBe(false)
      })

      it('list item prefix (triggers LLM when alone - needs parent context)', () => {
        // List items without parent context produce parse errors
        // This is expected - in real use they're indented under a parent
        expect(shouldTranslateHybrid('- Item "First"')).toBe(true)
      })

      it('component with named instance', () => {
        expect(shouldTranslateHybrid('Button named SaveBtn "Save"')).toBe(false)
      })

      it('Icon with material flag', () => {
        expect(shouldTranslateHybrid('Icon "home", material')).toBe(false)
      })
    })
  })

  describe('detectNaturalLanguage', () => {
    it('detects German articles at start', () => {
      const result = detectNaturalLanguage('ein Login Formular')
      expect(result.isNaturalLanguage).toBe(true)
      expect(result.confidence).toBe('high')
    })

    it('detects English articles at start', () => {
      const result = detectNaturalLanguage('a blue button')
      expect(result.isNaturalLanguage).toBe(true)
      expect(result.confidence).toBe('high')
    })

    it('detects request verbs', () => {
      const result = detectNaturalLanguage('erstelle einen Button')
      expect(result.isNaturalLanguage).toBe(true)
      expect(result.reason).toBe('request verb')
    })

    it('detects prepositions in middle', () => {
      const result = detectNaturalLanguage('toolbar mit icons')
      expect(result.isNaturalLanguage).toBe(true)
      expect(result.reason).toContain('preposition')
    })

    it('recognizes valid DSL structure', () => {
      const result = detectNaturalLanguage('Button bg #3B82F6')
      expect(result.isNaturalLanguage).toBe(false)
      expect(result.reason).toBe('valid DSL structure')
    })

    it('recognizes component definitions', () => {
      const result = detectNaturalLanguage('Card: pad 16')
      expect(result.isNaturalLanguage).toBe(false)
      expect(result.reason).toBe('component definition')
    })

    it('recognizes token definitions', () => {
      const result = detectNaturalLanguage('$primary: #3B82F6')
      expect(result.isNaturalLanguage).toBe(false)
      expect(result.reason).toBe('token definition')
    })

    it('skips comments', () => {
      const result = detectNaturalLanguage('// comment here')
      expect(result.isNaturalLanguage).toBe(false)
      expect(result.reason).toBe('comment')
    })
  })

  describe('isNaturalLanguageLine', () => {
    it('returns true for clear NL', () => {
      expect(isNaturalLanguageLine('bitte erstelle ein Formular')).toBe(true)
    })

    it('returns false for valid DSL', () => {
      expect(isNaturalLanguageLine('Button bg #333')).toBe(false)
    })

    it('returns false for low confidence NL', () => {
      // Single lowercase word without clear NL indicators
      expect(isNaturalLanguageLine('something')).toBe(false)
    })
  })
})
