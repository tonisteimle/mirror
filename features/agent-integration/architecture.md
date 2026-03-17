# Mirror AI Agent - Architektur

## System-Übersicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MIRROR STUDIO                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────────────┐ │
│  │    Editor    │  │   Preview    │  │           AI Chat Panel            │ │
│  │  (CodeMir)   │  │    (DOM)     │  │  ┌──────────────────────────────┐  │ │
│  │              │  │              │  │  │ Agent: Ich erstelle ein     │  │ │
│  │              │  │              │  │  │ Dashboard Layout...         │  │ │
│  │              │◄─┼──────────────┼──┤  │                              │  │ │
│  │   Sync       │  │    Sync      │  │  │ ┌─ Tool: add_child ───────┐ │  │ │
│  │              │  │              │  │  │ │ parent: Root            │ │  │ │
│  │              │  │              │  │  │ │ component: Box hor      │ │  │ │
│  └──────────────┘  └──────────────┘  │  │ └──────────────────────────┘ │  │ │
│         │                 │          │  └──────────────────────────────┘  │ │
│         │                 │          │                                     │ │
│         ▼                 ▼          │  ┌──────────────────────────────┐  │ │
│  ┌────────────────────────────────┐  │  │         Quick Actions        │  │ │
│  │         State Store            │  │  │  [Explain] [Improve] [Fix]   │  │ │
│  │  - currentCode                 │  │  └──────────────────────────────┘  │ │
│  │  - selectedElement             │  │                                     │ │
│  │  - tokens                      │  │  ┌──────────────────────────────┐  │ │
│  │  - astCache                    │  │  │      Suggestion Cards        │  │ │
│  └────────────────────────────────┘  │  │  "Add responsive breakpoint" │  │ │
│                                       │  │  "Extract as component"      │  │ │
│                                       │  └──────────────────────────────┘  │ │
│                                       └────────────────────────────────────┘ │
│                                                       │                      │
├───────────────────────────────────────────────────────┼──────────────────────┤
│                                                       │                      │
│                           AGENT LAYER                 │                      │
│  ┌────────────────────────────────────────────────────┴────────────────────┐ │
│  │                                                                          │ │
│  │                        Claude Agent SDK                                  │ │
│  │                                                                          │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │ │
│  │  │   System    │  │    Tool     │  │   Context   │  │   Memory    │    │ │
│  │  │   Prompt    │  │   Registry  │  │   Manager   │  │   Store     │    │ │
│  │  │             │  │             │  │             │  │             │    │ │
│  │  │ - DSL Spec  │  │ - Read      │  │ - Code      │  │ - History   │    │ │
│  │  │ - Examples  │  │ - Write     │  │ - Selection │  │ - Patterns  │    │ │
│  │  │ - Rules     │  │ - Validate  │  │ - Tokens    │  │ - Prefs     │    │ │
│  │  └─────────────┘  │ - Preview   │  │ - AST       │  └─────────────┘    │ │
│  │                    │ - Analyze   │  └─────────────┘                     │ │
│  │                    └─────────────┘                                       │ │
│  │                                                                          │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                           │                                   │
├───────────────────────────────────────────┼───────────────────────────────────┤
│                                           │                                   │
│                           TOOL LAYER      │                                   │
│  ┌────────────────────────────────────────┴──────────────────────────────────┐│
│  │                                                                            ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐  ││
│  │  │                         Core Tools                                   │  ││
│  │  ├─────────────────────────────────────────────────────────────────────┤  ││
│  │  │                                                                      │  ││
│  │  │  READ                    WRITE                   ANALYZE             │  ││
│  │  │  ─────                   ─────                   ───────             │  ││
│  │  │  get_code                set_property            validate            │  ││
│  │  │  get_element             set_properties          explain             │  ││
│  │  │  get_context             add_child               suggest             │  ││
│  │  │  get_tree                delete_element          find_issues         │  ││
│  │  │  get_tokens              move_element            optimize            │  ││
│  │  │  get_schema              wrap_with                                   │  ││
│  │  │                          duplicate                                   │  ││
│  │  │                          replace_code                                │  ││
│  │  │                                                                      │  ││
│  │  └─────────────────────────────────────────────────────────────────────┘  ││
│  │                                                                            ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐  ││
│  │  │                       Advanced Tools                                 │  ││
│  │  ├─────────────────────────────────────────────────────────────────────┤  ││
│  │  │                                                                      │  ││
│  │  │  VISUAL                  GENERATION              PROJECT             │  ││
│  │  │  ──────                  ──────────              ───────             │  ││
│  │  │  screenshot_preview      generate_component      search_components   │  ││
│  │  │  analyze_layout          generate_layout         extract_component   │  ││
│  │  │  check_alignment         generate_form           create_token        │  ││
│  │  │  measure_spacing         generate_list           refactor            │  ││
│  │  │                          apply_pattern                               │  ││
│  │  │                                                                      │  ││
│  │  └─────────────────────────────────────────────────────────────────────┘  ││
│  │                                                                            ││
│  └────────────────────────────────────────────────────────────────────────────┘│
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Komponenten-Details

