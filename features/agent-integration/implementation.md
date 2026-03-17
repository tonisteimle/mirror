# Mirror AI Agent - Implementierungsplan

## Phasen-Übersicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  Phase 1          Phase 2          Phase 3          Phase 4          Phase 5│
│  Foundation       Core Agent       Visual           Intelligence     Polish │
│                                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐│
│  │ SDK      │    │ Tools    │    │ Preview  │    │ Memory   │    │ UX     ││
│  │ Setup    │───►│ System   │───►│ Integr.  │───►│ System   │───►│ Polish ││
│  │          │    │          │    │          │    │          │    │        ││
│  │ Basic    │    │ Chat UI  │    │ Visual   │    │ Learning │    │ Perf   ││
│  │ Tools    │    │          │    │ Tools    │    │          │    │        ││
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    └────────┘│
│                                                                              │
│  ~2 Tage          ~3 Tage          ~2 Tage          ~2 Tage          ~1 Tag │
│                                                                              │
│                        Gesamt: ~10 Tage                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation

**Ziel:** Agent SDK integriert, minimale Funktionalität

### Tasks

| # | Task | Beschreibung | Dateien |
|---|------|--------------|---------|
| 1.1 | SDK installieren | Claude Agent SDK + Dependencies | package.json |
| 1.2 | Agent Wrapper | Basis-Klasse für Agent | studio/agent/mirror-agent.ts |
| 1.3 | System Prompt | Statischer DSL-Prompt | studio/agent/prompts/system.ts |
| 1.4 | Basic Tools | get_code, set_property | studio/agent/tools/core.ts |
| 1.5 | Test-Setup | Agent-Tests | studio/agent/__tests__/ |

### 1.1 SDK Installation

```bash
npm install @anthropic-ai/claude-agent-sdk
```

### 1.2 Agent Wrapper

```typescript
// studio/agent/mirror-agent.ts

import { Agent, AgentConfig, Tool } from "@anthropic-ai/claude-agent-sdk";
import { buildSystemPrompt } from "./prompts/system";
import { coreTools } from "./tools/core";

export interface MirrorAgentConfig {
  editor: EditorView;
  sourceMap: SourceMap;
  codeModifier: CodeModifier;
  apiKey?: string;
}

export class MirrorAgent {
  private agent: Agent;
  private config: MirrorAgentConfig;

  constructor(config: MirrorAgentConfig) {
    this.config = config;

    this.agent = new Agent({
      model: "claude-sonnet-4-20250514",
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
      systemPrompt: buildSystemPrompt({
        tokens: this.getTokens(),
        components: this.getComponents()
      }),
      tools: this.buildTools()
    });
  }

  private buildTools(): Tool[] {
    return coreTools.map(tool => ({
      ...tool,
      execute: (params) => tool.execute(params, this.getToolContext())
    }));
  }

  private getToolContext(): ToolContext {
    return {
      editor: this.config.editor,
      sourceMap: this.config.sourceMap,
      codeModifier: this.config.codeModifier,
      parser: new Parser(),
      getCode: () => this.config.editor.state.doc.toString()
    };
  }

  async *run(prompt: string): AsyncGenerator<AgentEvent> {
    // Kontext zum Prompt hinzufügen
    const contextualPrompt = this.addContext(prompt);

    for await (const event of this.agent.run(contextualPrompt)) {
      yield event;
    }
  }

  private addContext(prompt: string): string {
    const code = this.config.editor.state.doc.toString();
    const cursor = this.config.editor.state.selection.main.head;
    const line = this.config.editor.state.doc.lineAt(cursor).number;

    return `
Current code:
\`\`\`mirror
${code}
\`\`\`

Cursor at line: ${line}

User request: ${prompt}
`;
  }

  private getTokens(): Record<string, string> {
    // Tokens aus Code extrahieren
    return {};
  }

  private getComponents(): string[] {
    // Komponenten-Definitionen finden
    return [];
  }
}
```

### 1.3 System Prompt

```typescript
// studio/agent/prompts/system.ts

