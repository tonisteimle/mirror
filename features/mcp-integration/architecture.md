# MCP Integration - Architektur

## System-Übersicht

```
┌────────────────────────────────────────────────────────────────────┐
│                          User                                       │
│                    "Mach den Button rot"                            │
└───────────────────────────┬────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────────┐
│                      Claude Code                                    │
│                                                                     │
│  1. Versteht natürliche Sprache                                    │
│  2. Plant Aktionen                                                  │
│  3. Ruft MCP Tools auf                                             │
│  4. Validiert Ergebnisse                                           │
└───────────────────────────┬────────────────────────────────────────┘
                            │ stdio (JSON-RPC)
                            ▼
┌────────────────────────────────────────────────────────────────────┐
│                    Mirror MCP Server                                │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │   Tools     │  │  Resources  │  │   Bridge    │                │
│  │             │  │             │  │             │                │
│  │ get_context │  │ schema      │  │ WebSocket   │                │
│  │ set_property│  │ tokens      │  │ oder        │                │
│  │ add_child   │  │ current-code│  │ File-based  │                │
│  │ validate    │  │ examples    │  │             │                │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                │
│         │                │                │                        │
│         └────────────────┴────────────────┘                        │
│                          │                                          │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────────────┐
│                     Mirror Studio                                   │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │  CodeMirror │  │   Preview   │  │  SourceMap  │                │
│  │   Editor    │  │   (DOM)     │  │             │                │
│  └─────────────┘  └─────────────┘  └─────────────┘                │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    Code Modifier                              │  │
│  │   - Atomic Operations (set_property, add_child, etc.)        │  │
│  │   - Preserves Formatting                                      │  │
│  │   - Undo/Redo Integration                                     │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

---

## Komponenten

### 1. MCP Server (`src/mcp/server.ts`)

Entry Point des MCP Servers. Registriert Tools und Resources.

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
  name: "mirror-studio",
  version: "1.0.0",
});

// Tools registrieren
server.setRequestHandler(ListToolsRequestSchema, () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, handleToolCall);

// Resources registrieren
server.setRequestHandler(ListResourcesRequestSchema, () => ({ resources }));
server.setRequestHandler(ReadResourceRequestSchema, handleResourceRead);

// Starten
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 2. Tools (`src/mcp/tools/`)

Atomare Operationen die Claude aufrufen kann.

#### 2.1 Context Tools (`context.ts`)

```typescript
// get_context - Aktuellen Zustand verstehen
{
  name: "get_context",
  description: "Gibt den aktuellen Editor-Kontext zurück",
  inputSchema: z.object({}),
  handler: async () => {
    const context = await bridge.getContext();
    return {
      selectedElement: context.selected?.id || null,
      selectedCode: context.selected?.code || null,
      parentChain: context.parentChain,
      siblings: context.siblings,
      availableTokens: context.tokens,
      cursorLine: context.line,
      cursorColumn: context.column
    };
  }
}

// get_element - Details zu einem Element
{
  name: "get_element",
  description: "Gibt Details zu einem Element zurück",
  inputSchema: z.object({
    selector: z.string().describe("Element-ID, Zeile, oder CSS-artiger Selector")
  }),
  handler: async ({ selector }) => {
    const element = await bridge.getElement(selector);
    return {
      type: element.type,           // "Button"
      properties: element.props,    // { bg: "#333", pad: "12" }
      children: element.children,   // [{ type: "Text", ... }]
      sourceLocation: element.loc,  // { line: 5, col: 2, endLine: 7 }
      parentId: element.parentId
    };
  }
}

