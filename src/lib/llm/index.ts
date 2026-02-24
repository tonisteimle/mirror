/**
 * LLM Module
 *
 * Central exports for LLM-related functionality including:
 * - Input sanitization
 * - Rate limiting
 * - Provider abstraction
 * - Response caching
 * - Prompt versioning
 */

// Input Sanitization
export {
  sanitizeUserInput,
  sanitizeCodeContext,
  detectPromptInjection,
  isInputSafe,
  createSafePrompt,
  type SanitizationResult,
  type InjectionDetectionResult,
} from './input-sanitizer'

// Rate Limiting
export {
  RateLimiter,
  RateLimitError,
  isRateLimitError,
  DEFAULT_LIMITS,
  getGlobalLimiter,
  resetGlobalLimiter,
  resetAllGlobalLimiters,
  canGenerateNow,
  recordGenerationRequest,
  getGenerationStatus,
  canTranslateNow,
  recordTranslationRequest,
  withRateLimit,
  type RateLimiterConfig,
  type RateLimitStatus,
} from './rate-limiter'

// Provider Abstraction
export {
  OpenRouterProvider,
  createProvider,
  getGlobalProvider,
  setGlobalProviderApiKey,
  isGlobalProviderConfigured,
  cancelGlobalProviderRequest,
  type LLMProvider,
  type GenerateOptions,
  type GenerateResult,
  type StreamChunk,
  type ProviderConfig,
  type ProviderType,
} from './provider'

// Prompt Versioning
export {
  PROMPTS,
  getPrompt,
  getPromptContent,
  getPromptVersion,
  listPrompts,
  getPromptChangelog,
  getJsBuilderPrompt,
  getIntentCreatePrompt,
  getIntentModifyPrompt,
  parseVersion,
  compareVersions,
  type PromptDefinition,
  type PromptRegistry,
} from './prompts'

// Response Caching
export {
  ResponseCache,
  getGlobalCache,
  clearGlobalCache,
  getGlobalCacheStats,
  hashPrompt,
  createCacheKey,
  type CacheEntry,
  type CacheStats,
  type CacheConfig,
} from './cache'
