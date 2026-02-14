/**
 * Token Context Definition
 *
 * Context for design tokens.
 * Separated from provider to avoid react-refresh issues.
 */

import { createContext } from 'react'
import type { TokenValue } from '../../parser/types'

export const TokenContext = createContext<Map<string, TokenValue> | null>(null)