### 1. System Prompt Engine

Der System Prompt ist nicht statisch, sondern wird dynamisch aufgebaut:

```typescript
class SystemPromptEngine {
  build(): string {
    return [
      this.getCoreIdentity(),
      this.getDSLSpecification(),
      this.getContextualRules(),
      this.getProjectContext(),
      this.getExamples(),
      this.getUserPreferences()
    ].join('\n\n');
  }

  // Kern-Identität
  private getCoreIdentity(): string {
    return `
# Du bist der Mirror AI Assistant

Du bist ein Experte für Mirror DSL - eine domänenspezifische Sprache für
UI-Prototyping. Du verstehst nicht nur die Syntax, sondern auch die
Designprinzipien dahinter.

## Deine Stärken
- Verstehst UI/UX Konzepte
- Kennst Best Practices für Layouts
- Optimierst für Lesbarkeit und Wartbarkeit
- Arbeitest iterativ und validierst jeden Schritt
`;
  }

  // DSL Spec - komprimiert aber vollständig
  private getDSLSpecification(): string {
    return `
## Mirror DSL Specification

### Syntax
\`\`\`
Component property value, property2 value2
  Child property value
    GrandChild property value
\`\`\`

### Primitives
${this.formatPrimitives()}

### Properties
${this.formatProperties()}

### Events & Actions
${this.formatEventsActions()}

### States
${this.formatStates()}
`;
  }

  // Regeln basierend auf Kontext
  private getContextualRules(): string {
    const rules = [];

    // Wenn Tokens definiert sind
    if (this.hasTokens()) {
      rules.push(`
## Token-Nutzung
Das Projekt hat Design-Tokens definiert. Nutze IMMER Tokens statt Hardcoded-Werte:
- Farben: $primary.bg, $secondary.col, etc.
- Spacing: $spacing.sm, $spacing.md, $spacing.lg
- Radien: $radius.sm, $radius.md
`);
    }

    // Wenn Komponenten definiert sind
    if (this.hasComponents()) {
      rules.push(`
## Komponenten-Wiederverwendung
Folgende Komponenten sind definiert - nutze sie wenn möglich:
${this.listComponents()}
`);
    }

    return rules.join('\n\n');
  }

  // Projekt-spezifischer Kontext
  private getProjectContext(): string {
    return `
## Aktueller Projekt-Kontext

### Definierte Tokens
${JSON.stringify(this.context.tokens, null, 2)}

### Definierte Komponenten
${this.context.components.map(c => `- ${c.name}: ${c.description}`).join('\n')}

### Code-Struktur
${this.context.codeStructure}
`;
  }

  // Gute Beispiele
  private getExamples(): string {
    return `
## Beispiele

### Card Component
\`\`\`
Box ver pad 16 bg $surface rad $radius.md shadow sm
  Image w full h 160 rad $radius.sm
  Box ver gap 8 pad-top 12
    Text "Titel" fs 18 weight semibold col $text.primary
    Text "Beschreibung" fs 14 col $text.secondary line 1.5
  Box hor gap 8 pad-top 12
    Button bg $primary col white pad 8 rad $radius.sm grow
      Text "Action"
\`\`\`

### Form Layout
\`\`\`
Box ver gap 16
  Box ver gap 4
    Label "Email" fs 12 col $text.secondary
    Input pad 12 bor 1 boc $border rad $radius.sm
  Box ver gap 4
    Label "Password" fs 12 col $text.secondary
    Input type password pad 12 bor 1 boc $border rad $radius.sm
  Button bg $primary col white pad 12 rad $radius.sm
    Text "Sign In"
\`\`\`
`;
  }

  // User-Präferenzen aus History lernen
  private getUserPreferences(): string {
    if (!this.memory.hasPreferences()) return '';

    return `
## Deine Präferenzen (gelernt)
${this.memory.getPreferences().map(p => `- ${p}`).join('\n')}
`;
  }
}
```

---

### 2. Tool Registry

Alle Tools mit voller Typisierung und Validierung:

```typescript
interface Tool {
  name: string;
  description: string;
  category: 'read' | 'write' | 'analyze' | 'visual' | 'generate' | 'project';
  parameters: ParameterSchema;
  execute: (params: any, context: ToolContext) => Promise<ToolResult>;
  validate?: (params: any) => ValidationResult;
  examples?: string[];
}

