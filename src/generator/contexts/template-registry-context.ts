/**
 * Template Registry Context Definition
 *
 * Context for component templates.
 * Separated from provider to avoid react-refresh issues.
 */

import { createContext } from 'react'
import type { ComponentTemplate } from '../../parser/parser'

export const TemplateRegistryContext = createContext<Map<string, ComponentTemplate> | null>(null)