// get_tree - Ganzen AST
{
  name: "get_tree",
  description: "Gibt den kompletten Element-Baum zurück",
  inputSchema: z.object({
    depth: z.number().optional().describe("Max Tiefe, default unbegrenzt")
  }),
  handler: async ({ depth }) => {
    return await bridge.getTree(depth);
  }
}
```

#### 2.2 Mutation Tools (`mutations.ts`)

```typescript
// set_property - Eine Property ändern
{
  name: "set_property",
  description: "Setzt eine Property auf einem Element. Beispiel: set_property('#btn', 'bg', '#ff0000')",
  inputSchema: z.object({
    selector: z.string(),
    property: z.string(),
    value: z.string()
  }),
  handler: async ({ selector, property, value }) => {
    // Validierung
    const validation = validatePropertyValue(property, value);
    if (!validation.valid) {
      throw new Error(`Invalid value for ${property}: ${validation.error}`);
    }

    // Anwenden
    const result = await bridge.setProperty(selector, property, value);
    return {
      success: true,
      newCode: result.code,
      affectedLine: result.line
    };
  }
}

// set_properties - Mehrere Properties
{
  name: "set_properties",
  description: "Setzt mehrere Properties auf einmal",
  inputSchema: z.object({
    selector: z.string(),
    properties: z.record(z.string())
  }),
  handler: async ({ selector, properties }) => {
    const result = await bridge.setProperties(selector, properties);
    return { success: true, newCode: result.code };
  }
}

// add_child - Element hinzufügen
{
  name: "add_child",
  description: "Fügt ein Kind-Element hinzu",
  inputSchema: z.object({
    parent: z.string(),
    component: z.string(),
    properties: z.record(z.string()).optional(),
    content: z.string().optional(),
    position: z.union([z.literal("first"), z.literal("last"), z.number()]).optional()
  }),
  handler: async ({ parent, component, properties, content, position }) => {
    const result = await bridge.addChild(parent, component, properties, content, position);
    return {
      success: true,
      newElementId: result.id,
      newCode: result.code
    };
  }
}

// delete_element
{
  name: "delete_element",
  description: "Löscht ein Element und alle Kinder",
  inputSchema: z.object({
    selector: z.string()
  }),
  handler: async ({ selector }) => {
    const result = await bridge.deleteElement(selector);
    return { success: true, deletedCount: result.count };
  }
}

// wrap_with - Element in Container wrappen
{
  name: "wrap_with",
  description: "Wickelt ein Element in einen Container. Beispiel: wrap_with('#icon', 'Box hor gap 8')",
  inputSchema: z.object({
    element: z.string(),
    wrapper: z.string()
  }),
  handler: async ({ element, wrapper }) => {
    const result = await bridge.wrapWith(element, wrapper);
    return { success: true, wrapperId: result.id };
  }
}

// move_element
{
  name: "move_element",
  description: "Verschiebt ein Element zu einem anderen Parent",
  inputSchema: z.object({
    element: z.string(),
    newParent: z.string(),
    position: z.number().optional()
  }),
  handler: async ({ element, newParent, position }) => {
    const result = await bridge.moveElement(element, newParent, position);
    return { success: true };
  }
}

// duplicate_element
{
  name: "duplicate_element",
  description: "Dupliziert ein Element",
  inputSchema: z.object({
    selector: z.string()
  }),
  handler: async ({ selector }) => {
    const result = await bridge.duplicateElement(selector);
    return { success: true, newElementId: result.id };
  }
}
```

#### 2.3 Validation Tools (`validation.ts`)

```typescript
// validate - Code validieren
{
  name: "validate",
  description: "Validiert DSL-Code auf Syntax-Fehler",
  inputSchema: z.object({
    code: z.string()
  }),
  handler: async ({ code }) => {
    try {
      const ast = parse(code);
      return {
        valid: true,
        elementCount: countElements(ast),
        warnings: getWarnings(ast)
      };
    } catch (e) {
      return {
        valid: false,
        error: e.message,
        line: e.line,
        column: e.column
      };
    }
  }
}