import { dslSchema } from "../../schema";

interface PromptContext {
  tokens: Record<string, string>;
  components: string[];
}

export function buildSystemPrompt(context: PromptContext): string {
  return `
# Mirror DSL Assistant

You are an expert assistant for Mirror DSL - a domain-specific language for rapid UI prototyping.

## Your Capabilities

1. **Read & Understand** - Analyze Mirror DSL code structure
2. **Modify** - Make precise surgical edits to code
3. **Generate** - Create new components and layouts
4. **Validate** - Check code for errors and issues
5. **Explain** - Help users understand code

## DSL Quick Reference

### Primitives
${formatPrimitives(dslSchema.primitives)}

### Common Properties
| Property | Aliases | Values |
|----------|---------|--------|
| background | bg | color, token |
| color | col | color, token |
| padding | pad | number, token |
| gap | - | number |
| width | w | number, full, hug |
| height | h | number, full, hug |
| radius | rad | number |
| border | bor | number |

### Layout Properties
- \`hor\` - Horizontal flex layout
- \`ver\` - Vertical flex layout (default)
- \`gap N\` - Gap between children
- \`center\` - Center children
- \`spread\` - Space between children
- \`wrap\` - Allow wrapping
- \`grid N\` - Grid with N columns

### Events
- \`onclick\` - Click handler
- \`onhover\` - Hover handler
- \`onfocus\` - Focus handler

### Actions
- \`show ElementId\` - Show element
- \`hide ElementId\` - Hide element
- \`toggle ElementId\` - Toggle visibility

## Tool Usage Rules

1. **Always read before write** - Use get_code or get_element before modifying
2. **Validate after changes** - Use validate to check syntax
3. **Be surgical** - Modify only what's necessary
4. **Preserve formatting** - Don't reformat unchanged code
5. **Use tokens** - Prefer $tokens over hardcoded values when available

## Available Tokens
${formatTokens(context.tokens)}

## Examples

### Card Component
\`\`\`mirror
Box ver pad 16 bg white rad 8 shadow sm
  Image w full h 160 rad 4
  Box ver gap 8 pad-top 12
    Text "Title" fs 18 weight bold
    Text "Description" col #666
\`\`\`

### Button
\`\`\`mirror
Button bg #007bff col white pad 12 rad 6 onclick doSomething
  Text "Click Me"
\`\`\`

### Form
\`\`\`mirror
Box ver gap 16
  Box ver gap 4
    Label "Email"
    Input type email pad 12 bor 1 boc #ddd rad 4
  Button bg #007bff col white pad 12 rad 6
    Text "Submit"
\`\`\`
`;
}

function formatPrimitives(primitives: any[]): string {
  return primitives
    .map(p => `- **${p.name}** → \`<${p.element}>\``)
    .join('\n');
}

function formatTokens(tokens: Record<string, string>): string {
  if (Object.keys(tokens).length === 0) {
    return '_No tokens defined_';
  }
  return Object.entries(tokens)
    .map(([name, value]) => `- \`${name}\`: ${value}`)
    .join('\n');
}
```

### 1.4 Basic Tools

```typescript
// studio/agent/tools/core.ts

import { Tool, ToolContext } from "../types";

