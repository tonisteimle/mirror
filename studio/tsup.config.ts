import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['studio/index.ts'],
  format: ['esm'],
  outDir: 'studio/dist',
  splitting: false,
  // Replace process.env.NODE_ENV for browser compatibility
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  // Bundle everything EXCEPT these packages (loaded via importmap)
  external: [
    'tom-select',
    '@codemirror/state',
    '@codemirror/view',
    '@codemirror/language',
    '@codemirror/commands',
    '@codemirror/autocomplete',
  ],
  // Force bundling of ALL @zag-js and @atlaskit packages (not external)
  noExternal: [/^@zag-js\/.*/, /^@atlaskit\/.*/],
})
