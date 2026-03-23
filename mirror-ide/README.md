# Mirror IDE (Tauri Desktop App)

Desktop-Wrapper für Mirror Studio mit nativen Funktionen.

## Was ist das?

- Die **bestehende Studio Web-App** wird unverändert verwendet
- Tauri fügt **native Desktop-Funktionen** hinzu:
  - Echtes File System (statt localStorage)
  - Claude CLI Integration
  - Native Dialoge

## Development

```bash
# 1. Lokalen Server für studio/ starten (in separatem Terminal)
cd .. && npx live-server --port=5500

# 2. Tauri starten
npm run dev
```

## Build

```bash
npm run build
```

## Tauri Bridge

Die Datei `studio/tauri-bridge.js` stellt die Tauri-APIs bereit:

```javascript
// Prüfen ob in Tauri
if (window.TauriBridge?.isTauri()) {
  // Native File System
  const content = await window.TauriBridge.fs.readFile('/path/to/file');
  await window.TauriBridge.fs.writeFile('/path/to/file', content);

  // Dialoge
  const folder = await window.TauriBridge.dialog.openFolder();

  // Claude CLI
  const result = await window.TauriBridge.agent.runAgent(
    'erstelle eine todo app',
    'fixer',  // oder 'builder'
    '/project/path'
  );
}
```

## Struktur

```
mirror-ide/
├── src-tauri/           # Rust Backend
│   └── src/commands/    # File System, Claude CLI, Project Commands
├── package.json
└── README.md

studio/                  # Unveränderte Web-App
├── tauri-bridge.js      # Brücke zu Tauri APIs
├── index.html
├── app.js
└── ...
```