class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  // Core Read Tools
  registerCoreReadTools() {
    this.register({
      name: 'get_code',
      description: 'Returns the complete current Mirror DSL code',
      category: 'read',
      parameters: {},
      execute: async (_, ctx) => ctx.editor.getCode(),
      examples: ['get_code()']
    });

    this.register({
      name: 'get_element',
      description: `Returns details about a specific element.

Selectors:
- @N: Element at line N (e.g., @5)
- #id: Element with id (e.g., #header)
- Type: First element of type (e.g., Button)
- Type:N: Nth element of type (e.g., Button:2)`,
      category: 'read',
      parameters: {
        selector: { type: 'string', required: true }
      },
      execute: async ({ selector }, ctx) => {
        const element = ctx.sourceMap.findBySelector(selector);
        if (!element) return { error: `Not found: ${selector}` };

        return {
          type: element.type,
          line: element.line,
          properties: element.properties,
          children: element.children.map(c => ({ type: c.type, line: c.line })),
          parent: element.parent ? { type: element.parent.type, line: element.parent.line } : null,
          code: ctx.editor.getLineContent(element.line)
        };
      },
      examples: [
        'get_element("@5") // Element auf Zeile 5',
        'get_element("#sidebar") // Element mit ID sidebar',
        'get_element("Button:2") // Zweiter Button'
      ]
    });

    this.register({
      name: 'get_context',
      description: 'Returns current editor context: selection, cursor, tokens',
      category: 'read',
      parameters: {},
      execute: async (_, ctx) => ({
        cursorLine: ctx.editor.getCursorLine(),
        selectedElement: ctx.selection.current,
        selectedCode: ctx.selection.currentCode,
        parentChain: ctx.selection.parentChain,
        siblings: ctx.selection.siblings,
        availableTokens: ctx.tokens.list(),
        recentChanges: ctx.history.recent(5)
      })
    });

    this.register({
      name: 'get_tree',
      description: 'Returns the complete element tree structure',
      category: 'read',
      parameters: {
        depth: { type: 'number', required: false, default: -1 },
        format: { type: 'string', enum: ['full', 'summary', 'outline'], default: 'summary' }
      },
      execute: async ({ depth, format }, ctx) => {
        const tree = ctx.sourceMap.getTree(depth);

        switch (format) {
          case 'outline':
            return this.formatOutline(tree);
          case 'summary':
            return this.formatSummary(tree);
          default:
            return tree;
        }
      }
    });
  }

  // Core Write Tools
  registerCoreWriteTools() {
    this.register({
      name: 'set_property',
      description: `Sets a single property on an element.

Common properties:
- Layout: hor, ver, gap, pad, margin
- Size: w, h, minw, maxw
- Visual: bg, col, bor, rad, shadow
- Typography: fs, weight, line`,
      category: 'write',
      parameters: {
        selector: { type: 'string', required: true },
        property: { type: 'string', required: true },
        value: { type: 'string', required: true }
      },
      validate: ({ property, value }) => {
        if (!isValidProperty(property)) {
          return { valid: false, error: `Unknown property: ${property}`, suggestions: getSimilarProperties(property) };
        }
        if (!isValidValue(property, value)) {
          return { valid: false, error: `Invalid value for ${property}`, allowedValues: getPropertyValues(property) };
        }
        return { valid: true };
      },
      execute: async ({ selector, property, value }, ctx) => {
        const element = ctx.sourceMap.findBySelector(selector);
        if (!element) return { error: `Not found: ${selector}` };

        const result = ctx.codeModifier.setProperty(element.line, property, value);
        ctx.editor.applyChange(result);

        return {
          success: true,
          line: element.line,
          before: element.code,
          after: ctx.editor.getLineContent(element.line)
        };
      }
    });

    this.register({
      name: 'add_child',
      description: 'Adds a new child element to a parent',
      category: 'write',
      parameters: {
        parent: { type: 'string', required: true },
        component: { type: 'string', required: true },
        properties: { type: 'object', required: false },
        content: { type: 'string', required: false },
        position: { type: 'string', enum: ['first', 'last', 'number'], default: 'last' }
      },
      validate: ({ component }) => {
        if (!isValidPrimitive(component)) {
          return { valid: false, error: `Unknown component: ${component}`, suggestions: getSimilarPrimitives(component) };
        }
        return { valid: true };
      },
      execute: async ({ parent, component, properties, content, position }, ctx) => {
        const parentElement = ctx.sourceMap.findBySelector(parent);
        if (!parentElement) return { error: `Parent not found: ${parent}` };

        const result = ctx.codeModifier.addChild(parentElement.line, {
          component,
          properties: properties || {},
          content,
          position
        });

        ctx.editor.applyChange(result);

        return {
          success: true,
          newElementLine: result.insertedLine,
          code: ctx.editor.getLineContent(result.insertedLine)
        };
      }
    });

    this.register({
      name: 'wrap_with',
      description: 'Wraps an element with a container',
      category: 'write',
      parameters: {
        element: { type: 'string', required: true },
        wrapper: { type: 'string', required: true, description: 'Container definition, e.g., "Box hor gap 8"' }
      },
      execute: async ({ element, wrapper }, ctx) => {
        const el = ctx.sourceMap.findBySelector(element);
        if (!el) return { error: `Not found: ${element}` };

        const result = ctx.codeModifier.wrapWith(el.line, wrapper);
        ctx.editor.applyChange(result);

        return { success: true, wrapperLine: result.wrapperLine };
      }
    });

    this.register({
      name: 'delete_element',
      description: 'Deletes an element and all its children',
      category: 'write',
      parameters: {
        selector: { type: 'string', required: true },
        confirm: { type: 'boolean', required: false, default: true }
      },
      execute: async ({ selector, confirm }, ctx) => {
        const element = ctx.sourceMap.findBySelector(selector);
        if (!element) return { error: `Not found: ${selector}` };

        const childCount = this.countChildren(element);

        if (confirm && childCount > 0) {
          return {
            needsConfirmation: true,
            message: `This will delete ${childCount + 1} elements. Set confirm: false to proceed.`
          };
        }

        const result = ctx.codeModifier.deleteElement(element.line);
        ctx.editor.applyChange(result);

        return { success: true, deletedCount: result.deletedLines };
      }
    });

    this.register({
      name: 'replace_code',
      description: 'Replaces a range of code with new code. Use for complex multi-line changes.',
      category: 'write',
      parameters: {
        startLine: { type: 'number', required: true },
        endLine: { type: 'number', required: true },
        newCode: { type: 'string', required: true }
      },
      execute: async ({ startLine, endLine, newCode }, ctx) => {
        // Validiere neuen Code
        const validation = ctx.parser.validate(newCode);
        if (!validation.valid) {
          return { error: `Invalid code: ${validation.error}`, line: validation.line };
        }

        const result = ctx.codeModifier.replaceRange(startLine, endLine, newCode);
        ctx.editor.applyChange(result);

        return { success: true, linesChanged: endLine - startLine + 1 };
      }
    });
  }

  // Analyze Tools
  registerAnalyzeTools() {
    this.register({
      name: 'validate',
      description: 'Validates the current code for syntax errors',
      category: 'analyze',
      parameters: {},
      execute: async (_, ctx) => {
        const code = ctx.editor.getCode();
        try {
          const ast = ctx.parser.parse(code);
          const warnings = ctx.linter.check(ast);

          return {
            valid: true,
            elementCount: countElements(ast),
            warnings: warnings.map(w => ({ line: w.line, message: w.message, severity: w.severity }))
          };
        } catch (e) {
          return {
            valid: false,
            error: e.message,
            line: e.line,
            column: e.column,
            suggestion: getSuggestionForError(e)
          };
        }
      }
    });

    this.register({
      name: 'explain',
      description: 'Explains what a piece of code does',
      category: 'analyze',
      parameters: {
        selector: { type: 'string', required: false },
        startLine: { type: 'number', required: false },
        endLine: { type: 'number', required: false }
      },
      execute: async (params, ctx) => {
        let code: string;

        if (params.selector) {
          const element = ctx.sourceMap.findBySelector(params.selector);
          code = ctx.editor.getCodeForElement(element);
        } else if (params.startLine && params.endLine) {
          code = ctx.editor.getRange(params.startLine, params.endLine);
        } else {
          code = ctx.editor.getSelectedText() || ctx.editor.getCode();
        }

        // Der Agent selbst erklärt - kein Tool-Result nötig
        return { code, instruction: 'Please explain this code to the user' };
      }
    });

    this.register({
      name: 'find_issues',
      description: 'Finds potential issues in the code: accessibility, performance, best practices',
      category: 'analyze',
      parameters: {
        categories: {
          type: 'array',
          items: { type: 'string', enum: ['accessibility', 'performance', 'bestPractices', 'layout'] },
          required: false,
          default: ['accessibility', 'bestPractices']
        }
      },
      execute: async ({ categories }, ctx) => {
        const code = ctx.editor.getCode();
        const ast = ctx.parser.parse(code);
        const issues = [];

        if (categories.includes('accessibility')) {
          issues.push(...this.checkAccessibility(ast));
        }
        if (categories.includes('performance')) {
          issues.push(...this.checkPerformance(ast));
        }
        if (categories.includes('bestPractices')) {
          issues.push(...this.checkBestPractices(ast));
        }
        if (categories.includes('layout')) {
          issues.push(...this.checkLayout(ast));
        }

        return { issues };
      }
    });

    this.register({
      name: 'suggest_improvements',
      description: 'Suggests improvements for selected element or code',
      category: 'analyze',
      parameters: {
        selector: { type: 'string', required: false },
        focus: { type: 'string', enum: ['layout', 'visual', 'interaction', 'all'], default: 'all' }
      },
      execute: async ({ selector, focus }, ctx) => {
        const element = selector
          ? ctx.sourceMap.findBySelector(selector)
          : ctx.selection.current;

        if (!element) return { suggestions: [] };

        const suggestions = [];

        if (focus === 'layout' || focus === 'all') {
          suggestions.push(...this.suggestLayoutImprovements(element, ctx));
        }
        if (focus === 'visual' || focus === 'all') {
          suggestions.push(...this.suggestVisualImprovements(element, ctx));
        }
        if (focus === 'interaction' || focus === 'all') {
          suggestions.push(...this.suggestInteractionImprovements(element, ctx));
        }

        return { suggestions };
      }
    });
  }

  // Visual Tools (Preview-Integration)
  registerVisualTools() {
    this.register({
      name: 'screenshot_preview',
      description: 'Takes a screenshot of the current preview for visual analysis',
      category: 'visual',
      parameters: {
        selector: { type: 'string', required: false, description: 'Element to screenshot, or full preview' }
      },
      execute: async ({ selector }, ctx) => {
        const screenshot = await ctx.preview.screenshot(selector);
        return {
          image: screenshot,
          instruction: 'Analyze this screenshot for layout issues, alignment problems, or visual improvements'
        };
      }
    });

    this.register({
      name: 'analyze_layout',
      description: 'Analyzes the visual layout for issues',
      category: 'visual',
      parameters: {},
      execute: async (_, ctx) => {
        const screenshot = await ctx.preview.screenshot();
        const elements = await ctx.preview.getElementBounds();

        const analysis = {
          alignmentIssues: this.detectAlignmentIssues(elements),
          spacingInconsistencies: this.detectSpacingIssues(elements),
          overflowProblems: this.detectOverflow(elements),
          touchTargetIssues: this.detectSmallTouchTargets(elements)
        };

        return { analysis, screenshot };
      }
    });

    this.register({
      name: 'measure_element',
      description: 'Measures an element in the preview (dimensions, position)',
      category: 'visual',
      parameters: {
        selector: { type: 'string', required: true }
      },
      execute: async ({ selector }, ctx) => {
        const bounds = await ctx.preview.getElementBounds(selector);
        if (!bounds) return { error: `Element not found in preview: ${selector}` };

        return {
          width: bounds.width,
          height: bounds.height,
          x: bounds.x,
          y: bounds.y,
          computedStyles: bounds.computedStyles
        };
      }
    });
  }

  // Generation Tools
  registerGenerationTools() {
    this.register({
      name: 'generate_component',
      description: 'Generates a complete component based on description',
      category: 'generate',
      parameters: {
        description: { type: 'string', required: true },
        style: { type: 'string', enum: ['minimal', 'detailed', 'production'], default: 'detailed' }
      },
      execute: async ({ description, style }, ctx) => {
        // Gibt Instruction zurück - der Agent generiert dann
        return {
          instruction: `Generate Mirror DSL code for: ${description}`,
          context: {
            availableTokens: ctx.tokens.list(),
            existingComponents: ctx.components.list(),
            style
          }
        };
      }
    });

    this.register({
      name: 'apply_pattern',
      description: 'Applies a common UI pattern to selected element',
      category: 'generate',
      parameters: {
        pattern: {
          type: 'string',
          enum: ['card', 'list', 'form', 'modal', 'sidebar', 'header', 'footer', 'grid', 'tabs'],
          required: true
        },
        target: { type: 'string', required: false, description: 'Element to apply pattern to' }
      },
      execute: async ({ pattern, target }, ctx) => {
        const patterns = {
          card: 'Box ver pad 16 bg $surface rad $radius.md shadow sm',
          list: 'Box ver gap 8',
          form: 'Box ver gap 16',
          modal: 'Box ver pad 24 bg white rad 12 shadow lg w 400 center',
          sidebar: 'Box ver w 240 h full bg $surface-secondary pad 16',
          header: 'Box hor spread pad 16 bg $surface bor-bottom 1 boc $border',
          footer: 'Box hor center pad 16 bg $surface-secondary',
          grid: 'Box grid 3 gap 16',
          tabs: 'Box ver gap 0'
        };

        const code = patterns[pattern];

        if (target) {
          const element = ctx.sourceMap.findBySelector(target);
          if (!element) return { error: `Not found: ${target}` };

          const result = ctx.codeModifier.wrapWith(element.line, code);
          ctx.editor.applyChange(result);
          return { success: true, appliedPattern: pattern };
        }

        return { patternCode: code, instruction: 'Add this pattern to the code' };
      }
    });
  }

  // Project Tools
  registerProjectTools() {
    this.register({
      name: 'search_code',
      description: 'Searches for elements by type, property, or content',
      category: 'project',
      parameters: {
        query: { type: 'string', required: true },
        type: { type: 'string', enum: ['element', 'property', 'value', 'content'], default: 'element' }
      },
      execute: async ({ query, type }, ctx) => {
        const results = ctx.sourceMap.search(query, type);
        return { results: results.slice(0, 20) };
      }
    });

    this.register({
      name: 'extract_component',
      description: 'Extracts selected code into a reusable component definition',
      category: 'project',
      parameters: {
        selector: { type: 'string', required: true },
        name: { type: 'string', required: true },
        parameters: { type: 'array', items: { type: 'string' }, required: false }
      },
      execute: async ({ selector, name, parameters }, ctx) => {
        const element = ctx.sourceMap.findBySelector(selector);
        if (!element) return { error: `Not found: ${selector}` };

        const code = ctx.editor.getCodeForElement(element);
        const definition = this.createComponentDefinition(name, code, parameters);

        return {
          definition,
          instruction: `Add this component definition and replace the original with ${name}`
        };
      }
    });

    this.register({
      name: 'create_token',
      description: 'Creates a new design token',
      category: 'project',
      parameters: {
        name: { type: 'string', required: true },
        value: { type: 'string', required: true },
        category: { type: 'string', enum: ['color', 'spacing', 'radius', 'shadow', 'font'], required: true }
      },
      execute: async ({ name, value, category }, ctx) => {
        const fullName = `$${category}.${name}`;
        const result = ctx.tokens.add(fullName, value);

        return { success: true, token: fullName, value };
      }
    });
  }
}
```

---

### 3. Context Manager

Verwaltet den kompletten Kontext für den Agent:

```typescript
class ContextManager {
  // Baut den Runtime-Kontext für jeden Agent-Aufruf
  buildContext(): AgentContext {
    return {
      // Aktueller Code-Stand
      code: this.editor.getCode(),

      // AST für strukturierte Abfragen
      ast: this.parser.parse(this.editor.getCode()),

      // SourceMap für Element-Lookups
      sourceMap: this.sourceMap,

      // Aktuelle Selektion
      selection: {
        current: this.selectionManager.getCurrent(),
        currentCode: this.getSelectedCode(),
        parentChain: this.getParentChain(),
        siblings: this.getSiblings()
      },

      // Projekt-Tokens
      tokens: this.tokenManager.getAll(),

      // Definierte Komponenten
      components: this.componentManager.getAll(),

      // Editor-State
      editor: {
        cursorLine: this.editor.getCursorLine(),
        cursorColumn: this.editor.getCursorColumn(),
        visibleRange: this.editor.getVisibleRange()
      },

      // Letzte Änderungen (für Undo-Context)
      history: this.historyManager.getRecent(10),

      // Preview-State (falls verfügbar)
      preview: {
        rendered: this.preview.isRendered(),
        errors: this.preview.getErrors(),
        warnings: this.preview.getWarnings()
      }
    };
  }