// validate_value - Property-Wert validieren
{
  name: "validate_value",
  description: "Prüft ob ein Wert für eine Property gültig ist",
  inputSchema: z.object({
    property: z.string(),
    value: z.string()
  }),
  handler: async ({ property, value }) => {
    const result = validatePropertyValue(property, value);
    return {
      valid: result.valid,
      error: result.error,
      suggestion: result.suggestion,
      allowedValues: getPropertySchema(property).values
    };
  }
}
```

### 3. Resources (`src/mcp/resources/`)

Schreibgeschützte Daten die Claude lesen kann.

```typescript
// mirror://schema - DSL Schema
{
  uri: "mirror://schema",
  name: "DSL Schema",
  description: "Alle Primitives, Properties, Events und Actions",
  mimeType: "application/json",
  content: () => JSON.stringify({
    primitives: primitiveSchema,   // Box, Text, Button, etc.
    properties: propertySchema,     // bg, pad, gap, etc.
    events: eventSchema,            // onclick, onhover, etc.
    actions: actionSchema,          // show, hide, toggle, etc.
    states: stateSchema             // hover, selected, etc.
  })
}

// mirror://tokens - Projekt-Tokens
{
  uri: "mirror://tokens",
  name: "Projekt-Tokens",
  description: "Definierte Design-Tokens ($primary, $spacing.md, etc.)",
  mimeType: "application/json",
  content: async () => {
    const tokens = await bridge.getTokens();
    return JSON.stringify(tokens);
  }
}

// mirror://current-code - Aktueller Code
{
  uri: "mirror://current-code",
  name: "Aktueller Code",
  description: "Der aktuelle DSL-Code im Editor",
  mimeType: "text/plain",
  content: async () => {
    return await bridge.getCode();
  }
}

// mirror://examples - Best Practices
{
  uri: "mirror://examples",
  name: "Beispiele",
  description: "Code-Beispiele für häufige Patterns",
  mimeType: "application/json",
  content: () => JSON.stringify({
    layouts: [
      { name: "Horizontal mit Gap", code: "Box hor gap 16" },
      { name: "Zentriert", code: "Box center" },
      { name: "Grid 3 Spalten", code: "Box grid 3 gap 16" }
    ],
    components: [
      { name: "Card", code: "Box ver pad 16 bg #fff rad 8 shadow md" },
      { name: "Button Primary", code: "Button bg #007bff col white pad 12 rad 6" }
    ]
  })
}
```

### 4. Bridge (`src/mcp/bridge.ts`)

Kommunikation zwischen MCP Server und Studio.

#### Option A: WebSocket (wenn Studio läuft)

```typescript
class WebSocketBridge implements Bridge {
  private ws: WebSocket | null = null;
  private pendingRequests = new Map<string, { resolve, reject }>();

  async connect(): Promise<void> {
    const port = process.env.MIRROR_STUDIO_PORT || 3456;
    this.ws = new WebSocket(`ws://localhost:${port}/mcp`);

    this.ws.on('message', (data) => {
      const msg = JSON.parse(data);
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        pending.resolve(msg.result);
        this.pendingRequests.delete(msg.id);
      }
    });
  }

  private async request(method: string, params: any): Promise<any> {
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify({ id, method, params }));
    });
  }

  async getContext(): Promise<Context> {
    return this.request('getContext', {});
  }

  async setProperty(selector: string, prop: string, value: string): Promise<Result> {
    return this.request('setProperty', { selector, prop, value });
  }

  // ... weitere Methoden
}
```

#### Option B: File-based (einfacher, immer verfügbar)

```typescript
class FileBridge implements Bridge {
  constructor(private projectPath: string) {}

  async getCode(): Promise<string> {
    const mainFile = path.join(this.projectPath, 'main.mirror');
    return fs.readFile(mainFile, 'utf-8');
  }

