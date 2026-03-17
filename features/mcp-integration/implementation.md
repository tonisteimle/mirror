# MCP Integration - Implementierungsplan

## Übersicht

```
Phase 0: Setup (Grundlagen)
    │
    ▼
Phase 1: Minimal Viable Server
    │
    ▼
Phase 2: Core Tools
    │
    ▼
Phase 3: Bridge + Studio Integration
    │
    ▼
Phase 4: Polish + Erweiterungen
```

---

## Phase 0: Setup (Grundlagen)

**Ziel:** Dependencies installieren, Projektstruktur anlegen, "Hello World" Server

### Tasks

| # | Task | Dateien | Aufwand |
|---|------|---------|---------|
| 0.1 | MCP SDK + Zod installieren | package.json | 5min |
| 0.2 | Ordnerstruktur anlegen | src/mcp/* | 5min |
| 0.3 | Minimal Server (echo tool) | src/mcp/server.ts | 30min |
| 0.4 | Build-Script hinzufügen | package.json | 10min |
| 0.5 | Server bei Claude Code registrieren | .mcp.json | 10min |
| 0.6 | Testen: "Hello World" Tool | - | 15min |

### 0.1 Dependencies

```bash
npm install @modelcontextprotocol/sdk zod
npm install -D @types/node
```

### 0.2 Ordnerstruktur

```
src/mcp/
├── server.ts
├── bridge.ts
├── tools/
│   └── index.ts
└── resources/
    └── index.ts
```

### 0.3 Minimal Server

```typescript
// src/mcp/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const server = new Server({
  name: "mirror-studio",
  version: "0.1.0",
});

// Minimales Test-Tool
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "echo",
    description: "Echoes input back - test tool",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Message to echo" }
      },
      required: ["message"]
    }
  }]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "echo") {
    return {
      content: [{
        type: "text",
        text: `Echo: ${request.params.arguments?.message}`
      }]
    };
  }
  throw new Error(`Unknown tool: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Mirror MCP Server started");
}

main().catch(console.error);
```

### 0.4 Build Script

```json
// package.json
{
  "scripts": {
    "build:mcp": "esbuild src/mcp/server.ts --bundle --platform=node --format=esm --outfile=dist/mcp/server.js",
    "mcp": "node dist/mcp/server.js",
    "mcp:dev": "npx tsx src/mcp/server.ts"
  }
}
```

### 0.5 Registrierung

```json
// .mcp.json (im Projekt-Root)
{
  "mcpServers": {
    "mirror-studio": {
      "command": "node",
      "args": ["./dist/mcp/server.js"],
      "env": {
        "MIRROR_PROJECT": "${workspaceFolder}"
      }
    }
  }
}
```

### 0.6 Test

```bash
# Server bauen
npm run build:mcp

# Claude Code neu starten (damit .mcp.json geladen wird)
# Dann in Claude Code:
> echo "Hello MCP"
# Sollte "Echo: Hello MCP" zurückgeben
```

### Akzeptanzkriterien Phase 0

- [x] `npm run build:mcp` funktioniert
- [x] Server startet ohne Fehler
- [x] `echo` Tool ist in Claude Code verfügbar
- [x] Claude kann `echo` aufrufen und Antwort erhalten

---

## Phase 1: Minimal Viable Server

**Ziel:** Schema-Resource + ein funktionierendes Tool (get_schema)

### Tasks

| # | Task | Dateien | Aufwand |
|---|------|---------|---------|
| 1.1 | DSL Schema als Resource | src/mcp/resources/schema.ts | 1h |
| 1.2 | Resource-Handler implementieren | src/mcp/server.ts | 30min |
| 1.3 | get_schema Tool | src/mcp/tools/context.ts | 30min |
| 1.4 | Testen mit Claude Code | - | 30min |

### 1.1 Schema Resource

```typescript
// src/mcp/resources/schema.ts
import { primitives } from "../../schema/primitives";
import { properties } from "../../schema/properties";

export const schemaResource = {
  uri: "mirror://schema",
  name: "Mirror DSL Schema",
  description: "Complete schema of Mirror DSL primitives, properties, events and actions",
  mimeType: "application/json",

  getContent(): string {
    return JSON.stringify({
      primitives: Object.entries(primitives).map(([name, def]) => ({
        name,
        element: def.element,
        aliases: def.aliases || []
      })),

      properties: Object.entries(properties).map(([name, def]) => ({
        name,
        aliases: def.aliases || [],
        values: def.values,
        type: def.type
      })),

      events: [
        { name: "onclick", dom: "click" },
        { name: "onhover", dom: "mouseenter" },
        { name: "onfocus", dom: "focus" },
        { name: "onblur", dom: "blur" },
        { name: "onchange", dom: "change" },
        { name: "oninput", dom: "input" },
        { name: "onkeydown", dom: "keydown", supportsKey: true }
      ],

      actions: [
        { name: "show" },
        { name: "hide" },
        { name: "toggle" },
        { name: "select" },
        { name: "highlight", targets: ["next", "prev", "first", "last"] },
        { name: "page" },
        { name: "assign" }
      ],

      states: {
        system: ["hover", "focus", "active", "disabled"],
        custom: ["selected", "highlighted", "expanded", "collapsed", "on", "off"]
      }
    }, null, 2);
  }
};
```

### Akzeptanzkriterien Phase 1

- [ ] `mirror://schema` Resource verfügbar
- [ ] Claude kann Schema lesen: "Was sind die Layout-Properties?"
- [ ] Claude antwortet korrekt mit `hor`, `ver`, `gap`, etc.

---

## Phase 2: Core Tools

**Ziel:** Die wichtigsten Mutations-Tools implementieren

### Tasks

| # | Task | Dateien | Aufwand |
|---|------|---------|---------|
| 2.1 | File Bridge (read/write) | src/mcp/bridge.ts | 1h |
| 2.2 | Selector Parser | src/mcp/utils/selector.ts | 1h |
| 2.3 | get_context Tool | src/mcp/tools/context.ts | 1h |
| 2.4 | set_property Tool | src/mcp/tools/mutations.ts | 2h |
| 2.5 | add_child Tool | src/mcp/tools/mutations.ts | 2h |
| 2.6 | delete_element Tool | src/mcp/tools/mutations.ts | 1h |
| 2.7 | validate Tool | src/mcp/tools/validation.ts | 1h |
| 2.8 | Integration Tests | src/mcp/__tests__/ | 2h |

### 2.1 File Bridge

```typescript
// src/mcp/bridge.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { parse } from '../parser/parser';
import { CodeModifier } from '../studio/code-modifier';

export interface Bridge {
  getCode(): Promise<string>;
  saveCode(code: string): Promise<void>;
  getAST(): Promise<AST>;
  getTokens(): Promise<Record<string, string>>;
}

export class FileBridge implements Bridge {
  private projectPath: string;

  constructor() {
    this.projectPath = process.env.MIRROR_PROJECT || process.cwd();
  }

  private get mainFile(): string {
    return path.join(this.projectPath, 'main.mirror');
  }

  async getCode(): Promise<string> {
    try {
      return await fs.readFile(this.mainFile, 'utf-8');
    } catch {
      return '';
    }
  }

  async saveCode(code: string): Promise<void> {
    await fs.writeFile(this.mainFile, code, 'utf-8');
  }

  async getAST(): Promise<AST> {
    const code = await this.getCode();
    return parse(code);
  }

  async getTokens(): Promise<Record<string, string>> {
    const tokensFile = path.join(this.projectPath, 'tokens.mirror');
    try {
      const content = await fs.readFile(tokensFile, 'utf-8');
      return this.parseTokens(content);
    } catch {
      return {};
    }
  }

  private parseTokens(content: string): Record<string, string> {
    const tokens: Record<string, string> = {};
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^\$([a-zA-Z0-9._-]+):\s*(.+)$/);
      if (match) {
        tokens[`$${match[1]}`] = match[2].trim();
      }
    }
    return tokens;
  }
}
```

### 2.2 Selector Parser

```typescript
// src/mcp/utils/selector.ts

export interface SelectorResult {
  type: 'line' | 'id' | 'type' | 'first';
  line?: number;
  id?: string;
  elementType?: string;
}

export function parseSelector(selector: string): SelectorResult {
  // @42 → Zeile 42
  if (selector.startsWith('@')) {
    return { type: 'line', line: parseInt(selector.slice(1), 10) };
  }

  // #login-btn → Element mit ID
  if (selector.startsWith('#')) {
    return { type: 'id', id: selector.slice(1) };
  }

  // Button → Erstes Element vom Typ
  if (/^[A-Z][a-zA-Z]*$/.test(selector)) {
    return { type: 'type', elementType: selector };
  }

  // Fallback: als Zeile interpretieren
  const line = parseInt(selector, 10);
  if (!isNaN(line)) {
    return { type: 'line', line };
  }

  return { type: 'first' };
}

export function findElementBySelector(
  ast: AST,
  selector: SelectorResult
): ASTNode | null {
  // Implementation...
}
```

### 2.4 set_property Tool

```typescript
// src/mcp/tools/mutations.ts
import { z } from 'zod';
import { bridge } from '../bridge';
import { CodeModifier } from '../../studio/code-modifier';
import { parseSelector, findElementBySelector } from '../utils/selector';

export const setPropertyTool = {
  name: "set_property",
  description: `Sets a CSS property on an element.

Examples:
- set_property("@5", "bg", "#ff0000") → Sets background on line 5
- set_property("#login-btn", "pad", "16") → Sets padding on element with ID
- set_property("Button", "col", "white") → Sets color on first Button

Properties: bg, col, pad, gap, rad, w, h, fs, etc.`,

  inputSchema: z.object({
    selector: z.string().describe("Element selector: @line, #id, or Type"),
    property: z.string().describe("Property name (bg, pad, gap, etc.)"),
    value: z.string().describe("New value")
  }),

  async handler({ selector, property, value }: {
    selector: string;
    property: string;
    value: string;
  }) {
    const code = await bridge.getCode();
    const ast = await bridge.getAST();

    const selectorResult = parseSelector(selector);
    const element = findElementBySelector(ast, selectorResult);

    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    const modifier = new CodeModifier(code);
    const result = modifier.setProperty(element.location.line, property, value);

    await bridge.saveCode(result.code);

    return {
      success: true,
      message: `Set ${property} to ${value} on line ${element.location.line}`,
      affectedLine: element.location.line
    };
  }
};
```

### Akzeptanzkriterien Phase 2

- [ ] `set_property` funktioniert mit @line, #id, und Type Selektoren
- [ ] `add_child` fügt Elemente korrekt ein
- [ ] `delete_element` entfernt Elemente
- [ ] `validate` erkennt Syntax-Fehler
- [ ] Alle Tools haben aussagekräftige Fehlermeldungen

---

## Phase 3: Bridge + Studio Integration

**Ziel:** WebSocket-Bridge für Live-Interaktion mit Studio

### Tasks

| # | Task | Dateien | Aufwand |
|---|------|---------|---------|
| 3.1 | WebSocket Server in Studio | studio/mcp-handler.ts | 2h |
| 3.2 | WebSocket Bridge im MCP Server | src/mcp/bridge.ts | 1h |
| 3.3 | Bidirektionale Kommunikation | - | 2h |
| 3.4 | get_context mit Live-Selection | src/mcp/tools/context.ts | 1h |
| 3.5 | Live Code Updates | - | 2h |
| 3.6 | Testen der Integration | - | 2h |

### 3.1 WebSocket Server in Studio

```typescript
// studio/mcp-handler.ts
export class MCPHandler {
  private wss: WebSocket.Server;

  constructor(
    private editor: EditorView,
    private sourceMap: SourceMap,
    private selectionManager: SelectionManager,
    port: number = 3456
  ) {
    this.wss = new WebSocket.Server({ port });
    this.wss.on('connection', this.handleConnection.bind(this));
  }

  private handleConnection(ws: WebSocket) {
    ws.on('message', async (data) => {
      const request = JSON.parse(data.toString());
      try {
        const result = await this.handleRequest(request.method, request.params);
        ws.send(JSON.stringify({ id: request.id, result }));
      } catch (error) {
        ws.send(JSON.stringify({ id: request.id, error: error.message }));
      }
    });
  }

  private async handleRequest(method: string, params: any): Promise<any> {
    switch (method) {
      case 'getContext':
        return this.getContext();
      case 'getCode':
        return this.editor.state.doc.toString();
      case 'setProperty':
        return this.setProperty(params);
      case 'addChild':
        return this.addChild(params);
      // ...
    }
  }

  private getContext(): Context {
    const selection = this.selectionManager.getSelected();
    const cursor = this.editor.state.selection.main.head;
    const line = this.editor.state.doc.lineAt(cursor).number;

    return {
      selectedElement: selection?.id || null,
      selectedCode: selection ? this.getCodeForNode(selection) : null,
      cursorLine: line,
      parentChain: selection ? this.getParentChain(selection) : []
    };
  }

  private setProperty({ selector, property, value }): Result {
    // ... wie in Architecture beschrieben
  }
}
```

### Akzeptanzkriterien Phase 3

- [ ] WebSocket-Verbindung zwischen MCP Server und Studio
- [ ] `get_context` zeigt aktuell selektiertes Element
- [ ] Änderungen via MCP erscheinen live im Editor
- [ ] Keine Race Conditions bei schnellen Änderungen

---

## Phase 4: Polish + Erweiterungen

**Ziel:** Zusätzliche Tools, bessere UX, Dokumentation

### Tasks

| # | Task | Aufwand |
|---|------|---------|
| 4.1 | wrap_with Tool | 1h |
| 4.2 | move_element Tool | 1h |
| 4.3 | duplicate_element Tool | 30min |
| 4.4 | Token Resource (live) | 1h |
| 4.5 | Examples Resource | 1h |
| 4.6 | Error Recovery | 2h |
| 4.7 | Performance Optimierung | 2h |
| 4.8 | Dokumentation | 2h |
| 4.9 | Tutorial für Benutzer | 1h |

### Zusätzliche Tools

```typescript
// wrap_with
{
  name: "wrap_with",
  description: "Wraps an element in a container. Example: wrap_with('#icon', 'Box hor gap 8')",
  inputSchema: z.object({
    element: z.string(),
    wrapper: z.string().describe("Container definition, e.g. 'Box hor gap 8'")
  })
}

// move_element
{
  name: "move_element",
  description: "Moves an element to a different parent",
  inputSchema: z.object({
    element: z.string(),
    newParent: z.string(),
    position: z.number().optional()
  })
}

// duplicate_element
{
  name: "duplicate_element",
  description: "Duplicates an element and its children",
  inputSchema: z.object({
    selector: z.string()
  })
}
```

### Akzeptanzkriterien Phase 4

- [ ] Alle Tools funktionieren zuverlässig
- [ ] Gute Fehlermeldungen bei ungültigen Eingaben
- [ ] Performance < 100ms für einfache Operationen
- [ ] Dokumentation vollständig

---

## Timeline (Schätzung)

| Phase | Aufwand | Kumulativ |
|-------|---------|-----------|
| Phase 0: Setup | 1h | 1h |
| Phase 1: Minimal Server | 2.5h | 3.5h |
| Phase 2: Core Tools | 11h | 14.5h |
| Phase 3: Bridge | 10h | 24.5h |
| Phase 4: Polish | 11.5h | 36h |

**Gesamt: ~36 Stunden Entwicklungszeit**

---

## Quick Start (nach Implementierung)

```bash
# 1. Server bauen
npm run build:mcp

# 2. Claude Code starten (im Mirror-Projekt)
claude

# 3. Los geht's!
> Mach den Button auf Zeile 5 rot
> Füg einen Text "Hello" zum Header hinzu
> Wrap alle Buttons in eine horizontale Box
```

---

## Checkliste

### Phase 0
- [ ] Dependencies installiert
- [ ] Ordnerstruktur angelegt
- [ ] Minimal Server funktioniert
- [ ] .mcp.json konfiguriert
- [ ] Echo-Tool getestet

### Phase 1
- [ ] Schema Resource implementiert
- [ ] Claude kann Schema abfragen

### Phase 2
- [ ] File Bridge funktioniert
- [ ] Selector Parser funktioniert
- [ ] set_property Tool funktioniert
- [ ] add_child Tool funktioniert
- [ ] delete_element Tool funktioniert
- [ ] validate Tool funktioniert

### Phase 3
- [ ] WebSocket Server in Studio
- [ ] WebSocket Bridge im MCP Server
- [ ] Live Context funktioniert
- [ ] Live Updates funktionieren

### Phase 4
- [ ] wrap_with Tool
- [ ] move_element Tool
- [ ] duplicate_element Tool
- [ ] Token Resource
- [ ] Examples Resource
- [ ] Dokumentation fertig
