/**
 * Component Test Builder
 *
 * Fluent API for writing concise component tests.
 */
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { it, expect, describe, beforeEach } from 'vitest'
import { createRenderer, type RenderWithProps } from './render'
import { resetMocks } from './mocks'
import type { ComponentType } from 'react'
import type { Mock } from 'vitest'

// Extract keys that are functions (for type-safe callback assertions)
type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? K : never
}[keyof T]

// Builder options
interface BuilderOptions {
  providers?: Parameters<typeof createRenderer>[2]
  editorTestId?: string
}

/**
 * Create a test builder for a component.
 */
export function componentTest<P extends Record<string, unknown>>(
  Component: ComponentType<P>,
  defaultProps: () => P,
  options?: BuilderOptions
) {
  const renderFn = createRenderer(Component, defaultProps, options)
  const editorTestId = options?.editorTestId ?? 'editor'

  return {
    /**
     * Get the render function for custom tests.
     */
    render: renderFn,

    /**
     * Test that elements with given texts are rendered.
     */
    shouldRender(texts: string[]) {
      describe('renders', () => {
        beforeEach(() => resetMocks())

        it.each(texts)('should render "%s"', (text) => {
          renderFn()
          expect(screen.getByText(text)).toBeDefined()
        })
      })
    },

    /**
     * Test that elements with given titles are rendered.
     */
    shouldRenderTitles(titles: string[]) {
      describe('renders buttons', () => {
        beforeEach(() => resetMocks())

        it.each(titles)('should render button with title "%s"', (title) => {
          renderFn()
          expect(screen.getByTitle(title)).toBeDefined()
        })
      })
    },

    /**
     * Test click behavior with type-safe callback assertions.
     */
    clicking(target: string) {
      return {
        calls: <K extends FunctionKeys<P>>(propName: K, ...expectedArgs: unknown[]) => {
          it(`clicking "${target}" calls ${String(propName)}${expectedArgs.length ? ` with ${JSON.stringify(expectedArgs)}` : ''}`, () => {
            resetMocks()
            const { props } = renderFn()
            const element = screen.queryByText(target) || screen.queryByTitle(target)
            if (!element) throw new Error(`Element "${target}" not found`)
            fireEvent.click(element)

            const mockFn = props[propName] as Mock
            if (expectedArgs.length > 0) {
              expect(mockFn).toHaveBeenCalledWith(...expectedArgs)
            } else {
              expect(mockFn).toHaveBeenCalled()
            }
          })
        },
      }
    },

    /**
     * Test with specific prop overrides.
     */
    when(propOverrides: Partial<P>) {
      return {
        shows: (text: string) => {
          const desc = Object.entries(propOverrides)
            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
            .join(', ')

          it(`when ${desc}, shows "${text}"`, () => {
            resetMocks()
            renderFn(propOverrides)
            expect(screen.getByText(text)).toBeDefined()
          })
        },

        editorHasValue: (value: string) => {
          const desc = Object.entries(propOverrides)
            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
            .join(', ')

          it(`when ${desc}, editor has value "${value}"`, () => {
            resetMocks()
            renderFn(propOverrides)
            const editor = screen.getByTestId(editorTestId) as HTMLTextAreaElement
            expect(editor.value).toBe(value)
          })
        },

        render: () => renderFn(propOverrides),
      }
    },

    /**
     * Test that component doesn't render when condition is met.
     */
    whenNotRendered(propOverrides: Partial<P>) {
      return {
        describe: (description: string) => {
          it(description, () => {
            resetMocks()
            const { container } = renderFn(propOverrides)
            expect(container.firstChild).toBeNull()
          })
        },
      }
    },

    /**
     * Test async behavior with waitFor.
     */
    async: {
      /**
       * Wait for element to appear after action.
       */
      afterClicking(target: string) {
        return {
          shows: (text: string) => {
            it(`after clicking "${target}", shows "${text}"`, async () => {
              resetMocks()
              renderFn()
              const element = screen.queryByText(target) || screen.queryByTitle(target)
              if (!element) throw new Error(`Element "${target}" not found`)
              fireEvent.click(element)

              await waitFor(() => {
                expect(screen.getByText(text)).toBeDefined()
              })
            })
          },

          hides: (text: string) => {
            it(`after clicking "${target}", hides "${text}"`, async () => {
              resetMocks()
              renderFn()
              const element = screen.queryByText(target) || screen.queryByTitle(target)
              if (!element) throw new Error(`Element "${target}" not found`)
              fireEvent.click(element)

              await waitFor(() => {
                expect(screen.queryByText(text)).toBeNull()
              })
            })
          },
        }
      },
    },

    /**
     * Test keyboard interactions.
     */
    pressing(key: string, options?: { ctrl?: boolean; shift?: boolean; alt?: boolean }) {
      return {
        calls: <K extends FunctionKeys<P>>(propName: K, ...expectedArgs: unknown[]) => {
          const modifiers = [
            options?.ctrl && 'Ctrl',
            options?.shift && 'Shift',
            options?.alt && 'Alt',
          ].filter(Boolean).join('+')
          const keyDesc = modifiers ? `${modifiers}+${key}` : key

          it(`pressing ${keyDesc} calls ${String(propName)}${expectedArgs.length ? ` with ${JSON.stringify(expectedArgs)}` : ''}`, () => {
            resetMocks()
            const { props, container } = renderFn()
            const target = container.firstChild as HTMLElement

            fireEvent.keyDown(target, {
              key,
              ctrlKey: options?.ctrl,
              shiftKey: options?.shift,
              altKey: options?.alt,
            })

            const mockFn = props[propName] as Mock
            if (expectedArgs.length > 0) {
              expect(mockFn).toHaveBeenCalledWith(...expectedArgs)
            } else {
              expect(mockFn).toHaveBeenCalled()
            }
          })
        },

        on: (selector: string) => ({
          calls: <K extends FunctionKeys<P>>(propName: K, ...expectedArgs: unknown[]) => {
            const modifiers = [
              options?.ctrl && 'Ctrl',
              options?.shift && 'Shift',
              options?.alt && 'Alt',
            ].filter(Boolean).join('+')
            const keyDesc = modifiers ? `${modifiers}+${key}` : key

            it(`pressing ${keyDesc} on "${selector}" calls ${String(propName)}`, () => {
              resetMocks()
              const { props } = renderFn()
              const element = screen.queryByText(selector) ||
                screen.queryByTitle(selector) ||
                screen.queryByTestId(selector)
              if (!element) throw new Error(`Element "${selector}" not found`)

              fireEvent.keyDown(element, {
                key,
                ctrlKey: options?.ctrl,
                shiftKey: options?.shift,
                altKey: options?.alt,
              })

              const mockFn = props[propName] as Mock
              if (expectedArgs.length > 0) {
                expect(mockFn).toHaveBeenCalledWith(...expectedArgs)
              } else {
                expect(mockFn).toHaveBeenCalled()
              }
            })
          },
        }),
      }
    },
  }
}
