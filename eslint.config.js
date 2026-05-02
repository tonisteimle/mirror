import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'studio/dist/**',
      'packages/*/dist/**',
      'packages/*/node_modules/**',
      'docs/**',
      '*.min.js',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        Mirror: 'readonly', // Global compiler loaded via script tag
        MirrorLang: 'readonly', // Legacy global
        Chart: 'readonly', // Chart.js global
      },
    },
    rules: {
      // TypeScript-specific rules
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',

      // General rules
      'no-console': ['warn', { allow: ['warn', 'error', 'debug'] }],
      'no-debugger': 'warn',
      'prefer-const': 'warn',
      'no-var': 'error',

      // Relaxed for gradual adoption
      eqeqeq: ['warn', 'always', { null: 'ignore' }], // Allow != null for null/undefined checks
      'no-useless-escape': 'warn',
      'no-useless-assignment': 'warn',
      'no-case-declarations': 'warn',
      'no-dupe-keys': 'warn',
      'no-regex-spaces': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      'preserve-caught-error': 'off',
    },
  },
  {
    // Relaxed rules for test files
    files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-console': 'off',
    },
  },
  {
    // Relaxed rules for CLI tools
    files: ['**/cli.ts', '**/cli/*.ts', 'scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Relaxed rules for runtime (browser warnings are intentional)
    files: ['compiler/runtime/**/*.ts'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'debug', 'log'] }],
    },
  },
  {
    // Studio production code: route all logging through createLogger.
    // Excluded: test stacks, drag-test transport adapters, perf-logger
    // (which IS the console-routed perf channel).
    files: ['studio/**/*.ts'],
    ignores: [
      'studio/test-api/**',
      'studio/**/*.test.ts',
      'studio/**/*.spec.ts',
      'studio/preview/drag/test-api/**',
      'studio/preview/drag/test-runner*.ts',
      'studio/preview/drag/browser-test-api.ts',
      'studio/preview/drag/reporter/adapters/console-adapter.ts',
      'studio/compile/perf-logger.ts',
    ],
    rules: {
      'no-console': 'error',
    },
  }
)