export const coreTools: Tool[] = [
  {
    name: "get_code",
    description: "Returns the current Mirror DSL code",
    parameters: {},
    execute: async (_, ctx: ToolContext) => {
      return ctx.getCode();
    }
  },

  {
    name: "get_element",
    description: `Gets details about an element.

Selectors:
- @5: Line 5
- #id: Element with ID
- Button: First Button element
- Button:2: Second Button`,
    parameters: {
      selector: { type: "string", required: true }
    },
    execute: async ({ selector }, ctx: ToolContext) => {
      const code = ctx.getCode();
      const element = findElement(code, selector);

      if (!element) {
        return { error: `Element not found: ${selector}` };
      }

      return {
        type: element.type,
        line: element.line,
        properties: element.properties,
        childCount: element.children.length,
        code: element.rawCode
      };
    }
  },

  {
    name: "set_property",
    description: "Sets a property on an element",
    parameters: {
      selector: { type: "string", required: true },
      property: { type: "string", required: true },
      value: { type: "string", required: true }
    },
    execute: async ({ selector, property, value }, ctx: ToolContext) => {
      const element = findElement(ctx.getCode(), selector);

      if (!element) {
        return { error: `Element not found: ${selector}` };
      }

      const result = ctx.codeModifier.setProperty(element.line, property, value);

      // Apply to editor
      ctx.editor.dispatch({
        changes: { from: 0, to: ctx.editor.state.doc.length, insert: result.code }
      });

      return {
        success: true,
        line: element.line,
        newCode: result.code.split('\n')[element.line - 1]
      };
    }
  },

  {
    name: "validate",
    description: "Validates the current code for syntax errors",
    parameters: {},
    execute: async (_, ctx: ToolContext) => {
      try {
        const ast = ctx.parser.parse(ctx.getCode());
        return {
          valid: true,
          elementCount: countElements(ast)
        };
      } catch (e: any) {
        return {
          valid: false,
          error: e.message,
          line: e.line
        };
      }
    }
  }
];
```

### Akzeptanzkriterien Phase 1

- [ ] Agent SDK installiert und konfiguriert
- [ ] MirrorAgent Klasse funktioniert
- [ ] get_code, get_element, set_property, validate Tools funktionieren
- [ ] Basic Test: "Mach den Button rot" → funktioniert

---

## Phase 2: Core Agent

**Ziel:** Vollständiges Tool-Set, Chat-UI

### Tasks

| # | Task | Beschreibung | Dateien |
|---|------|--------------|---------|
| 2.1 | Write Tools | add_child, delete, wrap, move | studio/agent/tools/write.ts |
| 2.2 | Analyze Tools | explain, find_issues, suggest | studio/agent/tools/analyze.ts |
| 2.3 | Generate Tools | generate_component, apply_pattern | studio/agent/tools/generate.ts |
| 2.4 | Chat Panel UI | Message List, Input, Streaming | studio/panels/chat-panel.ts |
| 2.5 | Event Rendering | Tool-Use, Thinking, Results | studio/panels/chat-renderer.ts |
| 2.6 | State Integration | Selection Sync, Code Sync | studio/agent/sync.ts |

### 2.4 Chat Panel UI

```typescript
// studio/panels/chat-panel.ts

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolUses?: ToolUse[];
  thinking?: string;
  timestamp: Date;
}

interface ToolUse {
  id: string;
  tool: string;
  input: any;
  result?: any;
  status: 'pending' | 'running' | 'done' | 'error';
}

export class ChatPanel {
  private container: HTMLElement;
  private messages: ChatMessage[] = [];
  private agent: MirrorAgent;
  private isStreaming: boolean = false;

  constructor(container: HTMLElement, agent: MirrorAgent) {
    this.container = container;
    this.agent = agent;
    this.render();
  }

