// Ambient declarations for Tauri's CDN ESM imports.
//
// Studio loads `@tauri-apps/api` directly from esm.sh at runtime so the
// browser bundle stays independent of an installed Tauri SDK. TypeScript
// can't follow URL imports — these declarations let it accept the import
// statements; the call sites (in `studio/tauri-bridge.ts`) cast the
// resolved namespace object to local interfaces (`TauriCoreApi`,
// `TauriEventApi`, `TauriWindowApi`) that capture only the call shapes
// the bridge actually uses.
declare module 'https://esm.sh/@tauri-apps/api@2/core'
declare module 'https://esm.sh/@tauri-apps/api@2/event'
declare module 'https://esm.sh/@tauri-apps/api@2/window'
