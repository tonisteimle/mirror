/**
 * Token Context Hooks
 *
 * Hooks for accessing token context.
 * Separated from provider to avoid react-refresh issues.
 */

import { useContext } from 'react'
import { TokenContext } from './token-context-definition'

export function useTokens() {
  return useContext(TokenContext)
}
