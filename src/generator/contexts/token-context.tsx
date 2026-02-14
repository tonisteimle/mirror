/**
 * Token Context
 *
 * Provides access to design tokens (TokenValue map) for nested components.
 * Used by Playground to access parent document tokens.
 */

import type { ReactNode } from 'react'
import type { TokenValue } from '../../parser/types'
import { TokenContext } from './token-context-definition'

export function TokenProvider({
  tokens,
  children
}: {
  tokens: Map<string, TokenValue>
  children: ReactNode
}) {
  return (
    <TokenContext.Provider value={tokens}>
      {children}
    </TokenContext.Provider>
  )
}

