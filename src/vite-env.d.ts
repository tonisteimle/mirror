/// <reference types="vite/client" />

// Raw file imports
declare module '*.mirror?raw' {
  const content: string
  export default content
}