  // Komprimierter Kontext für System-Prompt
  getCompressedContext(): string {
    const ctx = this.buildContext();

    return `
## Current State

### Code Structure
${this.formatCodeOutline(ctx.ast)}

### Selected Element
${ctx.selection.current ? this.formatElement(ctx.selection.current) : 'None'}

### Available Tokens
${this.formatTokens(ctx.tokens)}

### Recent Changes
${ctx.history.map(h => `- ${h.description}`).join('\n')}
`;
  }
}
```

---

### 4. Memory Store

Lernt aus Interaktionen:

```typescript
class MemoryStore {
  // Speichert User-Präferenzen
  private preferences: Map<string, string> = new Map();

  // Häufig genutzte Patterns
  private patterns: Pattern[] = [];

  // Erfolgreiche Transformationen
  private successfulTransforms: Transform[] = [];

  // Lernt aus erfolgreichen Interaktionen
  learnFromInteraction(interaction: Interaction) {
    // Wenn User Änderung akzeptiert hat
    if (interaction.accepted) {
      // Pattern extrahieren
      const pattern = this.extractPattern(interaction);
      if (pattern) {
        this.patterns.push(pattern);
      }

      // Transform merken
      this.successfulTransforms.push({
        input: interaction.userMessage,
        output: interaction.agentAction,
        context: interaction.context
      });
    }

    // Wenn User korrigiert hat
    if (interaction.corrected) {
      // Präferenz ableiten
      const pref = this.inferPreference(interaction);
      if (pref) {
        this.preferences.set(pref.key, pref.value);
      }
    }
  }

  // Gibt gelernte Präferenzen zurück
  getPreferences(): string[] {
    return Array.from(this.preferences.entries())
      .map(([key, value]) => `${key}: ${value}`);
  }

  // Findet ähnliche erfolgreiche Transforms
  findSimilarTransforms(input: string): Transform[] {
    return this.successfulTransforms
      .filter(t => this.similarity(t.input, input) > 0.7)
      .slice(0, 3);
  }
}
```