  async setProperty(selector: string, prop: string, value: string): Promise<Result> {
    const code = await this.getCode();
    const modifier = new CodeModifier(code);

    // Selector zu Zeile/Position auflösen
    const location = this.resolveSelector(selector, code);

    // Property setzen
    const result = modifier.setProperty(location.line, prop, value);

    // Speichern
    await fs.writeFile(this.getMainFile(), result.code);

    return { success: true, code: result.code, line: location.line };
  }

  private resolveSelector(selector: string, code: string): Location {
    // #id → Finde Element mit ID
    // @5 → Zeile 5
    // Button → Erstes Button-Element
    // ...
  }

  async getTokens(): Promise<Tokens> {
    const tokensFile = path.join(this.projectPath, 'tokens.mirror');
    if (await fs.exists(tokensFile)) {
      return parseTokens(await fs.readFile(tokensFile, 'utf-8'));
    }
    return {};
  }

  // ... weitere Methoden
}
```

---

## Dateistruktur

```
src/mcp/
├── server.ts              # Entry Point
├── bridge.ts              # Bridge Interface + Implementierungen
├── tools/
│   ├── index.ts           # Tool-Registry
│   ├── context.ts         # get_context, get_element, get_tree
│   ├── mutations.ts       # set_property, add_child, delete, wrap, move
│   └── validation.ts      # validate, validate_value
├── resources/
│   ├── index.ts           # Resource-Registry
│   ├── schema.ts          # DSL Schema Resource
│   ├── tokens.ts          # Token Resource
│   └── examples.ts        # Beispiel-Patterns
└── utils/
    ├── selector.ts        # Selector-Parsing (#id, @line, etc.)
    └── validation.ts      # Property-Validierung
```

---

## Studio-seitige Integration

Wenn WebSocket-Bridge genutzt wird, braucht Studio einen Handler:

```typescript
// studio/mcp-handler.ts

class MCPHandler {
  constructor(
    private editor: EditorView,
    private sourceMap: SourceMap,
    private codeModifier: CodeModifier
  ) {}

  handleRequest(method: string, params: any): any {
    switch (method) {
      case 'getContext':
        return this.getContext();
      case 'setProperty':
        return this.setProperty(params);
      case 'addChild':
        return this.addChild(params);
      // ...
    }
  }

  private getContext(): Context {
    const cursor = this.editor.state.selection.main.head;
    const line = this.editor.state.doc.lineAt(cursor).number;
    const node = this.sourceMap.getNodeAtLine(line);

    return {
      selected: node ? {
        id: node.id,
        code: this.getCodeForNode(node),
        type: node.type
      } : null,
      parentChain: node ? this.getParentChain(node) : [],
      line,
      column: cursor - this.editor.state.doc.line(line).from
    };
  }

  private setProperty({ selector, prop, value }): Result {
    const location = this.resolveSelector(selector);
    const result = this.codeModifier.setProperty(location.line, prop, value);

    // Editor aktualisieren
    this.editor.dispatch({
      changes: { from: 0, to: this.editor.state.doc.length, insert: result.code }
    });

    return { success: true, code: result.code };
  }
}
```

---

## Konfiguration

### .mcp.json (Project-Scope)

```json
{
  "mcpServers": {
    "mirror-studio": {
      "command": "node",
      "args": ["./dist/mcp/server.js"],
      "env": {
        "MIRROR_PROJECT": "${workspaceFolder}",
        "MIRROR_STUDIO_PORT": "3456"
      }
    }
  }
}
```

### Claude Code Registrierung

```bash
# Einmalig (global)
claude mcp add mirror-studio -- node /path/to/Mirror/dist/mcp/server.js

# Oder project-scope
claude mcp add mirror-studio --scope project -- npm run mcp
```

### package.json Script

```json
{
  "scripts": {
    "mcp": "node dist/mcp/server.js",
    "mcp:dev": "tsx src/mcp/server.ts",
    "build:mcp": "esbuild src/mcp/server.ts --bundle --platform=node --outfile=dist/mcp/server.js"
  }
}
```