  private render() {
    this.container.innerHTML = `
      <div class="chat-panel">
        <div class="chat-header">
          <span class="chat-title">Mirror AI</span>
          <div class="chat-actions">
            <button class="chat-action" data-action="clear">Clear</button>
          </div>
        </div>
        <div class="chat-messages"></div>
        <div class="chat-input-container">
          <textarea class="chat-input" placeholder="Describe what you want..."></textarea>
          <button class="chat-send">Send</button>
        </div>
        <div class="chat-suggestions">
          <button class="suggestion">Make it responsive</button>
          <button class="suggestion">Add hover effects</button>
          <button class="suggestion">Improve spacing</button>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners() {
    const input = this.container.querySelector('.chat-input') as HTMLTextAreaElement;
    const sendBtn = this.container.querySelector('.chat-send') as HTMLButtonElement;

    // Send on button click
    sendBtn.addEventListener('click', () => this.sendMessage(input.value));

    // Send on Cmd/Ctrl+Enter
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.sendMessage(input.value);
      }
    });

    // Suggestions
    this.container.querySelectorAll('.suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        input.value = btn.textContent || '';
        this.sendMessage(input.value);
      });
    });
  }

  async sendMessage(text: string) {
    if (!text.trim() || this.isStreaming) return;

    const input = this.container.querySelector('.chat-input') as HTMLTextAreaElement;
    input.value = '';

    // Add user message
    this.addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date()
    });

    // Create assistant message placeholder
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      toolUses: [],
      timestamp: new Date()
    };
    this.addMessage(assistantMessage);

    this.isStreaming = true;
    this.updateStreamingState(true);

    try {
      for await (const event of this.agent.run(text)) {
        this.handleAgentEvent(event, assistantMessage);
      }
    } catch (error) {
      assistantMessage.content += `\n\nError: ${error.message}`;
      this.updateMessage(assistantMessage);
    } finally {
      this.isStreaming = false;
      this.updateStreamingState(false);
    }
  }

  private handleAgentEvent(event: AgentEvent, message: ChatMessage) {
    switch (event.type) {
      case 'text':
        message.content += event.content;
        this.updateMessage(message);
        break;

      case 'thinking':
        message.thinking = event.content;
        this.updateMessage(message);
        break;

      case 'tool_use':
        message.toolUses = message.toolUses || [];
        message.toolUses.push({
          id: event.id,
          tool: event.tool,
          input: event.input,
          status: 'running'
        });
        this.updateMessage(message);
        break;

      case 'tool_result':
        const toolUse = message.toolUses?.find(t => t.id === event.toolUseId);
        if (toolUse) {
          toolUse.result = event.result;
          toolUse.status = event.error ? 'error' : 'done';
          this.updateMessage(message);
        }
        break;
    }
  }

  private addMessage(message: ChatMessage) {
    this.messages.push(message);
    this.renderMessages();
  }

  private updateMessage(message: ChatMessage) {
    const index = this.messages.findIndex(m => m.id === message.id);
    if (index !== -1) {
      this.messages[index] = message;
      this.renderMessages();
    }
  }

  private renderMessages() {
    const container = this.container.querySelector('.chat-messages');
    if (!container) return;

    container.innerHTML = this.messages.map(msg => this.renderMessage(msg)).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  private renderMessage(message: ChatMessage): string {
    const isUser = message.role === 'user';

    return `
      <div class="chat-message ${isUser ? 'user' : 'assistant'}">
        <div class="message-header">
          <span class="message-role">${isUser ? 'You' : 'Mirror AI'}</span>
          <span class="message-time">${this.formatTime(message.timestamp)}</span>
        </div>
        ${message.thinking ? this.renderThinking(message.thinking) : ''}
        <div class="message-content">${this.formatContent(message.content)}</div>
        ${message.toolUses ? this.renderToolUses(message.toolUses) : ''}
      </div>
    `;
  }

  private renderThinking(thinking: string): string {
    return `
      <details class="message-thinking">
        <summary>Thinking...</summary>
        <pre>${thinking}</pre>
      </details>
    `;
  }

  private renderToolUses(toolUses: ToolUse[]): string {
    return toolUses.map(tool => `
      <div class="tool-use ${tool.status}">
        <div class="tool-header">
          <span class="tool-icon">${this.getToolIcon(tool.tool)}</span>
          <span class="tool-name">${tool.tool}</span>
          <span class="tool-status">${this.getStatusIcon(tool.status)}</span>
        </div>
        <div class="tool-input">
          <pre>${JSON.stringify(tool.input, null, 2)}</pre>
        </div>
        ${tool.result ? `
          <div class="tool-result">
            <pre>${JSON.stringify(tool.result, null, 2)}</pre>
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  private getToolIcon(tool: string): string {
    const icons: Record<string, string> = {
      get_code: '📄',
      get_element: '🔍',
      set_property: '✏️',
      add_child: '➕',
      delete_element: '🗑️',
      validate: '✓',
      screenshot: '📷'
    };
    return icons[tool] || '🔧';
  }

  private getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      pending: '⏳',
      running: '⚡',
      done: '✓',
      error: '✗'
    };
    return icons[status] || '';
  }

  private formatContent(content: string): string {
    // Markdown-ähnliche Formatierung
    return content
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  private updateStreamingState(streaming: boolean) {
    const sendBtn = this.container.querySelector('.chat-send') as HTMLButtonElement;
    const input = this.container.querySelector('.chat-input') as HTMLTextAreaElement;

    sendBtn.disabled = streaming;
    input.disabled = streaming;
    sendBtn.textContent = streaming ? '...' : 'Send';
  }
}
```

### Akzeptanzkriterien Phase 2

- [ ] Alle Core Tools implementiert
- [ ] Chat Panel mit Streaming
- [ ] Tool-Verwendung wird angezeigt
- [ ] Thinking-Blöcke sichtbar
- [ ] Selection-Sync funktioniert

---

## Phase 3: Visual Integration

**Ziel:** Agent kann Preview "sehen" und analysieren

### Tasks

| # | Task | Beschreibung | Dateien |
|---|------|--------------|---------|
| 3.1 | Screenshot Tool | Preview-Screenshots | studio/agent/tools/visual.ts |
| 3.2 | Layout Analysis | Spacing, Alignment erkennen | studio/agent/tools/visual.ts |
| 3.3 | Element Bounds | Dimensionen aus Preview | studio/preview/bounds.ts |
| 3.4 | Visual Feedback | Highlights bei Tool-Use | studio/agent/visual-feedback.ts |

### 3.1 Screenshot Tool

```typescript
// studio/agent/tools/visual.ts

export const visualTools: Tool[] = [
  {
    name: "screenshot_preview",
    description: "Takes a screenshot of the preview for visual analysis",
    parameters: {
      selector: {
        type: "string",
        required: false,
        description: "Element selector to screenshot, or full preview if omitted"
      }
    },
    execute: async ({ selector }, ctx: ToolContext) => {
      const preview = ctx.preview;

      // Screenshot als Base64
      const imageData = await preview.screenshot(selector);

      return {
        type: "image",
        data: imageData,
        format: "png",
        instruction: "Analyze this screenshot for layout issues, spacing problems, or visual improvements"
      };
    }
  },

  {
    name: "measure_element",
    description: "Measures an element's dimensions and position in the preview",
    parameters: {
      selector: { type: "string", required: true }
    },
    execute: async ({ selector }, ctx: ToolContext) => {
      const bounds = await ctx.preview.getElementBounds(selector);

      if (!bounds) {
        return { error: `Element not visible in preview: ${selector}` };
      }

      return {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        visible: bounds.visible,
        overflow: bounds.overflow
      };
    }
  },

  {
    name: "check_spacing",
    description: "Checks spacing consistency between elements",
    parameters: {
      parent: { type: "string", required: false }
    },
    execute: async ({ parent }, ctx: ToolContext) => {
      const elements = await ctx.preview.getChildBounds(parent);

      const gaps = [];
      for (let i = 1; i < elements.length; i++) {
        const prev = elements[i - 1];
        const curr = elements[i];
        const gap = curr.y - (prev.y + prev.height);
        gaps.push({ between: [prev.selector, curr.selector], gap });
      }

      // Inkonsistenzen finden
      const uniqueGaps = [...new Set(gaps.map(g => g.gap))];
      const inconsistent = uniqueGaps.length > 1;

      return {
        gaps,
        inconsistent,
        suggestion: inconsistent
          ? `Spacing is inconsistent: ${uniqueGaps.join(', ')}px. Consider using a consistent gap.`
          : null
      };
    }
  }
];
```

### Akzeptanzkriterien Phase 3

- [ ] Screenshot-Tool liefert Preview-Bilder
- [ ] Agent kann Screenshots analysieren
- [ ] Element-Messungen funktionieren
- [ ] Visual Feedback bei Tool-Ausführung

---

## Phase 4: Intelligence

**Ziel:** Agent lernt und verbessert sich

### Tasks

| # | Task | Beschreibung | Dateien |
|---|------|--------------|---------|
| 4.1 | Memory Store | Preferences, Patterns speichern | studio/agent/memory.ts |
| 4.2 | Dynamic Prompt | Context-basierter System Prompt | studio/agent/prompts/dynamic.ts |
| 4.3 | Pattern Learning | Erfolgreiche Muster erkennen | studio/agent/learning.ts |
| 4.4 | Suggestions | Proaktive Vorschläge | studio/agent/suggestions.ts |

### 4.1 Memory Store

```typescript
// studio/agent/memory.ts

interface MemoryEntry {
  id: string;
  type: 'preference' | 'pattern' | 'correction';
  key: string;
  value: any;
  confidence: number;
  timestamp: Date;
}

export class MemoryStore {
  private storage: Storage;
  private entries: MemoryEntry[] = [];

  constructor() {
    this.storage = localStorage;
    this.load();
  }

  // Lernt aus User-Feedback
  learnFromFeedback(interaction: {
    userMessage: string;
    agentAction: any;
    accepted: boolean;
    correction?: string;
  }) {
    if (interaction.accepted) {
      // Pattern als erfolgreich markieren
      this.addPattern(interaction.userMessage, interaction.agentAction);
    } else if (interaction.correction) {
      // Korrektur lernen
      this.addCorrection(interaction.userMessage, interaction.correction);
    }
  }

  // Lernt Preferences aus wiederholtem Verhalten
  inferPreference(observations: any[]) {
    // Z.B.: User ändert immer Farben zu bestimmten Werten
    // → Präferenz für diese Farben ableiten
  }

  // Gibt Kontext für Prompt
  getContextForPrompt(): string {
    const preferences = this.getPreferences();
    const patterns = this.getRecentPatterns();

    if (preferences.length === 0 && patterns.length === 0) {
      return '';
    }

    return `
## Learned Preferences
${preferences.map(p => `- ${p.key}: ${p.value}`).join('\n')}

## Successful Patterns
${patterns.map(p => `- "${p.trigger}" → ${p.action}`).join('\n')}
`;
  }

  // Findet ähnliche vergangene Anfragen
  findSimilar(query: string): MemoryEntry[] {
    return this.entries
      .filter(e => this.similarity(e.key, query) > 0.7)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  private save() {
    this.storage.setItem('mirror-agent-memory', JSON.stringify(this.entries));
  }

  private load() {
    const data = this.storage.getItem('mirror-agent-memory');
    if (data) {
      this.entries = JSON.parse(data);
    }
  }
}
```

### 4.4 Suggestions

```typescript
// studio/agent/suggestions.ts

export class SuggestionEngine {
  private agent: MirrorAgent;
  private memory: MemoryStore;

  // Generiert proaktive Vorschläge
  async generateSuggestions(context: {
    code: string;
    selection: Element | null;
    recentChanges: Change[];
  }): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // 1. Code-basierte Vorschläge
    const codeIssues = await this.analyzeCode(context.code);
    suggestions.push(...codeIssues.map(issue => ({
      type: 'improvement',
      title: issue.title,
      description: issue.description,
      action: issue.fix
    })));

    // 2. Kontext-basierte Vorschläge
    if (context.selection) {
      const elementSuggestions = await this.suggestForElement(context.selection);
      suggestions.push(...elementSuggestions);
    }

    // 3. Aus Memory gelernte Vorschläge
    const learnedSuggestions = this.memory.getSuggestionsForContext(context);
    suggestions.push(...learnedSuggestions);

    return suggestions.slice(0, 5);
  }

  private async analyzeCode(code: string): Promise<Issue[]> {
    const issues: Issue[] = [];

    // Hardcoded Colors
    const hardcodedColors = code.match(/#[0-9a-fA-F]{3,6}/g);
    if (hardcodedColors && hardcodedColors.length > 3) {
      issues.push({
        title: "Extract color tokens",
        description: `Found ${hardcodedColors.length} hardcoded colors. Consider using tokens.`,
        fix: { action: 'extract_tokens', colors: [...new Set(hardcodedColors)] }
      });
    }

    // Inconsistent Spacing
    const gaps = code.match(/gap \d+/g);
    if (gaps && new Set(gaps).size > 3) {
      issues.push({
        title: "Standardize spacing",
        description: "Multiple different gap values used. Consider a spacing scale.",
        fix: { action: 'standardize_spacing' }
      });
    }

    // Missing accessibility
    const buttons = (code.match(/Button/g) || []).length;
    const buttonTexts = (code.match(/Button[^]*?Text/g) || []).length;
    if (buttons > buttonTexts) {
      issues.push({
        title: "Add button labels",
        description: "Some buttons may be missing text labels for accessibility.",
        fix: { action: 'add_labels' }
      });
    }

    return issues;
  }
}
```

### Akzeptanzkriterien Phase 4

- [ ] Memory speichert Preferences
- [ ] Prompt nutzt gelernte Infos
- [ ] Proaktive Suggestions erscheinen
- [ ] Agent wird mit Nutzung besser

---

## Phase 5: Polish

**Ziel:** Performance, UX, Dokumentation

### Tasks

| # | Task | Beschreibung |
|---|------|--------------|
| 5.1 | Performance | Streaming optimieren, Caching |
| 5.2 | Error Handling | Graceful Degradation |
| 5.3 | Keyboard Shortcuts | Cmd+K für Chat |
| 5.4 | Quick Actions | Buttons für häufige Aktionen |
| 5.5 | Dokumentation | User Guide |
| 5.6 | Tests | E2E Tests für Agent |

### 5.3 Keyboard Shortcuts

```typescript
// studio/agent/shortcuts.ts

export function setupAgentShortcuts(chatPanel: ChatPanel) {
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + K: Chat öffnen/fokussieren
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      chatPanel.focus();
    }

    // Cmd/Ctrl + Shift + K: Quick Action
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      chatPanel.showQuickActions();
    }

    // Escape: Chat schließen (wenn leer)
    if (e.key === 'Escape') {
      chatPanel.blurIfEmpty();
    }
  });
}
```

### 5.4 Quick Actions

```typescript
// studio/agent/quick-actions.ts

export const quickActions = [
  {
    id: 'explain',
    label: 'Explain selection',
    icon: '💡',
    prompt: (ctx) => `Explain what this code does: ${ctx.selectedCode}`
  },
  {
    id: 'improve',
    label: 'Improve layout',
    icon: '✨',
    prompt: (ctx) => `Suggest improvements for: ${ctx.selectedCode}`
  },
  {
    id: 'responsive',
    label: 'Make responsive',
    icon: '📱',
    prompt: (ctx) => `Make this responsive: ${ctx.selectedCode}`
  },
  {
    id: 'extract',
    label: 'Extract component',
    icon: '📦',
    prompt: (ctx) => `Extract this into a reusable component: ${ctx.selectedCode}`
  },
  {
    id: 'fix',
    label: 'Fix issues',
    icon: '🔧',
    prompt: () => `Find and fix any issues in the current code`
  }
];
```

### Akzeptanzkriterien Phase 5

- [ ] Response-Zeit < 500ms für erste Zeichen
- [ ] Graceful Error Handling
- [ ] Cmd+K öffnet Chat
- [ ] Quick Actions funktionieren
- [ ] Dokumentation vorhanden

---

## Deployment Checklist

### Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

### Build

```bash
npm run build:studio  # Inkludiert Agent
```

### Test

```bash
npm run test:agent    # Agent-spezifische Tests
npm run test:e2e      # E2E mit Agent
```

---

## Metriken

| Metrik | Ziel |
|--------|------|
| Time to First Token | < 500ms |
| Tool Execution | < 100ms |
| Success Rate | > 90% |
| User Satisfaction | > 4/5 |

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| API Latenz | Mittel | Hoch | Streaming, Optimistic UI |
| Falsche Änderungen | Niedrig | Hoch | Undo, Validation, Confirm |
| API Kosten | Mittel | Mittel | Caching, Token-Limits |
| SDK Breaking Changes | Niedrig | Mittel | Version Pinning |
