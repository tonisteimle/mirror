import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['studio/index.ts'],
  format: ['esm'],
  outDir: 'studio/dist',
  splitting: false,
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
