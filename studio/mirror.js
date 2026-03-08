"use strict";
var Mirror = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    CodeModifier: () => CodeModifier,
    DIRECTORY_ORDER: () => DIRECTORY_ORDER,
    DragDropManager: () => DragDropManager,
    DropZoneCalculator: () => DropZoneCalculator,
    EditorSyncManager: () => EditorSyncManager,
    ICON_PATHS: () => ICON_PATHS,
    PROPERTY_ICON_PATHS: () => PROPERTY_ICON_PATHS,
    PreviewInteraction: () => PreviewInteraction,
    PropertyExtractor: () => PropertyExtractor,
    PropertyPanel: () => PropertyPanel,
    SelectionManager: () => SelectionManager,
    SourceMap: () => SourceMap,
    SourceMapBuilder: () => SourceMapBuilder,
    addPropertyToLine: () => addPropertyToLine,
    applyChange: () => applyChange,
    buildReactSystemPrompt: () => buildReactSystemPrompt,
    calculatePropertyPosition: () => calculatePropertyPosition,
    calculateSourcePosition: () => calculateSourcePosition,
    callLLM: () => callLLM,
    combineFiles: () => combineFiles,
    combineProjectFiles: () => combineProjectFiles,
    compile: () => compile,
    compileProject: () => compileProject,
    createCodeModifier: () => createCodeModifier,
    createDragDropManager: () => createDragDropManager,
    createDropZoneCalculator: () => createDropZoneCalculator,
    createEditorSyncManager: () => createEditorSyncManager,
    createPreviewInteraction: () => createPreviewInteraction,
    createPropertyExtractor: () => createPropertyExtractor,
    createPropertyPanel: () => createPropertyPanel,
    extractKeywords: () => extractKeywords,
    extractReactFromResponse: () => extractReactFromResponse,
    extractStudioContext: () => extractStudioContext,
    findIconForComponent: () => findIconForComponent,
    findIconsForComponents: () => findIconsForComponents,
    findPropertyInLine: () => findPropertyInLine,
    generateDOM: () => generateDOM,
    generateFramework: () => generateFramework,
    generateFromPrompt: () => generateFromPrompt,
    generateIconSVG: () => generateIconSVG,
    generateReact: () => generateReact,
    generateStatic: () => generateStatic,
    getCanonicalName: () => getCanonicalName,
    getIconPath: () => getIconPath,
    getSelectionManager: () => getSelectionManager,
    isBooleanProperty: () => isBooleanProperty,
    isMultiValueProperty: () => isMultiValueProperty,
    isSameProperty: () => isSameProperty,
    makeCanvasElementDraggable: () => makeCanvasElementDraggable,
    makeDraggable: () => makeDraggable,
    parse: () => parse,
    parseLine: () => parseLine,
    prepareCodeForInsertion: () => prepareCodeForInsertion,
    removePropertyFromLine: () => removePropertyFromLine,
    resetSelectionManager: () => resetSelectionManager,
    toIR: () => toIR,
    updatePropertyInLine: () => updatePropertyInLine
  });

  // src/parser/lexer.ts
  var Lexer = class {
    source;
    pos = 0;
    line = 1;
    column = 1;
    indentStack = [0];
    tokens = [];
    constructor(source) {
      this.source = source;
    }
    tokenize() {
      while (!this.isAtEnd()) {
        this.scanToken();
      }
      while (this.indentStack.length > 1) {
        this.indentStack.pop();
        this.addToken("DEDENT", "");
      }
      this.addToken("EOF", "");
      return this.tokens;
    }
    scanToken() {
      if (this.peek() === "\n") {
        this.advance();
        this.line++;
        this.column = 1;
        this.handleIndentation();
        return;
      }
      if (this.peek() === " " || this.peek() === "	") {
        this.advance();
        return;
      }
      if (this.peek() === "/" && this.peekNext() === "/") {
        this.skipComment();
        return;
      }
      if (this.peek() === "-" && this.peekNext() === "-") {
        this.scanSection();
        return;
      }
      if (this.peek() === "-" && this.isDigit(this.peekNext())) {
        this.scanNegativeNumber();
        return;
      }
      if (this.peek() === '"') {
        this.scanString();
        return;
      }
      if (this.isDigit(this.peek()) || this.peek() === "#") {
        this.scanNumber();
        return;
      }
      if (this.peek() === "$") {
        this.scanDollarIdentifier();
        return;
      }
      if (this.isAlpha(this.peek())) {
        this.scanIdentifier();
        return;
      }
      switch (this.peek()) {
        case ":":
          this.addToken("COLON", ":");
          this.advance();
          break;
        case ",":
          this.addToken("COMMA", ",");
          this.advance();
          break;
        case ";":
          this.addToken("SEMICOLON", ";");
          this.advance();
          break;
        case ".":
          this.addToken("DOT", ".");
          this.advance();
          break;
        case "?":
          this.addToken("QUESTION", "?");
          this.advance();
          break;
        case "(":
          this.addToken("LPAREN", "(");
          this.advance();
          break;
        case ")":
          this.addToken("RPAREN", ")");
          this.advance();
          break;
        case "=":
          this.advance();
          if (this.peek() === "=" && this.peekNext() === "=") {
            this.advance();
            this.advance();
            this.addToken("STRICT_EQUAL", "===");
          } else if (this.peek() === "=") {
            this.advance();
            this.addToken("EQUALS", "==");
          } else {
            this.addToken("EQUALS", "=");
          }
          break;
        case "&":
          this.advance();
          if (this.peek() === "&") {
            this.advance();
            this.addToken("AND_AND", "&&");
          }
          break;
        case "|":
          this.advance();
          if (this.peek() === "|") {
            this.advance();
            this.addToken("OR_OR", "||");
          }
          break;
        case ">":
          this.advance();
          if (this.peek() === "=") {
            this.advance();
            this.addToken("GTE", ">=");
          } else {
            this.addToken("GT", ">");
          }
          break;
        case "<":
          this.advance();
          if (this.peek() === "=") {
            this.advance();
            this.addToken("LTE", "<=");
          } else {
            this.addToken("LT", "<");
          }
          break;
        case "!":
          this.advance();
          if (this.peek() === "=" && this.peekNext() === "=") {
            this.advance();
            this.advance();
            this.addToken("STRICT_NOT_EQUAL", "!==");
          } else if (this.peek() === "=") {
            this.advance();
            this.addToken("NOT_EQUAL", "!=");
          } else {
            this.addToken("BANG", "!");
          }
          break;
        case "/":
          this.addToken("SLASH", "/");
          this.advance();
          break;
        default:
          this.advance();
      }
    }
    handleIndentation() {
      let indent = 0;
      while (this.peek() === " ") {
        indent++;
        this.advance();
      }
      while (this.peek() === "	") {
        indent += 4;
        this.advance();
      }
      if (this.peek() === "\n" || this.isAtEnd()) {
        return;
      }
      const currentIndent = this.indentStack[this.indentStack.length - 1];
      if (indent > currentIndent) {
        this.indentStack.push(indent);
        this.addToken("INDENT", "");
      } else if (indent < currentIndent) {
        while (this.indentStack.length > 1 && this.indentStack[this.indentStack.length - 1] > indent) {
          this.indentStack.pop();
          this.addToken("DEDENT", "");
        }
      }
      this.addToken("NEWLINE", "");
    }
    scanString() {
      this.advance();
      let value = "";
      while (!this.isAtEnd() && this.peek() !== '"') {
        if (this.peek() === "\\" && this.peekNext() === '"') {
          this.advance();
          value += '"';
        } else {
          value += this.peek();
        }
        this.advance();
      }
      this.advance();
      this.addToken("STRING", value);
    }
    scanNumber() {
      let value = "";
      if (this.peek() === "#") {
        value += this.advance();
        while (this.isHexDigit(this.peek())) {
          value += this.advance();
        }
        this.addToken("NUMBER", value);
        return;
      }
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
      if (this.peek() === "." && this.isDigit(this.peekNext())) {
        value += this.advance();
        while (this.isDigit(this.peek())) {
          value += this.advance();
        }
      }
      if (this.peek() === "%") {
        value += this.advance();
      }
      this.addToken("NUMBER", value);
    }
    scanNegativeNumber() {
      let value = this.advance();
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
      if (this.peek() === "." && this.isDigit(this.peekNext())) {
        value += this.advance();
        while (this.isDigit(this.peek())) {
          value += this.advance();
        }
      }
      this.addToken("NUMBER", value);
    }
    scanDollarIdentifier() {
      let value = this.advance();
      while (this.isAlphaNumeric(this.peek()) || this.peek() === "-" || this.peek() === ".") {
        value += this.advance();
      }
      this.addToken("IDENTIFIER", value);
    }
    scanIdentifier() {
      let value = "";
      while (this.isAlphaNumeric(this.peek()) || this.peek() === "-") {
        value += this.advance();
      }
      const keywords = {
        "as": "AS",
        "extends": "EXTENDS",
        "named": "NAMED",
        "each": "EACH",
        "in": "IN",
        "if": "IF",
        "else": "ELSE",
        "where": "WHERE",
        "data": "DATA",
        "keys": "KEYS",
        "and": "AND",
        "or": "OR",
        "not": "NOT",
        "then": "THEN",
        "selection": "SELECTION",
        "route": "ROUTE"
      };
      const type = keywords[value] || "IDENTIFIER";
      this.addToken(type, value);
    }
    scanSection() {
      while (this.peek() === "-") {
        this.advance();
      }
      while (this.peek() === " ") {
        this.advance();
      }
      let name = "";
      while (this.peek() !== "-" && this.peek() !== "\n" && !this.isAtEnd()) {
        name += this.advance();
      }
      while (this.peek() === "-" || this.peek() === " ") {
        this.advance();
      }
      this.addToken("SECTION", name.trim());
    }
    skipComment() {
      while (this.peek() !== "\n" && !this.isAtEnd()) {
        this.advance();
      }
    }
    addToken(type, value) {
      this.tokens.push({
        type,
        value,
        line: this.line,
        column: this.column
      });
    }
    peek() {
      return this.source[this.pos] || "\0";
    }
    peekNext() {
      return this.source[this.pos + 1] || "\0";
    }
    advance() {
      const char = this.source[this.pos];
      this.pos++;
      this.column++;
      return char;
    }
    isAtEnd() {
      return this.pos >= this.source.length;
    }
    isDigit(c) {
      return c >= "0" && c <= "9";
    }
    isHexDigit(c) {
      return this.isDigit(c) || c >= "a" && c <= "f" || c >= "A" && c <= "F";
    }
    isAlpha(c) {
      return c >= "a" && c <= "z" || c >= "A" && c <= "Z" || c === "_";
    }
    isAlphaNumeric(c) {
      return this.isAlpha(c) || this.isDigit(c);
    }
  };
  function tokenize(source) {
    return new Lexer(source).tokenize();
  }

  // src/parser/parser.ts
  var JS_KEYWORDS = /* @__PURE__ */ new Set(["let", "const", "var", "function", "class"]);
  var Parser = class {
    tokens;
    pos = 0;
    errors = [];
    source;
    constructor(tokens, source = "") {
      this.tokens = tokens;
      this.source = source;
    }
    parse() {
      const program = {
        type: "Program",
        line: 1,
        column: 1,
        tokens: [],
        components: [],
        instances: [],
        errors: []
      };
      while (!this.isAtEnd()) {
        this.skipNewlines();
        if (this.isAtEnd()) break;
        if (this.check("SECTION")) {
          this.advance();
          continue;
        }
        if (this.check("IDENTIFIER") && this.checkNext("COLON") && (this.checkAt(2, "NUMBER") || this.checkAt(2, "STRING"))) {
          const token = this.parseTokenDefinition();
          if (token) program.tokens.push(token);
          continue;
        }
        if (this.check("IDENTIFIER") && this.checkNext("COLON") && this.checkAt(2, "IDENTIFIER") && this.checkAt(3, "EQUALS")) {
          const token = this.parseLegacyTokenDefinition();
          if (token) program.tokens.push(token);
          continue;
        }
        if (this.check("EACH")) {
          const each = this.parseEach();
          if (each) program.instances.push(each);
          continue;
        }
        if (this.check("IF")) {
          const conditional = this.parseConditionalBlock();
          if (conditional) program.instances.push(conditional);
          continue;
        }
        if (this.check("IDENTIFIER") && this.isJavaScriptKeyword()) {
          const jsBlock = this.parseJavaScript();
          if (jsBlock) {
            program.javascript = jsBlock;
          }
          break;
        }
        if (this.check("IDENTIFIER")) {
          const node = this.parseComponentOrInstance();
          if (node) {
            if (node.type === "Component") {
              program.components.push(node);
            } else {
              program.instances.push(node);
            }
          }
          continue;
        }
        this.advance();
      }
      program.errors = this.errors;
      return program;
    }
    // Check if current identifier is a JavaScript keyword
    isJavaScriptKeyword() {
      const current = this.current();
      return current && JS_KEYWORDS.has(current.value);
    }
    // Parse JavaScript block (rest of file)
    parseJavaScript() {
      const startToken = this.current();
      if (!startToken || !this.source) return null;
      const lines = this.source.split("\n");
      let charPos = 0;
      for (let i = 0; i < startToken.line - 1; i++) {
        charPos += lines[i].length + 1;
      }
      const actualStartColumn = startToken.column - startToken.value.length;
      charPos += actualStartColumn - 1;
      const code = this.source.slice(charPos).trim();
      while (!this.isAtEnd()) {
        this.advance();
      }
      return {
        type: "JavaScript",
        code,
        line: startToken.line,
        column: startToken.column
      };
    }
    // New simplified syntax: name: value
    parseTokenDefinition() {
      const name = this.advance();
      this.advance();
      const value = this.advance();
      const tokenType = this.inferTokenType(value.value);
      return {
        type: "Token",
        name: name.value,
        tokenType,
        value: value.value,
        line: name.line,
        column: name.column
      };
    }
    // Legacy syntax: name: type = value (backwards compatible)
    parseLegacyTokenDefinition() {
      const name = this.advance();
      this.advance();
      const tokenType = this.advance();
      this.advance();
      const value = this.advance();
      return {
        type: "Token",
        name: name.value,
        tokenType: tokenType.value,
        value: value.value,
        line: name.line,
        column: name.column
      };
    }
    // Parse a route path (e.g., "Home", "admin/users", "pages/settings")
    // Combines identifiers separated by slashes into a single path string
    parseRoutePath() {
      if (!this.check("IDENTIFIER")) return null;
      let path = this.advance().value;
      while (this.check("SLASH") && this.checkNext("IDENTIFIER")) {
        this.advance();
        path += "/" + this.advance().value;
      }
      return path;
    }
    // Infer token type from value
    inferTokenType(value) {
      const str = String(value);
      if (str.startsWith("#")) {
        return "color";
      }
      if (/^\d+(%|px|rem|em)?$/.test(str)) {
        return "size";
      }
      if (typeof value === "string" && !str.startsWith("#") && !/^\d/.test(str)) {
        return "font";
      }
      return void 0;
    }
    parseComponentOrInstance() {
      const name = this.advance();
      if (this.check("AS")) {
        return this.parseComponentDefinition(name);
      }
      if (this.check("EXTENDS")) {
        return this.parseComponentInheritance(name);
      }
      if (this.check("COLON")) {
        return this.parseComponentDefinitionWithDefaultPrimitive(name);
      }
      return this.parseInstance(name);
    }
    parseComponentDefinition(name) {
      this.advance();
      const primitive = this.advance();
      if (!this.expect("COLON")) {
        this.errors[this.errors.length - 1].hint = `Add a colon after "${primitive.value}"`;
        this.recoverToNextDefinition();
        return null;
      }
      const component = {
        type: "Component",
        name: name.value,
        primitive: primitive.value,
        extends: null,
        properties: [],
        states: [],
        events: [],
        children: [],
        line: name.line,
        column: name.column
      };
      this.parseInlineProperties(component.properties);
      this.skipNewlines();
      if (this.check("INDENT")) {
        this.advance();
        this.parseComponentBody(component);
      }
      return component;
    }
    parseComponentInheritance(name) {
      this.advance();
      const parent = this.advance();
      if (!this.expect("COLON")) {
        this.errors[this.errors.length - 1].hint = `Add a colon after "${parent.value}"`;
        this.recoverToNextDefinition();
        return null;
      }
      const component = {
        type: "Component",
        name: name.value,
        primitive: null,
        extends: parent.value,
        properties: [],
        states: [],
        events: [],
        children: [],
        line: name.line,
        column: name.column
      };
      this.parseInlineProperties(component.properties);
      this.skipNewlines();
      if (this.check("INDENT")) {
        this.advance();
        this.parseComponentBody(component);
      }
      return component;
    }
    // Parse component definition without explicit primitive: Name:
    // Defaults to Frame as the base primitive
    parseComponentDefinitionWithDefaultPrimitive(name) {
      this.advance();
      const component = {
        type: "Component",
        name: name.value,
        primitive: "Frame",
        // Default primitive
        extends: null,
        properties: [],
        states: [],
        events: [],
        children: [],
        line: name.line,
        column: name.column
      };
      this.parseInlineProperties(component.properties);
      this.skipNewlines();
      if (this.check("INDENT")) {
        this.advance();
        this.parseComponentBody(component);
      }
      return component;
    }
    parseInstance(name) {
      const instance = {
        type: "Instance",
        component: name.value,
        name: null,
        properties: [],
        children: [],
        line: name.line,
        column: name.column
      };
      if (this.check("NAMED")) {
        this.advance();
        instance.name = this.advance().value;
      }
      if (this.hasChildOverrideSyntax()) {
        instance.childOverrides = this.parseChildOverridesFromStart();
      } else {
        this.parseInlineProperties(instance.properties);
      }
      const routeIndex = instance.properties.findIndex((p) => p.name === "_route");
      if (routeIndex !== -1) {
        const routeProp = instance.properties[routeIndex];
        instance.route = String(routeProp.values[0]);
        instance.properties.splice(routeIndex, 1);
      }
      this.skipNewlines();
      if (this.check("INDENT")) {
        this.advance();
        this.parseInstanceBody(instance);
      }
      return instance;
    }
    /**
     * Look ahead to check if the current line contains child override syntax (semicolons)
     */
    hasChildOverrideSyntax() {
      let ahead = 0;
      while (this.pos + ahead < this.tokens.length) {
        const token = this.tokens[this.pos + ahead];
        if (token.type === "NEWLINE" || token.type === "INDENT" || token.type === "EOF") {
          return false;
        }
        if (token.type === "SEMICOLON") {
          return true;
        }
        ahead++;
      }
      return false;
    }
    /**
     * Parse child overrides from the start of the line
     * Syntax: ChildName prop value; ChildName2 prop2 value2
     */
    parseChildOverridesFromStart() {
      const overrides = [];
      if (this.check("IDENTIFIER")) {
        const childName = this.advance();
        const properties2 = [];
        this.parseInlineProperties(properties2);
        overrides.push({
          childName: childName.value,
          properties: properties2
        });
      }
      while (this.check("SEMICOLON")) {
        this.advance();
        if (this.check("NEWLINE") || this.check("INDENT") || this.isAtEnd()) break;
        if (!this.check("IDENTIFIER")) break;
        const childName = this.advance();
        const properties2 = [];
        this.parseInlineProperties(properties2);
        overrides.push({
          childName: childName.value,
          properties: properties2
        });
      }
      return overrides;
    }
    parseComponentBody(component) {
      while (!this.check("DEDENT") && !this.isAtEnd()) {
        this.skipNewlines();
        if (this.check("DEDENT") || this.isAtEnd()) break;
        if (this.check("COMMA")) {
          this.advance();
          continue;
        }
        if (this.check("DATA")) {
          const dataToken = this.advance();
          const binding = this.parseDataBindingValues();
          if (binding) {
            const values = [binding.collection];
            if (binding.filter) {
              values.push({ filter: binding.filter });
            }
            component.properties.push({
              type: "Property",
              name: "data",
              values,
              line: dataToken.line,
              column: dataToken.column
            });
          }
          continue;
        }
        if (this.check("SELECTION")) {
          this.advance();
          if (this.check("IDENTIFIER")) {
            const varToken = this.advance();
            component.selection = varToken.value;
          }
          continue;
        }
        if (this.check("ROUTE")) {
          this.advance();
          const routePath = this.parseRoutePath();
          if (routePath) {
            component.route = routePath;
          }
          continue;
        }
        const initialStates = /* @__PURE__ */ new Set(["closed", "open", "collapsed", "expanded"]);
        const booleanProperties2 = /* @__PURE__ */ new Set([
          "horizontal",
          "hor",
          "vertical",
          "ver",
          "center",
          "cen",
          "spread",
          "wrap",
          "stacked",
          "hidden",
          "visible",
          "disabled",
          "scroll",
          "scroll-ver",
          "scroll-hor",
          "scroll-both",
          "clip",
          "truncate",
          "italic",
          "underline",
          "uppercase",
          "lowercase",
          "left",
          "right",
          "top",
          "bottom",
          "hor-center",
          "ver-center",
          "focusable"
          // Makes element focusable for keyboard events
        ]);
        const systemStates = /* @__PURE__ */ new Set(["hover", "focus", "active", "disabled", "filled"]);
        if (this.check("IDENTIFIER") && !this.checkNext("COLON") && !this.checkNext("AS")) {
          const name = this.current().value;
          if (systemStates.has(name)) {
            const savedPos = this.pos;
            const stateToken = this.advance();
            this.skipNewlines();
            if (this.check("INDENT")) {
              this.advance();
              const state = {
                type: "State",
                name: stateToken.value,
                properties: [],
                childOverrides: [],
                line: stateToken.line,
                column: stateToken.column
              };
              while (!this.check("DEDENT") && !this.isAtEnd()) {
                this.skipNewlines();
                if (this.check("DEDENT")) break;
                if (this.check("IDENTIFIER")) {
                  const token = this.current();
                  if (token && this.isUppercase(token.value)) {
                    const childOverride = this.parseStateChildOverride();
                    if (childOverride) state.childOverrides.push(childOverride);
                  } else {
                    const prop = this.parseProperty();
                    if (prop) state.properties.push(prop);
                  }
                } else {
                  this.advance();
                }
              }
              if (this.check("DEDENT")) this.advance();
              component.states.push(state);
              continue;
            } else {
              this.pos = savedPos;
            }
          }
          if (name === "state") {
            const savedPos = this.pos;
            this.advance();
            if (this.check("IDENTIFIER")) {
              const stateNameToken = this.advance();
              const state = {
                type: "State",
                name: stateNameToken.value,
                properties: [],
                childOverrides: [],
                line: stateNameToken.line,
                column: stateNameToken.column
              };
              if (this.check("IDENTIFIER") || this.check("NUMBER") || this.check("STRING")) {
                this.parseInlineProperties(state.properties);
              }
              this.skipNewlines();
              if (this.check("INDENT")) {
                this.advance();
                while (!this.check("DEDENT") && !this.isAtEnd()) {
                  this.skipNewlines();
                  if (this.check("DEDENT")) break;
                  if (this.check("IDENTIFIER")) {
                    const token = this.current();
                    if (token && this.isUppercase(token.value)) {
                      const childOverride = this.parseStateChildOverride();
                      if (childOverride) state.childOverrides.push(childOverride);
                    } else {
                      const prop = this.parseProperty();
                      if (prop) state.properties.push(prop);
                    }
                  } else {
                    this.advance();
                  }
                }
                if (this.check("DEDENT")) this.advance();
              }
              component.states.push(state);
              continue;
            } else {
              this.pos = savedPos;
            }
          }
          if (initialStates.has(name)) {
            const token = this.advance();
            component.initialState = token.value;
            continue;
          }
          if (booleanProperties2.has(name)) {
            const token = this.advance();
            component.properties.push({
              type: "Property",
              name: token.value,
              values: [true],
              line: token.line,
              column: token.column
            });
            continue;
          }
          const propertiesWithAnyValue = /* @__PURE__ */ new Set([
            "font",
            "cursor",
            "align",
            "weight"
          ]);
          const next = this.peekAt(1);
          if (next && (next.type === "NUMBER" || next.type === "STRING" || next.type === "IDENTIFIER" && !this.current().value.startsWith("on"))) {
            const isLikelyProperty = name[0] === name[0].toLowerCase() && (next.type === "NUMBER" || propertiesWithAnyValue.has(name) || next.type === "IDENTIFIER" && next.value[0] === next.value[0].toLowerCase());
            if (isLikelyProperty) {
              const prop = this.parseProperty();
              if (prop) component.properties.push(prop);
              continue;
            }
          }
        }
        if (this.check("IDENTIFIER") && this.checkNext("COLON")) {
          const name = this.current().value;
          const isLikelyState = name[0] === name[0].toLowerCase();
          if (isLikelyState) {
            const stateName = this.advance();
            this.advance();
            const state = {
              type: "State",
              name: stateName.value,
              properties: [],
              childOverrides: [],
              line: stateName.line,
              column: stateName.column
            };
            this.parseInlineProperties(state.properties);
            this.skipNewlines();
            if (this.check("INDENT")) {
              this.advance();
              while (!this.check("DEDENT") && !this.isAtEnd()) {
                this.skipNewlines();
                if (this.check("DEDENT")) break;
                if (this.check("IDENTIFIER")) {
                  const prop = this.parseProperty();
                  if (prop) state.properties.push(prop);
                } else {
                  this.advance();
                }
              }
              if (this.check("DEDENT")) this.advance();
            }
            component.states.push(state);
            continue;
          } else {
            const slotName = this.advance();
            this.advance();
            const slot = {
              type: "Instance",
              component: slotName.value,
              name: null,
              properties: [],
              children: [],
              line: slotName.line,
              column: slotName.column
            };
            this.parseInlineProperties(slot.properties);
            this.skipNewlines();
            if (this.check("INDENT")) {
              this.advance();
              this.parseInstanceBody(slot);
            }
            component.children.push(slot);
            continue;
          }
        }
        if (this.check("IDENTIFIER") && this.current().value.startsWith("on")) {
          const event = this.parseEvent();
          if (event) component.events.push(event);
          continue;
        }
        if (this.check("KEYS")) {
          this.parseKeysBlock(component.events);
          continue;
        }
        if (this.check("IF")) {
          this.advance();
          const condition = this.parseExpression();
          this.skipNewlines();
          const match = condition.match(/^\(?\s*(\w+)\s*\)?$/);
          const visibleWhen = match ? match[1] : condition;
          if (!this.check("INDENT")) {
            ;
            component.visibleWhen = visibleWhen;
            continue;
          }
          this.advance();
          while (!this.isAtEnd() && !this.check("DEDENT")) {
            this.skipNewlines();
            if (this.check("DEDENT") || this.isAtEnd()) break;
            if (this.check("IDENTIFIER") && this.checkNext("AS")) {
              const childName = this.advance();
              const child = this.parseComponentDefinition(childName);
              child.visibleWhen = visibleWhen;
              component.children.push(child);
              continue;
            }
            if (this.check("IDENTIFIER")) {
              const name = this.advance();
              const child = this.parseInstance(name);
              child.visibleWhen = visibleWhen;
              component.children.push(child);
              continue;
            }
            this.advance();
          }
          if (this.check("DEDENT")) this.advance();
          continue;
        }
        if (this.check("IDENTIFIER") && this.checkNext("AS")) {
          const childName = this.advance();
          const child = this.parseComponentDefinition(childName);
          component.children.push(child);
          continue;
        }
        if (this.check("IDENTIFIER")) {
          const name = this.advance();
          const child = this.parseInstance(name);
          component.children.push(child);
          continue;
        }
        this.advance();
      }
      if (this.check("DEDENT")) this.advance();
    }
    parseInstanceBody(instance) {
      const booleanProperties2 = /* @__PURE__ */ new Set([
        "focusable",
        "hidden",
        "visible",
        "disabled",
        "clip",
        "scroll"
      ]);
      const initialStates = /* @__PURE__ */ new Set(["closed", "open", "collapsed", "expanded"]);
      while (!this.check("DEDENT") && !this.isAtEnd()) {
        this.skipNewlines();
        if (this.check("DEDENT") || this.isAtEnd()) break;
        if (this.check("IF")) {
          this.advance();
          const condition = this.parseExpression();
          this.skipNewlines();
          const match = condition.match(/^\(?\s*(\w+)\s*\)?$/);
          const visibleWhen = match ? match[1] : condition;
          if (!this.check("INDENT")) {
            instance.visibleWhen = visibleWhen;
            continue;
          }
          this.advance();
          while (!this.isAtEnd() && !this.check("DEDENT")) {
            this.skipNewlines();
            if (this.check("DEDENT") || this.isAtEnd()) break;
            if (this.check("IDENTIFIER")) {
              const name = this.advance();
              const child = this.parseInstance(name);
              child.visibleWhen = visibleWhen;
              if (!instance.children) instance.children = [];
              instance.children.push(child);
              continue;
            }
            this.advance();
          }
          if (this.check("DEDENT")) this.advance();
          continue;
        }
        if (this.check("SELECTION")) {
          this.advance();
          if (this.check("IDENTIFIER")) {
            const varToken = this.advance();
            instance.selection = varToken.value;
          }
          continue;
        }
        if (this.check("ROUTE")) {
          this.advance();
          const routePath = this.parseRoutePath();
          if (routePath) {
            instance.route = routePath;
          }
          continue;
        }
        if (this.check("KEYS")) {
          this.advance();
          this.skipNewlines();
          if (this.check("INDENT")) {
            this.advance();
            while (!this.check("DEDENT") && !this.isAtEnd()) {
              this.skipNewlines();
              if (this.check("DEDENT")) break;
              this.advance();
            }
            if (this.check("DEDENT")) this.advance();
          }
          continue;
        }
        if (this.check("IDENTIFIER")) {
          const name = this.current().value;
          if (initialStates.has(name)) {
            const token = this.advance();
            instance.initialState = token.value;
            continue;
          }
          if (booleanProperties2.has(name)) {
            const token = this.advance();
            instance.properties.push({
              type: "Property",
              name: token.value,
              values: [true],
              line: token.line,
              column: token.column
            });
            continue;
          }
          const child = this.parseInstance(this.advance());
          instance.children.push(child);
          continue;
        }
        this.advance();
      }
      if (this.check("DEDENT")) this.advance();
    }
    parseInlineProperties(properties2) {
      while (!this.check("NEWLINE") && !this.check("INDENT") && !this.check("DEDENT") && !this.check("SEMICOLON") && !this.isAtEnd()) {
        if (this.check("COMMA")) {
          this.advance();
          continue;
        }
        if (this.check("STRING")) {
          const str = this.advance();
          properties2.push({
            type: "Property",
            name: "content",
            values: [str.value],
            line: str.line,
            column: str.column
          });
          continue;
        }
        if (this.check("DATA")) {
          const dataToken = this.advance();
          const binding = this.parseDataBindingValues();
          if (binding) {
            const values = [binding.collection];
            if (binding.filter) {
              values.push({ filter: binding.filter });
            }
            properties2.push({
              type: "Property",
              name: "data",
              values,
              line: dataToken.line,
              column: dataToken.column
            });
          }
          continue;
        }
        if (this.check("ROUTE")) {
          const routeToken = this.advance();
          const routePath = this.parseRoutePath();
          if (routePath) {
            properties2.push({
              type: "Property",
              name: "_route",
              // Special prefix to identify route properties
              values: [routePath],
              line: routeToken.line,
              column: routeToken.column
            });
          }
          continue;
        }
        if (this.check("IDENTIFIER")) {
          const prop = this.parseProperty();
          if (prop) properties2.push(prop);
          continue;
        }
        if (this.check("NUMBER")) {
          this.advance();
          continue;
        }
        this.advance();
      }
    }
    parseDataBindingValues() {
      if (!this.check("IDENTIFIER")) return null;
      const collection = this.advance().value;
      let filter;
      if (this.check("WHERE")) {
        this.advance();
        filter = this.parseExpression();
      }
      return { collection, filter };
    }
    parseProperty() {
      if (!this.check("IDENTIFIER")) return null;
      const name = this.advance();
      const values = [];
      const collectedTokens = [];
      while (!this.check("COMMA") && !this.check("NEWLINE") && !this.check("INDENT") && !this.check("DEDENT") && !this.isAtEnd()) {
        if (this.check("QUESTION")) {
          this.advance();
          let condition = "";
          const startsWithDot = collectedTokens.length > 0 && collectedTokens[0].type === "DOT";
          if (startsWithDot) {
            condition = name.value;
          }
          for (let j = 0; j < collectedTokens.length; j++) {
            const t = collectedTokens[j];
            if (t.type === "DOT") {
              condition += ".";
            } else if (j > 0 && collectedTokens[j - 1].type !== "DOT" && t.type !== "DOT") {
              condition += " " + t.value;
            } else if (condition && !condition.endsWith(".")) {
              condition += " " + t.value;
            } else {
              condition += t.value;
            }
          }
          let thenValue = "";
          if (this.check("STRING")) {
            thenValue = this.advance().value;
          } else if (this.check("NUMBER")) {
            thenValue = this.advance().value;
          } else if (this.check("IDENTIFIER")) {
            thenValue = this.advance().value;
          }
          let elseValue = "";
          if (this.check("COLON")) {
            this.advance();
            if (this.check("STRING")) {
              elseValue = this.advance().value;
            } else if (this.check("NUMBER")) {
              elseValue = this.advance().value;
            } else if (this.check("IDENTIFIER")) {
              elseValue = this.advance().value;
            }
          }
          values.push({
            kind: "conditional",
            condition,
            then: thenValue,
            else: elseValue
          });
          const propertyName = startsWithDot ? "content" : name.value;
          return {
            type: "Property",
            name: propertyName,
            values,
            line: name.line,
            column: name.column
          };
        }
        if (this.check("STRICT_EQUAL") || this.check("STRICT_NOT_EQUAL") || this.check("NOT_EQUAL") || this.check("GT") || this.check("LT") || this.check("GTE") || this.check("LTE") || this.check("AND_AND") || this.check("OR_OR") || this.check("BANG") || this.check("DOT")) {
          collectedTokens.push({ type: this.current().type, value: this.advance().value });
        } else if (this.check("NUMBER")) {
          collectedTokens.push({ type: "NUMBER", value: this.advance().value });
        } else if (this.check("STRING")) {
          collectedTokens.push({ type: "STRING", value: `"${this.advance().value}"` });
        } else if (this.check("IDENTIFIER")) {
          collectedTokens.push({ type: "IDENTIFIER", value: this.advance().value });
        } else {
          break;
        }
      }
      let i = 0;
      while (i < collectedTokens.length) {
        const token = collectedTokens[i];
        if (token.type === "IDENTIFIER") {
          let combined = token.value;
          while (i + 2 < collectedTokens.length && collectedTokens[i + 1].type === "DOT" && collectedTokens[i + 2].type === "IDENTIFIER") {
            combined += "." + collectedTokens[i + 2].value;
            i += 2;
          }
          if (combined.startsWith("$")) {
            values.push({ kind: "token", name: combined.slice(1) });
          } else {
            values.push(combined);
          }
        } else if (token.type === "STRING") {
          values.push(token.value.replace(/^"|"$/g, ""));
        } else if (token.type !== "DOT") {
          values.push(token.value);
        }
        i++;
      }
      return {
        type: "Property",
        name: name.value,
        values,
        line: name.line,
        column: name.column
      };
    }
    parseEvent() {
      const eventToken = this.advance();
      const eventName = eventToken.value;
      const event = {
        type: "Event",
        name: eventName,
        actions: [],
        line: eventToken.line,
        column: eventToken.column
      };
      if (this.check("IDENTIFIER")) {
        const next = this.current();
        if (this.checkNext("COLON")) {
          event.key = next.value;
          this.advance();
          this.advance();
        }
      }
      if (this.check("IDENTIFIER")) {
        const mod = this.current().value;
        if (mod === "debounce" || mod === "delay") {
          this.advance();
          const time = this.advance();
          event.modifiers = [{ type: mod, value: parseInt(time.value) }];
          if (this.check("COLON")) {
            this.advance();
          }
        }
      }
      while (!this.check("NEWLINE") && !this.check("COMMA") && !this.isAtEnd()) {
        if (this.check("IDENTIFIER")) {
          const action = this.parseAction();
          if (action) event.actions.push(action);
        } else {
          break;
        }
      }
      return event;
    }
    parseAction() {
      const actionToken = this.advance();
      const action = {
        type: "Action",
        name: actionToken.value,
        line: actionToken.line,
        column: actionToken.column
      };
      if (this.check("IDENTIFIER") && !this.checkNext("COLON")) {
        action.target = this.advance().value;
      }
      return action;
    }
    parseKeysBlock(events) {
      this.advance();
      this.skipNewlines();
      if (!this.check("INDENT")) return;
      this.advance();
      while (!this.check("DEDENT") && !this.isAtEnd()) {
        this.skipNewlines();
        if (this.check("DEDENT")) break;
        if (this.check("IDENTIFIER")) {
          const key = this.advance();
          const actions = [];
          if (this.check("COLON")) {
            this.advance();
          }
          while (!this.check("NEWLINE") && !this.check("DEDENT") && !this.isAtEnd()) {
            if (this.check("IDENTIFIER")) {
              const action = this.parseAction();
              if (action) actions.push(action);
            } else if (this.check("COMMA")) {
              this.advance();
            } else {
              break;
            }
          }
          events.push({
            type: "Event",
            name: "onkeydown",
            key: key.value,
            actions,
            line: key.line,
            column: key.column
          });
        } else {
          this.advance();
        }
      }
      if (this.check("DEDENT")) this.advance();
    }
    // ============================================================================
    // EACH LOOP PARSING
    // ============================================================================
    parseEach() {
      const eachToken = this.advance();
      if (!this.check("IDENTIFIER")) return null;
      const item = this.advance().value;
      if (!this.check("IN")) return null;
      this.advance();
      if (!this.check("IDENTIFIER")) return null;
      const collection = this.advance().value;
      const each = {
        type: "Each",
        item,
        collection,
        children: [],
        line: eachToken.line,
        column: eachToken.column
      };
      if (this.check("WHERE")) {
        this.advance();
        each.filter = this.parseExpression();
      }
      this.skipNewlines();
      if (this.check("INDENT")) {
        this.advance();
        while (!this.check("DEDENT") && !this.isAtEnd()) {
          this.skipNewlines();
          if (this.check("DEDENT")) break;
          if (this.check("IDENTIFIER")) {
            const child = this.parseInstance(this.advance());
            each.children.push(child);
          } else if (this.check("EACH")) {
            const nestedEach = this.parseEach();
            if (nestedEach) each.children.push(nestedEach);
          } else if (this.check("IF")) {
            const conditional = this.parseConditionalBlock();
            if (conditional) each.children.push(conditional);
          } else {
            this.advance();
          }
        }
        if (this.check("DEDENT")) this.advance();
      }
      return each;
    }
    // ============================================================================
    // CONDITIONAL PARSING
    // ============================================================================
    parseConditionalBlock() {
      const ifToken = this.advance();
      const condition = this.parseExpression();
      const conditional = {
        type: "Conditional",
        condition,
        then: [],
        else: [],
        line: ifToken.line,
        column: ifToken.column
      };
      this.skipNewlines();
      if (this.check("INDENT")) {
        this.advance();
        while (!this.check("DEDENT") && !this.check("ELSE") && !this.isAtEnd()) {
          this.skipNewlines();
          if (this.check("DEDENT") || this.check("ELSE")) break;
          if (this.check("IDENTIFIER")) {
            const child = this.parseInstance(this.advance());
            conditional.then.push(child);
          } else if (this.check("EACH")) {
            const each = this.parseEach();
            if (each) conditional.then.push(each);
          } else if (this.check("IF")) {
            const nested = this.parseConditionalBlock();
            if (nested) conditional.then.push(nested);
          } else {
            this.advance();
          }
        }
        if (this.check("DEDENT")) this.advance();
      }
      this.skipNewlines();
      if (this.check("ELSE")) {
        this.advance();
        this.skipNewlines();
        if (this.check("INDENT")) {
          this.advance();
          while (!this.check("DEDENT") && !this.isAtEnd()) {
            this.skipNewlines();
            if (this.check("DEDENT")) break;
            if (this.check("IDENTIFIER")) {
              const child = this.parseInstance(this.advance());
              conditional.else.push(child);
            } else if (this.check("EACH")) {
              const each = this.parseEach();
              if (each) conditional.else.push(each);
            } else if (this.check("IF")) {
              const nested = this.parseConditionalBlock();
              if (nested) conditional.else.push(nested);
            } else {
              this.advance();
            }
          }
          if (this.check("DEDENT")) this.advance();
        }
      }
      return conditional;
    }
    parseExpression() {
      let expr = "";
      let parenDepth = 0;
      while (!this.isAtEnd()) {
        if (this.check("LPAREN")) {
          parenDepth++;
          if (expr && !expr.endsWith("(") && !expr.endsWith(".") && !expr.endsWith(" ")) {
            expr += " ";
          }
          expr += "(";
          this.advance();
          continue;
        }
        if (this.check("RPAREN")) {
          if (parenDepth > 0) {
            parenDepth--;
            expr += ")";
            this.advance();
            continue;
          }
          break;
        }
        if (parenDepth === 0 && (this.check("NEWLINE") || this.check("INDENT") || this.check("DEDENT"))) {
          break;
        }
        if (this.check("THEN")) {
          break;
        }
        const token = this.advance();
        if (token.type === "DOT") {
          expr += ".";
          continue;
        }
        if (token.type === "BANG") {
          if (expr && !expr.endsWith("(") && !expr.endsWith(" ")) {
            expr += " ";
          }
          expr += "!";
          continue;
        }
        if (token.type === "STRING") {
          if (expr && !expr.endsWith("(") && !expr.endsWith("!") && !expr.endsWith(".")) {
            expr += " ";
          }
          expr += `"${token.value}"`;
        } else {
          if (expr && !expr.endsWith("(") && !expr.endsWith("!") && !expr.endsWith(".") && !expr.endsWith(" ")) {
            expr += " ";
          }
          expr += token.value;
        }
      }
      return expr.trim();
    }
    // ============================================================================
    // DATA BINDING PARSING
    // ============================================================================
    parseDataBinding() {
      this.advance();
      if (!this.check("IDENTIFIER")) return null;
      const collection = this.advance().value;
      let filter;
      if (this.check("WHERE")) {
        this.advance();
        filter = this.parseExpression();
      }
      return { collection, filter };
    }
    // Helpers
    skipNewlines() {
      while (this.check("NEWLINE")) {
        this.advance();
      }
    }
    current() {
      return this.tokens[this.pos];
    }
    check(type) {
      if (this.isAtEnd()) return false;
      return this.current().type === type;
    }
    checkNext(type) {
      if (this.pos + 1 >= this.tokens.length) return false;
      return this.tokens[this.pos + 1].type === type;
    }
    checkAt(offset, type) {
      if (this.pos + offset >= this.tokens.length) return false;
      return this.tokens[this.pos + offset].type === type;
    }
    peekAt(offset) {
      if (this.pos + offset >= this.tokens.length) return null;
      return this.tokens[this.pos + offset];
    }
    advance() {
      if (!this.isAtEnd()) this.pos++;
      return this.tokens[this.pos - 1];
    }
    expect(type) {
      if (this.check(type)) return this.advance();
      this.addError(`Expected ${type} but got ${this.current()?.type}`);
      return null;
    }
    addError(message, hint) {
      const token = this.current();
      this.errors.push({
        message,
        line: token?.line ?? 0,
        column: token?.column ?? 0,
        hint
      });
    }
    recoverToNextDefinition() {
      while (!this.isAtEnd()) {
        if (this.check("NEWLINE")) {
          this.advance();
          const next = this.current();
          if (next && (next.type === "IDENTIFIER" || next.type === "EACH" || next.type === "IF")) {
            return;
          }
        } else {
          this.advance();
        }
      }
    }
    isAtEnd() {
      return this.current()?.type === "EOF";
    }
    /**
     * Check if a string starts with an uppercase letter (component name convention)
     */
    isUppercase(str) {
      if (!str || str.length === 0) return false;
      const firstChar = str.charAt(0);
      return firstChar >= "A" && firstChar <= "Z";
    }
    /**
     * Parse a child override within a state block
     * Syntax: ChildName property value
     */
    parseStateChildOverride() {
      if (!this.check("IDENTIFIER")) return null;
      const childName = this.advance();
      const properties2 = [];
      this.parseInlineProperties(properties2);
      return {
        childName: childName.value,
        properties: properties2
      };
    }
  };
  function parse(source) {
    const tokens = tokenize(source);
    return new Parser(tokens, source).parse();
  }

  // src/studio/source-map.ts
  var SourceMap = class {
    nodes = /* @__PURE__ */ new Map();
    /**
     * Add a node mapping
     */
    addNode(mapping) {
      this.nodes.set(mapping.nodeId, mapping);
    }
    /**
     * Get node mapping by ID
     * Supports template instance IDs like "node-5[2]" by falling back to template ID "node-5"
     */
    getNodeById(id) {
      const direct = this.nodes.get(id);
      if (direct) return direct;
      const templateId = this.getTemplateId(id);
      if (templateId && templateId !== id) {
        return this.nodes.get(templateId) || null;
      }
      return null;
    }
    /**
     * Extract template ID from instance ID
     * e.g., "node-5[2]" -> "node-5"
     */
    getTemplateId(nodeId) {
      const match = nodeId.match(/^(.+)\[\d+\]$/);
      return match ? match[1] : nodeId;
    }
    /**
     * Check if a node ID is a template instance
     * e.g., "node-5[2]" -> true, "node-5" -> false
     */
    isTemplateInstance(nodeId) {
      return /\[\d+\]$/.test(nodeId);
    }
    /**
     * Get property position for a specific node and property
     */
    getPropertyPosition(nodeId, propName) {
      const node = this.nodes.get(nodeId);
      if (!node) return null;
      return node.properties.get(propName) || null;
    }
    /**
     * Get all node IDs
     */
    getAllNodeIds() {
      return Array.from(this.nodes.keys());
    }
    /**
     * Get nodes by component name
     */
    getNodesByComponent(componentName) {
      return Array.from(this.nodes.values()).filter((n) => n.componentName === componentName);
    }
    /**
     * Get node by instance name
     */
    getNodeByInstanceName(instanceName) {
      for (const node of this.nodes.values()) {
        if (node.instanceName === instanceName) {
          return node;
        }
      }
      return null;
    }
    /**
     * Check if a node is a template (each loop or conditional)
     */
    isTemplate(nodeId) {
      const node = this.nodes.get(nodeId);
      return node?.isEachTemplate || node?.isConditional || false;
    }
    /**
     * Get children of a node
     */
    getChildren(parentId) {
      return Array.from(this.nodes.values()).filter((n) => n.parentId === parentId);
    }
    /**
     * Find the node that contains a specific line (for editor cursor sync)
     * Returns the most specific (deepest/smallest range) node at that line
     * Skips definition nodes to prefer instances
     */
    getNodeAtLine(line) {
      let bestMatch = null;
      let bestSpecificity = Infinity;
      for (const node of this.nodes.values()) {
        if (node.isDefinition) continue;
        const startLine = node.position.line;
        const endLine = node.position.endLine;
        if (line >= startLine && line <= endLine) {
          const specificity = endLine - startLine;
          if (specificity < bestSpecificity) {
            bestMatch = node;
            bestSpecificity = specificity;
          }
        }
      }
      return bestMatch;
    }
    /**
     * Get all nodes that start at a specific line
     * Useful for finding exact matches when cursor is on component line
     */
    getNodesStartingAtLine(line) {
      return Array.from(this.nodes.values()).filter((n) => n.position.line === line && !n.isDefinition);
    }
    /**
     * Clear all mappings
     */
    clear() {
      this.nodes.clear();
    }
    /**
     * Get size
     */
    get size() {
      return this.nodes.size;
    }
  };
  var SourceMapBuilder = class {
    sourceMap = new SourceMap();
    /**
     * Add a node with its source position
     */
    addNode(nodeId, componentName, position, options = {}) {
      this.sourceMap.addNode({
        nodeId,
        componentName,
        position,
        properties: /* @__PURE__ */ new Map(),
        instanceName: options.instanceName,
        isDefinition: options.isDefinition || false,
        isEachTemplate: options.isEachTemplate,
        isConditional: options.isConditional,
        parentId: options.parentId
      });
    }
    /**
     * Add property source position to an existing node
     */
    addPropertyPosition(nodeId, propName, position) {
      const node = this.sourceMap.getNodeById(nodeId);
      if (node) {
        node.properties.set(propName, position);
      }
    }
    /**
     * Build and return the SourceMap
     */
    build() {
      return this.sourceMap;
    }
    /**
     * Get the current map (for intermediate access)
     */
    getMap() {
      return this.sourceMap;
    }
  };
  function calculateSourcePosition(line, column, content) {
    if (!content) {
      return {
        line,
        column,
        endLine: line,
        endColumn: column + 1
      };
    }
    const lines = content.split("\n");
    const endLine = line + lines.length - 1;
    const endColumn = lines.length === 1 ? column + content.length : lines[lines.length - 1].length;
    return {
      line,
      column,
      endLine,
      endColumn
    };
  }
  function calculatePropertyPosition(sourceLine, lineNumber, propName, propValue) {
    const patterns = [
      new RegExp(`\\b${propName}\\s+([^,\\s]+(?:\\s+[^,\\s]+)*)`, "i"),
      new RegExp(`\\b${propName}\\b`, "i")
    ];
    for (const pattern of patterns) {
      const match = sourceLine.match(pattern);
      if (match && match.index !== void 0) {
        const startColumn = match.index + 1;
        const fullMatch = match[0];
        return {
          line: lineNumber,
          column: startColumn,
          endLine: lineNumber,
          endColumn: startColumn + fullMatch.length
        };
      }
    }
    return null;
  }

  // src/ir/index.ts
  function toIR(ast, includeSourceMap) {
    const transformer = new IRTransformer(ast, includeSourceMap || false);
    const ir = transformer.transform();
    if (includeSourceMap) {
      return {
        ir,
        sourceMap: transformer.getSourceMap()
      };
    }
    return ir;
  }
  var ALIGNMENT_PROPERTIES = /* @__PURE__ */ new Set([
    "left",
    "right",
    "top",
    "bottom",
    "hor-center",
    "ver-center",
    "center",
    "cen",
    "spread"
  ]);
  var DIRECTION_PROPERTIES = /* @__PURE__ */ new Set([
    "horizontal",
    "hor",
    "vertical",
    "ver"
  ]);
  var IRTransformer = class {
    ast;
    componentMap = /* @__PURE__ */ new Map();
    tokenSet = /* @__PURE__ */ new Set();
    nodeIdCounter = 0;
    includeSourceMap;
    sourceMapBuilder;
    constructor(ast, includeSourceMap = false) {
      this.ast = ast;
      this.includeSourceMap = includeSourceMap;
      this.sourceMapBuilder = new SourceMapBuilder();
      for (const comp of ast.components) {
        this.registerComponent(comp);
      }
      for (const token of ast.tokens) {
        this.tokenSet.add(token.name);
      }
    }
    /**
     * Get the built source map
     */
    getSourceMap() {
      return this.sourceMapBuilder.build();
    }
    /**
     * Recursively register a component and all its nested component definitions
     */
    registerComponent(comp) {
      this.componentMap.set(comp.name, comp);
      for (const child of comp.children) {
        if (child.type === "Component") {
          this.registerComponent(child);
        }
      }
    }
    transform() {
      const tokens = this.ast.tokens.map((t) => ({
        name: t.name,
        type: t.tokenType,
        value: t.value
      }));
      const nodes = this.ast.instances.map((inst) => this.transformInstance(inst));
      return { nodes, tokens };
    }
    generateId() {
      return `node-${++this.nodeIdCounter}`;
    }
    transformInstance(instance, parentId, isEachTemplate, isConditional) {
      if (instance.type === "Each") {
        return this.transformEach(instance);
      }
      if (instance.type === "Conditional") {
        return this.transformConditional(instance);
      }
      const component = this.componentMap.get(instance.component);
      const resolvedComponent = component ? this.resolveComponent(component) : null;
      const tag = this.getTag(instance.component, resolvedComponent);
      const properties2 = this.mergeProperties(
        resolvedComponent?.properties || [],
        instance.properties
      );
      const primitive = resolvedComponent?.primitive || instance.component.toLowerCase();
      const styles = this.transformProperties(properties2, primitive);
      const stateStyles = resolvedComponent?.states ? this.transformStates(resolvedComponent.states) : [];
      const events = resolvedComponent?.events ? this.transformEvents(resolvedComponent.events) : [];
      const { inlineStateStyles, inlineEvents, remainingChildren } = this.extractInlineStatesAndEvents(instance.children || []);
      const childOverrideInstances = this.childOverridesToInstances(instance.childOverrides || []);
      const children = this.resolveChildren(
        resolvedComponent?.children || [],
        [...remainingChildren, ...childOverrideInstances]
      );
      const visibleWhen = instance.visibleWhen || resolvedComponent?.visibleWhen;
      const initialState = instance.initialState || resolvedComponent?.initialState;
      const selection = instance.selection || resolvedComponent?.selection;
      const route = instance.route || resolvedComponent?.route;
      const nodeId = this.generateId();
      if (route) {
        events.push({
          name: "click",
          actions: [{ type: "navigate", target: route }]
        });
      }
      let sourcePosition;
      let propertySourceMaps;
      if (this.includeSourceMap) {
        sourcePosition = calculateSourcePosition(instance.line, instance.column);
        propertySourceMaps = [];
        for (const prop of instance.properties) {
          const propPosition = calculateSourcePosition(prop.line, prop.column);
          propertySourceMaps.push({
            name: prop.name,
            position: propPosition
          });
        }
        this.sourceMapBuilder.addNode(
          nodeId,
          instance.component,
          sourcePosition,
          {
            instanceName: instance.name || void 0,
            isDefinition: false,
            isEachTemplate,
            isConditional,
            parentId
          }
        );
        for (const propMap of propertySourceMaps) {
          this.sourceMapBuilder.addPropertyPosition(nodeId, propMap.name, propMap.position);
        }
      }
      if (resolvedComponent?.states) {
        this.applyStateChildOverrides(children, resolvedComponent.states);
      }
      return {
        id: nodeId,
        tag,
        primitive,
        name: instance.component,
        instanceName: instance.name || void 0,
        properties: this.extractHTMLProperties(properties2),
        styles: [...styles, ...stateStyles, ...inlineStateStyles],
        events: [...events, ...inlineEvents],
        children,
        visibleWhen,
        initialState,
        selection,
        route,
        sourcePosition,
        propertySourceMaps
      };
    }
    transformEach(each) {
      const nodeId = this.generateId();
      const eachData = {
        id: nodeId,
        itemVar: each.item,
        collection: each.collection,
        filter: each.filter,
        template: each.children.map((child) => this.transformInstance(child, nodeId, true))
      };
      let sourcePosition;
      if (this.includeSourceMap) {
        sourcePosition = calculateSourcePosition(each.line, each.column);
        this.sourceMapBuilder.addNode(
          nodeId,
          "Each",
          sourcePosition,
          { isDefinition: false, isEachTemplate: true }
        );
      }
      return {
        id: nodeId,
        tag: "div",
        name: "Each",
        properties: [],
        styles: [],
        events: [],
        children: [],
        each: eachData,
        sourcePosition
      };
    }
    transformConditional(cond) {
      const nodeId = this.generateId();
      const conditionalData = {
        id: nodeId,
        condition: cond.condition,
        then: cond.then.map((child) => this.transformInstance(child, nodeId, false, true)),
        else: cond.else?.length > 0 ? cond.else.map((child) => this.transformInstance(child, nodeId, false, true)) : void 0
      };
      let sourcePosition;
      if (this.includeSourceMap) {
        sourcePosition = calculateSourcePosition(cond.line, cond.column);
        this.sourceMapBuilder.addNode(
          nodeId,
          "Conditional",
          sourcePosition,
          { isDefinition: false, isConditional: true }
        );
      }
      return {
        id: nodeId,
        tag: "div",
        name: "Conditional",
        properties: [],
        styles: [],
        events: [],
        children: [],
        conditional: conditionalData,
        sourcePosition
      };
    }
    /**
     * Resolve children with slot filling
     *
     * Component slots (Title:, Content:) can be filled by instance children.
     * If instance provides a child matching the slot name, it replaces the slot.
     * Otherwise, the slot's default content is used (or empty if none).
     */
    resolveChildren(componentChildren, instanceChildren) {
      const slotFillers = /* @__PURE__ */ new Map();
      const nonSlotChildren = [];
      for (const child of instanceChildren) {
        const childType = child.type;
        if (childType === "Instance") {
          const instance = child;
          if (!slotFillers.has(instance.component)) {
            slotFillers.set(instance.component, []);
          }
          slotFillers.get(instance.component).push(instance);
        } else if (childType === "Component") {
          continue;
        } else {
          nonSlotChildren.push(child);
        }
      }
      const result = [];
      const templateNames = /* @__PURE__ */ new Set();
      for (const child of componentChildren) {
        const childType = child.type;
        if (childType === "Instance") {
          const inst = child;
          templateNames.add(inst.component);
        }
      }
      if (componentChildren.length > 0) {
        for (const slot of componentChildren) {
          const slotType = slot.type;
          if (slotType === "Instance" || slotType === "Component") {
            const slotDef = slot;
            const slotName = slotDef.component || slotDef.name;
            if (slotType === "Component" && templateNames.has(slotName)) {
              continue;
            }
            const slotVisibleWhen = slotDef.visibleWhen;
            const slotInitialState = slotDef.initialState;
            const fillers = slotFillers.get(slotName);
            if (fillers && fillers.length > 0) {
              for (const filler of fillers) {
                const node = this.transformChild(filler);
                if (slotVisibleWhen && !node.visibleWhen) {
                  node.visibleWhen = slotVisibleWhen;
                }
                if (slotInitialState && !node.initialState) {
                  node.initialState = slotInitialState;
                }
                result.push(node);
              }
              slotFillers.delete(slotName);
            } else {
              if (slotType === "Component") {
                const compSlot = slot;
                const pseudoInstance = {
                  type: "Instance",
                  component: compSlot.name,
                  name: null,
                  properties: compSlot.properties,
                  // Don't pass children here - they come from the component definition
                  // via resolveChildren's componentChildren parameter
                  children: [],
                  line: compSlot.line,
                  column: compSlot.column
                };
                pseudoInstance.visibleWhen = slotVisibleWhen;
                pseudoInstance.initialState = slotInitialState;
                result.push(this.transformInstance(pseudoInstance));
              } else {
                result.push(this.transformInstance(slot));
              }
            }
          } else if (slot.type === "Slot") {
            const slotObj = slot;
            const fillers = slotFillers.get(slotObj.name);
            if (fillers && fillers.length > 0) {
              for (const filler of fillers) {
                result.push(this.transformChild(filler));
              }
              slotFillers.delete(slotObj.name);
            }
          }
        }
      }
      for (const [_name, fillers] of slotFillers) {
        for (const filler of fillers) {
          result.push(this.transformChild(filler));
        }
      }
      for (const child of nonSlotChildren) {
        result.push(this.transformChild(child));
      }
      return result;
    }
    /**
     * Convert childOverrides to Instance objects for slot filling
     *
     * childOverrides syntax: NavItem Icon "home"; Label "Home"
     * Each override becomes a pseudo-Instance that fills the corresponding slot
     */
    childOverridesToInstances(overrides) {
      return overrides.map((override) => ({
        type: "Instance",
        component: override.childName,
        name: null,
        properties: override.properties,
        children: [],
        line: override.properties[0]?.line || 0,
        column: override.properties[0]?.column || 0
      }));
    }
    transformChild(child) {
      if (child.type === "Text" || child.content !== void 0) {
        const text = child;
        return {
          id: this.generateId(),
          tag: "span",
          name: "Text",
          properties: [{ name: "textContent", value: text.content }],
          styles: [],
          events: [],
          children: []
        };
      }
      return this.transformInstance(child);
    }
    /**
     * Extract inline states and events from instance children.
     *
     * The parser treats inline constructs like:
     * - `state hover bg #333` as a child Instance with component="state"
     * - `onclick toggle` as a child Instance with component="onclick"
     *
     * This method identifies and extracts them, returning:
     * - inlineStateStyles: IRStyle[] with state attribute
     * - inlineEvents: IREvent[]
     * - remainingChildren: actual UI children
     */
    extractInlineStatesAndEvents(children) {
      const inlineStateStyles = [];
      const inlineEvents = [];
      const remainingChildren = [];
      for (const child of children) {
        if (child.type !== "Instance") {
          remainingChildren.push(child);
          continue;
        }
        const inst = child;
        const component = inst.component.toLowerCase();
        if (component === "state") {
          const props = inst.properties;
          if (props.length > 0) {
            const stateNameProp = props[0];
            const stateName = stateNameProp.name;
            const stateProps = props.slice(1);
            for (const prop of stateProps) {
              const cssStyles = this.propertyToCSS(prop);
              for (const style of cssStyles) {
                inlineStateStyles.push({ ...style, state: stateName });
              }
            }
          }
          continue;
        }
        if (component.startsWith("on")) {
          const eventName = this.mapEventName(component);
          const actions = [];
          for (const prop of inst.properties) {
            actions.push({
              type: prop.name,
              target: prop.values.length > 0 ? String(prop.values[0]) : void 0,
              args: prop.values.slice(1).map((v) => String(v))
            });
          }
          if (actions.length > 0) {
            inlineEvents.push({
              name: eventName,
              actions
            });
          }
          continue;
        }
        remainingChildren.push(child);
      }
      return { inlineStateStyles, inlineEvents, remainingChildren };
    }
    /**
     * Resolve component inheritance chain
     */
    resolveComponent(component) {
      if (!component.extends) {
        return component;
      }
      const parent = this.componentMap.get(component.extends);
      if (!parent) {
        return component;
      }
      const resolvedParent = this.resolveComponent(parent);
      return {
        ...component,
        primitive: component.primitive || resolvedParent.primitive,
        properties: this.mergeProperties(resolvedParent.properties, component.properties),
        states: [...resolvedParent.states, ...component.states],
        events: [...resolvedParent.events, ...component.events],
        children: [...resolvedParent.children, ...component.children]
      };
    }
    /**
     * Merge properties (later values override earlier)
     */
    mergeProperties(base, overrides) {
      const map = /* @__PURE__ */ new Map();
      for (const prop of base) {
        map.set(prop.name, prop);
      }
      for (const prop of overrides) {
        map.set(prop.name, prop);
      }
      return Array.from(map.values());
    }
    /**
     * Get HTML tag for component
     */
    getTag(componentName, resolved) {
      const primitive = resolved?.primitive || componentName.toLowerCase();
      const mapping = {
        // Layout primitives
        frame: "div",
        box: "div",
        text: "span",
        // Form elements
        button: "button",
        input: "input",
        textarea: "textarea",
        // Media
        image: "img",
        link: "a",
        icon: "span",
        // Semantic structure
        header: "header",
        nav: "nav",
        main: "main",
        section: "section",
        article: "article",
        aside: "aside",
        footer: "footer",
        // Headings
        h1: "h1",
        h2: "h2",
        h3: "h3",
        h4: "h4",
        h5: "h5",
        h6: "h6"
      };
      return mapping[primitive] || "div";
    }
    /**
     * Transform Mirror properties to CSS styles
     *
     * This method uses intelligent layout merging to handle flexbox properties correctly.
     * It collects all layout-related properties first, then generates consistent CSS.
     */
    transformProperties(properties2, primitive = "frame") {
      const styles = [];
      const layoutContext = {
        direction: null,
        justifyContent: null,
        alignItems: null,
        flexWrap: null,
        gap: null,
        isGrid: false,
        gridColumns: null
      };
      for (const prop of properties2) {
        const name = prop.name;
        const isBoolean = prop.values.length === 1 && prop.values[0] === true || prop.values.length === 0;
        if ((name === "horizontal" || name === "hor") && isBoolean) {
          layoutContext.direction = "row";
          continue;
        }
        if ((name === "vertical" || name === "ver") && isBoolean) {
          layoutContext.direction = "column";
          continue;
        }
        if (ALIGNMENT_PROPERTIES.has(name) && isBoolean) {
          this.applyAlignmentToContext(name, layoutContext);
          continue;
        }
        if (name === "align" && !isBoolean) {
          for (const val of prop.values) {
            const alignValue = String(val).toLowerCase();
            if (ALIGNMENT_PROPERTIES.has(alignValue)) {
              this.applyAlignmentToContext(alignValue, layoutContext);
            }
          }
          continue;
        }
        if (name === "wrap" && isBoolean) {
          layoutContext.flexWrap = "wrap";
          continue;
        }
        if ((name === "gap" || name === "g") && !isBoolean) {
          layoutContext.gap = this.formatCSSValue(name, this.resolveValue(prop.values));
          continue;
        }
        if (name === "grid") {
          layoutContext.isGrid = true;
          layoutContext.gridColumns = this.resolveGridColumns(prop);
          continue;
        }
      }
      const layoutStyles = this.generateLayoutStyles(layoutContext, primitive);
      styles.push(...layoutStyles);
      for (const prop of properties2) {
        const name = prop.name;
        const isBoolean = prop.values.length === 1 && prop.values[0] === true || prop.values.length === 0;
        if (DIRECTION_PROPERTIES.has(name) && isBoolean) continue;
        if (ALIGNMENT_PROPERTIES.has(name) && isBoolean) continue;
        if (name === "align" && !isBoolean) continue;
        if (name === "wrap" && isBoolean) continue;
        if ((name === "gap" || name === "g") && !isBoolean) continue;
        if (name === "grid") continue;
        const cssStyles = this.propertyToCSS(prop, primitive);
        styles.push(...cssStyles);
      }
      return styles;
    }
    /**
     * Apply alignment property to layout context
     */
    applyAlignmentToContext(name, ctx) {
      switch (name) {
        case "center":
        case "cen":
          ctx.justifyContent = "center";
          ctx.alignItems = "center";
          break;
        case "spread":
          ctx.justifyContent = "space-between";
          break;
        case "left":
          ctx.alignItems = ctx.alignItems || "flex-start";
          ctx._hAlign = "start";
          break;
        case "right":
          ;
          ctx._hAlign = "end";
          break;
        case "hor-center":
          ;
          ctx._hAlign = "center";
          break;
        case "top":
          ;
          ctx._vAlign = "start";
          break;
        case "bottom":
          ;
          ctx._vAlign = "end";
          break;
        case "ver-center":
          ;
          ctx._vAlign = "center";
          break;
      }
    }
    /**
     * Generate final layout styles from context
     *
     * Key insight: In flexbox, alignment properties mean different CSS depending on direction.
     * - In column: left/right → align-items, top/bottom → justify-content
     * - In row: left/right → justify-content, top/bottom → align-items
     */
    generateLayoutStyles(ctx, primitive) {
      const styles = [];
      if (ctx.isGrid) {
        styles.push({ property: "display", value: "grid" });
        if (ctx.gridColumns) {
          styles.push({ property: "grid-template-columns", value: ctx.gridColumns });
        }
        if (ctx.gap) {
          styles.push({ property: "gap", value: ctx.gap });
        }
        return styles;
      }
      const direction = ctx.direction || (primitive === "frame" ? "column" : null);
      const hasLayoutProps = direction || ctx.justifyContent || ctx.alignItems || ctx._hAlign || ctx._vAlign || ctx.flexWrap;
      if (!hasLayoutProps && primitive !== "frame") {
        if (ctx.gap) {
          styles.push({ property: "gap", value: ctx.gap });
        }
        return styles;
      }
      styles.push({ property: "display", value: "flex" });
      const finalDirection = direction || "column";
      styles.push({ property: "flex-direction", value: finalDirection });
      const hAlign = ctx._hAlign;
      const vAlign = ctx._vAlign;
      const alignValue = (align) => {
        if (align === "start") return "flex-start";
        if (align === "end") return "flex-end";
        return "center";
      };
      if (finalDirection === "column") {
        if (hAlign) {
          ctx.alignItems = alignValue(hAlign);
        }
        if (vAlign) {
          ctx.justifyContent = alignValue(vAlign);
        }
      } else {
        if (hAlign) {
          ctx.justifyContent = alignValue(hAlign);
        }
        if (vAlign) {
          ctx.alignItems = alignValue(vAlign);
        }
      }
      if (ctx.justifyContent) {
        styles.push({ property: "justify-content", value: ctx.justifyContent });
      }
      if (ctx.alignItems) {
        styles.push({ property: "align-items", value: ctx.alignItems });
      }
      if (ctx.flexWrap) {
        styles.push({ property: "flex-wrap", value: ctx.flexWrap });
      }
      if (ctx.gap) {
        styles.push({ property: "gap", value: ctx.gap });
      }
      return styles;
    }
    /**
     * Resolve grid column specification
     */
    resolveGridColumns(prop) {
      const values = prop.values;
      if (values.length === 1 && /^\d+$/.test(String(values[0]))) {
        return `repeat(${values[0]}, 1fr)`;
      }
      if (values.length === 2 && values[0] === "auto") {
        const minWidth = /^\d+$/.test(String(values[1])) ? `${values[1]}px` : values[1];
        return `repeat(auto-fill, minmax(${minWidth}, 1fr))`;
      }
      if (values.length >= 2) {
        return values.map((v) => {
          const str = String(v);
          if (/^\d+$/.test(str)) return `${str}px`;
          if (str.endsWith("%")) return str;
          return str;
        }).join(" ");
      }
      return null;
    }
    /**
     * Transform states to CSS styles with state attribute
     */
    transformStates(states) {
      const styles = [];
      for (const state of states) {
        for (const prop of state.properties) {
          const cssStyles = this.propertyToCSS(prop);
          for (const style of cssStyles) {
            styles.push({ ...style, state: state.name });
          }
        }
      }
      return styles;
    }
    /**
     * Apply state childOverrides to children
     *
     * When a state has childOverrides like:
     *   state filled
     *     Value col #fff
     *
     * This adds state-conditional styles to the matching child node.
     */
    applyStateChildOverrides(children, states) {
      for (const state of states) {
        for (const override of state.childOverrides) {
          const matchingChild = children.find(
            (child) => child.name === override.childName
          );
          if (matchingChild) {
            for (const prop of override.properties) {
              const cssStyles = this.propertyToCSS(prop);
              for (const style of cssStyles) {
                matchingChild.styles.push({
                  ...style,
                  state: state.name
                });
              }
            }
          }
        }
      }
    }
    /**
     * Convert Mirror property to CSS
     */
    propertyToCSS(prop, primitive = "frame") {
      const value = this.resolveValue(prop.values);
      const name = prop.name;
      const values = prop.values;
      if (prop.values.length === 1 && prop.values[0] === true || prop.values.length === 0) {
        return this.booleanPropertyToCSS(name);
      }
      if (name === "size") {
        if (primitive === "text" || primitive === "icon") {
          const val = String(values[0]);
          const px = /^\d+$/.test(val) ? `${val}px` : val;
          return [{ property: "font-size", value: px }];
        }
        if (values.length === 1) {
          const val = String(values[0]);
          if (val === "hug") {
            return [
              { property: "width", value: "fit-content" },
              { property: "height", value: "fit-content" }
            ];
          }
          if (val === "full") {
            return [
              { property: "width", value: "100%" },
              { property: "height", value: "100%" },
              { property: "flex-grow", value: "1" }
            ];
          }
          const px = /^\d+$/.test(val) ? `${val}px` : val;
          return [
            { property: "width", value: px },
            { property: "height", value: px }
          ];
        }
        if (values.length >= 2) {
          const w = String(values[0]);
          const h = String(values[1]);
          return [
            { property: "width", value: /^\d+$/.test(w) ? `${w}px` : w },
            { property: "height", value: /^\d+$/.test(h) ? `${h}px` : h }
          ];
        }
      }
      if ((name === "pad" || name === "padding" || name === "p") && values.length >= 2) {
        const directions = ["left", "right", "top", "bottom", "down", "l", "r", "t", "b", "x", "y", "horizontal", "vertical", "hor", "ver"];
        if (directions.includes(String(values[0]))) {
          return this.parseDirectionalSpacing("padding", values);
        }
      }
      if ((name === "margin" || name === "m") && values.length >= 2) {
        const directions = ["left", "right", "top", "bottom", "down", "l", "r", "t", "b", "x", "y", "horizontal", "vertical", "hor", "ver"];
        if (directions.includes(String(values[0]))) {
          return this.parseDirectionalSpacing("margin", values);
        }
      }
      if ((name === "bor" || name === "border") && values.length >= 2) {
        const dirMap = {
          "t": ["border-top"],
          "top": ["border-top"],
          "b": ["border-bottom"],
          "bottom": ["border-bottom"],
          "down": ["border-bottom"],
          "l": ["border-left"],
          "left": ["border-left"],
          "r": ["border-right"],
          "right": ["border-right"],
          "x": ["border-left", "border-right"],
          "y": ["border-top", "border-bottom"],
          "horizontal": ["border-left", "border-right"],
          "hor": ["border-left", "border-right"],
          "vertical": ["border-top", "border-bottom"],
          "ver": ["border-top", "border-bottom"]
        };
        const firstVal = String(values[0]);
        if (dirMap[firstVal]) {
          const borderProps = [];
          let i = 0;
          while (i < values.length && dirMap[String(values[i])]) {
            borderProps.push(...dirMap[String(values[i])]);
            i++;
          }
          const restValues = values.slice(i);
          const borderValue = this.formatBorderValue(restValues);
          const uniqueProps = [...new Set(borderProps)];
          return uniqueProps.map((prop2) => ({ property: prop2, value: borderValue }));
        }
      }
      if ((name === "rad" || name === "radius") && values.length >= 1) {
        const cornerMap = {
          "tl": ["border-top-left-radius"],
          "tr": ["border-top-right-radius"],
          "bl": ["border-bottom-left-radius"],
          "br": ["border-bottom-right-radius"],
          "t": ["border-top-left-radius", "border-top-right-radius"],
          "b": ["border-bottom-left-radius", "border-bottom-right-radius"],
          "l": ["border-top-left-radius", "border-bottom-left-radius"],
          "r": ["border-top-right-radius", "border-bottom-right-radius"]
        };
        const firstVal = String(values[0]);
        if (cornerMap[firstVal] && values.length >= 2) {
          const props = cornerMap[firstVal];
          const val = String(values[1]);
          const px = /^\d+$/.test(val) ? `${val}px` : val;
          return props.map((p) => ({ property: p, value: px }));
        }
      }
      if (name === "rotate" || name === "rot") {
        const deg = String(values[0]);
        return [{ property: "transform", value: `rotate(${deg}deg)` }];
      }
      if (name === "translate") {
        const x = String(values[0]);
        const y = values.length >= 2 ? String(values[1]) : "0";
        const xPx = /^-?\d+$/.test(x) ? `${x}px` : x;
        const yPx = /^-?\d+$/.test(y) ? `${y}px` : y;
        return [{ property: "transform", value: `translate(${xPx}, ${yPx})` }];
      }
      if (name.startsWith("hover-")) {
        const baseProp = name.replace("hover-", "");
        const propMap = {
          "bg": "background",
          "col": "color",
          "opacity": "opacity",
          "opa": "opacity",
          "scale": "transform",
          "bor": "border",
          "border": "border",
          "boc": "border-color",
          "border-color": "border-color",
          "rad": "border-radius",
          "radius": "border-radius"
        };
        const cssProp = propMap[baseProp] || baseProp;
        let cssValue2 = value;
        if (baseProp === "scale") {
          cssValue2 = `scale(${value})`;
        } else if (["bg", "col", "bor", "border", "boc", "border-color", "rad", "radius"].includes(baseProp)) {
          cssValue2 = this.formatCSSValue(baseProp, value);
        }
        return [{ property: cssProp, value: cssValue2, state: "hover" }];
      }
      const mapping = {
        // Layout
        horizontal: ["display", "flex-direction"],
        hor: ["display", "flex-direction"],
        vertical: ["display", "flex-direction"],
        ver: ["display", "flex-direction"],
        center: ["justify-content", "align-items"],
        cen: ["justify-content", "align-items"],
        gap: "gap",
        g: "gap",
        spread: "justify-content",
        wrap: "flex-wrap",
        stacked: "position",
        grid: "display",
        // Sizing
        width: "width",
        w: "width",
        height: "height",
        h: "height",
        "min-width": "min-width",
        minw: "min-width",
        "max-width": "max-width",
        maxw: "max-width",
        "min-height": "min-height",
        minh: "min-height",
        "max-height": "max-height",
        maxh: "max-height",
        // Spacing
        padding: "padding",
        pad: "padding",
        p: "padding",
        margin: "margin",
        m: "margin",
        // Colors
        color: "color",
        col: "color",
        c: "color",
        background: "background",
        bg: "background",
        "border-color": "border-color",
        boc: "border-color",
        // Border
        border: "border",
        bor: "border",
        radius: "border-radius",
        rad: "border-radius",
        // Typography
        "font-size": "font-size",
        fs: "font-size",
        weight: "font-weight",
        line: "line-height",
        font: "font-family",
        "text-align": "text-align",
        // Visual
        opacity: "opacity",
        o: "opacity",
        shadow: "box-shadow",
        cursor: "cursor",
        z: "z-index",
        // Scroll
        scroll: "overflow-y",
        "scroll-ver": "overflow-y",
        "scroll-hor": "overflow-x",
        "scroll-both": "overflow",
        clip: "overflow"
      };
      const cssProperty = mapping[name];
      if (!cssProperty) {
        return [];
      }
      if (name === "horizontal" || name === "hor") {
        return [
          { property: "display", value: "flex" },
          { property: "flex-direction", value: "row" }
        ];
      }
      if (name === "vertical" || name === "ver") {
        return [
          { property: "display", value: "flex" },
          { property: "flex-direction", value: "column" }
        ];
      }
      if (name === "center" || name === "cen") {
        return [
          { property: "display", value: "flex" },
          { property: "justify-content", value: "center" },
          { property: "align-items", value: "center" }
        ];
      }
      if (name === "spread") {
        return [
          { property: "display", value: "flex" },
          { property: "justify-content", value: "space-between" }
        ];
      }
      if (name === "wrap") {
        return [{ property: "flex-wrap", value: "wrap" }];
      }
      if (name === "stacked") {
        return [{ property: "position", value: "relative" }];
      }
      if (name === "scroll" || name === "scroll-ver") {
        return [{ property: "overflow-y", value: "auto" }];
      }
      if (name === "scroll-hor") {
        return [{ property: "overflow-x", value: "auto" }];
      }
      if (name === "scroll-both") {
        return [{ property: "overflow", value: "auto" }];
      }
      if (name === "clip") {
        return [{ property: "overflow", value: "hidden" }];
      }
      if (name === "grid") {
        const values2 = prop.values;
        if (values2.length === 1 && /^\d+$/.test(String(values2[0]))) {
          return [
            { property: "display", value: "grid" },
            { property: "grid-template-columns", value: `repeat(${values2[0]}, 1fr)` }
          ];
        }
        if (values2.length === 2 && values2[0] === "auto") {
          const minWidth = /^\d+$/.test(String(values2[1])) ? `${values2[1]}px` : values2[1];
          return [
            { property: "display", value: "grid" },
            { property: "grid-template-columns", value: `repeat(auto-fill, minmax(${minWidth}, 1fr))` }
          ];
        }
        if (values2.length >= 2) {
          const columns = values2.map((v) => {
            const str = String(v);
            if (/^\d+$/.test(str)) return `${str}px`;
            if (str.endsWith("%")) return str;
            return str;
          }).join(" ");
          return [
            { property: "display", value: "grid" },
            { property: "grid-template-columns", value: columns }
          ];
        }
        return [{ property: "display", value: "grid" }];
      }
      if ((name === "width" || name === "w" || name === "height" || name === "h") && value === "full") {
        return [
          { property: name === "width" || name === "w" ? "width" : "height", value: "100%" },
          { property: "flex-grow", value: "1" }
        ];
      }
      if ((name === "width" || name === "w" || name === "height" || name === "h") && value === "hug") {
        return [{ property: name === "width" || name === "w" ? "width" : "height", value: "fit-content" }];
      }
      if (name === "shadow") {
        const shadows = {
          sm: "0 1px 2px rgba(0,0,0,0.05)",
          md: "0 4px 6px rgba(0,0,0,0.1)",
          lg: "0 10px 15px rgba(0,0,0,0.1)"
        };
        return [{ property: "box-shadow", value: shadows[value] || value }];
      }
      const cssValue = this.formatCSSValue(name, value);
      return [{ property: cssProperty, value: cssValue }];
    }
    /**
     * Format value for CSS
     */
    formatCSSValue(property, value) {
      const needsPx = [
        "padding",
        "pad",
        "p",
        "margin",
        "m",
        "gap",
        "g",
        "width",
        "w",
        "height",
        "h",
        "min-width",
        "minw",
        "max-width",
        "maxw",
        "min-height",
        "minh",
        "max-height",
        "maxh",
        "font-size",
        "fs",
        "radius",
        "rad",
        "border-radius",
        "border",
        "bor"
      ];
      if (needsPx.includes(property)) {
        return value.split(" ").map((v) => {
          if (/^\d+$/.test(v)) {
            return `${v}px`;
          }
          return v;
        }).join(" ");
      }
      return value;
    }
    /**
     * Parse directional spacing (padding/margin)
     * Supports:
     * - pad left 20                    → padding-left: 20px
     * - pad top 8 bottom 24            → padding-top: 8px, padding-bottom: 24px
     * - pad left right 8               → padding-left: 8px, padding-right: 8px
     * - margin top bottom left 4       → margin-top/bottom/left: 4px
     * - pad x 16                       → padding-left: 16px, padding-right: 16px
     * - pad y 8                        → padding-top: 8px, padding-bottom: 8px
     */
    parseDirectionalSpacing(property, values) {
      const styles = [];
      const directionMap = {
        "left": ["left"],
        "right": ["right"],
        "top": ["top"],
        "bottom": ["bottom"],
        "down": ["bottom"],
        // Alias
        "l": ["left"],
        "r": ["right"],
        "t": ["top"],
        "b": ["bottom"],
        "x": ["left", "right"],
        // Horizontal shortcut
        "y": ["top", "bottom"],
        // Vertical shortcut
        "horizontal": ["left", "right"],
        "vertical": ["top", "bottom"],
        "hor": ["left", "right"],
        "ver": ["top", "bottom"]
      };
      let i = 0;
      while (i < values.length) {
        const val = String(values[i]);
        if (directionMap[val]) {
          const directions = [];
          while (i < values.length && directionMap[String(values[i])]) {
            directions.push(...directionMap[String(values[i])]);
            i++;
          }
          if (i < values.length) {
            const numVal = String(values[i]);
            const px = /^-?\d+$/.test(numVal) ? `${numVal}px` : numVal;
            const uniqueDirs = [...new Set(directions)];
            for (const dir of uniqueDirs) {
              styles.push({ property: `${property}-${dir}`, value: px });
            }
            i++;
          }
        } else {
          i++;
        }
      }
      return styles;
    }
    /**
     * Format border value: 1 #333 → 1px solid #333, 2 dashed #666 → 2px dashed #666
     */
    formatBorderValue(values) {
      const parts = [];
      let hasStyle = false;
      const styles = ["solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset", "none"];
      for (const v of values) {
        const str = String(v);
        if (/^\d+$/.test(str)) {
          parts.push(`${str}px`);
        } else if (styles.includes(str)) {
          hasStyle = true;
          parts.push(str);
        } else {
          parts.push(str);
        }
      }
      if (!hasStyle && parts.length > 0 && parts[0].endsWith("px")) {
        parts.splice(1, 0, "solid");
      }
      return parts.join(" ");
    }
    /**
     * Resolve property values to string
     */
    resolveValue(values) {
      return values.map((v) => {
        if (typeof v === "object" && v.kind === "token") {
          const cssVarName = v.name.replace(/\./g, "-");
          return `var(--${cssVarName})`;
        }
        if (typeof v === "string" && this.tokenSet.has(v)) {
          const cssVarName = v.replace(/\./g, "-");
          return `var(--${cssVarName})`;
        }
        return String(v);
      }).join(" ");
    }
    /**
     * Extract HTML properties (non-CSS)
     */
    extractHTMLProperties(properties2) {
      const htmlProps = [];
      for (const prop of properties2) {
        if (prop.name === "content") {
          htmlProps.push({ name: "textContent", value: this.resolveValue(prop.values) });
        }
        if (prop.name === "href") {
          htmlProps.push({ name: "href", value: this.resolveValue(prop.values) });
        }
        if (prop.name === "src") {
          htmlProps.push({ name: "src", value: this.resolveValue(prop.values) });
        }
        if (prop.name === "placeholder") {
          htmlProps.push({ name: "placeholder", value: this.resolveValue(prop.values) });
        }
        if (prop.name === "disabled") {
          htmlProps.push({ name: "disabled", value: true });
        }
        if (prop.name === "hidden") {
          htmlProps.push({ name: "hidden", value: true });
        }
        if (prop.name === "icon-size" || prop.name === "is") {
          htmlProps.push({ name: "data-icon-size", value: this.resolveValue(prop.values) });
        }
        if (prop.name === "icon-color" || prop.name === "ic") {
          htmlProps.push({ name: "data-icon-color", value: this.resolveValue(prop.values) });
        }
        if (prop.name === "icon-weight" || prop.name === "iw") {
          htmlProps.push({ name: "data-icon-weight", value: this.resolveValue(prop.values) });
        }
        if (prop.name === "fill") {
          htmlProps.push({ name: "data-icon-fill", value: true });
        }
        if (prop.name === "material") {
          htmlProps.push({ name: "data-icon-material", value: true });
        }
      }
      return htmlProps;
    }
    /**
     * Transform events to IR
     */
    transformEvents(events) {
      return events.map((event) => ({
        name: this.mapEventName(event.name),
        key: event.key,
        actions: event.actions.map((action) => this.transformAction(action)),
        modifiers: event.modifiers
      }));
    }
    /**
     * Map Mirror event names to DOM event names
     */
    mapEventName(name) {
      const mapping = {
        onclick: "click",
        onhover: "mouseenter",
        onchange: "change",
        oninput: "input",
        onfocus: "focus",
        onblur: "blur",
        onkeydown: "keydown",
        onkeyup: "keyup"
      };
      return mapping[name] || name.replace(/^on/, "");
    }
    /**
     * Transform action to IR
     */
    transformAction(action) {
      return {
        type: action.name,
        target: action.target,
        args: action.args
      };
    }
    /**
     * Convert boolean property to CSS
     */
    booleanPropertyToCSS(name) {
      switch (name) {
        case "horizontal":
        case "hor":
          return [
            { property: "display", value: "flex" },
            { property: "flex-direction", value: "row" }
          ];
        case "vertical":
        case "ver":
          return [
            { property: "display", value: "flex" },
            { property: "flex-direction", value: "column" }
          ];
        case "center":
        case "cen":
          return [
            { property: "display", value: "flex" },
            { property: "justify-content", value: "center" },
            { property: "align-items", value: "center" }
          ];
        case "spread":
          return [
            { property: "display", value: "flex" },
            { property: "justify-content", value: "space-between" }
          ];
        case "wrap":
          return [{ property: "flex-wrap", value: "wrap" }];
        case "stacked":
          return [{ property: "position", value: "relative" }];
        case "hidden":
          return [{ property: "display", value: "none" }];
        case "visible":
          return [{ property: "visibility", value: "visible" }];
        case "disabled":
          return [{ property: "pointer-events", value: "none" }, { property: "opacity", value: "0.5" }];
        case "scroll":
        case "scroll-ver":
          return [{ property: "overflow-y", value: "auto" }];
        case "scroll-hor":
          return [{ property: "overflow-x", value: "auto" }];
        case "scroll-both":
          return [{ property: "overflow", value: "auto" }];
        case "clip":
          return [{ property: "overflow", value: "hidden" }];
        case "truncate":
          return [
            { property: "overflow", value: "hidden" },
            { property: "text-overflow", value: "ellipsis" },
            { property: "white-space", value: "nowrap" }
          ];
        case "italic":
          return [{ property: "font-style", value: "italic" }];
        case "underline":
          return [{ property: "text-decoration", value: "underline" }];
        case "uppercase":
          return [{ property: "text-transform", value: "uppercase" }];
        case "lowercase":
          return [{ property: "text-transform", value: "lowercase" }];
        // Alignment: Using column layout defaults (frame default)
        // In column: left/right → align-items, top/bottom → justify-content
        case "left":
          return [
            { property: "align-items", value: "flex-start" }
          ];
        case "right":
          return [
            { property: "align-items", value: "flex-end" }
          ];
        case "top":
          return [
            { property: "justify-content", value: "flex-start" }
          ];
        case "bottom":
          return [
            { property: "justify-content", value: "flex-end" }
          ];
        case "hor-center":
          return [
            { property: "align-items", value: "center" }
          ];
        case "ver-center":
          return [
            { property: "justify-content", value: "center" }
          ];
        default:
          return [];
      }
    }
  };

  // src/backends/dom.ts
  function generateDOM(ast) {
    const ir = toIR(ast);
    const generator = new DOMGenerator(ir, ast.javascript);
    return generator.generate();
  }
  var DOMGenerator = class {
    ir;
    javascript;
    indent = 0;
    lines = [];
    constructor(ir, javascript) {
      this.ir = ir;
      this.javascript = javascript;
    }
    generate() {
      this.emitHeader();
      this.emitTokens();
      this.emitCreateUI();
      this.emitRuntime();
      if (this.javascript) {
        this.emitInitialization();
      }
      return this.lines.join("\n");
    }
    emit(line) {
      const indentation = "  ".repeat(this.indent);
      this.lines.push(indentation + line);
    }
    emitRaw(line) {
      this.lines.push(line);
    }
    emitHeader() {
      this.emit("// Generated by Mirror Compiler (DOM Backend)");
      this.emit("// Do not edit manually");
      this.emit("");
    }
    emitTokens() {
      if (this.ir.tokens.length === 0) return;
      this.emit("// Design Tokens");
      this.emit("const tokens = {");
      this.indent++;
      for (const token of this.ir.tokens) {
        const value = typeof token.value === "string" ? `"${token.value}"` : token.value;
        const tokenKey = (token.name.startsWith("$") ? token.name.slice(1) : token.name).replace(/\./g, "-");
        this.emit(`"${tokenKey}": ${value},`);
      }
      this.indent--;
      this.emit("}");
      this.emit("");
    }
    emitStyles() {
      this.emit("// Inject CSS styles");
      this.emit("const _style = document.createElement('style')");
      this.emit("_style.textContent = `");
      if (this.ir.tokens.length > 0) {
        this.emit(":root {");
        this.indent++;
        for (const token of this.ir.tokens) {
          const value = token.value;
          const cssVarName = (token.name.startsWith("$") ? token.name.slice(1) : token.name).replace(/\./g, "-");
          this.emit(`--${cssVarName}: ${value};`);
        }
        this.indent--;
        this.emit("}");
        this.emit("");
      }
      this.emit(".mirror-root * {");
      this.emit("  box-sizing: border-box;");
      this.emit("}");
      this.emitSystemStateCSS();
      this.emit("`");
      this.emit("document.head.appendChild(_style)");
      this.emit("");
    }
    emitSystemStateCSS() {
      const systemStates = ["hover", "focus", "active", "disabled"];
      for (const node of this.ir.nodes) {
        this.emitNodeStateCSS(node, systemStates);
      }
    }
    emitNodeStateCSS(node, systemStates) {
      const stateStyles = node.styles.filter((s) => s.state && systemStates.includes(s.state));
      if (stateStyles.length > 0) {
        const byState = this.groupByState(stateStyles);
        for (const [state, styles] of Object.entries(byState)) {
          const pseudoClass = state === "disabled" ? "[disabled]" : `:${state}`;
          this.emit("");
          this.emit(`[data-mirror-id="${node.id}"]${pseudoClass} {`);
          this.indent++;
          for (const style of styles) {
            this.emit(`${style.property}: ${style.value} !important;`);
          }
          this.indent--;
          this.emit("}");
        }
      }
      for (const child of node.children) {
        this.emitNodeStateCSS(child, systemStates);
      }
    }
    emitCreateUI() {
      this.emit("export function createUI(data = {}) {");
      this.indent++;
      this.emit("const _elements = {}");
      this.emit("const _state = { ...data }");
      this.emit("const _listeners = new Map()");
      this.emit("");
      this.emit("// Root container");
      this.emit("const _root = document.createElement('div')");
      this.emit("_root.className = 'mirror-root'");
      this.emit("");
      this.emitStyles();
      for (const node of this.ir.nodes) {
        this.emitNode(node, "_root");
      }
      this.emit("");
      this.emitPublicAPI();
      this.indent--;
      this.emit("}");
      this.emit("");
    }
    emitNode(node, parentVar) {
      if (node.each) {
        this.emitEachLoop(node.each, parentVar);
        return;
      }
      if (node.conditional) {
        this.emitConditional(node.conditional, parentVar);
        return;
      }
      const varName = this.sanitizeVarName(node.id);
      this.emit(`// ${node.name || node.tag}`);
      this.emit(`const ${varName} = document.createElement('${node.tag}')`);
      this.emit(`_elements['${node.id}'] = ${varName}`);
      this.emit(`${varName}.dataset.mirrorId = '${node.id}'`);
      if (node.name) {
        this.emit(`${varName}.dataset.mirrorName = '${node.name}'`);
      }
      if (node.instanceName) {
        this.emit(`_elements['${node.instanceName}'] = ${varName}`);
      }
      const isIcon = node.primitive === "icon";
      let iconName = null;
      for (const prop of node.properties) {
        if (prop.name === "textContent") {
          const value = typeof prop.value === "string" ? `"${this.escapeString(prop.value)}"` : prop.value;
          if (isIcon && typeof prop.value === "string") {
            iconName = prop.value;
          } else {
            this.emit(`${varName}.textContent = ${value}`);
          }
        } else if (prop.name === "disabled" || prop.name === "hidden") {
          this.emit(`${varName}.${prop.name} = ${prop.value}`);
        } else {
          const value = typeof prop.value === "string" ? `"${this.escapeString(String(prop.value))}"` : prop.value;
          this.emit(`${varName}.setAttribute('${prop.name}', ${value})`);
        }
      }
      if (isIcon && iconName) {
        this.emit(`// Load Lucide icon`);
        this.emit(`_runtime.loadIcon(${varName}, "${this.escapeString(iconName)}")`);
      }
      const baseStyles = node.styles.filter((s) => !s.state);
      if (baseStyles.length > 0) {
        this.emit(`Object.assign(${varName}.style, {`);
        this.indent++;
        for (const style of baseStyles) {
          this.emit(`'${style.property}': '${style.value}',`);
        }
        this.indent--;
        this.emit("})");
      }
      const cssStates = /* @__PURE__ */ new Set(["hover", "focus", "active", "disabled"]);
      const behaviorStyles = node.styles.filter((s) => s.state && !cssStates.has(s.state));
      if (behaviorStyles.length > 0) {
        this.emit(`${varName}._stateStyles = {`);
        this.indent++;
        const byState = this.groupByState(behaviorStyles);
        for (const [state, styles] of Object.entries(byState)) {
          this.emit(`'${state}': {`);
          this.indent++;
          for (const style of styles) {
            this.emit(`'${style.property}': '${style.value}',`);
          }
          this.indent--;
          this.emit("},");
        }
        this.indent--;
        this.emit("}");
      }
      if (node.initialState) {
        this.emit(`${varName}.dataset.state = '${node.initialState}'`);
        this.emit(`${varName}._initialState = '${node.initialState}'`);
      }
      if (node.visibleWhen) {
        this.emit(`${varName}._visibleWhen = '${node.visibleWhen}'`);
        this.emit(`// Initially hidden until parent state matches`);
        this.emit(`${varName}.style.display = 'none'`);
      }
      if (node.selection) {
        const selectionVar = node.selection.startsWith("$") ? node.selection.slice(1) : node.selection;
        this.emit(`${varName}._selectionBinding = '${selectionVar}'`);
      }
      if (node.name) {
        this.emit(`${varName}.dataset.component = '${node.name}'`);
      }
      if (node.route) {
        this.emit(`${varName}.dataset.route = '${node.route}'`);
      }
      const hasKeyboardEvents = node.events.some((e) => e.key || e.name === "keydown" || e.name === "keyup");
      if (hasKeyboardEvents) {
        this.emit(`${varName}.setAttribute('tabindex', '0')`);
      }
      for (const event of node.events) {
        this.emitEventListener(varName, event);
      }
      for (const child of node.children) {
        this.emitNode(child, varName);
      }
      this.emit(`${parentVar}.appendChild(${varName})`);
      this.emit("");
    }
    emitEachLoop(each, parentVar) {
      const containerId = this.sanitizeVarName(each.id);
      const itemVar = each.itemVar.startsWith("$") ? each.itemVar.slice(1) : each.itemVar;
      const collection = each.collection.startsWith("$") ? each.collection.slice(1) : each.collection;
      this.emit(`// Each loop: ${itemVar} in ${collection}`);
      this.emit(`const ${containerId}_container = document.createElement('div')`);
      this.emit(`${containerId}_container.dataset.eachContainer = '${each.id}'`);
      this.emit("");
      this.emit(`_elements['${each.id}'] = ${containerId}_container`);
      this.emit(`${containerId}_container._eachConfig = {`);
      this.indent++;
      this.emit(`itemVar: '${itemVar}',`);
      this.emit(`collection: '${collection}',`);
      if (each.filter) {
        this.emit(`filter: ${JSON.stringify(each.filter)},`);
      }
      this.emit(`renderItem: (${itemVar}, index) => {`);
      this.indent++;
      this.emit(`const itemContainer = document.createElement('div')`);
      this.emit(`itemContainer.dataset.eachItem = index`);
      for (const templateNode of each.template) {
        this.emitEachTemplateNode(templateNode, "itemContainer", itemVar);
      }
      this.emit(`return itemContainer`);
      this.indent--;
      this.emit("},");
      this.indent--;
      this.emit("}");
      this.emit("");
      this.emit(`// Initial render`);
      this.emit(`const ${collection}Data = data['${collection}'] || []`);
      if (each.filter) {
        this.emit(`const ${collection}Filtered = ${collection}Data.filter(${itemVar} => ${each.filter})`);
        this.emit(`${collection}Filtered.forEach((${itemVar}, index) => {`);
      } else {
        this.emit(`${collection}Data.forEach((${itemVar}, index) => {`);
      }
      this.indent++;
      this.emit(`${containerId}_container.appendChild(${containerId}_container._eachConfig.renderItem(${itemVar}, index))`);
      this.indent--;
      this.emit("})");
      this.emit("");
      this.emit(`${parentVar}.appendChild(${containerId}_container)`);
      this.emit("");
    }
    emitConditional(cond, parentVar) {
      const containerId = this.sanitizeVarName(cond.id);
      this.emit(`// Conditional`);
      this.emit(`const ${containerId}_container = document.createElement('div')`);
      this.emit(`${containerId}_container.dataset.conditionalId = '${cond.id}'`);
      this.emit(`_elements['${cond.id}'] = ${containerId}_container`);
      this.emit("");
      this.emit(`${containerId}_container._conditionalConfig = {`);
      this.indent++;
      this.emit(`condition: () => ${cond.condition},`);
      this.emit(`renderThen: () => {`);
      this.indent++;
      this.emit(`const fragment = document.createDocumentFragment()`);
      for (const node of cond.then) {
        this.emitConditionalTemplateNode(node, "fragment");
      }
      this.emit(`return fragment`);
      this.indent--;
      this.emit(`},`);
      if (cond.else && cond.else.length > 0) {
        this.emit(`renderElse: () => {`);
        this.indent++;
        this.emit(`const fragment = document.createDocumentFragment()`);
        for (const node of cond.else) {
          this.emitConditionalTemplateNode(node, "fragment");
        }
        this.emit(`return fragment`);
        this.indent--;
        this.emit(`},`);
      }
      this.indent--;
      this.emit(`}`);
      this.emit("");
      this.emit(`// Initial conditional render`);
      this.emit(`if (${cond.condition}) {`);
      this.indent++;
      this.emit(`${containerId}_container.appendChild(${containerId}_container._conditionalConfig.renderThen())`);
      this.indent--;
      if (cond.else && cond.else.length > 0) {
        this.emit(`} else {`);
        this.indent++;
        this.emit(`${containerId}_container.appendChild(${containerId}_container._conditionalConfig.renderElse())`);
        this.indent--;
      }
      this.emit(`}`);
      this.emit("");
      this.emit(`${parentVar}.appendChild(${containerId}_container)`);
      this.emit("");
    }
    emitConditionalTemplateNode(node, parentVar) {
      if (node.conditional) {
        const nestedId = this.sanitizeVarName(node.conditional.id);
        this.emit(`// Nested conditional`);
        this.emit(`const ${nestedId}_nested = document.createElement('div')`);
        this.emit(`if (${node.conditional.condition}) {`);
        this.indent++;
        for (const child of node.conditional.then) {
          this.emitConditionalTemplateNode(child, `${nestedId}_nested`);
        }
        this.indent--;
        if (node.conditional.else && node.conditional.else.length > 0) {
          this.emit(`} else {`);
          this.indent++;
          for (const child of node.conditional.else) {
            this.emitConditionalTemplateNode(child, `${nestedId}_nested`);
          }
          this.indent--;
        }
        this.emit(`}`);
        this.emit(`${parentVar}.appendChild(${nestedId}_nested)`);
        return;
      }
      if (node.each) {
        this.emitEachLoop(node.each, parentVar);
        return;
      }
      const varName = this.sanitizeVarName(node.id) + "_cond";
      this.emit(`const ${varName} = document.createElement('${node.tag}')`);
      this.emit(`${varName}.dataset.mirrorId = '${node.id}'`);
      if (node.name) {
        this.emit(`${varName}.dataset.mirrorName = '${node.name}'`);
      }
      for (const prop of node.properties) {
        if (prop.name === "textContent") {
          const value = typeof prop.value === "string" ? `"${this.escapeString(prop.value)}"` : prop.value;
          this.emit(`${varName}.textContent = ${value}`);
        } else if (prop.name === "disabled" || prop.name === "hidden") {
          this.emit(`${varName}.${prop.name} = ${prop.value}`);
        } else {
          const value = typeof prop.value === "string" ? `"${this.escapeString(String(prop.value))}"` : prop.value;
          this.emit(`${varName}.setAttribute('${prop.name}', ${value})`);
        }
      }
      const baseStyles = node.styles.filter((s) => !s.state);
      if (baseStyles.length > 0) {
        this.emit(`Object.assign(${varName}.style, {`);
        this.indent++;
        for (const style of baseStyles) {
          this.emit(`'${style.property}': '${style.value}',`);
        }
        this.indent--;
        this.emit("})");
      }
      for (const event of node.events) {
        this.emitEventListener(varName, event);
      }
      for (const child of node.children) {
        this.emitConditionalTemplateNode(child, varName);
      }
      this.emit(`${parentVar}.appendChild(${varName})`);
    }
    emitEachTemplateNode(node, parentVar, itemVar) {
      const varName = this.sanitizeVarName(node.id) + "_tpl";
      this.emit(`const ${varName} = document.createElement('${node.tag}')`);
      this.emit(`${varName}.dataset.mirrorId = '${node.id}[' + index + ']'`);
      if (node.name) {
        this.emit(`${varName}.dataset.mirrorName = '${node.name}'`);
      }
      for (const prop of node.properties) {
        if (prop.name === "textContent") {
          const value = this.resolveTemplateValue(prop.value, itemVar);
          this.emit(`${varName}.textContent = ${value}`);
        } else if (prop.name === "disabled" || prop.name === "hidden") {
          this.emit(`${varName}.${prop.name} = ${prop.value}`);
        } else {
          const value = this.resolveTemplateValue(prop.value, itemVar);
          this.emit(`${varName}.setAttribute('${prop.name}', ${value})`);
        }
      }
      const baseStyles = node.styles.filter((s) => !s.state);
      if (baseStyles.length > 0) {
        this.emit(`Object.assign(${varName}.style, {`);
        this.indent++;
        for (const style of baseStyles) {
          const value = this.resolveTemplateStyleValue(style.value, itemVar);
          this.emit(`'${style.property}': ${value},`);
        }
        this.indent--;
        this.emit("})");
      }
      for (const event of node.events) {
        this.emitTemplateEventListener(varName, event, itemVar);
      }
      for (const child of node.children) {
        this.emitEachTemplateNode(child, varName, itemVar);
      }
      this.emit(`${parentVar}.appendChild(${varName})`);
    }
    resolveTemplateValue(value, itemVar) {
      if (typeof value === "string") {
        if (value.includes(`$${itemVar}.`) || value.includes(`\${${itemVar}.`)) {
          const resolved = value.replace(new RegExp(`\\$${itemVar}\\.`, "g"), `${itemVar}.`);
          return resolved;
        }
        if (value === `$${itemVar}`) {
          return itemVar;
        }
        return `"${this.escapeString(String(value))}"`;
      }
      return String(value);
    }
    resolveTemplateStyleValue(value, itemVar) {
      if (value.includes(`$${itemVar}.`) || value.includes(`\${${itemVar}.`)) {
        const resolved = value.replace(new RegExp(`\\$${itemVar}\\.`, "g"), `${itemVar}.`);
        return resolved;
      }
      return `'${value}'`;
    }
    emitTemplateEventListener(varName, event, itemVar) {
      const eventName = event.name;
      this.emit(`${varName}.addEventListener('${eventName}', (e) => {`);
      this.indent++;
      for (const action of event.actions) {
        this.emitTemplateAction(action, varName, itemVar);
      }
      this.indent--;
      this.emit("})");
    }
    emitTemplateAction(action, currentVar, itemVar) {
      const target = action.target || "self";
      switch (action.type) {
        case "toggle":
          this.emit(`_runtime.toggle(_elements['${target}'] || ${currentVar})`);
          break;
        case "select":
          this.emit(`_runtime.select(${currentVar})`);
          break;
        case "assign":
          if (action.args && action.args[0] === `$${itemVar}`) {
            const stateVar = target.startsWith("$") ? target.slice(1) : target;
            this.emit(`_state['${stateVar}'] = ${itemVar}`);
            this.emit(`api.update()`);
          }
          break;
        default:
          this.emit(`// TODO: Template action '${action.type}' not implemented`);
      }
    }
    emitEventListener(varName, event) {
      const eventName = event.name;
      if (eventName === "mouseenter") {
        const hasHighlight = event.actions.some((a) => a.type === "highlight");
        if (hasHighlight) {
          this.emit(`${varName}.addEventListener('mouseenter', (e) => {`);
          this.indent++;
          for (const action of event.actions) {
            this.emitAction(action, varName);
          }
          this.indent--;
          this.emit("})");
          this.emit(`${varName}.addEventListener('mouseleave', (e) => {`);
          this.indent++;
          this.emit(`_runtime.unhighlight(${varName})`);
          this.indent--;
          this.emit("})");
          return;
        }
      }
      if (eventName === "click-outside") {
        this.emit(`// Click outside handler`);
        this.emit(`const ${varName}_clickOutsideHandler = (e) => {`);
        this.indent++;
        this.emit(`if (!${varName}.contains(e.target)) {`);
        this.indent++;
        for (const action of event.actions) {
          this.emitAction(action, varName);
        }
        this.indent--;
        this.emit("}");
        this.indent--;
        this.emit("}");
        this.emit(`document.addEventListener('click', ${varName}_clickOutsideHandler)`);
        this.emit(`${varName}._clickOutsideHandler = ${varName}_clickOutsideHandler`);
        return;
      }
      if (event.key) {
        this.emit(`${varName}.addEventListener('${eventName}', (e) => {`);
        this.indent++;
        this.emit(`if (e.key === '${this.mapKeyName(event.key)}') {`);
        this.indent++;
        for (const action of event.actions) {
          this.emitAction(action, varName);
        }
        this.indent--;
        this.emit("}");
        this.indent--;
        this.emit("})");
      } else {
        this.emit(`${varName}.addEventListener('${eventName}', (e) => {`);
        this.indent++;
        for (const action of event.actions) {
          this.emitAction(action, varName);
        }
        this.indent--;
        this.emit("})");
      }
    }
    emitAction(action, currentVar) {
      const target = action.target || "self";
      const builtinActions = /* @__PURE__ */ new Set([
        "toggle",
        "show",
        "hide",
        "select",
        "deselect",
        "highlight",
        "activate",
        "deactivate",
        "call",
        "assign",
        "page",
        "open",
        "close",
        "filter",
        "validate",
        "reset",
        "focus",
        "alert",
        "clear-selection",
        "deactivate-siblings",
        "toggle-state",
        "set-state",
        "change",
        "navigate"
      ]);
      switch (action.type) {
        case "toggle":
          this.emit(`_runtime.toggle(_elements['${target}'] || ${currentVar})`);
          break;
        case "show":
          this.emit(`_runtime.show(_elements['${target}'] || ${currentVar})`);
          break;
        case "hide":
          this.emit(`_runtime.hide(_elements['${target}'] || ${currentVar})`);
          break;
        case "close":
          this.emit(`_runtime.close(_elements['${target}'] || ${currentVar})`);
          break;
        case "select":
          if (target === "highlighted") {
            this.emit(`_runtime.selectHighlighted(${currentVar})`);
          } else {
            this.emit(`_runtime.select(_elements['${target}'] || ${currentVar})`);
          }
          break;
        case "deselect":
          this.emit(`_runtime.deselect(_elements['${target}'] || ${currentVar})`);
          break;
        case "highlight":
          if (target === "next") {
            this.emit(`_runtime.highlightNext(${currentVar})`);
          } else if (target === "prev") {
            this.emit(`_runtime.highlightPrev(${currentVar})`);
          } else if (target === "first") {
            this.emit(`_runtime.highlightFirst(${currentVar})`);
          } else if (target === "last") {
            this.emit(`_runtime.highlightLast(${currentVar})`);
          } else {
            this.emit(`_runtime.highlight(_elements['${target}'] || ${currentVar})`);
          }
          break;
        case "activate":
          this.emit(`_runtime.activate(_elements['${target}'] || ${currentVar})`);
          break;
        case "deactivate":
          this.emit(`_runtime.deactivate(_elements['${target}'] || ${currentVar})`);
          break;
        case "toggle-state":
          const stateArg = action.args?.[0] || "on";
          this.emit(`_runtime.toggleState(_elements['${target}'] || ${currentVar}, '${stateArg}')`);
          break;
        case "set-state":
          const newState = action.args?.[0] || "default";
          this.emit(`_runtime.setState(_elements['${target}'] || ${currentVar}, '${newState}')`);
          break;
        case "call":
          const fnName = action.target || "";
          const args = action.args?.map((a) => `"${a}"`).join(", ") || "";
          this.emit(`if (typeof ${fnName} === 'function') ${fnName}(${args})`);
          break;
        case "navigate":
          const isPageRoute = /^[a-z]/.test(target);
          if (isPageRoute) {
            this.emit(`_runtime.navigateToPage('${target}', ${currentVar})`);
          } else {
            this.emit(`_runtime.navigate('${target}', ${currentVar})`);
          }
          break;
        default:
          if (!builtinActions.has(action.type)) {
            const funcName = action.type;
            const funcArgs = action.target ? `"${action.target}"` : "";
            this.emit(`if (typeof ${funcName} === 'function') ${funcName}(${funcArgs})`);
          } else {
            this.emit(`// TODO: Action '${action.type}' not implemented`);
          }
      }
    }
    emitPublicAPI() {
      this.emit("// Public API");
      this.emit("const api = {");
      this.indent++;
      this.emit("root: _root,");
      this.emit("");
      const namedNodes = this.collectNamedNodes(this.ir.nodes);
      for (const node of namedNodes) {
        this.emit(`get ${node.instanceName}() {`);
        this.indent++;
        this.emit(`return _runtime.wrap(_elements['${node.instanceName}'])`);
        this.indent--;
        this.emit("},");
      }
      this.emit("");
      this.emit("// State management");
      this.emit("setState(key, value) {");
      this.indent++;
      this.emit("_state[key] = value");
      this.emit("this.update()");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("getState(key) {");
      this.indent++;
      this.emit("return _state[key]");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("update() {");
      this.indent++;
      this.emit("// Re-render each loops based on state changes");
      this.emit("for (const el of _root.querySelectorAll('[data-each-container]')) {");
      this.indent++;
      this.emit("if (el._eachConfig) {");
      this.indent++;
      this.emit("const { collection, renderItem, filter } = el._eachConfig");
      this.emit("const items = _state[collection] || []");
      this.emit("const filtered = filter ? items.filter(item => eval(filter)) : items");
      this.emit('el.innerHTML = ""');
      this.emit("filtered.forEach((item, index) => el.appendChild(renderItem(item, index)))");
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("}");
      this.emit("");
      this.emit("// Re-render conditionals based on state changes");
      this.emit("for (const el of _root.querySelectorAll('[data-conditional-id]')) {");
      this.indent++;
      this.emit("if (el._conditionalConfig) {");
      this.indent++;
      this.emit("const { condition, renderThen, renderElse } = el._conditionalConfig");
      this.emit('el.innerHTML = ""');
      this.emit("if (condition()) {");
      this.indent++;
      this.emit("el.appendChild(renderThen())");
      this.indent--;
      this.emit("} else if (renderElse) {");
      this.indent++;
      this.emit("el.appendChild(renderElse())");
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("},");
      this.indent--;
      this.emit("}");
      this.emit("");
      this.emit("return api");
    }
    emitRuntime() {
      this.emit("// Runtime helpers");
      this.emit("const _runtime = {");
      this.indent++;
      this.emit("// Mirror property to CSS mapping");
      this.emit("_propMap: {");
      this.indent++;
      this.emit("'bg': 'background',");
      this.emit("'col': 'color',");
      this.emit("'pad': 'padding',");
      this.emit("'rad': 'borderRadius',");
      this.emit("'gap': 'gap',");
      this.emit("'w': 'width',");
      this.emit("'h': 'height',");
      this.emit("'opacity': 'opacity',");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("// Convert alignment value to CSS");
      this.emit("_alignToCSS(el, prop, value) {");
      this.indent++;
      this.emit("const dir = el.style.flexDirection || 'column'");
      this.emit("const isRow = dir === 'row'");
      this.emit("");
      this.emit("const alignMap = { 'left': 'flex-start', 'right': 'flex-end', 'center': 'center', 'top': 'flex-start', 'bottom': 'flex-end' }");
      this.emit("const cssVal = alignMap[value] || value");
      this.emit("");
      this.emit("if (prop === 'align' || prop === 'hor-align') {");
      this.indent++;
      this.emit("// Horizontal alignment");
      this.emit("if (isRow) { el.style.justifyContent = cssVal }");
      this.emit("else { el.style.alignItems = cssVal }");
      this.indent--;
      this.emit("} else if (prop === 'ver-align') {");
      this.indent++;
      this.emit("// Vertical alignment");
      this.emit("if (isRow) { el.style.alignItems = cssVal }");
      this.emit("else { el.style.justifyContent = cssVal }");
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("_getAlign(el, prop) {");
      this.indent++;
      this.emit("const dir = el.style.flexDirection || 'column'");
      this.emit("const isRow = dir === 'row'");
      this.emit("const reverseMap = { 'flex-start': 'left', 'flex-end': 'right', 'center': 'center' }");
      this.emit("");
      this.emit("if (prop === 'align' || prop === 'hor-align') {");
      this.indent++;
      this.emit("const val = isRow ? el.style.justifyContent : el.style.alignItems");
      this.emit("return reverseMap[val] || val");
      this.indent--;
      this.emit("} else if (prop === 'ver-align') {");
      this.indent++;
      this.emit("const val = isRow ? el.style.alignItems : el.style.justifyContent");
      this.emit("const vertMap = { 'flex-start': 'top', 'flex-end': 'bottom', 'center': 'center' }");
      this.emit("return vertMap[val] || val");
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("wrap(el) {");
      this.indent++;
      this.emit("if (!el) return null");
      this.emit("const self = this");
      this.emit("return {");
      this.indent++;
      this.emit("_el: el,");
      this.emit("");
      this.emit("// Text & Value");
      this.emit("get text() { return el.textContent },");
      this.emit("set text(v) { el.textContent = v },");
      this.emit("get value() { return el.value },");
      this.emit("set value(v) { el.value = v },");
      this.emit("");
      this.emit("// Visibility");
      this.emit('get visible() { return el.style.display !== "none" },');
      this.emit('set visible(v) { el.style.display = v ? "" : "none" },');
      this.emit("get hidden() { return el.hidden },");
      this.emit('set hidden(v) { el.hidden = v; el.style.display = v ? "none" : "" },');
      this.emit("");
      this.emit("// Alignment (smart based on flex-direction)");
      this.emit("get align() { return self._getAlign(el, 'align') },");
      this.emit("set align(v) { self._alignToCSS(el, 'align', v) },");
      this.emit("get verAlign() { return self._getAlign(el, 'ver-align') },");
      this.emit("set verAlign(v) { self._alignToCSS(el, 'ver-align', v) },");
      this.emit("");
      this.emit("// Common style properties");
      this.emit("get bg() { return el.style.background },");
      this.emit("set bg(v) { el.style.background = v },");
      this.emit("get col() { return el.style.color },");
      this.emit("set col(v) { el.style.color = v },");
      this.emit("get pad() { return el.style.padding },");
      this.emit("set pad(v) { el.style.padding = typeof v === 'number' ? v + 'px' : v },");
      this.emit("get gap() { return el.style.gap },");
      this.emit("set gap(v) { el.style.gap = typeof v === 'number' ? v + 'px' : v },");
      this.emit("get rad() { return el.style.borderRadius },");
      this.emit("set rad(v) { el.style.borderRadius = typeof v === 'number' ? v + 'px' : v },");
      this.emit("get w() { return el.style.width },");
      this.emit("set w(v) { el.style.width = typeof v === 'number' ? v + 'px' : v },");
      this.emit("get h() { return el.style.height },");
      this.emit("set h(v) { el.style.height = typeof v === 'number' ? v + 'px' : v },");
      this.emit("get opacity() { return el.style.opacity },");
      this.emit("set opacity(v) { el.style.opacity = v },");
      this.emit("");
      this.emit("// State");
      this.emit("get state() { return el.dataset.state || 'default' },");
      this.emit("set state(v) { self.setState(el, v) },");
      this.emit("");
      this.emit("// Events");
      this.emit('set onclick(fn) { el.addEventListener("click", fn) },');
      this.emit('set onchange(fn) { el.addEventListener("change", fn) },');
      this.emit("");
      this.emit("// Methods");
      this.emit("addClass(c) { el.classList.add(c) },");
      this.emit("removeClass(c) { el.classList.remove(c) },");
      this.emit("toggleClass(c) { el.classList.toggle(c) },");
      this.emit("setStyle(prop, val) { el.style[prop] = val },");
      this.emit("getStyle(prop) { return el.style[prop] },");
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("toggle(el) {");
      this.indent++;
      this.emit("if (!el) return");
      this.emit("// Handle dropdown-style open/closed states");
      this.emit("const currentState = el.dataset.state || el._initialState");
      this.emit('if (currentState === "closed" || currentState === "open") {');
      this.indent++;
      this.emit('const newState = currentState === "closed" ? "open" : "closed"');
      this.emit("this.setState(el, newState)");
      this.indent--;
      this.emit('} else if (currentState === "collapsed" || currentState === "expanded") {');
      this.indent++;
      this.emit('const newState = currentState === "collapsed" ? "expanded" : "collapsed"');
      this.emit("this.setState(el, newState)");
      this.indent--;
      this.emit("} else {");
      this.indent++;
      this.emit("// Fallback to hidden toggle");
      this.emit("el.hidden = !el.hidden");
      this.emit('this.applyState(el, el.hidden ? "off" : "on")');
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("show(el) {");
      this.indent++;
      this.emit("if (!el) return");
      this.emit("el.hidden = false");
      this.emit('el.style.display = ""');
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("hide(el) {");
      this.indent++;
      this.emit("if (!el) return");
      this.emit("el.hidden = true");
      this.emit('el.style.display = "none"');
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("close(el) {");
      this.indent++;
      this.emit("if (!el) return");
      this.emit("// If element has toggle state (open/closed), set to closed");
      this.emit("const initialState = el._initialState");
      this.emit('if (initialState === "closed" || initialState === "open" || el.dataset.state === "open" || el.dataset.state === "closed") {');
      this.indent++;
      this.emit('this.setState(el, "closed")');
      this.indent--;
      this.emit('} else if (initialState === "expanded" || initialState === "collapsed" || el.dataset.state === "expanded" || el.dataset.state === "collapsed") {');
      this.indent++;
      this.emit('this.setState(el, "collapsed")');
      this.indent--;
      this.emit("} else {");
      this.indent++;
      this.emit("// Fallback to hide");
      this.emit("this.hide(el)");
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("select(el) {");
      this.indent++;
      this.emit("if (!el) return");
      this.emit("// Clear previous selection from siblings");
      this.emit("if (el.parentElement) {");
      this.indent++;
      this.emit("Array.from(el.parentElement.children).forEach(sibling => {");
      this.indent++;
      this.emit("if (sibling !== el && sibling.dataset.selected) {");
      this.indent++;
      this.emit("this.deselect(sibling)");
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("})");
      this.indent--;
      this.emit("}");
      this.emit('el.dataset.selected = "true"');
      this.emit('this.applyState(el, "selected")');
      this.emit("// Update selection binding if present");
      this.emit("this.updateSelectionBinding(el)");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("deselect(el) {");
      this.indent++;
      this.emit("if (!el) return");
      this.emit("delete el.dataset.selected");
      this.emit('this.removeState(el, "selected")');
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("highlight(el) {");
      this.indent++;
      this.emit("if (!el) return");
      this.emit("// Clear highlight from siblings first");
      this.emit("if (el.parentElement) {");
      this.indent++;
      this.emit("Array.from(el.parentElement.children).forEach(sibling => {");
      this.indent++;
      this.emit("if (sibling !== el && sibling.dataset.highlighted) {");
      this.indent++;
      this.emit("this.unhighlight(sibling)");
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("})");
      this.indent--;
      this.emit("}");
      this.emit('el.dataset.highlighted = "true"');
      this.emit('this.applyState(el, "highlighted")');
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("unhighlight(el) {");
      this.indent++;
      this.emit("if (!el) return");
      this.emit("delete el.dataset.highlighted");
      this.emit('this.removeState(el, "highlighted")');
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("highlightNext(container) {");
      this.indent++;
      this.emit("if (!container) return");
      this.emit("// Find the menu/list container with items");
      this.emit("const items = this.getHighlightableItems(container)");
      this.emit("if (!items.length) return");
      this.emit('const current = items.findIndex(el => el.dataset.highlighted === "true")');
      this.emit("const next = current === -1 ? 0 : Math.min(current + 1, items.length - 1)");
      this.emit("this.highlight(items[next])");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("highlightPrev(container) {");
      this.indent++;
      this.emit("if (!container) return");
      this.emit("const items = this.getHighlightableItems(container)");
      this.emit("if (!items.length) return");
      this.emit('const current = items.findIndex(el => el.dataset.highlighted === "true")');
      this.emit("const prev = current === -1 ? items.length - 1 : Math.max(current - 1, 0)");
      this.emit("this.highlight(items[prev])");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("highlightFirst(container) {");
      this.indent++;
      this.emit("if (!container) return");
      this.emit("const items = this.getHighlightableItems(container)");
      this.emit("if (items.length) this.highlight(items[0])");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("highlightLast(container) {");
      this.indent++;
      this.emit("if (!container) return");
      this.emit("const items = this.getHighlightableItems(container)");
      this.emit("if (items.length) this.highlight(items[items.length - 1])");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("getHighlightableItems(container) {");
      this.indent++;
      this.emit("// Find all children that have _stateStyles.highlighted (proper highlight targets)");
      this.emit("// Falls back to cursor: pointer only if no highlighted items found");
      this.emit("const findItems = (el, requireHighlightState) => {");
      this.indent++;
      this.emit("const items = []");
      this.emit("for (const child of el.children) {");
      this.indent++;
      this.emit("if (child._stateStyles?.highlighted) {");
      this.indent++;
      this.emit("items.push(child)");
      this.indent--;
      this.emit('} else if (!requireHighlightState && child.style.cursor === "pointer") {');
      this.indent++;
      this.emit("items.push(child)");
      this.indent--;
      this.emit("} else {");
      this.indent++;
      this.emit("// Recurse into child containers");
      this.emit("items.push(...findItems(child, requireHighlightState))");
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("}");
      this.emit("return items");
      this.indent--;
      this.emit("}");
      this.emit("// First try to find items with _stateStyles.highlighted");
      this.emit("let items = findItems(container, true)");
      this.emit("// Fall back to cursor: pointer if no highlighted items found");
      this.emit("if (!items.length) items = findItems(container, false)");
      this.emit("return items");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("selectHighlighted(container) {");
      this.indent++;
      this.emit("if (!container) return");
      this.emit("const items = this.getHighlightableItems(container)");
      this.emit('const highlighted = items.find(el => el.dataset.highlighted === "true")');
      this.emit("if (highlighted) this.select(highlighted)");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("activate(el) {");
      this.indent++;
      this.emit("if (!el) return");
      this.emit('el.dataset.active = "true"');
      this.emit('this.applyState(el, "active")');
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("deactivate(el) {");
      this.indent++;
      this.emit("if (!el) return");
      this.emit("delete el.dataset.active");
      this.emit('this.removeState(el, "active")');
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("applyState(el, state) {");
      this.indent++;
      this.emit("if (!el._stateStyles || !el._stateStyles[state]) return");
      this.emit("Object.assign(el.style, el._stateStyles[state])");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("removeState(el, state) {");
      this.indent++;
      this.emit("if (!el._baseStyles) return");
      this.emit("Object.assign(el.style, el._baseStyles)");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("setState(el, stateName) {");
      this.indent++;
      this.emit("if (!el) return");
      this.emit("");
      this.emit("// Store base styles on first state change");
      this.emit("if (!el._baseStyles && el._stateStyles) {");
      this.indent++;
      this.emit("el._baseStyles = {}");
      this.emit("const stateProps = new Set()");
      this.emit("for (const state of Object.values(el._stateStyles)) {");
      this.indent++;
      this.emit("for (const prop of Object.keys(state)) stateProps.add(prop)");
      this.indent--;
      this.emit("}");
      this.emit("for (const prop of stateProps) {");
      this.indent++;
      this.emit('el._baseStyles[prop] = el.style[prop] || ""');
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("}");
      this.emit("");
      this.emit("// Restore base styles first");
      this.emit("if (el._baseStyles) Object.assign(el.style, el._baseStyles)");
      this.emit("");
      this.emit("// Apply new state");
      this.emit("el.dataset.state = stateName");
      this.emit("if (stateName !== 'default' && el._stateStyles && el._stateStyles[stateName]) {");
      this.indent++;
      this.emit("Object.assign(el.style, el._stateStyles[stateName])");
      this.indent--;
      this.emit("}");
      this.emit("");
      this.emit("// Update visibility of children based on new state");
      this.emit("this.updateVisibility(el)");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("toggleState(el, state1, state2) {");
      this.indent++;
      this.emit("if (!el) return");
      this.emit("state2 = state2 || 'default'");
      this.emit("const current = el.dataset.state || state2");
      this.emit("const next = current === state1 ? state2 : state1");
      this.emit("this.setState(el, next)");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("updateVisibility(el) {");
      this.indent++;
      this.emit("if (!el) return");
      this.emit("const state = el.dataset.state");
      this.emit("// Find children with _visibleWhen");
      this.emit('const children = el.querySelectorAll("[data-mirror-id]")');
      this.emit("children.forEach(child => {");
      this.indent++;
      this.emit("if (child._visibleWhen) {");
      this.indent++;
      this.emit("// Simple state match or evaluate condition");
      this.emit("const condition = child._visibleWhen");
      this.emit("let visible = false");
      this.emit('if (condition.includes("&&") || condition.includes("||")) {');
      this.indent++;
      this.emit("// Complex condition - evaluate with state as context");
      this.emit("try {");
      this.indent++;
      this.emit('const open = state === "open"');
      this.emit('const closed = state === "closed"');
      this.emit('const expanded = state === "expanded"');
      this.emit('const collapsed = state === "collapsed"');
      this.emit("visible = eval(condition)");
      this.indent--;
      this.emit("} catch (e) { visible = false }");
      this.indent--;
      this.emit("} else {");
      this.indent++;
      this.emit("// Simple state name match");
      this.emit("visible = state === condition");
      this.indent--;
      this.emit("}");
      this.emit('child.style.display = visible ? "" : "none"');
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("})");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("navigate(targetName, clickedElement) {");
      this.indent++;
      this.emit("if (!targetName) return");
      this.emit("");
      this.emit("// Find the target component by name");
      this.emit('const target = document.querySelector(`[data-component="${targetName}"]`)');
      this.emit("if (!target) return");
      this.emit("");
      this.emit("// Show target, hide siblings");
      this.emit("if (target.parentElement) {");
      this.indent++;
      this.emit("Array.from(target.parentElement.children).forEach(sibling => {");
      this.indent++;
      this.emit("if (sibling.dataset && sibling.dataset.component) {");
      this.indent++;
      this.emit('sibling.style.display = sibling === target ? "" : "none"');
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("})");
      this.indent--;
      this.emit("}");
      this.emit("");
      this.emit("// Update selected state in Nav container");
      this.emit("this.updateNavSelection(clickedElement)");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("updateNavSelection(clickedElement) {");
      this.indent++;
      this.emit("if (!clickedElement) return");
      this.emit("");
      this.emit("// Find the Nav container");
      this.emit('const nav = clickedElement.closest("nav")');
      this.emit("if (!nav) return");
      this.emit("");
      this.emit("// Find all elements with route in this nav");
      this.emit('const navItems = nav.querySelectorAll("[data-route]")');
      this.emit("navItems.forEach(item => {");
      this.indent++;
      this.emit("if (item === clickedElement) {");
      this.indent++;
      this.emit('item.dataset.selected = "true"');
      this.emit('this.applyState(item, "selected")');
      this.indent--;
      this.emit("} else {");
      this.indent++;
      this.emit("delete item.dataset.selected");
      this.emit('this.removeState(item, "selected")');
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("})");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("// Navigate to page (load .mirror file)");
      this.emit("navigateToPage(pageName, clickedElement) {");
      this.indent++;
      this.emit("if (!pageName) return");
      this.emit("");
      this.emit("// Construct filename (support paths like admin/users)");
      this.emit('const filename = pageName.endsWith(".mirror") ? pageName : pageName + ".mirror"');
      this.emit("");
      this.emit("// Get readFile from options or window");
      this.emit("const readFile = this._readFile || window._mirrorReadFile");
      this.emit("if (!readFile) {");
      this.indent++;
      this.emit('console.warn("No readFile callback available for page navigation")');
      this.emit("return");
      this.indent--;
      this.emit("}");
      this.emit("");
      this.emit("// Load file content");
      this.emit("const content = readFile(filename)");
      this.emit("if (!content) {");
      this.indent++;
      this.emit("console.warn(`Page not found: ${filename}`)");
      this.emit("return");
      this.indent--;
      this.emit("}");
      this.emit("");
      this.emit("// Compile the page (Mirror must be available globally)");
      this.emit('if (typeof Mirror === "undefined" || !Mirror.compile) {');
      this.indent++;
      this.emit('console.warn("Mirror compiler not available for dynamic page loading")');
      this.emit("return");
      this.indent--;
      this.emit("}");
      this.emit("");
      this.emit("try {");
      this.indent++;
      this.emit("const pageCode = Mirror.compile(content, { readFile })");
      this.emit("");
      this.emit("// Find page container");
      this.emit("const container = this.getPageContainer()");
      this.emit("if (!container) {");
      this.indent++;
      this.emit('console.warn("No page container found for rendering")');
      this.emit("return");
      this.indent--;
      this.emit("}");
      this.emit("");
      this.emit("// Clear and render new page");
      this.emit('container.innerHTML = ""');
      this.emit('const execCode = pageCode.replace("export function createUI", "function createUI")');
      this.emit('const fn = new Function(execCode + "\\nreturn createUI();")');
      this.emit("const ui = fn()");
      this.emit("if (ui && ui.root) {");
      this.indent++;
      this.emit("// Append children of root, not root itself");
      this.emit("while (ui.root.firstChild) {");
      this.indent++;
      this.emit("container.appendChild(ui.root.firstChild)");
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("} catch (err) {");
      this.indent++;
      this.emit("console.error(`Failed to load page ${filename}:`, err)");
      this.indent--;
      this.emit("}");
      this.emit("");
      this.emit("// Update selected state");
      this.emit("this.updateNavSelection(clickedElement)");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("// Get container for page content");
      this.emit("getPageContainer() {");
      this.indent++;
      this.emit("// First try named page container");
      this.emit('let container = document.querySelector("[data-page-container]")');
      this.emit("if (container) return container");
      this.emit("");
      this.emit('// Then try named instance "PageContent" or "Content"');
      this.emit('container = document.querySelector("[data-instance-name=\\"PageContent\\"]")');
      this.emit("if (container) return container");
      this.emit('container = document.querySelector("[data-instance-name=\\"Content\\"]")');
      this.emit("if (container) return container");
      this.emit("");
      this.emit("// Fallback: first sibling of nav that is not nav");
      this.emit('const nav = document.querySelector("nav")');
      this.emit("if (nav && nav.parentElement) {");
      this.indent++;
      this.emit("for (const sibling of nav.parentElement.children) {");
      this.indent++;
      this.emit('if (sibling !== nav && sibling.tagName !== "NAV") {');
      this.indent++;
      this.emit("return sibling");
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("}");
      this.emit("");
      this.emit("return null");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("updateSelectionBinding(el) {");
      this.indent++;
      this.emit("if (!el) return");
      this.emit("// Find parent with _selectionBinding");
      this.emit("let parent = el.parentElement");
      this.emit("while (parent) {");
      this.indent++;
      this.emit("if (parent._selectionBinding) {");
      this.indent++;
      this.emit("// Get the text content of the selected element");
      this.emit('const value = el.textContent?.trim() || ""');
      this.emit("// Store in global state");
      this.emit("const varName = parent._selectionBinding");
      this.emit("window._mirrorState = window._mirrorState || {}");
      this.emit("window._mirrorState[varName] = value");
      this.emit("// Update all bound elements");
      this.emit("this.updateBoundElements(varName, value)");
      this.emit("return");
      this.indent--;
      this.emit("}");
      this.emit("parent = parent.parentElement");
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("updateBoundElements(varName, value) {");
      this.indent++;
      this.emit("// Find all elements with _textBinding");
      this.emit('document.querySelectorAll("[data-mirror-id]").forEach(el => {');
      this.indent++;
      this.emit("if (el._textBinding === varName) {");
      this.indent++;
      this.emit("// Simple update - just set the text");
      this.emit('el.textContent = value || el._textPlaceholder || ""');
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("})");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("destroy(el) {");
      this.indent++;
      this.emit("if (!el) return");
      this.emit("// Remove click-outside handler");
      this.emit("if (el._clickOutsideHandler) {");
      this.indent++;
      this.emit("document.removeEventListener('click', el._clickOutsideHandler)");
      this.emit("delete el._clickOutsideHandler");
      this.indent--;
      this.emit("}");
      this.emit("// Recursively destroy children");
      this.emit("if (el.children) {");
      this.indent++;
      this.emit("Array.from(el.children).forEach(child => this.destroy(child))");
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("},");
      this.emit("");
      this.emit("// Load Lucide icon from CDN");
      this.emit("async loadIcon(el, iconName) {");
      this.indent++;
      this.emit("if (!el || !iconName) return");
      this.emit("");
      this.emit("// Get icon properties from data attributes");
      this.emit("const size = el.dataset.iconSize || '24'");
      this.emit('const color = el.dataset.iconColor || "currentColor"');
      this.emit("const strokeWidth = el.dataset.iconWeight || '2'");
      this.emit("");
      this.emit("try {");
      this.indent++;
      this.emit("const url = `https://unpkg.com/lucide-static/icons/${iconName}.svg`");
      this.emit("const res = await fetch(url)");
      this.emit("if (!res.ok) {");
      this.indent++;
      this.emit('console.warn(`Icon "${iconName}" not found`)');
      this.emit("el.textContent = iconName");
      this.emit("return");
      this.indent--;
      this.emit("}");
      this.emit("const svgText = await res.text()");
      this.emit("el.innerHTML = svgText");
      this.emit("");
      this.emit("const svg = el.querySelector('svg')");
      this.emit("if (svg) {");
      this.indent++;
      this.emit("svg.style.width = size + 'px'");
      this.emit("svg.style.height = size + 'px'");
      this.emit("svg.style.color = color");
      this.emit("svg.setAttribute('stroke-width', strokeWidth)");
      this.emit("svg.style.display = 'block'");
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("} catch (err) {");
      this.indent++;
      this.emit('console.warn(`Failed to load icon "${iconName}":`, err)');
      this.emit("el.textContent = iconName");
      this.indent--;
      this.emit("}");
      this.indent--;
      this.emit("},");
      this.indent--;
      this.emit("}");
      this.emit("");
    }
    sanitizeVarName(id) {
      return id.replace(/-/g, "_");
    }
    escapeString(str) {
      return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
    }
    mapKeyName(key) {
      const mapping = {
        "escape": "Escape",
        "enter": "Enter",
        "tab": "Tab",
        "space": " ",
        "arrow-up": "ArrowUp",
        "arrow-down": "ArrowDown",
        "arrow-left": "ArrowLeft",
        "arrow-right": "ArrowRight",
        "backspace": "Backspace",
        "delete": "Delete"
      };
      return mapping[key] || key;
    }
    groupByState(styles) {
      const result = {};
      for (const style of styles) {
        const state = style.state || "default";
        if (!result[state]) result[state] = [];
        result[state].push(style);
      }
      return result;
    }
    collectNamedNodes(nodes) {
      const result = [];
      for (const node of nodes) {
        if (node.instanceName) {
          result.push(node);
        }
        result.push(...this.collectNamedNodes(node.children));
      }
      return result;
    }
    emitInitialization() {
      const namedNodes = this.collectNamedNodes(this.ir.nodes);
      this.emit("// ============================================");
      this.emit("// Auto-initialization (Mirror + JavaScript)");
      this.emit("// ============================================");
      this.emit("");
      this.emit("const _ui = createUI()");
      this.emit("");
      if (namedNodes.length > 0) {
        this.emit("// Named instance proxies");
        for (const node of namedNodes) {
          this.emit(`const ${node.instanceName} = _ui.${node.instanceName}`);
        }
        this.emit("");
      }
      this.emit("// Global update function");
      this.emit("function update() { _ui.update() }");
      this.emit("");
      this.emit("// User JavaScript");
      if (this.javascript) {
        for (const line of this.javascript.code.split("\n")) {
          this.emitRaw(line);
        }
      }
      this.emit("");
      this.emit("// Mount to document");
      this.emit("document.body.appendChild(_ui.root)");
    }
  };

  // src/backends/framework.ts
  function generateFramework(ast) {
    const ir = toIR(ast);
    const generator = new FrameworkGenerator(ir);
    return generator.generate();
  }
  var FrameworkGenerator = class {
    ir;
    indent = 0;
    lines = [];
    constructor(ir) {
      this.ir = ir;
    }
    generate() {
      this.emitHeader();
      this.emitTokens();
      this.emitComponents();
      this.emitUI();
      this.emitMount();
      return this.lines.join("\n");
    }
    emit(line) {
      const indentation = "  ".repeat(this.indent);
      this.lines.push(indentation + line);
    }
    emitRaw(line) {
      this.lines.push(line);
    }
    emitHeader() {
      this.emit("// Generated by Mirror Compiler (Framework Backend)");
      this.emit("// This code uses the Mirror Runtime for rendering");
      this.emit("");
      this.emit("import { M } from 'mirror-runtime'");
      this.emit("");
    }
    emitTokens() {
      if (this.ir.tokens.length === 0) return;
      this.emit("// Design Tokens");
      this.emit("export const tokens = {");
      this.indent++;
      for (const token of this.ir.tokens) {
        const value = typeof token.value === "string" ? `'${token.value}'` : token.value;
        this.emit(`'${token.name}': ${value},`);
      }
      this.indent--;
      this.emit("}");
      this.emit("");
    }
    emitComponents() {
    }
    emitUI() {
      this.emit("// UI Tree");
      if (this.ir.nodes.length === 1) {
        this.emit("export const ui = " + this.nodeToM(this.ir.nodes[0]));
      } else if (this.ir.nodes.length > 1) {
        this.emit("export const ui = M('Box', [");
        this.indent++;
        for (let i = 0; i < this.ir.nodes.length; i++) {
          const comma = i < this.ir.nodes.length - 1 ? "," : "";
          this.emit(this.nodeToM(this.ir.nodes[i]) + comma);
        }
        this.indent--;
        this.emit("])");
      } else {
        this.emit("export const ui = M('Box')");
      }
      this.emit("");
    }
    emitMount() {
      this.emit("/**");
      this.emit(" * Mount UI to a container element");
      this.emit(" * @param {HTMLElement} container - The container to mount to");
      this.emit(" * @returns {MirrorUI} - UI controller with get(), destroy() methods");
      this.emit(" */");
      this.emit("export function mount(container) {");
      this.indent++;
      this.emit("return M.render(ui, container)");
      this.indent--;
      this.emit("}");
      this.emit("");
      this.emit("// For reverse translation to Mirror DSL:");
      this.emit("// console.log(M.toMirror(ui))");
    }
    /**
     * Convert IR node to M() call string
     */
    nodeToM(node) {
      if (node.each) {
        return this.eachToM(node.each);
      }
      if (node.conditional) {
        return this.conditionalToM(node.conditional);
      }
      const parts = [];
      const type = this.getNodeType(node);
      parts.push(`'${type}'`);
      const content = this.getContent(node);
      const props = this.nodeToProps(node);
      const propsStr = this.propsToString(props);
      const children = node.children.map((c) => this.nodeToM(c));
      const hasChildren = children.length > 0;
      if (content && propsStr && hasChildren) {
        return `M(${parts[0]}, '${this.escapeString(content)}', ${propsStr}, [
${this.indentLines(children.join(",\n"))}
${this.currentIndent()}])`;
      } else if (content && propsStr) {
        return `M(${parts[0]}, '${this.escapeString(content)}', ${propsStr})`;
      } else if (content && hasChildren) {
        return `M(${parts[0]}, '${this.escapeString(content)}', [
${this.indentLines(children.join(",\n"))}
${this.currentIndent()}])`;
      } else if (content) {
        return `M(${parts[0]}, '${this.escapeString(content)}')`;
      } else if (propsStr && hasChildren) {
        return `M(${parts[0]}, ${propsStr}, [
${this.indentLines(children.join(",\n"))}
${this.currentIndent()}])`;
      } else if (propsStr) {
        return `M(${parts[0]}, ${propsStr})`;
      } else if (hasChildren) {
        return `M(${parts[0]}, [
${this.indentLines(children.join(",\n"))}
${this.currentIndent()}])`;
      } else {
        return `M(${parts[0]})`;
      }
    }
    eachToM(each) {
      const template = each.template.map((n) => this.nodeToM(n));
      const templateStr = `[
${this.indentLines(template.join(",\n"))}
${this.currentIndent()}]`;
      if (each.filter) {
        return `M.each('${each.itemVar}', '${each.collection}', ${templateStr}, '${each.filter}')`;
      }
      return `M.each('${each.itemVar}', '${each.collection}', ${templateStr})`;
    }
    conditionalToM(cond) {
      const thenBranch = cond.then.map((n) => this.nodeToM(n));
      const thenStr = `[
${this.indentLines(thenBranch.join(",\n"))}
${this.currentIndent()}]`;
      if (cond.else && cond.else.length > 0) {
        const elseBranch = cond.else.map((n) => this.nodeToM(n));
        const elseStr = `[
${this.indentLines(elseBranch.join(",\n"))}
${this.currentIndent()}]`;
        return `M.if('${cond.condition}', ${thenStr}, ${elseStr})`;
      }
      return `M.if('${cond.condition}', ${thenStr})`;
    }
    /**
     * Get the Mirror type name for a node
     */
    getNodeType(node) {
      if (node.name && node.name !== node.tag) {
        return node.name;
      }
      const tagToType = {
        div: "Box",
        span: "Text",
        button: "Button",
        input: "Input",
        textarea: "Textarea",
        img: "Image",
        a: "Link"
      };
      if (node.primitive === "icon") {
        return "Icon";
      }
      return tagToType[node.tag] || node.name || "Box";
    }
    /**
     * Extract content from node (for Text, Icon, Button, Link)
     */
    getContent(node) {
      const textContent = node.properties.find((p) => p.name === "textContent");
      if (textContent && typeof textContent.value === "string") {
        return textContent.value;
      }
      return null;
    }
    /**
     * Convert node styles, events, and properties to props object
     */
    nodeToProps(node) {
      const props = {};
      if (node.instanceName) {
        props.named = node.instanceName;
      }
      if (node.initialState) {
        props.state = node.initialState;
      }
      if (node.visibleWhen) {
        props["visible-when"] = node.visibleWhen;
      }
      if (node.route) {
        props.route = node.route;
      }
      if (node.selection) {
        props.selection = node.selection;
      }
      this.stylesToProps(node.styles, props);
      this.eventsToProps(node.events, props);
      for (const prop of node.properties) {
        if (prop.name !== "textContent") {
          if (prop.name === "placeholder" || prop.name === "href" || prop.name === "src" || prop.name === "type") {
            props[prop.name] = prop.value;
          } else if (prop.name === "hidden" || prop.name === "disabled") {
            props[prop.name] = true;
          } else if (prop.name.startsWith("data-icon-")) {
            const iconProp = prop.name.replace("data-icon-", "");
            if (iconProp === "size") props.is = prop.value;
            else if (iconProp === "color") props.ic = prop.value;
            else if (iconProp === "weight") props.iw = prop.value;
          }
        }
      }
      return props;
    }
    /**
     * Convert IR styles to Mirror props
     */
    stylesToProps(styles, props) {
      const baseStyles = styles.filter((s) => !s.state);
      const stateStyles = styles.filter((s) => s.state);
      for (const style of baseStyles) {
        const mirrorProp = this.cssPropToMirrorProp(style.property, style.value);
        if (mirrorProp) {
          props[mirrorProp.name] = mirrorProp.value;
        }
      }
      if (stateStyles.length > 0) {
        const states = {};
        for (const style of stateStyles) {
          if (!states[style.state]) {
            states[style.state] = {};
          }
          const mirrorProp = this.cssPropToMirrorProp(style.property, style.value);
          if (mirrorProp) {
            states[style.state][mirrorProp.name] = mirrorProp.value;
          }
        }
        props.states = states;
      }
    }
    /**
     * Map CSS property/value back to Mirror property
     */
    cssPropToMirrorProp(prop, value) {
      if (prop === "display" && value === "flex") return null;
      if (prop === "flex-direction" && value === "row") return { name: "hor", value: true };
      if (prop === "flex-direction" && value === "column") return null;
      if (prop === "gap") return { name: "gap", value: this.parsePxValue(value) };
      if (prop === "justify-content" && value === "space-between") return { name: "spread", value: true };
      if (prop === "flex-wrap" && value === "wrap") return { name: "wrap", value: true };
      if (prop === "justify-content" && value === "center") return { name: "center", value: true };
      if (prop === "align-items" && value === "center") return { name: "center", value: true };
      if (prop === "width") {
        if (value === "100%") return { name: "w", value: "full" };
        if (value === "fit-content") return { name: "w", value: "hug" };
        return { name: "w", value: this.parsePxValue(value) };
      }
      if (prop === "height") {
        if (value === "100%") return { name: "h", value: "full" };
        if (value === "fit-content") return { name: "h", value: "hug" };
        return { name: "h", value: this.parsePxValue(value) };
      }
      if (prop === "min-width") return { name: "minw", value: this.parsePxValue(value) };
      if (prop === "max-width") return { name: "maxw", value: this.parsePxValue(value) };
      if (prop === "min-height") return { name: "minh", value: this.parsePxValue(value) };
      if (prop === "max-height") return { name: "maxh", value: this.parsePxValue(value) };
      if (prop === "padding") return { name: "pad", value: this.parsePxValue(value) };
      if (prop === "margin") return { name: "margin", value: this.parsePxValue(value) };
      if (prop === "background" || prop === "background-color") return { name: "bg", value };
      if (prop === "color") return { name: "col", value };
      if (prop === "border-color") return { name: "boc", value };
      if (prop === "border") return { name: "bor", value };
      if (prop === "border-radius") return { name: "rad", value: this.parsePxValue(value) };
      if (prop === "font-size") return { name: "font-size", value: this.parsePxValue(value) };
      if (prop === "font-weight") return { name: "weight", value };
      if (prop === "line-height") return { name: "line", value };
      if (prop === "font-family") return { name: "font", value };
      if (prop === "text-align") return { name: "text-align", value };
      if (prop === "font-style" && value === "italic") return { name: "italic", value: true };
      if (prop === "text-decoration" && value === "underline") return { name: "underline", value: true };
      if (prop === "text-transform" && value === "uppercase") return { name: "uppercase", value: true };
      if (prop === "text-transform" && value === "lowercase") return { name: "lowercase", value: true };
      if (prop === "opacity") return { name: "opacity", value: parseFloat(value) };
      if (prop === "box-shadow") return { name: "shadow", value };
      if (prop === "cursor") return { name: "cursor", value };
      if (prop === "z-index") return { name: "z", value: parseInt(value) };
      if (prop === "overflow-y" && value === "auto") return { name: "scroll", value: true };
      if (prop === "overflow-x" && value === "auto") return { name: "scroll-hor", value: true };
      if (prop === "overflow" && value === "hidden") return { name: "clip", value: true };
      if (prop === "display" && value === "none") return { name: "hidden", value: true };
      if (prop === "display" && value === "grid") return null;
      if (prop === "grid-template-columns") {
        const match = value.match(/repeat\((\d+), 1fr\)/);
        if (match) return { name: "grid", value: parseInt(match[1]) };
        return { name: "grid", value };
      }
      if (prop === "flex-grow") return null;
      return null;
    }
    /**
     * Convert IR events to Mirror props
     */
    eventsToProps(events, props) {
      for (const event of events) {
        const actions = event.actions.map((a) => this.actionToString(a));
        const actionValue = actions.length === 1 ? actions[0] : actions;
        if (event.key) {
          props[`onkeydown ${event.key}`] = actionValue;
        } else {
          const eventName = `on${event.name}`;
          props[eventName] = actionValue;
        }
      }
    }
    /**
     * Convert IR action to action string
     */
    actionToString(action) {
      if (action.target) {
        return `${action.type} ${action.target}`;
      }
      return action.type;
    }
    /**
     * Convert props object to string
     */
    propsToString(props) {
      const entries = Object.entries(props);
      if (entries.length === 0) return "";
      const parts = [];
      for (const [key, value] of entries) {
        if (key === "states") {
          parts.push(`states: ${this.statesToString(value)}`);
        } else if (typeof value === "string") {
          if (key.includes(" ") || key.includes("-")) {
            parts.push(`'${key}': '${value}'`);
          } else {
            parts.push(`${key}: '${value}'`);
          }
        } else if (typeof value === "boolean") {
          parts.push(`${key}: ${value}`);
        } else if (typeof value === "number") {
          parts.push(`${key}: ${value}`);
        } else if (Array.isArray(value)) {
          const arrayStr = value.map((v) => typeof v === "string" ? `'${v}'` : v).join(", ");
          parts.push(`${key}: [${arrayStr}]`);
        } else {
          parts.push(`${key}: ${JSON.stringify(value)}`);
        }
      }
      return `{ ${parts.join(", ")} }`;
    }
    /**
     * Convert states object to string
     */
    statesToString(states) {
      const parts = [];
      for (const [stateName, stateProps] of Object.entries(states)) {
        const propParts = [];
        for (const [key, value] of Object.entries(stateProps)) {
          if (typeof value === "string") {
            propParts.push(`${key}: '${value}'`);
          } else {
            propParts.push(`${key}: ${value}`);
          }
        }
        parts.push(`${stateName}: { ${propParts.join(", ")} }`);
      }
      return `{ ${parts.join(", ")} }`;
    }
    /**
     * Parse px values to numbers
     */
    parsePxValue(value) {
      if (value.endsWith("px")) {
        const num = parseInt(value);
        if (!isNaN(num)) return num;
      }
      return value;
    }
    escapeString(s) {
      return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    }
    currentIndent() {
      return "  ".repeat(this.indent);
    }
    indentLines(text) {
      const indent = "  ".repeat(this.indent + 1);
      return text.split("\n").map((line) => indent + line).join("\n");
    }
  };

  // src/backends/react.ts
  function generateReact(ast, options = {}) {
    const program = ast;
    const lines = [];
    const { includeTokens = true } = options;
    lines.push(`import React from 'react'`);
    lines.push(``);
    if (includeTokens && program.tokens && program.tokens.length > 0) {
      lines.push(`// Design Tokens`);
      lines.push(`const tokens = {`);
      for (const token of program.tokens) {
        const value = typeof token.value === "string" ? `'${token.value}'` : token.value;
        lines.push(`  '${token.name}': ${value},`);
      }
      lines.push(`}`);
      lines.push(``);
    }
    const componentMap = /* @__PURE__ */ new Map();
    if (program.components) {
      for (const comp of program.components) {
        componentMap.set(comp.name, comp);
      }
    }
    lines.push(`export default function App() {`);
    lines.push(`  return (`);
    if (program.instances && program.instances.length > 0) {
      for (const instance of program.instances) {
        const jsx = generateJSX(instance, componentMap, program.tokens || [], "    ");
        lines.push(jsx);
      }
    } else {
      lines.push(`    <div />`);
    }
    lines.push(`  )`);
    lines.push(`}`);
    lines.push(``);
    return lines.join("\n");
  }
  function generateJSX(instance, components, tokens, indent) {
    const compDef = components.get(instance.component);
    const allProps = [...compDef?.properties || [], ...instance.properties];
    const style = generateStyles(allProps, tokens);
    const styleStr = Object.keys(style).length > 0 ? ` style={${formatStyleObject(style)}}` : "";
    const tag = getHtmlTag(instance.component, compDef);
    const textContent = getTextContent(instance, allProps);
    const hasChildren = instance.children.length > 0 || textContent;
    if (!hasChildren) {
      return `${indent}<${tag}${styleStr} />`;
    }
    const lines = [];
    lines.push(`${indent}<${tag}${styleStr}>`);
    if (textContent) {
      lines.push(`${indent}  ${JSON.stringify(textContent)}`);
    }
    for (const child of instance.children) {
      if (child.type === "Instance") {
        lines.push(generateJSX(child, components, tokens, indent + "  "));
      } else if (child.type === "Text") {
        lines.push(`${indent}  ${JSON.stringify(child.content)}`);
      }
    }
    lines.push(`${indent}</${tag}>`);
    return lines.join("\n");
  }
  function getHtmlTag(componentName, compDef) {
    const primitive = compDef?.primitive?.toLowerCase();
    if (primitive === "button") return "button";
    if (primitive === "input") return "input";
    if (primitive === "textarea") return "textarea";
    if (primitive === "image") return "img";
    if (primitive === "link") return "a";
    if (primitive === "text") return "span";
    const name = componentName.toLowerCase();
    if (name.includes("button") || name === "btn") return "button";
    if (name.includes("input") || name.includes("field")) return "input";
    if (name.includes("link")) return "a";
    if (name.includes("heading") || name.includes("title")) return "h2";
    if (name.includes("text") || name.includes("label") || name.includes("body")) return "span";
    if (name.includes("nav")) return "nav";
    if (name.includes("header")) return "header";
    if (name.includes("footer")) return "footer";
    if (name.includes("main")) return "main";
    if (name.includes("section")) return "section";
    if (name.includes("aside") || name.includes("sidebar")) return "aside";
    return "div";
  }
  function getTextContent(instance, properties2) {
    for (const prop of properties2) {
      if (prop.name === "content" && prop.values.length > 0) {
        const val = prop.values[0];
        if (typeof val === "string") return val;
      }
    }
    for (const child of instance.children) {
      if (child.type === "Text") {
        return child.content;
      }
    }
    return null;
  }
  function generateStyles(properties2, tokens) {
    const style = {};
    const tokenMap = /* @__PURE__ */ new Map();
    for (const token of tokens) {
      const nameWithoutPrefix = token.name.startsWith("$") ? token.name.slice(1) : token.name;
      const nameWithPrefix = "$" + nameWithoutPrefix;
      let resolvedValue = token.value;
      if (typeof resolvedValue === "string" && resolvedValue.startsWith("$")) {
        const refName = resolvedValue.slice(1);
        const found = tokens.find((t) => {
          const n = t.name.startsWith("$") ? t.name.slice(1) : t.name;
          return n === refName;
        });
        if (found) resolvedValue = found.value;
      }
      tokenMap.set(nameWithoutPrefix, resolvedValue);
      tokenMap.set(nameWithPrefix, resolvedValue);
    }
    const resolve = (value) => {
      if (typeof value === "object" && value !== null && "name" in value) {
        const tokenName = value.name;
        const cleanName = tokenName.startsWith("$") ? tokenName.slice(1) : tokenName;
        return tokenMap.get(cleanName) ?? tokenMap.get("$" + cleanName) ?? `$${cleanName}`;
      }
      if (typeof value === "string" && value.startsWith("$")) {
        const cleanName = value.slice(1);
        return tokenMap.get(cleanName) ?? tokenMap.get(value) ?? value;
      }
      if (typeof value === "boolean") return value ? 1 : 0;
      return value;
    };
    for (const prop of properties2) {
      if (prop.values.length === 0) continue;
      const rawValue = prop.values[0];
      const value = resolve(rawValue);
      switch (prop.name) {
        // Layout
        case "hor":
        case "horizontal":
          style.display = "flex";
          style.flexDirection = "row";
          break;
        case "ver":
        case "vertical":
          style.display = "flex";
          style.flexDirection = "column";
          break;
        case "wrap":
          style.flexWrap = "wrap";
          break;
        case "spread":
          style.justifyContent = "space-between";
          break;
        case "center":
        case "cen":
          style.display = "flex";
          style.justifyContent = "center";
          style.alignItems = "center";
          break;
        // Alignment
        case "left":
          style.justifyContent = "flex-start";
          break;
        case "right":
          style.justifyContent = "flex-end";
          break;
        case "top":
          style.alignItems = "flex-start";
          break;
        case "bottom":
          style.alignItems = "flex-end";
          break;
        // Spacing
        case "gap":
        case "g":
          style.gap = typeof value === "number" ? `${value}px` : value;
          break;
        case "pad":
        case "padding":
        case "p":
          style.padding = typeof value === "number" ? `${value}px` : value;
          break;
        case "margin":
        case "m":
          style.margin = typeof value === "number" ? `${value}px` : value;
          break;
        // Size
        case "w":
        case "width":
          if (value === "full") {
            style.width = "100%";
          } else if (value === "hug") {
            style.width = "fit-content";
          } else {
            style.width = typeof value === "number" ? `${value}px` : value;
          }
          break;
        case "h":
        case "height":
          if (value === "full") {
            style.height = "100%";
          } else if (value === "hug") {
            style.height = "fit-content";
          } else {
            style.height = typeof value === "number" ? `${value}px` : value;
          }
          break;
        case "minw":
        case "min-width":
          style.minWidth = typeof value === "number" ? `${value}px` : value;
          break;
        case "maxw":
        case "max-width":
          style.maxWidth = typeof value === "number" ? `${value}px` : value;
          break;
        case "minh":
        case "min-height":
          style.minHeight = typeof value === "number" ? `${value}px` : value;
          break;
        case "maxh":
        case "max-height":
          style.maxHeight = typeof value === "number" ? `${value}px` : value;
          break;
        // Colors
        case "col":
        case "color":
        case "c":
          style.color = String(value);
          break;
        case "bg":
        case "background":
          style.backgroundColor = String(value);
          break;
        // Border
        case "bor":
        case "border":
          style.border = typeof value === "number" ? `${value}px solid` : String(value);
          break;
        case "boc":
        case "border-color":
          style.borderColor = String(value);
          break;
        case "rad":
        case "radius":
          style.borderRadius = typeof value === "number" ? `${value}px` : value;
          break;
        // Typography
        case "font-size":
        case "fs":
          style.fontSize = typeof value === "number" ? `${value}px` : value;
          break;
        case "weight":
          style.fontWeight = value;
          break;
        case "font":
          style.fontFamily = String(value);
          break;
        case "line":
        case "line-height":
          style.lineHeight = value;
          break;
        // Visual
        case "opacity":
        case "o":
          style.opacity = value;
          break;
        case "cursor":
          style.cursor = String(value);
          break;
        case "overflow":
          style.overflow = String(value);
          break;
        case "scroll":
          style.overflowY = "auto";
          break;
        case "hidden":
          style.display = "none";
          break;
      }
    }
    return style;
  }
  function formatStyleObject(style) {
    const entries = Object.entries(style);
    if (entries.length === 0) return "{}";
    const parts = entries.map(([key, value]) => {
      const formattedValue = typeof value === "string" ? `'${value}'` : value;
      return `${key}: ${formattedValue}`;
    });
    return `{ ${parts.join(", ")} }`;
  }

  // src/backends/static.ts
  function generateStatic(ast) {
    const ir = toIR(ast);
    const lines = [
      "<!DOCTYPE html>",
      "<html>",
      "<head>",
      '  <meta charset="UTF-8">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
      "  <title>Mirror App</title>",
      "  <style>",
      "    /* TODO: Generate CSS from tokens and styles */",
      "  </style>",
      "</head>",
      "<body>",
      ""
    ];
    for (const node of ir.nodes) {
      lines.push(`  <!-- ${node.name || node.tag} -->`);
      lines.push(`  <${node.tag}></${node.tag}>`);
    }
    lines.push("");
    lines.push("</body>");
    lines.push("</html>");
    lines.push("");
    return lines.join("\n");
  }

  // src/preprocessor.ts
  var DIRECTORY_ORDER = ["data", "tokens", "components", "layouts"];
  function combineProjectFiles(listFiles, readFile) {
    const sections = [];
    for (const dir of DIRECTORY_ORDER) {
      const files = listFiles(dir);
      for (const file of files) {
        const content = readFile(`${dir}/${file}`);
        if (content) {
          sections.push(`// === ${dir}/${file} ===`);
          sections.push(content);
          sections.push("");
        }
      }
    }
    return sections.join("\n");
  }
  function combineFiles(files, readFile) {
    const sections = [];
    for (const file of files) {
      const content = readFile(file);
      if (content) {
        sections.push(content);
        sections.push("");
      }
    }
    return sections.join("\n");
  }

  // src/studio/selection-manager.ts
  var SelectionManager = class {
    selectedNodeId = null;
    hoveredNodeId = null;
    listeners = /* @__PURE__ */ new Set();
    hoverListeners = /* @__PURE__ */ new Set();
    breadcrumbListeners = /* @__PURE__ */ new Set();
    currentBreadcrumb = [];
    /**
     * Select a node by ID
     * @param nodeId The node ID to select, or null to clear selection
     */
    select(nodeId) {
      if (nodeId === this.selectedNodeId) {
        return;
      }
      const previous = this.selectedNodeId;
      this.selectedNodeId = nodeId;
      this.notifyListeners(nodeId, previous);
    }
    /**
     * Get the currently selected node ID
     */
    getSelection() {
      return this.selectedNodeId;
    }
    /**
     * Clear the current selection
     */
    clearSelection() {
      this.select(null);
    }
    /**
     * Check if a specific node is selected
     */
    isSelected(nodeId) {
      return this.selectedNodeId === nodeId;
    }
    /**
     * Set hover state for a node
     * @param nodeId The node ID being hovered, or null to clear hover
     */
    hover(nodeId) {
      if (nodeId === this.hoveredNodeId) {
        return;
      }
      const previous = this.hoveredNodeId;
      this.hoveredNodeId = nodeId;
      this.notifyHoverListeners(nodeId, previous);
    }
    /**
     * Get the currently hovered node ID
     */
    getHoveredNode() {
      return this.hoveredNodeId;
    }
    /**
     * Subscribe to selection changes
     * @param listener The callback to invoke when selection changes
     * @returns Unsubscribe function
     */
    subscribe(listener) {
      this.listeners.add(listener);
      return () => {
        this.listeners.delete(listener);
      };
    }
    /**
     * Subscribe to hover changes
     * @param listener The callback to invoke when hover changes
     * @returns Unsubscribe function
     */
    subscribeHover(listener) {
      this.hoverListeners.add(listener);
      return () => {
        this.hoverListeners.delete(listener);
      };
    }
    /**
     * Subscribe to breadcrumb changes
     * @param listener The callback to invoke when breadcrumb changes
     * @returns Unsubscribe function
     */
    subscribeBreadcrumb(listener) {
      this.breadcrumbListeners.add(listener);
      if (this.currentBreadcrumb.length > 0) {
        listener(this.currentBreadcrumb);
      }
      return () => {
        this.breadcrumbListeners.delete(listener);
      };
    }
    /**
     * Set the current breadcrumb chain
     * Called by PreviewInteraction when selection changes
     */
    setBreadcrumb(chain) {
      this.currentBreadcrumb = chain;
      this.notifyBreadcrumbListeners(chain);
    }
    /**
     * Get the current breadcrumb chain
     */
    getBreadcrumb() {
      return this.currentBreadcrumb;
    }
    /**
     * Get number of subscribers
     */
    get subscriberCount() {
      return this.listeners.size;
    }
    /**
     * Notify all selection listeners
     */
    notifyListeners(nodeId, previousNodeId) {
      for (const listener of this.listeners) {
        try {
          listener(nodeId, previousNodeId);
        } catch (error) {
          console.error("Error in selection listener:", error);
        }
      }
    }
    /**
     * Notify all hover listeners
     */
    notifyHoverListeners(nodeId, previousNodeId) {
      for (const listener of this.hoverListeners) {
        try {
          listener(nodeId, previousNodeId);
        } catch (error) {
          console.error("Error in hover listener:", error);
        }
      }
    }
    /**
     * Notify all breadcrumb listeners
     */
    notifyBreadcrumbListeners(chain) {
      for (const listener of this.breadcrumbListeners) {
        try {
          listener(chain);
        } catch (error) {
          console.error("Error in breadcrumb listener:", error);
        }
      }
    }
    /**
     * Dispose the manager and clear all listeners
     */
    dispose() {
      this.listeners.clear();
      this.hoverListeners.clear();
      this.breadcrumbListeners.clear();
      this.selectedNodeId = null;
      this.hoveredNodeId = null;
      this.currentBreadcrumb = [];
    }
  };
  var defaultInstance = null;
  function getSelectionManager() {
    if (!defaultInstance) {
      defaultInstance = new SelectionManager();
    }
    return defaultInstance;
  }
  function resetSelectionManager() {
    if (defaultInstance) {
      defaultInstance.dispose();
      defaultInstance = null;
    }
  }

  // src/studio/preview-interaction.ts
  var DEFAULT_HOVER_STYLES = {
    outline: "2px solid rgba(59, 130, 246, 0.5)",
    outlineOffset: "-2px"
  };
  var DEFAULT_SELECTED_STYLES = {
    outline: "2px solid #3B82F6",
    outlineOffset: "-2px"
  };
  var PreviewInteraction = class {
    container;
    selectionManager;
    options;
    currentHoverElement = null;
    currentSelectedElement = null;
    boundHandleClick;
    boundHandleMouseOver;
    boundHandleMouseOut;
    unsubscribeSelection = null;
    unsubscribeHover = null;
    constructor(container, selectionManager, options = {}) {
      this.container = container;
      this.selectionManager = selectionManager;
      this.options = {
        hoverClass: options.hoverClass || "",
        selectedClass: options.selectedClass || "",
        stopPropagation: options.stopPropagation ?? true,
        nodeIdAttribute: options.nodeIdAttribute || "data-mirror-id"
      };
      this.boundHandleClick = this.handleClick.bind(this);
      this.boundHandleMouseOver = this.handleMouseOver.bind(this);
      this.boundHandleMouseOut = this.handleMouseOut.bind(this);
      this.attach();
    }
    /**
     * Attach event listeners
     */
    attach() {
      this.container.addEventListener("click", this.boundHandleClick);
      this.container.addEventListener("mouseover", this.boundHandleMouseOver);
      this.container.addEventListener("mouseout", this.boundHandleMouseOut);
      this.unsubscribeSelection = this.selectionManager.subscribe((nodeId, previousNodeId) => {
        this.updateSelectionVisual(nodeId, previousNodeId);
        if (nodeId) {
          const element = this.findElementByNodeId(nodeId);
          if (element) {
            const chain = this.getAncestorChain(element).map((item) => ({
              nodeId: item.id,
              name: item.name
            }));
            this.selectionManager.setBreadcrumb(chain);
          }
        } else {
          this.selectionManager.setBreadcrumb([]);
        }
      });
      this.unsubscribeHover = this.selectionManager.subscribeHover((nodeId, previousNodeId) => {
        this.updateHoverVisual(nodeId, previousNodeId);
      });
    }
    /**
     * Detach event listeners
     */
    detach() {
      this.container.removeEventListener("click", this.boundHandleClick);
      this.container.removeEventListener("mouseover", this.boundHandleMouseOver);
      this.container.removeEventListener("mouseout", this.boundHandleMouseOut);
      if (this.unsubscribeSelection) {
        this.unsubscribeSelection();
        this.unsubscribeSelection = null;
      }
      if (this.unsubscribeHover) {
        this.unsubscribeHover();
        this.unsubscribeHover = null;
      }
      this.clearHighlight(this.currentHoverElement);
      this.clearSelection(this.currentSelectedElement);
      this.currentHoverElement = null;
      this.currentSelectedElement = null;
    }
    /**
     * Handle click events
     */
    handleClick(e) {
      const target = e.target;
      const nodeId = this.findNodeId(target);
      if (this.options.stopPropagation && nodeId) {
        e.stopPropagation();
      }
      this.selectionManager.select(nodeId);
    }
    /**
     * Handle mouseover events
     */
    handleMouseOver(e) {
      const target = e.target;
      const nodeId = this.findNodeId(target);
      this.selectionManager.hover(nodeId);
    }
    /**
     * Handle mouseout events
     */
    handleMouseOut(e) {
      const relatedTarget = e.relatedTarget;
      if (!relatedTarget || !this.container.contains(relatedTarget)) {
        this.selectionManager.hover(null);
      }
    }
    /**
     * Find the node ID for an element by traversing up the DOM tree
     */
    findNodeId(element) {
      let current = element;
      while (current && current !== this.container) {
        const nodeId = current.getAttribute(this.options.nodeIdAttribute);
        if (nodeId) {
          return nodeId;
        }
        current = current.parentElement;
      }
      return null;
    }
    /**
     * Find element by node ID
     */
    findElementByNodeId(nodeId) {
      return this.container.querySelector(`[${this.options.nodeIdAttribute}="${nodeId}"]`);
    }
    /**
     * Update visual state when selection changes
     */
    updateSelectionVisual(nodeId, previousNodeId) {
      if (previousNodeId && this.currentSelectedElement) {
        this.clearSelection(this.currentSelectedElement);
        this.currentSelectedElement = null;
      }
      if (nodeId) {
        const element = this.findElementByNodeId(nodeId);
        if (element) {
          this.applySelection(element);
          this.currentSelectedElement = element;
        }
      }
    }
    /**
     * Update visual state when hover changes
     */
    updateHoverVisual(nodeId, previousNodeId) {
      if (previousNodeId && this.currentHoverElement) {
        this.clearHighlight(this.currentHoverElement);
        this.currentHoverElement = null;
      }
      if (nodeId && nodeId !== this.selectionManager.getSelection()) {
        const element = this.findElementByNodeId(nodeId);
        if (element) {
          this.applyHighlight(element);
          this.currentHoverElement = element;
        }
      }
    }
    /**
     * Apply hover highlight to an element
     */
    applyHighlight(element) {
      if (this.options.hoverClass) {
        element.classList.add(this.options.hoverClass);
      } else {
        element.style.outline = DEFAULT_HOVER_STYLES.outline;
        element.style.outlineOffset = DEFAULT_HOVER_STYLES.outlineOffset;
      }
    }
    /**
     * Clear hover highlight from an element
     */
    clearHighlight(element) {
      if (!element) return;
      if (this.options.hoverClass) {
        element.classList.remove(this.options.hoverClass);
      } else {
        element.style.outline = "";
        element.style.outlineOffset = "";
      }
    }
    /**
     * Apply selection highlight to an element
     */
    applySelection(element) {
      if (this.options.selectedClass) {
        element.classList.add(this.options.selectedClass);
      } else {
        element.style.outline = DEFAULT_SELECTED_STYLES.outline;
        element.style.outlineOffset = DEFAULT_SELECTED_STYLES.outlineOffset;
      }
    }
    /**
     * Clear selection highlight from an element
     */
    clearSelection(element) {
      if (!element) return;
      if (this.options.selectedClass) {
        element.classList.remove(this.options.selectedClass);
      } else {
        element.style.outline = "";
        element.style.outlineOffset = "";
      }
    }
    /**
     * Get the ancestor chain for breadcrumb navigation
     * Returns array from root to selected element
     */
    getAncestorChain(element) {
      const chain = [];
      let current = element;
      while (current && current !== this.container) {
        const id = current.dataset?.mirrorId;
        const name = current.dataset?.mirrorName || current.tagName.toLowerCase();
        if (id) {
          chain.push({ id, name });
        }
        current = current.parentElement;
      }
      return chain.reverse();
    }
    /**
     * Get the ancestor chain for the currently selected element
     */
    getSelectedAncestorChain() {
      const selectedId = this.selectionManager.getSelection();
      if (!selectedId) return null;
      const element = this.findElementByNodeId(selectedId);
      if (!element) return null;
      return this.getAncestorChain(element);
    }
    /**
     * Refresh the visual state (useful after preview re-render)
     */
    refresh() {
      const selectedId = this.selectionManager.getSelection();
      const hoveredId = this.selectionManager.getHoveredNode();
      this.clearSelection(this.currentSelectedElement);
      this.clearHighlight(this.currentHoverElement);
      this.currentSelectedElement = null;
      this.currentHoverElement = null;
      if (selectedId) {
        this.updateSelectionVisual(selectedId, null);
      }
      if (hoveredId && hoveredId !== selectedId) {
        this.updateHoverVisual(hoveredId, null);
      }
    }
    /**
     * Dispose the interaction handler
     */
    dispose() {
      this.detach();
    }
  };
  function createPreviewInteraction(container, selectionManager, options) {
    return new PreviewInteraction(container, selectionManager, options);
  }

  // src/schema/properties.ts
  var properties = [
    // ============================================
    // LAYOUT
    // ============================================
    {
      name: "horizontal",
      aliases: ["hor"],
      type: "boolean",
      category: "layout",
      description: "Horizontal layout (flex-direction: row)"
    },
    {
      name: "vertical",
      aliases: ["ver"],
      type: "boolean",
      category: "layout",
      description: "Vertical layout (flex-direction: column)"
    },
    {
      name: "center",
      aliases: ["cen"],
      type: "boolean",
      category: "alignment",
      description: "Center on both axes"
    },
    {
      name: "gap",
      aliases: ["g"],
      type: "number",
      category: "layout",
      description: "Gap between children",
      unit: "px"
    },
    {
      name: "spread",
      aliases: [],
      type: "boolean",
      category: "layout",
      description: "Space-between distribution"
    },
    {
      name: "wrap",
      aliases: [],
      type: "boolean",
      category: "layout",
      description: "Allow flex wrap"
    },
    {
      name: "stacked",
      aliases: [],
      type: "boolean",
      category: "layout",
      description: "Stack children (z-layers)"
    },
    {
      name: "grid",
      aliases: [],
      type: "boolean",
      category: "layout",
      description: "Grid layout"
    },
    // ============================================
    // ALIGNMENT
    // ============================================
    {
      name: "left",
      aliases: [],
      type: "boolean",
      category: "alignment",
      description: "Align left"
    },
    {
      name: "right",
      aliases: [],
      type: "boolean",
      category: "alignment",
      description: "Align right"
    },
    {
      name: "hor-center",
      aliases: [],
      type: "boolean",
      category: "alignment",
      description: "Center horizontally"
    },
    {
      name: "top",
      aliases: [],
      type: "boolean",
      category: "alignment",
      description: "Align top"
    },
    {
      name: "bottom",
      aliases: [],
      type: "boolean",
      category: "alignment",
      description: "Align bottom"
    },
    {
      name: "ver-center",
      aliases: [],
      type: "boolean",
      category: "alignment",
      description: "Center vertically"
    },
    // ============================================
    // SIZING
    // ============================================
    {
      name: "width",
      aliases: ["w"],
      type: "size",
      category: "sizing",
      description: "Width (px, %, hug, full)"
    },
    {
      name: "height",
      aliases: ["h"],
      type: "size",
      category: "sizing",
      description: "Height (px, %, hug, full)"
    },
    {
      name: "size",
      aliases: [],
      type: "size",
      category: "sizing",
      description: "Width and height combined"
    },
    {
      name: "min-width",
      aliases: ["minw"],
      type: "number",
      category: "sizing",
      description: "Minimum width",
      unit: "px"
    },
    {
      name: "max-width",
      aliases: ["maxw"],
      type: "number",
      category: "sizing",
      description: "Maximum width",
      unit: "px"
    },
    {
      name: "min-height",
      aliases: ["minh"],
      type: "number",
      category: "sizing",
      description: "Minimum height",
      unit: "px"
    },
    {
      name: "max-height",
      aliases: ["maxh"],
      type: "number",
      category: "sizing",
      description: "Maximum height",
      unit: "px"
    },
    // ============================================
    // SPACING
    // ============================================
    {
      name: "padding",
      aliases: ["pad", "p"],
      type: "spacing",
      category: "spacing",
      description: "Inner spacing",
      directions: ["top", "right", "bottom", "left", "t", "r", "b", "l"]
    },
    {
      name: "margin",
      aliases: ["mar", "m"],
      type: "spacing",
      category: "spacing",
      description: "Outer spacing",
      directions: ["top", "right", "bottom", "left", "t", "r", "b", "l"]
    },
    // ============================================
    // COLOR
    // ============================================
    {
      name: "color",
      aliases: ["col", "c"],
      type: "color",
      category: "color",
      description: "Text color"
    },
    {
      name: "background",
      aliases: ["bg"],
      type: "color",
      category: "color",
      description: "Background color"
    },
    {
      name: "border-color",
      aliases: ["boc"],
      type: "color",
      category: "color",
      description: "Border color"
    },
    // ============================================
    // BORDER
    // ============================================
    {
      name: "border",
      aliases: ["bor"],
      type: "border",
      category: "border",
      description: "Border (width style color)",
      directions: ["top", "right", "bottom", "left", "t", "r", "b", "l"]
    },
    {
      name: "radius",
      aliases: ["rad"],
      type: "number",
      category: "border",
      description: "Border radius",
      unit: "px",
      directions: ["tl", "tr", "bl", "br", "t", "b", "l", "r"]
    },
    // ============================================
    // TYPOGRAPHY
    // ============================================
    {
      name: "font-size",
      aliases: ["fs"],
      type: "number",
      category: "typography",
      description: "Font size",
      unit: "px"
    },
    {
      name: "weight",
      aliases: [],
      type: "enum",
      category: "typography",
      description: "Font weight",
      options: ["100", "200", "300", "400", "500", "600", "700", "800", "900", "bold"]
    },
    {
      name: "line",
      aliases: [],
      type: "number",
      category: "typography",
      description: "Line height"
    },
    {
      name: "font",
      aliases: [],
      type: "string",
      category: "typography",
      description: "Font family"
    },
    {
      name: "text-align",
      aliases: [],
      type: "enum",
      category: "typography",
      description: "Text alignment",
      options: ["left", "center", "right", "justify"]
    },
    {
      name: "italic",
      aliases: [],
      type: "boolean",
      category: "typography",
      description: "Italic text"
    },
    {
      name: "underline",
      aliases: [],
      type: "boolean",
      category: "typography",
      description: "Underlined text"
    },
    {
      name: "truncate",
      aliases: [],
      type: "boolean",
      category: "typography",
      description: "Truncate with ellipsis"
    },
    {
      name: "uppercase",
      aliases: [],
      type: "boolean",
      category: "typography",
      description: "Uppercase text"
    },
    {
      name: "lowercase",
      aliases: [],
      type: "boolean",
      category: "typography",
      description: "Lowercase text"
    },
    // ============================================
    // ICON
    // ============================================
    {
      name: "icon-size",
      aliases: ["is"],
      type: "number",
      category: "icon",
      description: "Icon size",
      unit: "px",
      defaultValue: 24
    },
    {
      name: "icon-weight",
      aliases: ["iw"],
      type: "number",
      category: "icon",
      description: "Icon stroke weight",
      min: 100,
      max: 700,
      defaultValue: 400
    },
    {
      name: "icon-color",
      aliases: ["ic"],
      type: "color",
      category: "icon",
      description: "Icon color (overrides color)"
    },
    {
      name: "fill",
      aliases: [],
      type: "boolean",
      category: "icon",
      description: "Filled icon (Material only)"
    },
    // ============================================
    // VISUAL
    // ============================================
    {
      name: "opacity",
      aliases: ["o"],
      type: "number",
      category: "visual",
      description: "Opacity",
      min: 0,
      max: 1,
      defaultValue: 1
    },
    {
      name: "shadow",
      aliases: [],
      type: "enum",
      category: "visual",
      description: "Box shadow",
      options: ["sm", "md", "lg", "xl", "none"]
    },
    {
      name: "cursor",
      aliases: [],
      type: "enum",
      category: "visual",
      description: "Cursor style",
      options: ["pointer", "default", "text", "move", "not-allowed", "grab", "grabbing"]
    },
    {
      name: "z",
      aliases: [],
      type: "number",
      category: "visual",
      description: "Z-index"
    },
    {
      name: "hidden",
      aliases: [],
      type: "boolean",
      category: "visual",
      description: "Hidden initially"
    },
    {
      name: "visible",
      aliases: [],
      type: "boolean",
      category: "visual",
      description: "Visible"
    },
    {
      name: "disabled",
      aliases: [],
      type: "boolean",
      category: "visual",
      description: "Disabled state"
    },
    {
      name: "rotate",
      aliases: ["rot"],
      type: "number",
      category: "visual",
      description: "Rotation in degrees",
      unit: "deg"
    },
    {
      name: "translate",
      aliases: [],
      type: "string",
      category: "visual",
      description: "X Y translation"
    },
    // ============================================
    // SCROLL
    // ============================================
    {
      name: "scroll",
      aliases: [],
      type: "boolean",
      category: "scroll",
      description: "Vertical scroll"
    },
    {
      name: "scroll-ver",
      aliases: [],
      type: "boolean",
      category: "scroll",
      description: "Vertical scroll"
    },
    {
      name: "scroll-hor",
      aliases: [],
      type: "boolean",
      category: "scroll",
      description: "Horizontal scroll"
    },
    {
      name: "scroll-both",
      aliases: [],
      type: "boolean",
      category: "scroll",
      description: "Both directions scroll"
    },
    {
      name: "clip",
      aliases: [],
      type: "boolean",
      category: "scroll",
      description: "Overflow hidden"
    },
    // ============================================
    // HOVER
    // ============================================
    {
      name: "hover-background",
      aliases: ["hover-bg"],
      type: "color",
      category: "hover",
      description: "Background on hover"
    },
    {
      name: "hover-color",
      aliases: ["hover-col"],
      type: "color",
      category: "hover",
      description: "Text color on hover"
    },
    {
      name: "hover-opacity",
      aliases: ["hover-opa"],
      type: "number",
      category: "hover",
      description: "Opacity on hover",
      min: 0,
      max: 1
    },
    {
      name: "hover-scale",
      aliases: [],
      type: "number",
      category: "hover",
      description: "Scale on hover"
    },
    {
      name: "hover-border",
      aliases: ["hover-bor"],
      type: "border",
      category: "hover",
      description: "Border on hover"
    },
    {
      name: "hover-border-color",
      aliases: ["hover-boc"],
      type: "color",
      category: "hover",
      description: "Border color on hover"
    },
    {
      name: "hover-radius",
      aliases: ["hover-rad"],
      type: "number",
      category: "hover",
      description: "Border radius on hover"
    },
    // ============================================
    // CONTENT (for primitives)
    // ============================================
    {
      name: "content",
      aliases: [],
      type: "string",
      category: "content",
      description: "Text content"
    },
    {
      name: "placeholder",
      aliases: [],
      type: "string",
      category: "content",
      description: "Input placeholder"
    },
    {
      name: "src",
      aliases: [],
      type: "string",
      category: "content",
      description: "Image source URL"
    },
    {
      name: "href",
      aliases: [],
      type: "string",
      category: "content",
      description: "Link URL"
    },
    {
      name: "value",
      aliases: [],
      type: "string",
      category: "content",
      description: "Input value"
    }
  ];
  var categoryLabels = {
    layout: "Layout",
    alignment: "Alignment",
    sizing: "Size",
    spacing: "Spacing",
    color: "Color",
    border: "Border",
    typography: "Typography",
    icon: "Icon",
    visual: "Visual",
    scroll: "Scroll",
    hover: "Hover",
    content: "Content"
  };
  var categoryOrder = [
    "layout",
    "alignment",
    "sizing",
    "spacing",
    "color",
    "border",
    "typography",
    "icon",
    "visual",
    "scroll",
    "hover",
    "content"
  ];

  // src/studio/property-extractor.ts
  var PROPERTY_TYPES = {
    // Colors
    color: "color",
    col: "color",
    c: "color",
    background: "color",
    bg: "color",
    "border-color": "color",
    boc: "color",
    "hover-bg": "color",
    "hover-col": "color",
    "hover-boc": "color",
    // Sizes
    width: "size",
    w: "size",
    height: "size",
    h: "size",
    "min-width": "size",
    minw: "size",
    "max-width": "size",
    maxw: "size",
    "min-height": "size",
    minh: "size",
    "max-height": "size",
    maxh: "size",
    "font-size": "size",
    fs: "size",
    size: "size",
    // Spacing
    padding: "spacing",
    pad: "spacing",
    p: "spacing",
    margin: "spacing",
    m: "spacing",
    gap: "spacing",
    g: "spacing",
    // Numbers
    opacity: "number",
    o: "number",
    z: "number",
    weight: "number",
    line: "number",
    radius: "number",
    rad: "number",
    border: "number",
    bor: "number",
    // Booleans
    horizontal: "boolean",
    hor: "boolean",
    vertical: "boolean",
    ver: "boolean",
    center: "boolean",
    cen: "boolean",
    spread: "boolean",
    wrap: "boolean",
    stacked: "boolean",
    grid: "boolean",
    hidden: "boolean",
    visible: "boolean",
    disabled: "boolean",
    italic: "boolean",
    underline: "boolean",
    truncate: "boolean",
    uppercase: "boolean",
    lowercase: "boolean",
    // Text
    content: "text",
    placeholder: "text",
    href: "text",
    src: "text",
    font: "text",
    // Select
    cursor: "select",
    shadow: "select",
    "text-align": "select"
  };
  var CATEGORY_MAP = {
    // Layout
    horizontal: "layout",
    hor: "layout",
    vertical: "layout",
    ver: "layout",
    spread: "layout",
    wrap: "layout",
    stacked: "layout",
    grid: "layout",
    gap: "layout",
    g: "layout",
    // Alignment
    center: "alignment",
    cen: "alignment",
    left: "alignment",
    right: "alignment",
    "hor-center": "alignment",
    top: "alignment",
    bottom: "alignment",
    "ver-center": "alignment",
    // Sizing (matches schema category 'sizing')
    width: "sizing",
    w: "sizing",
    height: "sizing",
    h: "sizing",
    "min-width": "sizing",
    minw: "sizing",
    "max-width": "sizing",
    maxw: "sizing",
    "min-height": "sizing",
    minh: "sizing",
    "max-height": "sizing",
    maxh: "sizing",
    size: "sizing",
    // Spacing
    padding: "spacing",
    pad: "spacing",
    p: "spacing",
    margin: "spacing",
    m: "spacing",
    // Color (matches schema category 'color')
    color: "color",
    col: "color",
    c: "color",
    background: "color",
    bg: "color",
    "border-color": "color",
    boc: "color",
    // Border
    border: "border",
    bor: "border",
    radius: "border",
    rad: "border",
    // Typography
    "font-size": "typography",
    fs: "typography",
    weight: "typography",
    line: "typography",
    font: "typography",
    "text-align": "typography",
    italic: "typography",
    underline: "typography",
    truncate: "typography",
    uppercase: "typography",
    lowercase: "typography",
    // Visual
    opacity: "visual",
    o: "visual",
    shadow: "visual",
    cursor: "visual",
    z: "visual"
  };
  var CATEGORY_LABELS = {
    layout: "Layout",
    alignment: "Alignment",
    sizing: "Size",
    spacing: "Spacing",
    color: "Color",
    border: "Border",
    typography: "Typography",
    visual: "Visual",
    hover: "Hover",
    other: "Other"
  };
  var PropertyExtractor = class {
    ast;
    sourceMap;
    componentMap = /* @__PURE__ */ new Map();
    showAllProperties = true;
    constructor(ast, sourceMap, options) {
      this.ast = ast;
      this.sourceMap = sourceMap;
      this.showAllProperties = options?.showAllProperties ?? true;
      for (const comp of ast.components) {
        this.componentMap.set(comp.name, comp);
      }
    }
    /**
     * Set whether to show all available properties or only set ones
     */
    setShowAllProperties(show) {
      this.showAllProperties = show;
    }
    /**
     * Get all properties for a node
     */
    getProperties(nodeId) {
      const isTemplateInstance = this.sourceMap.isTemplateInstance(nodeId);
      const templateId = isTemplateInstance ? this.sourceMap.getTemplateId(nodeId) : void 0;
      const nodeMapping = this.sourceMap.getNodeById(nodeId);
      if (!nodeMapping) {
        return null;
      }
      const astNode = this.findAstNode(nodeMapping);
      if (!astNode) {
        return null;
      }
      const allProperties = [];
      if ("properties" in astNode) {
        for (const prop of astNode.properties) {
          allProperties.push(this.extractProperty(prop, "instance"));
        }
      }
      if (!nodeMapping.isDefinition) {
        const componentDef = this.componentMap.get(nodeMapping.componentName);
        if (componentDef) {
          const inheritedProps = this.getInheritedProperties(componentDef);
          for (const prop of inheritedProps) {
            if (!allProperties.some((p) => p.name === prop.name)) {
              allProperties.push(prop);
            }
          }
        }
      }
      if (this.showAllProperties) {
        this.addAvailableProperties(allProperties);
      }
      const categories = this.showAllProperties ? this.categorizeAllProperties(allProperties) : this.categorizeProperties(allProperties);
      return {
        nodeId,
        componentName: nodeMapping.componentName,
        instanceName: nodeMapping.instanceName,
        isDefinition: nodeMapping.isDefinition,
        isTemplateInstance,
        templateId,
        categories,
        allProperties,
        showAllProperties: this.showAllProperties
      };
    }
    /**
     * Add all available properties from schema (not already set)
     */
    addAvailableProperties(existingProps) {
      const existingNames = new Set(existingProps.map((p) => p.name));
      for (const prop of existingProps) {
        const def = properties.find(
          (d) => d.name === prop.name || d.aliases.includes(prop.name)
        );
        if (def) {
          existingNames.add(def.name);
          def.aliases.forEach((a) => existingNames.add(a));
        }
      }
      for (const propDef of properties) {
        if (existingNames.has(propDef.name)) continue;
        existingProps.push({
          name: propDef.name,
          value: "",
          type: this.schemaTypeToPropertyType(propDef.type),
          source: "available",
          line: 0,
          column: 0,
          isToken: false,
          hasValue: false,
          description: propDef.description,
          options: propDef.options
        });
      }
    }
    /**
     * Convert schema type to PropertyType
     */
    schemaTypeToPropertyType(type) {
      switch (type) {
        case "color":
          return "color";
        case "number":
          return "number";
        case "size":
          return "size";
        case "spacing":
          return "spacing";
        case "boolean":
          return "boolean";
        case "string":
          return "text";
        case "enum":
          return "select";
        case "border":
          return "number";
        default:
          return "unknown";
      }
    }
    /**
     * Categorize properties using schema categories (for all properties mode)
     */
    categorizeAllProperties(properties2) {
      const categoryMap = /* @__PURE__ */ new Map();
      for (const prop of properties2) {
        const schemaProp = properties.find(
          (d) => d.name === prop.name || d.aliases.includes(prop.name)
        );
        const category = schemaProp?.category || "other";
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category).push(prop);
      }
      const categories = [];
      for (const catName of categoryOrder) {
        const props = categoryMap.get(catName);
        if (props && props.length > 0) {
          props.sort((a, b) => {
            if (a.hasValue !== false && b.hasValue === false) return -1;
            if (a.hasValue === false && b.hasValue !== false) return 1;
            return 0;
          });
          categories.push({
            name: catName,
            label: categoryLabels[catName] || catName,
            properties: props
          });
        }
      }
      const otherProps = categoryMap.get("other");
      if (otherProps && otherProps.length > 0) {
        categories.push({
          name: "other",
          label: "Other",
          properties: otherProps
        });
      }
      return categories;
    }
    /**
     * Get a specific property value
     */
    getProperty(nodeId, propName) {
      const element = this.getProperties(nodeId);
      if (!element) return null;
      return element.allProperties.find((p) => p.name === propName) || null;
    }
    /**
     * Find AST node from source map mapping
     */
    findAstNode(mapping) {
      for (const inst of this.ast.instances) {
        const found = this.findInInstance(inst, mapping);
        if (found) return found;
      }
      if (mapping.isDefinition) {
        return this.componentMap.get(mapping.componentName) || null;
      }
      return null;
    }
    /**
     * Recursively find an instance matching the mapping
     */
    findInInstance(inst, mapping) {
      if (inst.line === mapping.position.line && inst.column === mapping.position.column) {
        return inst;
      }
      if (inst.children) {
        for (const child of inst.children) {
          if (child.type === "Instance") {
            const found = this.findInInstance(child, mapping);
            if (found) return found;
          }
        }
      }
      return null;
    }
    /**
     * Get inherited properties from component chain
     */
    getInheritedProperties(comp) {
      const props = [];
      if (comp.extends) {
        const parent = this.componentMap.get(comp.extends);
        if (parent) {
          props.push(...this.getInheritedProperties(parent));
        }
      }
      for (const prop of comp.properties) {
        const extracted = this.extractProperty(prop, comp.extends ? "inherited" : "component");
        const existingIndex = props.findIndex((p) => p.name === extracted.name);
        if (existingIndex >= 0) {
          props[existingIndex] = extracted;
        } else {
          props.push(extracted);
        }
      }
      return props;
    }
    /**
     * Extract a property with full metadata
     */
    extractProperty(prop, source) {
      let value = "";
      let isToken = false;
      let tokenName;
      if (prop.values.length === 0) {
        value = "true";
      } else if (prop.values.length === 1) {
        const val = prop.values[0];
        if (typeof val === "object" && "kind" in val && val.kind === "token") {
          isToken = true;
          tokenName = val.name;
          value = `$${val.name}`;
        } else {
          value = String(val);
        }
      } else {
        value = prop.values.map((v) => {
          if (typeof v === "object" && "kind" in v && v.kind === "token") {
            return `$${v.name}`;
          }
          return String(v);
        }).join(" ");
        for (const v of prop.values) {
          if (typeof v === "object" && "kind" in v && v.kind === "token") {
            isToken = true;
            tokenName = v.name;
            break;
          }
        }
      }
      const schemaProp = properties.find(
        (d) => d.name === prop.name || d.aliases.includes(prop.name)
      );
      return {
        name: prop.name,
        value,
        type: this.getPropertyType(prop.name),
        source,
        line: prop.line,
        column: prop.column,
        isToken,
        tokenName,
        hasValue: true,
        description: schemaProp?.description,
        options: schemaProp?.options
      };
    }
    /**
     * Get the type of a property
     */
    getPropertyType(name) {
      return PROPERTY_TYPES[name] || "unknown";
    }
    /**
     * Group properties into categories
     */
    categorizeProperties(properties2) {
      const categoryMap = /* @__PURE__ */ new Map();
      for (const prop of properties2) {
        const category = CATEGORY_MAP[prop.name] || "other";
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category).push(prop);
      }
      const categories = [];
      const order = ["layout", "alignment", "sizing", "spacing", "color", "border", "typography", "visual", "hover", "other"];
      for (const name of order) {
        const props = categoryMap.get(name);
        if (props && props.length > 0) {
          categories.push({
            name,
            label: CATEGORY_LABELS[name] || name,
            properties: props
          });
        }
      }
      return categories;
    }
    /**
     * Update the AST reference
     */
    updateAST(ast) {
      this.ast = ast;
      this.componentMap.clear();
      for (const comp of ast.components) {
        this.componentMap.set(comp.name, comp);
      }
    }
    /**
     * Update the source map reference
     */
    updateSourceMap(sourceMap) {
      this.sourceMap = sourceMap;
    }
  };
  function createPropertyExtractor(ast, sourceMap) {
    return new PropertyExtractor(ast, sourceMap);
  }

  // src/studio/line-property-parser.ts
  var aliasMap = /* @__PURE__ */ new Map();
  var booleanProperties = /* @__PURE__ */ new Set();
  var multiValueProperties = /* @__PURE__ */ new Set();
  var directionalProperties = /* @__PURE__ */ new Set();
  for (const prop of properties) {
    aliasMap.set(prop.name, prop.name);
    for (const alias of prop.aliases) {
      aliasMap.set(alias, prop.name);
    }
    if (prop.type === "boolean") {
      booleanProperties.add(prop.name);
      for (const alias of prop.aliases) {
        booleanProperties.add(alias);
      }
    }
    if (prop.type === "spacing" || prop.type === "border" || prop.type === "size") {
      multiValueProperties.add(prop.name);
      for (const alias of prop.aliases) {
        multiValueProperties.add(alias);
      }
    }
    if (prop.directions && prop.directions.length > 0) {
      directionalProperties.add(prop.name);
      for (const alias of prop.aliases) {
        directionalProperties.add(alias);
      }
    }
  }
  function getCanonicalName(name) {
    return aliasMap.get(name) || name;
  }
  function isSameProperty(name1, name2) {
    return getCanonicalName(name1) === getCanonicalName(name2);
  }
  function isBooleanProperty(name) {
    return booleanProperties.has(name) || booleanProperties.has(getCanonicalName(name));
  }
  function isMultiValueProperty(name) {
    return multiValueProperties.has(name) || multiValueProperties.has(getCanonicalName(name));
  }
  function parseLine(line) {
    const result = {
      indent: "",
      componentPart: "",
      properties: [],
      textContent: null,
      original: line
    };
    const indentMatch = line.match(/^(\s*)/);
    result.indent = indentMatch ? indentMatch[1] : "";
    const content = line.substring(result.indent.length);
    if (!content) return result;
    const componentMatch = content.match(/^([A-Z][a-zA-Z0-9]*(?:\s+as\s+[A-Z][a-zA-Z0-9]*)?:?)/);
    if (!componentMatch) return result;
    result.componentPart = componentMatch[1];
    let remaining = content.substring(componentMatch[0].length);
    let currentPos = result.indent.length + componentMatch[0].length;
    while (remaining.length > 0) {
      const leadingMatch = remaining.match(/^[\s,]+/);
      if (leadingMatch) {
        currentPos += leadingMatch[0].length;
        remaining = remaining.substring(leadingMatch[0].length);
      }
      if (!remaining.length) break;
      if (remaining.startsWith('"') || remaining.startsWith("'")) {
        const quote = remaining[0];
        const endQuote = remaining.indexOf(quote, 1);
        if (endQuote !== -1) {
          result.textContent = remaining.substring(0, endQuote + 1);
        } else {
          result.textContent = remaining;
        }
        break;
      }
      const propStartPos = currentPos;
      const propParsed = parseNextProperty(remaining);
      if (propParsed) {
        result.properties.push({
          name: propParsed.name,
          canonicalName: getCanonicalName(propParsed.name),
          value: propParsed.value,
          startIndex: propStartPos,
          endIndex: propStartPos + propParsed.consumed,
          isBoolean: propParsed.isBoolean
        });
        currentPos += propParsed.consumed;
        remaining = remaining.substring(propParsed.consumed);
      } else {
        const skipMatch = remaining.match(/^[^,]+/);
        if (skipMatch) {
          currentPos += skipMatch[0].length;
          remaining = remaining.substring(skipMatch[0].length);
        } else {
          break;
        }
      }
    }
    return result;
  }
  function parseNextProperty(str) {
    const nameMatch = str.match(/^([a-z][a-z0-9-]*)/);
    if (!nameMatch) return null;
    const name = nameMatch[1];
    let consumed = name.length;
    let remaining = str.substring(consumed);
    let value = "";
    const dirMatch = remaining.match(/^\s+(top|right|bottom|left|t|r|b|l|tl|tr|bl|br)\b/);
    if (dirMatch && directionalProperties.has(name)) {
      consumed += dirMatch[0].length;
      remaining = str.substring(consumed);
      value = dirMatch[1];
    }
    const nextChar = remaining.trimStart()[0];
    if (!nextChar || nextChar === "," || isBooleanProperty(name)) {
      const wsMatch = remaining.match(/^(\s*)(?=,|$)/);
      if (wsMatch) {
        consumed += wsMatch[1].length;
      }
      return { name, value, consumed, isBoolean: true };
    }
    const wsBeforeValue = remaining.match(/^(\s+)/);
    if (wsBeforeValue) {
      consumed += wsBeforeValue[0].length;
      remaining = str.substring(consumed);
    }
    const valueParts = [];
    while (remaining.length > 0) {
      const trimmedRemaining = remaining.trimStart();
      if (!trimmedRemaining || trimmedRemaining.startsWith(",")) {
        break;
      }
      if (trimmedRemaining.startsWith('"') || trimmedRemaining.startsWith("'")) {
        if (valueParts.length === 0) {
          const quote = trimmedRemaining[0];
          const endQuote = trimmedRemaining.indexOf(quote, 1);
          if (endQuote !== -1) {
            const skipWs2 = remaining.length - trimmedRemaining.length;
            const quotedPart = trimmedRemaining.substring(0, endQuote + 1);
            valueParts.push(quotedPart);
            consumed += skipWs2 + quotedPart.length;
            remaining = str.substring(consumed);
            continue;
          }
        }
        break;
      }
      const skipWs = remaining.length - trimmedRemaining.length;
      const tokenMatch = trimmedRemaining.match(/^([^\s,]+)/);
      if (tokenMatch) {
        const token = tokenMatch[1];
        if (valueParts.length > 0 && /^[a-z][a-z0-9-]*$/.test(token)) {
          const afterToken = trimmedRemaining.substring(token.length);
          if (afterToken.match(/^\s+[^,]/) || isBooleanProperty(token)) {
            break;
          }
        }
        valueParts.push(token);
        consumed += skipWs + token.length;
        remaining = str.substring(consumed);
      } else {
        break;
      }
    }
    value = valueParts.join(" ");
    return { name, value, consumed, isBoolean: false };
  }
  function updatePropertyInLine(parsedLine, propName, newValue) {
    const canonicalName = getCanonicalName(propName);
    const propIndex = parsedLine.properties.findIndex(
      (p) => p.canonicalName === canonicalName
    );
    if (propIndex === -1) {
      return addPropertyToLine(parsedLine, propName, newValue);
    }
    const prop = parsedLine.properties[propIndex];
    const line = parsedLine.original;
    let replacement;
    if (newValue === "" || newValue === "true") {
      replacement = prop.name;
    } else {
      replacement = `${prop.name} ${newValue}`;
    }
    const before = line.substring(0, prop.startIndex);
    const after = line.substring(prop.endIndex);
    return before + replacement + after;
  }
  function addPropertyToLine(parsedLine, propName, value) {
    const line = parsedLine.original.trimEnd();
    let propStr;
    if (value === "" || value === "true") {
      propStr = propName;
    } else {
      propStr = `${propName} ${value}`;
    }
    if (parsedLine.properties.length > 0 || parsedLine.textContent) {
      return `${line}, ${propStr}`;
    } else {
      return `${line} ${propStr}`;
    }
  }
  function removePropertyFromLine(parsedLine, propName) {
    const canonicalName = getCanonicalName(propName);
    const propIndex = parsedLine.properties.findIndex(
      (p) => p.canonicalName === canonicalName
    );
    if (propIndex === -1) {
      return parsedLine.original;
    }
    const prop = parsedLine.properties[propIndex];
    const line = parsedLine.original;
    let startRemove = prop.startIndex;
    let endRemove = prop.endIndex;
    const before = line.substring(0, prop.startIndex);
    const after = line.substring(prop.endIndex);
    const precedingMatch = before.match(/,\s*$/);
    if (precedingMatch) {
      startRemove -= precedingMatch[0].length;
    } else {
      const followingMatch = after.match(/^\s*,\s*/);
      if (followingMatch) {
        endRemove += followingMatch[0].length;
      }
    }
    return line.substring(0, startRemove) + line.substring(endRemove);
  }
  function findPropertyInLine(parsedLine, propName) {
    const canonicalName = getCanonicalName(propName);
    return parsedLine.properties.find((p) => p.canonicalName === canonicalName) || null;
  }

  // src/studio/code-modifier.ts
  var CodeModifier = class {
    source;
    sourceMap;
    lines;
    constructor(source, sourceMap) {
      this.source = source;
      this.sourceMap = sourceMap;
      this.lines = source.split("\n");
    }
    /**
     * Get the current source
     */
    getSource() {
      return this.source;
    }
    /**
     * Get the current source map
     */
    getSourceMap() {
      return this.sourceMap;
    }
    /**
     * Update an existing property value
     *
     * Uses LinePropertyParser for robust line analysis:
     * - Supports property aliases (bg, background, etc.)
     * - Correctly handles multi-value properties
     * - Preserves original property name used in source
     */
    updateProperty(nodeId, propName, newValue, options = {}) {
      const nodeMapping = this.sourceMap.getNodeById(nodeId);
      if (!nodeMapping) {
        return this.errorResult(`Node not found: ${nodeId}`);
      }
      const nodeLine = nodeMapping.position.line;
      const line = this.lines[nodeLine - 1];
      if (!line) {
        return this.errorResult(`Line not found: ${nodeLine}`);
      }
      const parsedLine = parseLine(line);
      const existingProp = findPropertyInLine(parsedLine, propName);
      if (!existingProp) {
        return this.addProperty(nodeId, propName, newValue, options);
      }
      const newLine = updatePropertyInLine(parsedLine, propName, newValue);
      const lineStartOffset = this.getCharacterOffset(nodeLine, 1);
      const from = lineStartOffset;
      const to = lineStartOffset + line.length;
      const newLines = [...this.lines];
      newLines[nodeLine - 1] = newLine;
      const newSource = newLines.join("\n");
      return {
        success: true,
        newSource,
        change: {
          from,
          to,
          insert: newLine
        }
      };
    }
    /**
     * Add a new property to a node
     *
     * Uses LinePropertyParser for consistent line handling
     */
    addProperty(nodeId, propName, value, options = {}) {
      const nodeMapping = this.sourceMap.getNodeById(nodeId);
      if (!nodeMapping) {
        return this.errorResult(`Node not found: ${nodeId}`);
      }
      const nodeLine = nodeMapping.position.line;
      const line = this.lines[nodeLine - 1];
      if (!line) {
        return this.errorResult(`Line not found: ${nodeLine}`);
      }
      const parsedLine = parseLine(line);
      const newLine = addPropertyToLine(parsedLine, propName, value);
      const lineStartOffset = this.getCharacterOffset(nodeLine, 1);
      const from = lineStartOffset;
      const to = lineStartOffset + line.length;
      const newLines = [...this.lines];
      newLines[nodeLine - 1] = newLine;
      const newSource = newLines.join("\n");
      return {
        success: true,
        newSource,
        change: {
          from,
          to,
          insert: newLine
        }
      };
    }
    /**
     * Remove a property from a node
     *
     * Uses LinePropertyParser for alias-aware property removal
     */
    removeProperty(nodeId, propName) {
      const nodeMapping = this.sourceMap.getNodeById(nodeId);
      if (!nodeMapping) {
        return this.errorResult(`Node not found: ${nodeId}`);
      }
      const nodeLine = nodeMapping.position.line;
      const line = this.lines[nodeLine - 1];
      if (!line) {
        return this.errorResult(`Line not found: ${nodeLine}`);
      }
      const parsedLine = parseLine(line);
      const existingProp = findPropertyInLine(parsedLine, propName);
      if (!existingProp) {
        return this.errorResult(`Property not found: ${propName}`);
      }
      const newLine = removePropertyFromLine(parsedLine, propName);
      const lineStartOffset = this.getCharacterOffset(nodeLine, 1);
      const from = lineStartOffset;
      const to = lineStartOffset + line.length;
      const newLines = [...this.lines];
      newLines[nodeLine - 1] = newLine;
      const newSource = newLines.join("\n");
      return {
        success: true,
        newSource,
        change: {
          from,
          to,
          insert: newLine
        }
      };
    }
    /**
     * Add a child component to a parent node
     */
    addChild(parentId, componentName, options = {}) {
      const { position = "last", properties: properties2, textContent } = options;
      const parentMapping = this.sourceMap.getNodeById(parentId);
      if (!parentMapping) {
        return this.errorResult(`Parent node not found: ${parentId}`);
      }
      const children = this.sourceMap.getChildren(parentId);
      const insertionInfo = this.calculateChildInsertionPoint(
        parentMapping,
        children,
        position
      );
      const componentLine = this.buildComponentLine(
        componentName,
        properties2,
        textContent,
        insertionInfo.indent
      );
      const insertText = `
${componentLine}`;
      const insertPosition = insertionInfo.charOffset;
      const newSource = this.source.substring(0, insertPosition) + insertText + this.source.substring(insertPosition);
      return {
        success: true,
        newSource,
        change: {
          from: insertPosition,
          to: insertPosition,
          insert: insertText
        }
      };
    }
    /**
     * Add a child component relative to a sibling (before or after)
     */
    addChildRelativeTo(siblingId, componentName, placement, options = {}) {
      const { properties: properties2, textContent } = options;
      const siblingMapping = this.sourceMap.getNodeById(siblingId);
      if (!siblingMapping) {
        return this.errorResult(`Sibling node not found: ${siblingId}`);
      }
      const siblingLine = this.lines[siblingMapping.position.line - 1];
      const indent = this.getLineIndent(siblingLine);
      const componentLine = this.buildComponentLine(
        componentName,
        properties2,
        textContent,
        indent
      );
      let insertPosition;
      let insertText;
      if (placement === "before") {
        insertPosition = this.getCharacterOffset(siblingMapping.position.line, 1);
        insertText = `${componentLine}
`;
      } else {
        const siblingEndLine = siblingMapping.position.endLine;
        const endLineContent = this.lines[siblingEndLine - 1];
        insertPosition = this.getCharacterOffset(siblingEndLine, endLineContent.length + 1);
        insertText = `
${componentLine}`;
      }
      const newSource = this.source.substring(0, insertPosition) + insertText + this.source.substring(insertPosition);
      return {
        success: true,
        newSource,
        change: {
          from: insertPosition,
          to: insertPosition,
          insert: insertText
        }
      };
    }
    /**
     * Remove a node and all its children from the source code
     */
    removeNode(nodeId) {
      const nodeMapping = this.sourceMap.getNodeById(nodeId);
      if (!nodeMapping) {
        return this.errorResult(`Node not found: ${nodeId}`);
      }
      const startLine = nodeMapping.position.line;
      const endLine = nodeMapping.position.endLine;
      const startOffset = this.getCharacterOffset(startLine, 1);
      const endLineContent = this.lines[endLine - 1];
      let endOffset = this.getCharacterOffset(endLine, endLineContent.length + 1);
      if (endLine < this.lines.length) {
        endOffset += 1;
      }
      let newSource;
      if (startLine === 1 && endLine === this.lines.length) {
        newSource = "";
      } else if (startLine === 1) {
        newSource = this.source.substring(endOffset);
      } else {
        const adjustedStartOffset = startOffset > 0 ? startOffset - 1 : startOffset;
        newSource = this.source.substring(0, adjustedStartOffset) + this.source.substring(endOffset);
      }
      return {
        success: true,
        newSource,
        change: {
          from: startOffset > 0 ? startOffset - 1 : startOffset,
          to: endOffset,
          insert: ""
        }
      };
    }
    /**
     * Move a node to a new location relative to another node
     */
    moveNode(sourceNodeId, targetId, placement) {
      const sourceMapping = this.sourceMap.getNodeById(sourceNodeId);
      if (!sourceMapping) {
        return this.errorResult(`Source node not found: ${sourceNodeId}`);
      }
      const targetMapping = this.sourceMap.getNodeById(targetId);
      if (!targetMapping) {
        return this.errorResult(`Target node not found: ${targetId}`);
      }
      if (sourceNodeId === targetId) {
        return this.errorResult("Cannot move node onto itself");
      }
      if (this.isDescendantOf(targetId, sourceNodeId)) {
        return this.errorResult("Cannot move node into its own descendant");
      }
      const startLine = sourceMapping.position.line;
      const endLine = sourceMapping.position.endLine;
      const sourceLines = this.lines.slice(startLine - 1, endLine);
      const sourceBlock = sourceLines.join("\n");
      const sourceIndent = this.getLineIndent(sourceLines[0]);
      let targetIndent;
      if (placement === "inside") {
        const targetLine = this.lines[targetMapping.position.line - 1];
        targetIndent = this.getLineIndent(targetLine) + "  ";
      } else {
        const targetLine = this.lines[targetMapping.position.line - 1];
        targetIndent = this.getLineIndent(targetLine);
      }
      const reindentedBlock = this.reindentBlock(sourceBlock, sourceIndent, targetIndent);
      const removeStart = this.getCharacterOffset(startLine, 1);
      const endLineContent = this.lines[endLine - 1];
      let removeEnd = this.getCharacterOffset(endLine, endLineContent.length + 1);
      if (endLine < this.lines.length) {
        removeEnd += 1;
      }
      let insertPosition;
      let insertText;
      if (placement === "inside") {
        const children = this.sourceMap.getChildren(targetId);
        if (children.length > 0) {
          const lastChild = children.reduce(
            (a, b) => a.position.endLine > b.position.endLine ? a : b
          );
          const lastChildEndLine = lastChild.position.endLine;
          const lastChildLineContent = this.lines[lastChildEndLine - 1];
          insertPosition = this.getCharacterOffset(lastChildEndLine, lastChildLineContent.length + 1);
        } else {
          const parentLine = targetMapping.position.line;
          const parentLineContent = this.lines[parentLine - 1];
          insertPosition = this.getCharacterOffset(parentLine, parentLineContent.length + 1);
        }
        insertText = `
${reindentedBlock}`;
      } else if (placement === "before") {
        insertPosition = this.getCharacterOffset(targetMapping.position.line, 1) - 1;
        if (insertPosition < 0) insertPosition = 0;
        insertText = `${reindentedBlock}
`;
      } else {
        const targetEndLine = targetMapping.position.endLine;
        const targetEndContent = this.lines[targetEndLine - 1];
        insertPosition = this.getCharacterOffset(targetEndLine, targetEndContent.length + 1);
        insertText = `
${reindentedBlock}`;
      }
      if (insertPosition > removeStart) {
        const removalLength = removeEnd - (removeStart > 0 ? removeStart - 1 : removeStart);
        insertPosition -= removalLength;
      }
      const adjustedRemoveStart = removeStart > 0 ? removeStart - 1 : removeStart;
      let newSource = this.source.substring(0, adjustedRemoveStart) + this.source.substring(removeEnd);
      newSource = newSource.substring(0, insertPosition) + insertText + newSource.substring(insertPosition);
      return {
        success: true,
        newSource,
        change: {
          from: Math.min(adjustedRemoveStart, insertPosition),
          to: Math.max(removeEnd, insertPosition),
          insert: insertText
        }
      };
    }
    /**
     * Check if a node is a descendant of another node
     */
    isDescendantOf(nodeId, ancestorId) {
      const node = this.sourceMap.getNodeById(nodeId);
      if (!node) return false;
      let currentId = node.parentId;
      while (currentId) {
        if (currentId === ancestorId) return true;
        const parent = this.sourceMap.getNodeById(currentId);
        currentId = parent?.parentId;
      }
      return false;
    }
    /**
     * Re-indent a block of code to a new indentation level
     */
    reindentBlock(block, oldIndent, newIndent) {
      const lines = block.split("\n");
      return lines.map((line, index) => {
        if (index === 0) {
          return newIndent + line.substring(oldIndent.length);
        }
        if (line.startsWith(oldIndent)) {
          const extraIndent = line.substring(oldIndent.length);
          return newIndent + extraIndent;
        }
        return line;
      }).join("\n");
    }
    /**
     * Calculate where to insert a child and with what indentation
     */
    calculateChildInsertionPoint(parentMapping, children, position) {
      const parentLine = this.lines[parentMapping.position.line - 1];
      const parentIndent = this.getLineIndent(parentLine);
      const childIndent = parentIndent + "  ";
      const sortedChildren = [...children].sort(
        (a, b) => a.position.line - b.position.line
      );
      if (sortedChildren.length === 0) {
        const parentEndLine2 = parentMapping.position.line;
        const lineContent2 = this.lines[parentEndLine2 - 1];
        return {
          charOffset: this.getCharacterOffset(parentEndLine2, lineContent2.length + 1),
          indent: childIndent
        };
      }
      if (position === "first") {
        const firstChild = sortedChildren[0];
        const charOffset = this.getCharacterOffset(firstChild.position.line, 1);
        return {
          // We need to insert at the beginning and add newline after
          charOffset: charOffset - 1,
          // Before the newline of the previous line
          indent: childIndent
        };
      }
      if (position === "last" || typeof position === "number") {
        let targetIndex = sortedChildren.length - 1;
        if (typeof position === "number") {
          targetIndex = Math.min(position - 1, sortedChildren.length - 1);
          targetIndex = Math.max(0, targetIndex);
        }
        const targetChild = sortedChildren[targetIndex];
        const targetEndLine = targetChild.position.endLine;
        const lineContent2 = this.lines[targetEndLine - 1];
        return {
          charOffset: this.getCharacterOffset(targetEndLine, lineContent2.length + 1),
          indent: childIndent
        };
      }
      const parentEndLine = parentMapping.position.line;
      const lineContent = this.lines[parentEndLine - 1];
      return {
        charOffset: this.getCharacterOffset(parentEndLine, lineContent.length + 1),
        indent: childIndent
      };
    }
    /**
     * Build a component line with indentation, properties, and optional text
     */
    buildComponentLine(componentName, properties2, textContent, indent = "") {
      let line = `${indent}${componentName}`;
      if (properties2) {
        line += ` ${properties2}`;
      }
      if (textContent) {
        const quotedText = textContent.startsWith('"') ? textContent : `"${textContent}"`;
        if (properties2) {
          line += `, ${quotedText}`;
        } else {
          line += ` ${quotedText}`;
        }
      }
      return line;
    }
    /**
     * Get the indentation of a line (leading whitespace)
     */
    getLineIndent(line) {
      const match = line.match(/^(\s*)/);
      return match ? match[1] : "";
    }
    /**
     * Update the source code (after external changes)
     */
    updateSource(source) {
      this.source = source;
      this.lines = source.split("\n");
    }
    /**
     * Update the source map
     */
    updateSourceMap(sourceMap) {
      this.sourceMap = sourceMap;
    }
    /**
     * Find and replace a property value in a line
     */
    findAndReplaceProperty(line, propName, newValue, lineNumber) {
      const patterns = [
        // Property with quoted value: propName "value"
        new RegExp(`(\\b${this.escapeRegex(propName)}\\s+)("[^"]*"|'[^']*')`, "g"),
        // Property with unquoted value: propName value (captured until comma or end)
        new RegExp(`(\\b${this.escapeRegex(propName)}\\s+)([^,\\s]+(?:\\s+[^,\\s]+)*)`, "g"),
        // Boolean property (no value)
        new RegExp(`(\\b${this.escapeRegex(propName)})(\\b)(?=\\s*,|\\s*$)`, "g")
      ];
      for (const pattern of patterns) {
        const match = pattern.exec(line);
        if (match) {
          const fullMatch = match[0];
          const prefix = match[1];
          const matchStart = match.index;
          const matchEnd = matchStart + fullMatch.length;
          const formattedValue = this.formatValue(propName, newValue);
          const newProp = `${prefix.trim()} ${formattedValue}`;
          const newLine = line.substring(0, matchStart) + newProp + line.substring(matchEnd);
          const from = this.getCharacterOffset(lineNumber, matchStart + 1);
          const to = this.getCharacterOffset(lineNumber, matchEnd + 1);
          return {
            newLine,
            change: {
              from,
              to,
              insert: newProp
            }
          };
        }
      }
      return null;
    }
    /**
     * Find and remove a property from a line
     */
    findAndRemoveProperty(line, propName, lineNumber) {
      const patterns = [
        // Property with comma before: ", propName value"
        new RegExp(`,\\s*\\b${this.escapeRegex(propName)}\\s+[^,\\n]+`, "g"),
        // Property with comma after: "propName value,"
        new RegExp(`\\b${this.escapeRegex(propName)}\\s+[^,\\n]+,\\s*`, "g"),
        // Property alone: "propName value"
        new RegExp(`\\b${this.escapeRegex(propName)}\\s+[^,\\n]+`, "g"),
        // Boolean with comma before: ", propName"
        new RegExp(`,\\s*\\b${this.escapeRegex(propName)}\\b`, "g"),
        // Boolean with comma after: "propName,"
        new RegExp(`\\b${this.escapeRegex(propName)}\\b,\\s*`, "g"),
        // Boolean alone: "propName"
        new RegExp(`\\b${this.escapeRegex(propName)}\\b`, "g")
      ];
      for (const pattern of patterns) {
        const match = pattern.exec(line);
        if (match) {
          const matchStart = match.index;
          const matchEnd = matchStart + match[0].length;
          const newLine = line.substring(0, matchStart) + line.substring(matchEnd);
          const from = this.getCharacterOffset(lineNumber, matchStart + 1);
          const to = this.getCharacterOffset(lineNumber, matchEnd + 1);
          return {
            newLine: newLine.trim() ? newLine : line,
            // Don't leave empty lines
            change: {
              from,
              to,
              insert: ""
            }
          };
        }
      }
      return null;
    }
    /**
     * Format a property for insertion
     */
    formatProperty(name, value) {
      if (value === "true" || value === "") {
        return name;
      }
      if (value.includes(" ") && !value.startsWith("$") && !value.startsWith("#")) {
        return `${name} "${value}"`;
      }
      return `${name} ${value}`;
    }
    /**
     * Format a value (may need quotes, etc.)
     */
    formatValue(propName, value) {
      if (value === "true" || value === "") {
        return "";
      }
      if (value.startsWith("$")) {
        return value;
      }
      if (value.startsWith("#")) {
        return value;
      }
      if (/^-?\d+(\.\d+)?$/.test(value)) {
        return value;
      }
      if (value.includes(" ")) {
        return `"${value}"`;
      }
      return value;
    }
    /**
     * Check if a line already has properties
     */
    lineHasProperties(line) {
      return line.includes(",") || /\s+(pad|bg|col|w|h|gap|rad|bor)\s+/.test(line);
    }
    /**
     * Get character offset from line and column
     */
    getCharacterOffset(line, column) {
      let offset = 0;
      for (let i = 0; i < line - 1; i++) {
        offset += this.lines[i].length + 1;
      }
      return offset + column - 1;
    }
    /**
     * Escape regex special characters
     */
    escapeRegex(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    /**
     * Extract an instance with inline properties to a component definition in components.mirror
     *
     * Takes a node that has inline properties and:
     * 1. Creates a component definition in components.mirror
     * 2. Adds "import components" to the current file if needed
     * 3. Simplifies the original line to just the instance (with text content if any)
     */
    extractToComponentFile(nodeId, filesAccess, options = {}) {
      const componentFileName = options.componentFileName ?? "components.mirror";
      const nodeMapping = this.sourceMap.getNodeById(nodeId);
      if (!nodeMapping) {
        return this.extractErrorResult(`Node not found: ${nodeId}`);
      }
      const nodeLine = nodeMapping.position.line;
      const line = this.lines[nodeLine - 1];
      if (!line) {
        return this.extractErrorResult(`Line not found: ${nodeLine}`);
      }
      const parsedLine = parseLine(line);
      if (parsedLine.properties.length === 0) {
        return this.extractErrorResult("No properties to extract");
      }
      const componentMatch = parsedLine.componentPart.match(/^([A-Z][a-zA-Z0-9]*)/);
      if (!componentMatch) {
        return this.extractErrorResult("Could not determine component name");
      }
      const componentName = componentMatch[1];
      const namedMatch = line.match(/\bnamed\s+([A-Za-z][A-Za-z0-9]*)/i);
      const namedPart = namedMatch ? ` named ${namedMatch[1]}` : "";
      const propsString = parsedLine.properties.map((p) => p.isBoolean ? p.name : `${p.name} ${p.value}`).join(", ");
      const definitionLine = `${componentName}: ${propsString}`;
      let instanceLine = parsedLine.indent + componentName + namedPart;
      if (parsedLine.textContent) {
        instanceLine += ` ${parsedLine.textContent}`;
      }
      let componentFileContent = filesAccess.getFile(componentFileName) ?? "";
      if (componentFileContent.length > 0 && !componentFileContent.endsWith("\n")) {
        componentFileContent += "\n";
      }
      componentFileContent += definitionLine + "\n";
      const currentFile = filesAccess.getCurrentFile();
      let importAdded = false;
      let currentSource = this.source;
      const importName = componentFileName.replace(".mirror", "");
      const importRegex = new RegExp(`^import\\s+${importName}\\s*$`, "m");
      if (!importRegex.test(currentSource)) {
        currentSource = `import ${importName}
` + currentSource;
        importAdded = true;
      }
      const currentLines = currentSource.split("\n");
      const lineOffset = importAdded ? 1 : 0;
      const adjustedNodeLine = nodeLine + lineOffset;
      currentLines[adjustedNodeLine - 1] = instanceLine;
      const newSource = currentLines.join("\n");
      const change = importAdded ? {
        from: 0,
        to: this.source.length,
        insert: newSource
      } : {
        from: this.getCharacterOffset(nodeLine, 1),
        to: this.getCharacterOffset(nodeLine, line.length + 1),
        insert: instanceLine
      };
      return {
        success: true,
        currentFileChange: change,
        componentFileChange: {
          path: componentFileName,
          content: componentFileContent
        },
        importAdded
      };
    }
    /**
     * Create an error result for extract operation
     */
    extractErrorResult(error) {
      return {
        success: false,
        currentFileChange: { from: 0, to: 0, insert: "" },
        componentFileChange: { path: "", content: "" },
        importAdded: false,
        error
      };
    }
    /**
     * Create an error result
     */
    errorResult(error) {
      return {
        success: false,
        newSource: this.source,
        change: { from: 0, to: 0, insert: "" },
        error
      };
    }
  };
  function createCodeModifier(source, sourceMap) {
    return new CodeModifier(source, sourceMap);
  }
  function applyChange(source, change) {
    return source.substring(0, change.from) + change.insert + source.substring(change.to);
  }

  // src/studio/icons.ts
  var PROPERTY_ICON_PATHS = {
    // Layout Direction - shows how children are arranged
    horizontal: `
    <rect x="2" y="6" width="2" height="3" rx="0.5" fill="currentColor"/>
    <rect x="6" y="6" width="2" height="3" rx="0.5" fill="currentColor"/>
    <rect x="10" y="6" width="2" height="3" rx="0.5" fill="currentColor"/>
  `,
    vertical: `
    <rect x="6" y="2" width="3" height="2" rx="0.5" fill="currentColor"/>
    <rect x="6" y="6" width="3" height="2" rx="0.5" fill="currentColor"/>
    <rect x="6" y="10" width="3" height="2" rx="0.5" fill="currentColor"/>
  `,
    // Center - elements centered both ways
    center: `
    <rect x="5" y="5" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1" fill="none"/>
    <circle cx="7.5" cy="7.5" r="1" fill="currentColor"/>
  `,
    // Spread - elements pushed to edges
    spread: `
    <rect x="2" y="5" width="2" height="4" rx="0.5" fill="currentColor"/>
    <rect x="10" y="5" width="2" height="4" rx="0.5" fill="currentColor"/>
    <path d="M5 7h4" stroke="currentColor" stroke-width="0.75" stroke-dasharray="1 1"/>
  `,
    // Wrap - elements that wrap to next line
    wrap: `
    <rect x="2" y="3" width="2" height="2" rx="0.5" fill="currentColor"/>
    <rect x="5.5" y="3" width="2" height="2" rx="0.5" fill="currentColor"/>
    <rect x="9" y="3" width="2" height="2" rx="0.5" fill="currentColor"/>
    <rect x="2" y="9" width="2" height="2" rx="0.5" fill="currentColor"/>
    <rect x="5.5" y="9" width="2" height="2" rx="0.5" fill="currentColor"/>
    <path d="M12 4 L12 7 L3 7" stroke="currentColor" stroke-width="0.75" fill="none" stroke-linecap="round"/>
  `,
    // Stacked - elements on top of each other (z-axis) - LARGER
    stacked: `
    <rect x="1" y="1" width="10" height="6" rx="0.5" fill="currentColor" opacity="0.35"/>
    <rect x="3" y="5" width="10" height="6" rx="0.5" fill="currentColor"/>
  `,
    // Grid - elements in a grid layout
    grid: `
    <rect x="2" y="2" width="3" height="3" rx="0.5" fill="currentColor"/>
    <rect x="8" y="2" width="3" height="3" rx="0.5" fill="currentColor"/>
    <rect x="2" y="8" width="3" height="3" rx="0.5" fill="currentColor"/>
    <rect x="8" y="8" width="3" height="3" rx="0.5" fill="currentColor"/>
  `,
    // Size constraints - min/max indicators
    "min-width": `
    <path d="M2 7 L5 4.5 L5 9.5 Z" fill="currentColor"/>
    <path d="M12 7 L9 4.5 L9 9.5 Z" fill="currentColor"/>
    <line x1="5" y1="7" x2="9" y2="7" stroke="currentColor" stroke-width="1"/>
  `,
    "max-width": `
    <path d="M5 7 L2 4.5 L2 9.5 Z" fill="currentColor"/>
    <path d="M9 7 L12 4.5 L12 9.5 Z" fill="currentColor"/>
    <line x1="2" y1="7" x2="5" y2="7" stroke="currentColor" stroke-width="1"/>
    <line x1="9" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1"/>
  `,
    "min-height": `
    <path d="M7 2 L4.5 5 L9.5 5 Z" fill="currentColor"/>
    <path d="M7 12 L4.5 9 L9.5 9 Z" fill="currentColor"/>
    <line x1="7" y1="5" x2="7" y2="9" stroke="currentColor" stroke-width="1"/>
  `,
    "max-height": `
    <path d="M7 5 L4.5 2 L9.5 2 Z" fill="currentColor"/>
    <path d="M7 9 L4.5 12 L9.5 12 Z" fill="currentColor"/>
    <line x1="7" y1="2" x2="7" y2="5" stroke="currentColor" stroke-width="1"/>
    <line x1="7" y1="9" x2="7" y2="12" stroke="currentColor" stroke-width="1"/>
  `,
    // Layout section icon - crossed arrows
    "layout": `
    <path d="M7 2 L5 4 L6.25 4 L6.25 6.25 L4 6.25 L4 5 L2 7 L4 9 L4 7.75 L6.25 7.75 L6.25 10 L5 10 L7 12 L9 10 L7.75 10 L7.75 7.75 L10 7.75 L10 9 L12 7 L10 5 L10 6.25 L7.75 6.25 L7.75 4 L9 4 L7 2 Z" fill="currentColor"/>
  `,
    // Padding direction icons - arrows
    // V/H: double-headed arrows (compact view)
    "pad-v": `
    <path d="M7 2 L4.5 5 L9.5 5 Z" fill="currentColor"/>
    <path d="M7 12 L4.5 9 L9.5 9 Z" fill="currentColor"/>
    <line x1="7" y1="5" x2="7" y2="9" stroke="currentColor" stroke-width="1.5"/>
  `,
    "pad-h": `
    <path d="M2 7 L5 4.5 L5 9.5 Z" fill="currentColor"/>
    <path d="M12 7 L9 4.5 L9 9.5 Z" fill="currentColor"/>
    <line x1="5" y1="7" x2="9" y2="7" stroke="currentColor" stroke-width="1.5"/>
  `,
    // T/R/B/L: single-headed arrows (expanded view)
    "pad-t": `
    <path d="M7 2 L4.5 5 L9.5 5 Z" fill="currentColor"/>
    <line x1="7" y1="5" x2="7" y2="12" stroke="currentColor" stroke-width="1.5"/>
  `,
    "pad-r": `
    <path d="M12 7 L9 4.5 L9 9.5 Z" fill="currentColor"/>
    <line x1="2" y1="7" x2="9" y2="7" stroke="currentColor" stroke-width="1.5"/>
  `,
    "pad-b": `
    <path d="M7 12 L4.5 9 L9.5 9 Z" fill="currentColor"/>
    <line x1="7" y1="2" x2="7" y2="9" stroke="currentColor" stroke-width="1.5"/>
  `,
    "pad-l": `
    <path d="M2 7 L5 4.5 L5 9.5 Z" fill="currentColor"/>
    <line x1="5" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5"/>
  `,
    // Border - rectangle icons for compact/expanded views
    "border": `
    <rect x="2" y="2" width="10" height="10" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
  `,
    "border-t": `
    <line x1="2" y1="2" x2="12" y2="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M2 2 L2 12 L12 12 L12 2" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3" stroke-linecap="round" stroke-linejoin="round"/>
  `,
    "border-r": `
    <line x1="12" y1="2" x2="12" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M12 2 L2 2 L2 12 L12 12" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3" stroke-linecap="round" stroke-linejoin="round"/>
  `,
    "border-b": `
    <line x1="2" y1="12" x2="12" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M2 12 L2 2 L12 2 L12 12" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3" stroke-linecap="round" stroke-linejoin="round"/>
  `,
    "border-l": `
    <line x1="2" y1="2" x2="2" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M2 2 L12 2 L12 12 L2 12" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3" stroke-linecap="round" stroke-linejoin="round"/>
  `,
    // Border styles
    "border-solid": `
    <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5"/>
  `,
    "border-dashed": `
    <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 1.5"/>
  `,
    "border-dotted": `
    <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-dasharray="1 1.5" stroke-linecap="round"/>
  `,
    "radius": `
    <path d="M2 10 L2 5 Q2 2 5 2 L10 2" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  `,
    // Typography - Text alignment
    "text-left": `
    <line x1="2" y1="3" x2="12" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="2" y1="7" x2="9" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="2" y1="11" x2="11" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,
    "text-center": `
    <line x1="2" y1="3" x2="12" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="3.5" y1="7" x2="10.5" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="2.5" y1="11" x2="11.5" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,
    "text-right": `
    <line x1="2" y1="3" x2="12" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="5" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="3" y1="11" x2="12" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,
    "text-justify": `
    <line x1="2" y1="3" x2="12" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="2" y1="11" x2="12" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,
    // Typography - Text styles
    "italic": `
    <text x="4" y="11" font-size="10" font-style="italic" font-family="serif" fill="currentColor">I</text>
  `,
    "underline": `
    <text x="4" y="10" font-size="9" font-family="sans-serif" fill="currentColor">U</text>
    <line x1="3" y1="12" x2="11" y2="12" stroke="currentColor" stroke-width="1"/>
  `,
    "truncate": `
    <text x="2" y="9" font-size="8" font-family="sans-serif" fill="currentColor">Ab</text>
    <text x="9" y="9" font-size="8" font-family="sans-serif" fill="currentColor">\u2026</text>
  `,
    "uppercase": `
    <text x="2" y="10" font-size="8" font-weight="bold" font-family="sans-serif" fill="currentColor">AA</text>
  `,
    "lowercase": `
    <text x="2" y="10" font-size="8" font-family="sans-serif" fill="currentColor">aa</text>
  `,
    // Visual - Shadow levels
    "shadow-none": `
    <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1" fill="none"/>
  `,
    "shadow-sm": `
    <rect x="4" y="4" width="7" height="7" rx="0.5" fill="currentColor" opacity="0.2"/>
    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1" fill="none"/>
  `,
    "shadow-md": `
    <rect x="5" y="5" width="7" height="7" rx="0.5" fill="currentColor" opacity="0.25"/>
    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1" fill="none"/>
  `,
    "shadow-lg": `
    <rect x="5" y="5" width="8" height="8" rx="0.5" fill="currentColor" opacity="0.3"/>
    <rect x="2" y="2" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1" fill="none"/>
  `,
    // Visual - Visibility
    "hidden": `
    <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="3" y1="3" x2="11" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,
    "visible": `
    <ellipse cx="7" cy="7" rx="5" ry="3.5" stroke="currentColor" stroke-width="1" fill="none"/>
    <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
  `,
    "disabled": `
    <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1" fill="none"/>
    <line x1="3.5" y1="10.5" x2="10.5" y2="3.5" stroke="currentColor" stroke-width="1"/>
  `
  };

  // src/studio/property-panel.ts
  var PropertyPanel = class {
    container;
    selectionManager;
    propertyExtractor;
    codeModifier;
    onCodeChange;
    options;
    unsubscribeSelection = null;
    unsubscribeBreadcrumb = null;
    currentElement = null;
    currentBreadcrumb = [];
    debounceTimers = /* @__PURE__ */ new Map();
    // Token caching for performance
    cachedSpacingTokens = /* @__PURE__ */ new Map();
    cachedColorTokens = null;
    cachedSourceHash = "";
    // AbortController for autocomplete event cleanup
    autocompleteAbortController = null;
    constructor(container, selectionManager, propertyExtractor, codeModifier, onCodeChange, options = {}) {
      this.container = container;
      this.selectionManager = selectionManager;
      this.propertyExtractor = propertyExtractor;
      this.codeModifier = codeModifier;
      this.onCodeChange = onCodeChange;
      this.options = {
        debounceTime: options.debounceTime ?? 300,
        showSourceIndicators: options.showSourceIndicators ?? true,
        getAllSource: options.getAllSource,
        filesAccess: options.filesAccess
      };
      this.attach();
    }
    /**
     * Attach to selection manager
     */
    attach() {
      this.unsubscribeSelection = this.selectionManager.subscribe((nodeId) => {
        this.updatePanel(nodeId);
      });
      this.unsubscribeBreadcrumb = this.selectionManager.subscribeBreadcrumb((chain) => {
        this.currentBreadcrumb = chain;
        if (this.currentElement) {
          this.render(this.currentElement);
        }
      });
      const currentSelection = this.selectionManager.getSelection();
      if (currentSelection) {
        this.updatePanel(currentSelection);
      } else {
        this.renderEmpty();
      }
    }
    /**
     * Detach from selection manager
     */
    detach() {
      if (this.unsubscribeSelection) {
        this.unsubscribeSelection();
        this.unsubscribeSelection = null;
      }
      if (this.unsubscribeBreadcrumb) {
        this.unsubscribeBreadcrumb();
        this.unsubscribeBreadcrumb = null;
      }
      this.clearDebounceTimers();
    }
    /**
     * Update panel for a node
     */
    updatePanel(nodeId) {
      const selectionChanged = nodeId !== this.currentElement?.nodeId;
      if (selectionChanged) {
        this.clearDebounceTimers();
      }
      if (!nodeId) {
        this.renderEmpty();
        this.currentElement = null;
        return;
      }
      const element = this.propertyExtractor.getProperties(nodeId);
      if (!element) {
        this.renderNotFound(nodeId);
        this.currentElement = null;
        return;
      }
      this.currentElement = element;
      this.render(element);
    }
    /**
     * Render empty state (no selection)
     */
    renderEmpty() {
      this.container.innerHTML = `
      <div class="pp-header">
        <span class="pp-title">Properties</span>
      </div>
      <div class="pp-content">
        <div class="pp-empty">
          <p>Select an element to view properties</p>
        </div>
      </div>
    `;
    }
    /**
     * Render not found state (selection exists but element not in AST)
     */
    renderNotFound(nodeId) {
      this.container.innerHTML = `
      <div class="pp-header">
        <span class="pp-title">Properties</span>
      </div>
      <div class="pp-content">
        <div class="pp-empty pp-not-found">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p>Element not found</p>
          <p class="pp-hint">The selected element may have been removed from the code.</p>
        </div>
      </div>
    `;
    }
    /**
     * Render the property panel
     */
    render(element) {
      const title = element.instanceName || element.componentName;
      const badge = element.isDefinition ? "Definition" : "";
      const hasInlineProperties = element.allProperties.some((p) => p.source === "instance");
      const showDefineBtn = !element.isDefinition && hasInlineProperties && this.options.filesAccess;
      this.container.innerHTML = `
      ${this.renderBreadcrumb()}
      <div class="pp-header">
        <span class="pp-title">${this.escapeHtml(title)}</span>
        ${badge ? `<span class="pp-badge">${badge}</span>` : ""}
        <div class="pp-header-actions">
          ${showDefineBtn ? `
            <button class="pp-define-btn" title="Als Komponente definieren">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </button>
          ` : ""}
          <button class="pp-close" title="Clear selection">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      ${element.isTemplateInstance ? `
        <div class="pp-template-notice">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>Template instance - changes apply to all items</span>
        </div>
      ` : ""}
      <div class="pp-content">
        ${this.renderCategories(element.categories)}
      </div>
    `;
      this.attachEventListeners();
    }
    /**
     * Render breadcrumb navigation
     */
    renderBreadcrumb() {
      if (this.currentBreadcrumb.length === 0) {
        return "";
      }
      const crumbs = this.currentBreadcrumb.map((item, index) => {
        const isLast = index === this.currentBreadcrumb.length - 1;
        return `
        <span class="pp-crumb${isLast ? " active" : ""}" data-node-id="${this.escapeHtml(item.nodeId)}">${this.escapeHtml(item.name)}</span>
        ${!isLast ? '<span class="pp-crumb-sep">\u203A</span>' : ""}
      `;
      }).join("");
      return `<div class="pp-breadcrumb">${crumbs}</div>`;
    }
    /**
     * Render property categories
     */
    renderCategories(categories) {
      if (categories.length === 0) {
        return `<div class="pp-empty"><p>No properties</p></div>`;
      }
      const layoutCat = categories.find((c) => c.name === "layout");
      const alignmentCat = categories.find((c) => c.name === "alignment");
      const sizingCat = categories.find((c) => c.name === "sizing");
      const spacingCat = categories.find((c) => c.name === "spacing");
      const borderCat = categories.find((c) => c.name === "border");
      const typographyCat = categories.find((c) => c.name === "typography");
      const specialCats = ["layout", "alignment", "sizing", "spacing", "border", "typography", "visual", "hover"];
      const otherCats = categories.filter((c) => !specialCats.includes(c.name));
      let result = "";
      if (layoutCat) {
        result += this.renderLayoutToggleGroup(layoutCat, alignmentCat);
      }
      if (sizingCat) {
        result += this.renderSizingSection(sizingCat);
      }
      if (spacingCat) {
        result += this.renderSpacingSection(spacingCat);
      }
      if (borderCat) {
        result += this.renderBorderSection(borderCat);
      }
      result += this.renderColorSection();
      if (typographyCat) {
        result += this.renderTypographySection(typographyCat);
      }
      return result;
    }
    /**
     * Render a single category
     */
    renderCategory(category) {
      if (category.name === "alignment") {
        return this.renderAlignmentGrid(category);
      }
      const booleans = category.properties.filter((p) => p.type === "boolean");
      const others = category.properties.filter((p) => p.type !== "boolean");
      const booleanRows = [];
      for (let i = 0; i < booleans.length; i += 4) {
        booleanRows.push(booleans.slice(i, i + 4));
      }
      return `
      <div class="pp-section">
        <div class="pp-label">${this.escapeHtml(category.label)}</div>
        ${booleanRows.map((row) => this.renderToggleRow(row)).join("")}
        ${others.map((prop) => this.renderProperty(prop)).join("")}
      </div>
    `;
    }
    /**
     * Layout mode options (mutually exclusive)
     */
    LAYOUT_MODES = ["vertical", "horizontal", "grid", "stacked"];
    /**
     * Gap token presets
     */
    GAP_TOKENS = [
      { label: "xs", value: "2" },
      { label: "s", value: "4" },
      { label: "m", value: "8" },
      { label: "l", value: "16" }
    ];
    /**
     * Render layout as exclusive toggle group (includes alignment)
     */
    renderLayoutToggleGroup(category, alignmentCat) {
      const props = category.properties;
      const isActive = (name) => {
        const prop = props.find((p) => p.name === name || p.name === name.substring(0, 3));
        return prop && (prop.value === "true" || prop.value === "" && prop.hasValue !== false);
      };
      let activeMode = "vertical";
      for (const mode of this.LAYOUT_MODES) {
        if (isActive(mode)) {
          activeMode = mode;
          break;
        }
      }
      if (isActive("hor")) activeMode = "horizontal";
      if (isActive("ver")) activeMode = "vertical";
      const gapProp = props.find((p) => p.name === "gap" || p.name === "g");
      const gapValue = gapProp?.value || "";
      const wrapProp = props.find((p) => p.name === "wrap");
      const wrapActive = wrapProp && (wrapProp.value === "true" || wrapProp.value === "" && wrapProp.hasValue !== false);
      const dynamicGapTokens = this.getGapTokens();
      const gapTokensToUse = dynamicGapTokens.length > 0 ? dynamicGapTokens.map((t) => ({ label: t.name, value: t.value, tokenRef: `$${t.fullName}` })) : this.GAP_TOKENS.map((t) => ({ label: t.label, value: t.value, tokenRef: `$${t.label}.gap` }));
      const isGapTokenRef = gapValue.startsWith("$");
      const gapTokens = gapTokensToUse.map((token) => {
        const active = isGapTokenRef ? gapValue === token.tokenRef : gapValue === token.value;
        return `<button class="token-btn ${active ? "active" : ""}" data-gap-token="${token.value}" data-token-ref="${token.tokenRef}" title="${token.tokenRef}: ${token.value}">${token.label}</button>`;
      }).join("");
      let alignmentRow = "";
      if (alignmentCat) {
        const alignProps = alignmentCat.properties;
        const isAlignActive = (name) => {
          const prop = alignProps.find((p) => p.name === name);
          return prop && (prop.value === "true" || prop.value === "" && prop.hasValue !== false);
        };
        const vAlign = isAlignActive("top") ? "top" : isAlignActive("bottom") ? "bottom" : isAlignActive("ver-center") ? "middle" : null;
        const hAlign = isAlignActive("left") ? "left" : isAlignActive("right") ? "right" : isAlignActive("hor-center") ? "center" : null;
        const isCenter = isAlignActive("center");
        const cells = [
          ["top-left", "top-center", "top-right"],
          ["middle-left", "middle-center", "middle-right"],
          ["bottom-left", "bottom-center", "bottom-right"]
        ];
        const getCellActive = (v, h) => {
          if (v === "middle" && h === "center" && isCenter) return true;
          const vMatch = v === "top" && vAlign === "top" || v === "middle" && vAlign === "middle" || v === "bottom" && vAlign === "bottom";
          const hMatch = h === "left" && hAlign === "left" || h === "center" && hAlign === "center" || h === "right" && hAlign === "right";
          return vMatch && hMatch;
        };
        const gridHtml = cells.map((row, vIdx) => {
          const vName = ["top", "middle", "bottom"][vIdx];
          return row.map((cell, hIdx) => {
            const hName = ["left", "center", "right"][hIdx];
            const active = getCellActive(vName, hName);
            return `<button class="align-cell ${active ? "active" : ""}" data-align="${cell}" title="${cell.replace("-", " ")}"></button>`;
          }).join("");
        }).join("");
        alignmentRow = `
          <div class="prop-row">
            <span class="prop-label">Align</span>
            <div class="prop-content">
              <div class="align-grid">
                ${gridHtml}
              </div>
            </div>
          </div>`;
      }
      return `
      <div class="section">
        <div class="section-label">Layout</div>
        <div class="section-content">
          <div class="prop-row">
            <span class="prop-label">Direction</span>
            <div class="prop-content">
              <div class="toggle-group">
                <button class="toggle-btn ${activeMode === "horizontal" ? "active" : ""}" data-layout="horizontal" title="Horizontal">
                  <svg class="icon" viewBox="0 0 14 14">
                    <path d="M2 7h10M9 4l3 3-3 3"/>
                  </svg>
                </button>
                <button class="toggle-btn ${activeMode === "vertical" ? "active" : ""}" data-layout="vertical" title="Vertical">
                  <svg class="icon" viewBox="0 0 14 14">
                    <path d="M7 2v10M4 9l3 3 3-3"/>
                  </svg>
                </button>
                <button class="toggle-btn ${activeMode === "grid" ? "active" : ""}" data-layout="grid" title="Grid">
                  <svg class="icon" viewBox="0 0 14 14">
                    <rect x="2" y="2" width="4" height="4" rx="1"/>
                    <rect x="8" y="2" width="4" height="4" rx="1"/>
                    <rect x="2" y="8" width="4" height="4" rx="1"/>
                    <rect x="8" y="8" width="4" height="4" rx="1"/>
                  </svg>
                </button>
                <button class="toggle-btn ${activeMode === "stacked" ? "active" : ""}" data-layout="stacked" title="Stack">
                  <svg class="icon" viewBox="0 0 14 14">
                    <rect x="2" y="3" width="10" height="8" rx="1"/>
                    <rect x="4" y="5" width="6" height="4" rx="0.5"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Gap</span>
            <div class="prop-content">
              <div class="token-group">
                ${gapTokens}
              </div>
              <input type="text" class="prop-input" value="${this.escapeHtml(gapValue)}" data-prop="gap" placeholder="0">
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Wrap</span>
            <div class="prop-content">
              <div class="toggle-group">
                <button class="toggle-btn ${!wrapActive ? "active" : ""}" data-wrap="off" title="No Wrap">
                  <svg class="icon" viewBox="0 0 14 14">
                    <path d="M2 7h10"/>
                  </svg>
                </button>
                <button class="toggle-btn ${wrapActive ? "active" : ""}" data-wrap="on" title="Wrap">
                  <svg class="icon" viewBox="0 0 14 14">
                    <path d="M2 4h10M2 10h6M10 7l-2 3"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>${alignmentRow}
        </div>
      </div>
    `;
    }
    /**
     * Render sizing section (1:1 from prototype-v2.html)
     */
    renderSizingSection(category) {
      const props = category.properties;
      const widthProp = props.find((p) => p.name === "width" || p.name === "w");
      const heightProp = props.find((p) => p.name === "height" || p.name === "h");
      const widthValue = widthProp?.value || "";
      const heightValue = heightProp?.value || "";
      const widthIsHug = widthValue === "hug";
      const widthIsFull = widthValue === "full";
      const heightIsHug = heightValue === "hug";
      const heightIsFull = heightValue === "full";
      return `
      <div class="section">
        <div class="section-label">Size</div>
        <div class="section-content">
          <div class="prop-row">
            <span class="prop-label">Width</span>
            <div class="prop-content">
              <div class="toggle-group">
                <button class="toggle-btn ${widthIsHug ? "active" : ""}" data-size-mode="width-hug" title="Hug Content">
                  <svg class="icon" viewBox="0 0 14 14">
                    <path d="M4 3v8M10 3v8M1 7h3M10 7h3"/>
                  </svg>
                </button>
                <button class="toggle-btn ${widthIsFull ? "active" : ""}" data-size-mode="width-full" title="Fill Container">
                  <svg class="icon" viewBox="0 0 14 14">
                    <path d="M2 3v8M12 3v8M2 7h10"/>
                  </svg>
                </button>
              </div>
              <input type="text" class="prop-input" value="${this.escapeHtml(widthValue)}" data-prop="width" placeholder="auto">
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Height</span>
            <div class="prop-content">
              <div class="toggle-group">
                <button class="toggle-btn ${heightIsHug ? "active" : ""}" data-size-mode="height-hug" title="Hug Content">
                  <svg class="icon" viewBox="0 0 14 14">
                    <path d="M3 4h8M3 10h8M7 1v3M7 10v3"/>
                  </svg>
                </button>
                <button class="toggle-btn ${heightIsFull ? "active" : ""}" data-size-mode="height-full" title="Fill Container">
                  <svg class="icon" viewBox="0 0 14 14">
                    <path d="M3 2h8M3 12h8M7 2v10"/>
                  </svg>
                </button>
              </div>
              <input type="text" class="prop-input" value="${this.escapeHtml(heightValue)}" data-prop="height" placeholder="auto">
            </div>
          </div>
        </div>
      </div>
    `;
    }
    /**
     * Padding preset values (for dropdown)
     */
    PADDING_PRESETS = ["2", "4", "8", "16", "32"];
    /**
     * Simple hash for cache invalidation
     */
    hashSource(source) {
      let hash = 0;
      for (let i = 0; i < source.length; i++) {
        const char = source.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return hash.toString(36);
    }
    /**
     * Invalidate token cache (call when source changes)
     */
    invalidateTokenCache() {
      this.cachedSpacingTokens.clear();
      this.cachedColorTokens = null;
      this.cachedSourceHash = "";
    }
    /**
     * Get spacing tokens from source for a specific property type (cached)
     * Parses tokens like "$sm.pad: 4", "$md.rad: 8", "$lg.gap: 16" from the source code
     * Uses getAllSource callback if available to get tokens from all project files
     * @param propType - The property type to extract (pad, rad, gap, etc.)
     */
    getSpacingTokens(propType) {
      const source = this.options.getAllSource ? this.options.getAllSource() : this.codeModifier.getSource();
      const hash = this.hashSource(source);
      if (hash !== this.cachedSourceHash) {
        this.cachedSpacingTokens.clear();
        this.cachedSourceHash = hash;
      }
      const cached = this.cachedSpacingTokens.get(propType);
      if (cached) {
        return cached;
      }
      const lines = source.split("\n");
      const tokenMap = /* @__PURE__ */ new Map();
      const regex = new RegExp(`^\\$?([a-zA-Z0-9_-]+)\\.${propType}\\s*:\\s*(\\d+)$`);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("//")) continue;
        const match = trimmed.match(regex);
        if (match) {
          const name = match[1];
          tokenMap.set(name, {
            name,
            // e.g., "sm"
            fullName: `${name}.${propType}`,
            // e.g., "sm.pad"
            value: match[2]
            // e.g., "4"
          });
        }
      }
      const tokens = Array.from(tokenMap.values());
      this.cachedSpacingTokens.set(propType, tokens);
      return tokens;
    }
    /**
     * Get padding tokens (convenience method)
     */
    getPaddingTokens() {
      return this.getSpacingTokens("pad");
    }
    /**
     * Get radius tokens
     */
    getRadiusTokens() {
      return this.getSpacingTokens("rad");
    }
    /**
     * Get gap tokens
     */
    getGapTokens() {
      return this.getSpacingTokens("gap");
    }
    /**
     * Resolve token value - get numeric value for a token reference
     * Token ref can be "sm.pad" or "$sm.pad" - we normalize it
     */
    resolveTokenValue(tokenRef) {
      const normalizedRef = tokenRef.startsWith("$") ? tokenRef.slice(1) : tokenRef;
      const parts = normalizedRef.split(".");
      if (parts.length < 2) return null;
      const propType = parts[parts.length - 1];
      const tokens = this.getSpacingTokens(propType);
      const token = tokens.find((t) => t.fullName === normalizedRef);
      return token?.value || null;
    }
    /**
     * Get color tokens from source (cached)
     * Parses tokens with hex colors like "$primary.bg: #3B82F6"
     */
    getColorTokens() {
      const source = this.codeModifier.getSource();
      const hash = this.hashSource(source);
      if (hash === this.cachedSourceHash && this.cachedColorTokens) {
        return this.cachedColorTokens;
      }
      const tokens = [];
      const tokenRegex = /\$?([\w.-]+):\s*(#[0-9A-Fa-f]{3,8})/g;
      let match;
      while ((match = tokenRegex.exec(source)) !== null) {
        tokens.push({
          name: match[1],
          value: match[2]
        });
      }
      this.cachedColorTokens = tokens;
      this.cachedSourceHash = hash;
      return tokens;
    }
    // Default tokens for autocomplete when none are defined in source
    DEFAULT_TOKENS = [
      // Spacing
      { name: "xs.pad", value: "2" },
      { name: "sm.pad", value: "4" },
      { name: "md.pad", value: "8" },
      { name: "lg.pad", value: "16" },
      { name: "xl.pad", value: "24" },
      { name: "xs.gap", value: "2" },
      { name: "sm.gap", value: "4" },
      { name: "md.gap", value: "8" },
      { name: "lg.gap", value: "16" },
      // Colors
      { name: "primary.bg", value: "#3B82F6" },
      { name: "secondary.bg", value: "#6B7280" },
      { name: "surface.bg", value: "#1a1a23" },
      { name: "elevated.bg", value: "#27272A" },
      { name: "primary.col", value: "#3B82F6" },
      { name: "muted.col", value: "#71717A" },
      { name: "text.col", value: "#E5E5E5" },
      // Radius
      { name: "sm.rad", value: "4" },
      { name: "md.rad", value: "8" },
      { name: "lg.rad", value: "12" }
    ];
    /**
     * Get all tokens from source, optionally filtered by property suffix
     * @param propertySuffix Optional suffix to filter (e.g., 'pad', 'bg', 'col')
     */
    getAllTokens(propertySuffix) {
      const source = this.codeModifier.getSource();
      const tokens = [];
      const tokenRegex = /^\s*\$?([\w.-]+):\s*(.+)$/gm;
      let match;
      while ((match = tokenRegex.exec(source)) !== null) {
        const name = match[1];
        const value = match[2].trim();
        if (!name.includes(".")) continue;
        if (propertySuffix) {
          if (name.endsWith("." + propertySuffix)) {
            tokens.push({ name, value });
          }
        } else {
          tokens.push({ name, value });
        }
      }
      if (tokens.length === 0) {
        const defaults = propertySuffix ? this.DEFAULT_TOKENS.filter((t) => t.name.endsWith("." + propertySuffix)) : this.DEFAULT_TOKENS;
        return defaults;
      }
      return tokens;
    }
    /**
     * Map property name to token suffix for filtering
     */
    getTokenSuffixForProperty(propName) {
      const mapping = {
        "pad": "pad",
        "padding": "pad",
        "p": "pad",
        "gap": "gap",
        "g": "gap",
        "bg": "bg",
        "background": "bg",
        "col": "col",
        "color": "col",
        "c": "col",
        "rad": "rad",
        "radius": "rad",
        "border-radius": "rad",
        "font-size": "font.size",
        "fs": "font.size"
      };
      return mapping[propName];
    }
    // Autocomplete state
    autocompleteDropdown = null;
    autocompleteInput = null;
    autocompleteIndex = -1;
    autocompleteTokens = [];
    autocompleteKeyHandler = null;
    /**
     * Show token autocomplete dropdown
     */
    showTokenAutocomplete(input) {
      let propName = input.dataset.prop;
      if (!propName) {
        if (input.dataset.padDir) {
          propName = "pad";
        } else if (input.dataset.borderDir || input.dataset.borderColorDir) {
          propName = "border";
        }
      }
      if (!propName) return;
      this.hideTokenAutocomplete();
      const suffix = this.getTokenSuffixForProperty(propName);
      this.autocompleteTokens = this.getAllTokens(suffix);
      if (this.autocompleteTokens.length === 0) {
        this.autocompleteTokens = this.getAllTokens();
      }
      if (this.autocompleteTokens.length === 0) return;
      const dropdown = document.createElement("div");
      dropdown.className = "pp-token-autocomplete";
      this.renderAutocompleteItems(dropdown);
      const rect = input.getBoundingClientRect();
      dropdown.style.position = "fixed";
      dropdown.style.top = `${rect.bottom + 4}px`;
      dropdown.style.left = `${rect.left}px`;
      dropdown.style.minWidth = `${rect.width}px`;
      document.body.appendChild(dropdown);
      this.autocompleteDropdown = dropdown;
      this.autocompleteInput = input;
      this.autocompleteIndex = -1;
      if (this.autocompleteAbortController) {
        this.autocompleteAbortController.abort();
      }
      this.autocompleteAbortController = new AbortController();
      const signal = this.autocompleteAbortController.signal;
      dropdown.querySelectorAll(".pp-token-item").forEach((item, index) => {
        item.addEventListener("mousedown", (e) => {
          e.preventDefault();
          this.selectAutocompleteItem(index);
        }, { signal });
        item.addEventListener("mouseenter", () => {
          this.autocompleteIndex = index;
          this.updateAutocompleteHighlight();
        }, { signal });
      });
      this.autocompleteKeyHandler = (e) => {
        this.handleAutocompleteKeydown(e);
      };
      document.addEventListener("keydown", this.autocompleteKeyHandler);
    }
    /**
     * Render autocomplete items
     */
    renderAutocompleteItems(dropdown) {
      dropdown.innerHTML = this.autocompleteTokens.map((token, index) => `
      <div class="pp-token-item ${index === this.autocompleteIndex ? "highlighted" : ""}" data-index="${index}">
        <span class="pp-token-name">$${token.name}</span>
        <span class="pp-token-value">${token.value}</span>
      </div>
    `).join("");
    }
    /**
     * Update autocomplete highlight
     */
    updateAutocompleteHighlight() {
      if (!this.autocompleteDropdown) return;
      const items = this.autocompleteDropdown.querySelectorAll(".pp-token-item");
      items.forEach((item, index) => {
        item.classList.toggle("highlighted", index === this.autocompleteIndex);
      });
      const highlighted = this.autocompleteDropdown.querySelector(".pp-token-item.highlighted");
      if (highlighted) {
        highlighted.scrollIntoView({ block: "nearest" });
      }
    }
    /**
     * Select autocomplete item
     */
    selectAutocompleteItem(index) {
      if (index < 0 || index >= this.autocompleteTokens.length) return;
      if (!this.autocompleteInput) return;
      const token = this.autocompleteTokens[index];
      this.autocompleteInput.value = "$" + token.name;
      this.autocompleteInput.classList.add("token");
      const propName = this.autocompleteInput.dataset.prop;
      if (propName && this.currentElement) {
        this.updateProperty(propName, "$" + token.name);
      }
      this.hideTokenAutocomplete();
    }
    /**
     * Hide autocomplete dropdown
     */
    hideTokenAutocomplete() {
      if (this.autocompleteDropdown) {
        this.autocompleteDropdown.remove();
        this.autocompleteDropdown = null;
      }
      if (this.autocompleteAbortController) {
        this.autocompleteAbortController.abort();
        this.autocompleteAbortController = null;
      }
      if (this.autocompleteKeyHandler) {
        document.removeEventListener("keydown", this.autocompleteKeyHandler);
        this.autocompleteKeyHandler = null;
      }
      this.autocompleteInput = null;
      this.autocompleteIndex = -1;
      this.autocompleteTokens = [];
    }
    /**
     * Handle autocomplete keyboard navigation
     */
    handleAutocompleteKeydown(e) {
      if (!this.autocompleteDropdown) return false;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          this.autocompleteIndex = Math.min(this.autocompleteIndex + 1, this.autocompleteTokens.length - 1);
          this.updateAutocompleteHighlight();
          return true;
        case "ArrowUp":
          e.preventDefault();
          this.autocompleteIndex = Math.max(this.autocompleteIndex - 1, 0);
          this.updateAutocompleteHighlight();
          return true;
        case "Enter":
          if (this.autocompleteIndex >= 0) {
            e.preventDefault();
            this.selectAutocompleteItem(this.autocompleteIndex);
            return true;
          }
          break;
        case "Escape":
          e.preventDefault();
          this.hideTokenAutocomplete();
          return true;
        case "Tab":
          this.hideTokenAutocomplete();
          break;
      }
      return false;
    }
    /**
     * Default color swatches for v2
     */
    COLOR_V2_SWATCHES = {
      bg: [
        { label: "Surface", value: "#1a1a23" },
        { label: "Elevated", value: "#27272A" },
        { label: "Primary", value: "#3B82F6" },
        { label: "Secondary", value: "#6B7280" }
      ],
      text: [
        { label: "Text", value: "#E5E5E5" },
        { label: "Muted", value: "#71717A" },
        { label: "Primary", value: "#3B82F6" }
      ]
    };
    /**
     * Render color picker section (v2)
     */
    /**
     * Render color section (1:1 from prototype-v2.html)
     */
    // Default color tokens when none defined in source
    DEFAULT_BG_TOKENS = [
      { name: "primary.bg", value: "#3B82F6" },
      { name: "success.bg", value: "#22C55E" },
      { name: "surface.bg", value: "#1a1a23" },
      { name: "elevated.bg", value: "#27272A" }
    ];
    DEFAULT_COL_TOKENS = [
      { name: "text.col", value: "#FFFFFF" },
      { name: "muted.col", value: "#A1A1AA" },
      { name: "subtle.col", value: "#71717A" }
    ];
    renderColorSection() {
      const nodeId = this.currentElement?.templateId || this.currentElement?.nodeId || "";
      const props = this.propertyExtractor?.getProperties(nodeId);
      const bgProp = props?.allProperties.find((p) => p.name === "background" || p.name === "bg");
      const colProp = props?.allProperties.find((p) => p.name === "color" || p.name === "col" || p.name === "c");
      const bgValue = bgProp?.value || "";
      const colValue = colProp?.value || "";
      const allColorTokens = this.getColorTokens();
      const bgTokens = allColorTokens.filter((t) => t.name.endsWith(".bg"));
      const colTokens = allColorTokens.filter((t) => t.name.endsWith(".col"));
      const bgTokensToUse = bgTokens.length > 0 ? bgTokens : this.DEFAULT_BG_TOKENS;
      const colTokensToUse = colTokens.length > 0 ? colTokens : this.DEFAULT_COL_TOKENS;
      const bgTokenValues = bgTokensToUse.map((t) => t.value.toLowerCase());
      const bgHasCustom = bgValue && !bgTokenValues.includes(bgValue.toLowerCase());
      const colTokenValues = colTokensToUse.map((t) => t.value.toLowerCase());
      const colHasCustom = colValue && !colTokenValues.includes(colValue.toLowerCase());
      const bgSwatches = bgTokensToUse.map((token) => {
        const isActive = bgValue.toLowerCase() === token.value.toLowerCase();
        return `<button class="color-swatch ${isActive ? "active" : ""}" style="background: ${token.value}" data-color-prop="bg" data-color="${token.value}" data-token="$${token.name}" title="$${token.name}"></button>`;
      }).join("");
      const colSwatches = colTokensToUse.map((token) => {
        const isActive = colValue.toLowerCase() === token.value.toLowerCase();
        return `<button class="color-swatch ${isActive ? "active" : ""}" style="background: ${token.value}" data-color-prop="color" data-color="${token.value}" data-token="$${token.name}" title="$${token.name}"></button>`;
      }).join("");
      return `
      <div class="section">
        <div class="section-label">Color</div>
        <div class="section-content">
          <div class="prop-row">
            <span class="prop-label">Background</span>
            <div class="prop-content">
              <div class="color-group">
                ${bgHasCustom ? `<button class="color-swatch active" style="background: ${this.escapeHtml(bgValue)}" data-color-prop="bg" data-color="${this.escapeHtml(bgValue)}" title="Current"></button>` : ""}
                ${bgSwatches}
              </div>
              <input type="text" class="prop-input" value="${this.escapeHtml(bgValue)}" data-prop="bg" placeholder="#hex">
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Text</span>
            <div class="prop-content">
              <div class="color-group">
                ${colHasCustom ? `<button class="color-swatch active" style="background: ${this.escapeHtml(colValue)}" data-color-prop="color" data-color="${this.escapeHtml(colValue)}" title="Current"></button>` : ""}
                ${colSwatches}
              </div>
              <input type="text" class="prop-input" value="${this.escapeHtml(colValue)}" data-prop="color" placeholder="#hex">
            </div>
          </div>
        </div>
      </div>
    `;
    }
    /**
     * Render a generic preset row
     * Pattern: [Icon] [Presets] [Input][▾] [Extra]
     */
    renderPresetRow(config) {
      const iconPath = PROPERTY_ICON_PATHS[config.iconKey];
      const presetButtons = config.presets.map((preset) => {
        const active = config.value === preset.value;
        return `<button class="pp-preset ${active ? "active" : ""}" data-${config.dataAttr}="${preset.value}">${preset.label}</button>`;
      }).join("");
      const dropdownBtn = config.showDropdown ? `<button class="pp-dropdown" data-${config.dataAttr}-dropdown>\u25BE</button>` : "";
      const dataPropAttr = config.dataProp ? `data-prop="${config.dataProp}"` : "";
      return `
      <div class="pp-row-line">
        <span class="pp-dim-icon" title="${config.iconKey}">
          <svg viewBox="0 0 14 14" width="12" height="12">${iconPath || ""}</svg>
        </span>
        <div class="pp-presets">
          ${presetButtons}
        </div>
        <div class="pp-input-wrap">
          <input type="text" class="${config.inputClass}" value="${this.escapeHtml(config.value)}" ${dataPropAttr} placeholder="${config.placeholder}">
          ${dropdownBtn}
        </div>
        ${config.extraContent || ""}
      </div>
    `;
    }
    /**
     * Padding token presets for v2
     */
    PADDING_V2_TOKENS = [
      { label: "xs", value: "2" },
      { label: "s", value: "4" },
      { label: "m", value: "8" },
      { label: "l", value: "16" }
    ];
    /**
     * Render spacing section with V/H inputs and tokens (v2)
     */
    /**
     * Render spacing section (1:1 from prototype-v2.html)
     */
    renderSpacingSection(category) {
      const props = category.properties;
      const padProp = props.find((p) => p.name === "padding" || p.name === "pad" || p.name === "p");
      const padValue = padProp?.value || "";
      const padParts = padValue.split(/\s+/).filter(Boolean);
      let tPad = "", rPad = "", bPad = "", lPad = "";
      if (padParts.length === 1) {
        tPad = rPad = bPad = lPad = padParts[0];
      } else if (padParts.length === 2) {
        tPad = bPad = padParts[0];
        rPad = lPad = padParts[1];
      } else if (padParts.length === 4) {
        tPad = padParts[0];
        rPad = padParts[1];
        bPad = padParts[2];
        lPad = padParts[3];
      }
      const vPad = tPad, hPad = rPad;
      const dynamicTokens = this.getPaddingTokens();
      const tokensToUse = dynamicTokens.length > 0 ? dynamicTokens.map((t) => ({ label: t.name, value: t.value, tokenRef: `$${t.fullName}` })) : this.PADDING_V2_TOKENS.map((t) => ({ label: t.label, value: t.value, tokenRef: `$${t.label}.pad` }));
      const renderPadTokens = (activeValue, direction) => {
        const isTokenRef = activeValue.startsWith("$");
        const resolvedValue = isTokenRef ? this.resolveTokenValue(activeValue) : null;
        return tokensToUse.map((token) => {
          const isActive = isTokenRef ? activeValue === token.tokenRef : activeValue === token.value;
          return `<button class="token-btn ${isActive ? "active" : ""}" data-pad-token="${token.value}" data-token-ref="${token.tokenRef}" data-pad-dir="${direction}" title="${token.tokenRef}: ${token.value}">${token.label}</button>`;
        }).join("");
      };
      return `
      <div class="section">
        <div class="section-label">Spacing</div>
        <div class="section-content" data-expand-container="spacing">
          <div class="prop-row collapsed-row" data-expand-group="spacing">
            <span class="prop-label">Padding H</span>
            <div class="prop-content">
              <div class="token-group">
                ${renderPadTokens(hPad, "h")}
              </div>
              <input type="text" class="prop-input" value="${this.escapeHtml(hPad)}" data-pad-dir="h" placeholder="0">
              <button class="toggle-btn expand-btn" data-expand="spacing" title="Expand">
                <svg class="icon" viewBox="0 0 14 14">
                  <path d="M4 6l3 3 3-3"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="prop-row collapsed-row" data-expand-group="spacing">
            <span class="prop-label">Padding V</span>
            <div class="prop-content">
              <div class="token-group">
                ${renderPadTokens(vPad, "v")}
              </div>
              <input type="text" class="prop-input" value="${this.escapeHtml(vPad)}" data-pad-dir="v" placeholder="0">
            </div>
          </div>
          <div class="prop-row expanded-row" data-expand-group="spacing">
            <span class="prop-label">Pad Top</span>
            <div class="prop-content">
              <div class="token-group">
                ${renderPadTokens(tPad, "t")}
              </div>
              <input type="text" class="prop-input" value="${this.escapeHtml(tPad)}" data-pad-dir="t" placeholder="0">
              <button class="toggle-btn expand-btn" data-expand="spacing" title="Collapse">
                <svg class="icon" viewBox="0 0 14 14">
                  <path d="M4 8l3-3 3 3"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="prop-row expanded-row" data-expand-group="spacing">
            <span class="prop-label">Pad Right</span>
            <div class="prop-content">
              <div class="token-group">
                ${renderPadTokens(rPad, "r")}
              </div>
              <input type="text" class="prop-input" value="${this.escapeHtml(rPad)}" data-pad-dir="r" placeholder="0">
            </div>
          </div>
          <div class="prop-row expanded-row" data-expand-group="spacing">
            <span class="prop-label">Pad Bottom</span>
            <div class="prop-content">
              <div class="token-group">
                ${renderPadTokens(bPad, "b")}
              </div>
              <input type="text" class="prop-input" value="${this.escapeHtml(bPad)}" data-pad-dir="b" placeholder="0">
            </div>
          </div>
          <div class="prop-row expanded-row" data-expand-group="spacing">
            <span class="prop-label">Pad Left</span>
            <div class="prop-content">
              <div class="token-group">
                ${renderPadTokens(lPad, "l")}
              </div>
              <input type="text" class="prop-input" value="${this.escapeHtml(lPad)}" data-pad-dir="l" placeholder="0">
            </div>
          </div>
        </div>
      </div>
    `;
    }
    /**
     * Render border section (1:1 from prototype-v2.html)
     */
    renderBorderSection(category) {
      const props = category.properties;
      const radiusProp = props.find((p) => p.name === "radius" || p.name === "rad");
      const radiusValue = radiusProp?.value || "";
      const borderProp = props.find((p) => p.name === "border" || p.name === "bor");
      const borderValue = borderProp?.value || "";
      const borderParts = borderValue.split(/\s+/).filter(Boolean);
      const borderWidth = borderParts[0] || "0";
      const dynamicRadiusTokens = this.getRadiusTokens();
      const radiusTokens = dynamicRadiusTokens.length > 0 ? [{ label: "0", value: "0", tokenRef: "" }, ...dynamicRadiusTokens.map((t) => ({ label: t.name, value: t.value, tokenRef: `$${t.fullName}` }))] : [
        { label: "0", value: "0", tokenRef: "" },
        { label: "s", value: "4", tokenRef: "$s.rad" },
        { label: "m", value: "8", tokenRef: "$m.rad" },
        { label: "l", value: "16", tokenRef: "$l.rad" }
      ];
      const isRadiusTokenRef = radiusValue.startsWith("$");
      const renderRadTokens = radiusTokens.map((token) => {
        const isActive = isRadiusTokenRef ? radiusValue === token.tokenRef : radiusValue === token.value;
        const title = token.tokenRef ? `${token.tokenRef}: ${token.value}` : token.value;
        return `<button class="token-btn ${isActive ? "active" : ""}" data-radius="${token.value}" data-token-ref="${token.tokenRef}" title="${title}">${token.label}</button>`;
      }).join("");
      const borderWidths = ["0", "1", "2"];
      const borderWidthToggles = borderWidths.map((w) => {
        const isActive = borderWidth === w;
        return `<button class="toggle-btn ${isActive ? "active" : ""}" data-border-width="${w}" title="${w}px">${w}</button>`;
      }).join("");
      return `
      <div class="section">
        <div class="section-label">Border</div>
        <div class="section-content">
          <div class="prop-row">
            <span class="prop-label">Radius</span>
            <div class="prop-content">
              <div class="token-group">
                ${renderRadTokens}
                <button class="token-btn ${radiusValue === "999" ? "active" : ""}" data-radius="999" title="Full: 999">
                  <svg class="icon" viewBox="0 0 14 14">
                    <circle cx="7" cy="7" r="5"/>
                  </svg>
                </button>
              </div>
              <input type="text" class="prop-input" value="${this.escapeHtml(radiusValue)}" data-prop="radius" placeholder="0">
              <button class="toggle-btn expand-btn" data-expand="radius" title="Expand">
                <svg class="icon" viewBox="0 0 14 14">
                  <path d="M4 6l3 3 3-3"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="prop-row expanded-row" data-expand-group="radius">
            <span class="prop-label">Top Left</span>
            <div class="prop-content">
              <div class="token-group">
                ${renderRadTokens}
              </div>
              <input type="text" class="prop-input" value="${this.escapeHtml(radiusValue)}" data-radius-corner="tl" placeholder="0">
            </div>
          </div>
          <div class="prop-row expanded-row" data-expand-group="radius">
            <span class="prop-label">Top Right</span>
            <div class="prop-content">
              <div class="token-group">
                ${renderRadTokens}
              </div>
              <input type="text" class="prop-input" value="${this.escapeHtml(radiusValue)}" data-radius-corner="tr" placeholder="0">
            </div>
          </div>
          <div class="prop-row expanded-row" data-expand-group="radius">
            <span class="prop-label">Btm Right</span>
            <div class="prop-content">
              <div class="token-group">
                ${renderRadTokens}
              </div>
              <input type="text" class="prop-input" value="${this.escapeHtml(radiusValue)}" data-radius-corner="br" placeholder="0">
            </div>
          </div>
          <div class="prop-row expanded-row" data-expand-group="radius">
            <span class="prop-label">Btm Left</span>
            <div class="prop-content">
              <div class="token-group">
                ${renderRadTokens}
              </div>
              <input type="text" class="prop-input" value="${this.escapeHtml(radiusValue)}" data-radius-corner="bl" placeholder="0">
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Border</span>
            <div class="prop-content">
              <div class="toggle-group">
                ${borderWidthToggles}
              </div>
              <div class="color-group">
                <button class="color-swatch" style="background: #333" data-border-color="#333" title="$border.col"></button>
                <button class="color-swatch" style="background: #3B82F6" data-border-color="#3B82F6" title="$primary.col"></button>
              </div>
              <button class="toggle-btn expand-btn" data-expand="border" title="Expand">
                <svg class="icon" viewBox="0 0 14 14">
                  <path d="M4 6l3 3 3-3"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="prop-row expanded-row" data-expand-group="border">
            <span class="prop-label">Top</span>
            <div class="prop-content">
              <div class="toggle-group">
                ${borderWidthToggles}
              </div>
              <div class="color-group">
                <button class="color-swatch" style="background: #333" data-border-color="#333"></button>
                <button class="color-swatch" style="background: #3B82F6" data-border-color="#3B82F6"></button>
              </div>
            </div>
          </div>
          <div class="prop-row expanded-row" data-expand-group="border">
            <span class="prop-label">Right</span>
            <div class="prop-content">
              <div class="toggle-group">
                ${borderWidthToggles}
              </div>
              <div class="color-group">
                <button class="color-swatch" style="background: #333" data-border-color="#333"></button>
                <button class="color-swatch" style="background: #3B82F6" data-border-color="#3B82F6"></button>
              </div>
            </div>
          </div>
          <div class="prop-row expanded-row" data-expand-group="border">
            <span class="prop-label">Bottom</span>
            <div class="prop-content">
              <div class="toggle-group">
                ${borderWidthToggles}
              </div>
              <div class="color-group">
                <button class="color-swatch" style="background: #333" data-border-color="#333"></button>
                <button class="color-swatch" style="background: #3B82F6" data-border-color="#3B82F6"></button>
              </div>
            </div>
          </div>
          <div class="prop-row expanded-row" data-expand-group="border">
            <span class="prop-label">Left</span>
            <div class="prop-content">
              <div class="toggle-group">
                ${borderWidthToggles}
              </div>
              <div class="color-group">
                <button class="color-swatch" style="background: #333" data-border-color="#333"></button>
                <button class="color-swatch" style="background: #3B82F6" data-border-color="#3B82F6"></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    }
    /**
     * Google Font families
     */
    GOOGLE_FONTS = [
      "Inter",
      "Roboto",
      "Open Sans",
      "Lato",
      "Montserrat",
      "Poppins",
      "Oswald",
      "Raleway",
      "Nunito",
      "Playfair Display",
      "Merriweather",
      "Source Sans Pro",
      "Ubuntu",
      "Rubik",
      "Work Sans",
      "Fira Sans",
      "Quicksand",
      "Karla",
      "Inconsolata",
      "Space Mono"
    ];
    /**
     * Font size presets
     */
    FONT_SIZE_PRESETS = ["11", "12", "14", "16", "18", "20", "24", "32"];
    /**
     * Font weight options
     */
    FONT_WEIGHT_OPTIONS = [
      { label: "300", value: "300" },
      { label: "400", value: "400" },
      { label: "500", value: "500" },
      { label: "600", value: "600" },
      { label: "700", value: "700" }
    ];
    /**
     * Text alignment options
     */
    TEXT_ALIGNS = ["left", "center", "right"];
    /**
     * Text style toggles (booleans)
     */
    TEXT_STYLES = ["italic", "underline", "uppercase", "lowercase", "truncate"];
    /**
     * Font size tokens for v2
     */
    FONT_SIZE_V2_TOKENS = [
      { label: "xs", value: "11" },
      { label: "s", value: "12" },
      { label: "m", value: "14" },
      { label: "l", value: "16" },
      { label: "xl", value: "20" }
    ];
    /**
     * Render typography section (v2) - matches prototype-v2.html
     */
    renderTypographySection(category) {
      const props = category.properties;
      const fontProp = props.find((p) => p.name === "font");
      const fontSizeProp = props.find((p) => p.name === "font-size" || p.name === "fs");
      const weightProp = props.find((p) => p.name === "weight");
      const textAlignProp = props.find((p) => p.name === "text-align");
      const fontValue = fontProp?.value || "";
      const fontSizeValue = fontSizeProp?.value || "";
      const weightValue = weightProp?.value || "";
      const textAlignValue = textAlignProp?.value || "";
      const prototypefonts = ["Inter", "SF Pro", "Helvetica", "Arial", "Georgia", "Times", "SF Mono", "Menlo"];
      const fontOptions = prototypefonts.map(
        (f) => `<option value="${f}" ${fontValue === f ? "selected" : ""}>${f}</option>`
      ).join("");
      const prototypeWeights = [
        { value: "100", label: "100 \xB7 Thin" },
        { value: "200", label: "200 \xB7 Extra Light" },
        { value: "300", label: "300 \xB7 Light" },
        { value: "400", label: "400 \xB7 Regular" },
        { value: "500", label: "500 \xB7 Medium" },
        { value: "600", label: "600 \xB7 Semi Bold" },
        { value: "700", label: "700 \xB7 Bold" },
        { value: "800", label: "800 \xB7 Extra Bold" },
        { value: "900", label: "900 \xB7 Black" }
      ];
      const weightOptions = prototypeWeights.map(
        (w) => `<option value="${w.value}" ${weightValue === w.value ? "selected" : ""}>${w.label}</option>`
      ).join("");
      const sizeTokens = this.FONT_SIZE_V2_TOKENS.map((token) => {
        const isActive = fontSizeValue === token.value;
        return `<button class="token-btn ${isActive ? "active" : ""}" data-font-size="${token.value}" title="${token.value}px">${token.label}</button>`;
      }).join("");
      const alignIcons = {
        left: '<path d="M2 3h10M2 7h6M2 11h8"/>',
        center: '<path d="M2 3h10M4 7h6M3 11h8"/>',
        right: '<path d="M2 3h10M6 7h6M4 11h8"/>'
      };
      const alignToggles = this.TEXT_ALIGNS.map((align) => {
        const isActive = textAlignValue === align;
        const iconPath = alignIcons[align] || "";
        return `<button class="toggle-btn ${isActive ? "active" : ""}" data-text-align="${align}" title="${align.charAt(0).toUpperCase() + align.slice(1)}">
        <svg class="icon" viewBox="0 0 14 14">${iconPath}</svg>
      </button>`;
      }).join("");
      const styleIcons = {
        italic: '<path d="M6 3h4M4 11h4M8 3L6 11"/>',
        underline: '<path d="M4 3v5a3 3 0 006 0V3M3 12h8"/>'
      };
      const styleToggles = ["italic", "underline"].map((style) => {
        const prop = props.find((p) => p.name === style);
        const isActive = prop && (prop.value === "true" || prop.value === "" && prop.hasValue !== false);
        const iconPath = styleIcons[style];
        return `<button class="toggle-btn ${isActive ? "active" : ""}" data-text-style="${style}" title="${style.charAt(0).toUpperCase() + style.slice(1)}">
        <svg class="icon" viewBox="0 0 14 14">${iconPath}</svg>
      </button>`;
      }).join("");
      return `
      <div class="section">
        <div class="section-label">Typography</div>
        <div class="section-content">
          <div class="prop-row">
            <span class="prop-label">Font</span>
            <div class="prop-content">
              <select class="prop-select" data-prop="font">
                ${fontOptions}
              </select>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Size</span>
            <div class="prop-content">
              <div class="token-group">
                ${sizeTokens}
              </div>
              <input type="text" class="prop-input" value="${this.escapeHtml(fontSizeValue)}" data-prop="font-size" placeholder="14">
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Weight</span>
            <div class="prop-content">
              <select class="prop-select" data-prop="weight">
                ${weightOptions}
              </select>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Align</span>
            <div class="prop-content">
              <div class="toggle-group">
                ${alignToggles}
              </div>
              <div class="toggle-group">
                ${styleToggles}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    }
    /**
     * Shadow presets
     */
    SHADOW_PRESETS = ["none", "sm", "md", "lg"];
    /**
     * Opacity presets
     */
    OPACITY_PRESETS = ["0", "0.25", "0.5", "0.75", "1"];
    /**
     * Render visual section with shadow, opacity, and visibility toggles
     */
    renderVisualSection(category) {
      const props = category.properties;
      const shadowProp = props.find((p) => p.name === "shadow");
      const opacityProp = props.find((p) => p.name === "opacity" || p.name === "o");
      const cursorProp = props.find((p) => p.name === "cursor");
      const zIndexProp = props.find((p) => p.name === "z");
      const shadowValue = shadowProp?.value || "";
      const opacityValue = opacityProp?.value || "";
      const cursorValue = cursorProp?.value || "";
      const zIndexValue = zIndexProp?.value || "";
      const shadowToggles = this.SHADOW_PRESETS.map((shadow) => {
        const active = shadowValue === shadow || shadow === "none" && !shadowValue;
        const iconPath = PROPERTY_ICON_PATHS[`shadow-${shadow}`];
        return `
        <button class="pp-shadow-toggle ${active ? "active" : ""}" data-shadow="${shadow}" title="${shadow}">
          ${iconPath ? `<svg viewBox="0 0 14 14" width="14" height="14">${iconPath}</svg>` : shadow}
        </button>
      `;
      }).join("");
      const opacityPresets = this.OPACITY_PRESETS.map((val) => {
        const active = opacityValue === val;
        return `<button class="pp-opacity-preset ${active ? "active" : ""}" data-opacity="${val}">${val}</button>`;
      }).join("");
      const visibilityToggles = ["hidden", "visible", "disabled"].map((prop) => {
        const propObj = props.find((p) => p.name === prop);
        const isActive = propObj && (propObj.value === "true" || propObj.value === "" && propObj.hasValue !== false);
        const iconPath = PROPERTY_ICON_PATHS[prop];
        return `
        <button class="pp-visibility-toggle ${isActive ? "active" : ""}" data-visibility="${prop}" title="${prop}">
          ${iconPath ? `<svg viewBox="0 0 14 14" width="14" height="14">${iconPath}</svg>` : prop}
        </button>
      `;
      }).join("");
      const cursorOptions = ["default", "pointer", "text", "move", "not-allowed", "grab"];
      return `
      <div class="pp-section">
        <div class="pp-label">Visual</div>
        <div class="pp-visual-row">
          <span class="pp-visual-label">Shadow</span>
          <div class="pp-shadow-group">
            ${shadowToggles}
          </div>
        </div>
        <div class="pp-visual-row">
          <span class="pp-visual-label">Opacity</span>
          <div class="pp-opacity-group">
            ${opacityPresets}
          </div>
          <input type="text" class="pp-opacity-input" value="${this.escapeHtml(opacityValue)}" data-prop="opacity" placeholder="1">
        </div>
        <div class="pp-visual-row">
          <span class="pp-visual-label">Cursor</span>
          <select class="pp-cursor-select" data-prop="cursor">
            <option value="" ${!cursorValue ? "selected" : ""}>-</option>
            ${cursorOptions.map((opt) => `<option value="${opt}" ${opt === cursorValue ? "selected" : ""}>${opt}</option>`).join("")}
          </select>
        </div>
        <div class="pp-visual-row">
          <span class="pp-visual-label">Z-Index</span>
          <input type="text" class="pp-zindex-input" value="${this.escapeHtml(zIndexValue)}" data-prop="z" placeholder="0">
        </div>
        <div class="pp-visual-row">
          <div class="pp-visibility-group">
            ${visibilityToggles}
          </div>
        </div>
      </div>
    `;
    }
    /**
     * Hover opacity presets
     */
    HOVER_OPACITY_PRESETS = ["0.5", "0.7", "0.8", "0.9", "1"];
    /**
     * Hover scale presets
     */
    HOVER_SCALE_PRESETS = ["0.95", "1", "1.02", "1.05", "1.1"];
    /**
     * Render hover section with hover-specific properties (v2 design)
     */
    renderHoverSection(category) {
      const props = category.properties;
      const hoverBgProp = props.find((p) => p.name === "hover-background" || p.name === "hover-bg");
      const hoverColProp = props.find((p) => p.name === "hover-color" || p.name === "hover-col");
      const hoverOpaProp = props.find((p) => p.name === "hover-opacity" || p.name === "hover-opa");
      const hoverScaleProp = props.find((p) => p.name === "hover-scale");
      const hoverBorProp = props.find((p) => p.name === "hover-border" || p.name === "hover-bor");
      const hoverBocProp = props.find((p) => p.name === "hover-border-color" || p.name === "hover-boc");
      const hoverBgValue = hoverBgProp?.value || "";
      const hoverColValue = hoverColProp?.value || "";
      const hoverOpaValue = hoverOpaProp?.value || "";
      const hoverScaleValue = hoverScaleProp?.value || "";
      const hoverBorValue = hoverBorProp?.value || "";
      const hoverBocValue = hoverBocProp?.value || "";
      const bgSwatches = this.COLOR_V2_SWATCHES.bg.map((swatch) => {
        const isActive = hoverBgValue === swatch.value;
        return `<button class="pp-color-btn ${isActive ? "active" : ""}" data-hover-prop="hover-bg" data-color="${this.escapeHtml(swatch.value)}" title="${swatch.label}" style="background: ${this.escapeHtml(swatch.value)}"></button>`;
      }).join("");
      const colSwatches = this.COLOR_V2_SWATCHES.text.map((swatch) => {
        const isActive = hoverColValue === swatch.value;
        return `<button class="pp-color-btn ${isActive ? "active" : ""}" data-hover-prop="hover-col" data-color="${this.escapeHtml(swatch.value)}" title="${swatch.label}" style="background: ${this.escapeHtml(swatch.value)}"></button>`;
      }).join("");
      const opacityTokens = this.HOVER_OPACITY_PRESETS.map((val) => {
        const isActive = hoverOpaValue === val;
        const label = val === "1" ? "1" : val.replace("0.", ".");
        return `<button class="pp-token-btn ${isActive ? "active" : ""}" data-hover-prop="hover-opacity" data-value="${val}" title="Opacity: ${val}">${label}</button>`;
      }).join("");
      const borderWidths = ["0", "1", "2"];
      const currentBorderWidth = hoverBorValue.split(" ")[0] || "0";
      const borderToggles = borderWidths.map((width) => {
        const isActive = currentBorderWidth === width;
        return `<button class="pp-toggle-btn ${isActive ? "active" : ""}" data-hover-bor-width="${width}" title="${width}px">${width}</button>`;
      }).join("");
      const borderColors = [
        { label: "Border", value: "#333" },
        { label: "Primary", value: "#3B82F6" }
      ];
      const borderColorSwatches = borderColors.map((swatch) => {
        const isActive = hoverBocValue === swatch.value || hoverBorValue.includes(swatch.value);
        return `<button class="pp-color-btn ${isActive ? "active" : ""}" data-hover-prop="hover-boc" data-color="${this.escapeHtml(swatch.value)}" title="${swatch.label}" style="background: ${this.escapeHtml(swatch.value)}"></button>`;
      }).join("");
      return `
      <div class="pp-section">
        <div class="pp-label">Hover</div>
        <div class="pp-prop-row">
          <span class="pp-prop-label">BG</span>
          <div class="pp-prop-content">
            <div class="pp-color-group">
              ${bgSwatches}
            </div>
            <input type="text" class="pp-v2-input" value="${this.escapeHtml(hoverBgValue)}" data-hover-prop="hover-bg" placeholder="#color">
          </div>
        </div>
        <div class="pp-prop-row">
          <span class="pp-prop-label">Color</span>
          <div class="pp-prop-content">
            <div class="pp-color-group">
              ${colSwatches}
            </div>
            <input type="text" class="pp-v2-input" value="${this.escapeHtml(hoverColValue)}" data-hover-prop="hover-col" placeholder="#color">
          </div>
        </div>
        <div class="pp-prop-row">
          <span class="pp-prop-label">Opacity</span>
          <div class="pp-prop-content">
            <div class="pp-token-group">
              ${opacityTokens}
            </div>
            <input type="text" class="pp-v2-input" value="${this.escapeHtml(hoverOpaValue)}" data-hover-prop="hover-opacity" placeholder="1">
          </div>
        </div>
        <div class="pp-prop-row">
          <span class="pp-prop-label">Scale</span>
          <div class="pp-prop-content">
            <input type="text" class="pp-v2-input" value="${this.escapeHtml(hoverScaleValue)}" data-hover-prop="hover-scale" placeholder="1.05">
          </div>
        </div>
        <div class="pp-prop-row">
          <span class="pp-prop-label">Border</span>
          <div class="pp-prop-content">
            <div class="pp-toggle-group">
              ${borderToggles}
            </div>
            <div class="pp-color-group">
              ${borderColorSwatches}
            </div>
          </div>
        </div>
      </div>
    `;
    }
    /**
     * Get short label from token name for display
     * e.g., "sm.pad" -> "SM", "spacing.small.pad" -> "Sma"
     */
    getTokenShortLabel(tokenName) {
      const name = tokenName.replace(/\.pad$/, "");
      const parts = name.split(".");
      const label = parts[0];
      return label.length <= 3 ? label.toUpperCase() : label.charAt(0).toUpperCase() + label.slice(1, 3);
    }
    /**
     * Render alignment as a 3x3 grid
     */
    renderAlignmentGrid(category) {
      const props = category.properties;
      const isActive = (name) => {
        const prop = props.find((p) => p.name === name);
        return prop && (prop.value === "true" || prop.value === "" && prop.hasValue !== false);
      };
      const vAlign = isActive("top") ? "top" : isActive("bottom") ? "bottom" : isActive("ver-center") ? "middle" : null;
      const hAlign = isActive("left") ? "left" : isActive("right") ? "right" : isActive("hor-center") ? "center" : null;
      const isCenter = isActive("center");
      const cells = [
        ["top-left", "top-center", "top-right"],
        ["middle-left", "middle-center", "middle-right"],
        ["bottom-left", "bottom-center", "bottom-right"]
      ];
      const getCellActive = (v, h) => {
        if (v === "middle" && h === "center" && isCenter) return true;
        const vMatch = v === "top" && vAlign === "top" || v === "middle" && vAlign === "middle" || v === "bottom" && vAlign === "bottom";
        const hMatch = h === "left" && hAlign === "left" || h === "center" && hAlign === "center" || h === "right" && hAlign === "right";
        return vMatch && hMatch;
      };
      const gridHtml = cells.map((row, vIdx) => {
        const vName = ["top", "middle", "bottom"][vIdx];
        return row.map((cell, hIdx) => {
          const hName = ["left", "center", "right"][hIdx];
          const active = getCellActive(vName, hName);
          return `<button class="pp-align-cell ${active ? "active" : ""}" data-align="${cell}" title="${cell.replace("-", " ")}"><span></span></button>`;
        }).join("");
      }).join("");
      return `
      <div class="pp-section">
        <div class="pp-label">${this.escapeHtml(category.label)}</div>
        <div class="pp-align-grid">
          ${gridHtml}
        </div>
      </div>
    `;
    }
    /**
     * Render a row of boolean toggles
     */
    renderToggleRow(props) {
      return `
      <div class="pp-toggle-row">
        ${props.map((prop) => this.renderToggleButton(prop)).join("")}
      </div>
    `;
    }
    /**
     * Render a single toggle button
     */
    renderToggleButton(prop) {
      const isActive = prop.value === "true" || prop.value === "" && prop.hasValue !== false;
      const tooltip = prop.description || prop.name;
      const sourceClass = this.options.showSourceIndicators ? `pp-source-${prop.source}` : "";
      const iconPath = PROPERTY_ICON_PATHS[prop.name];
      const content = iconPath ? `<svg width="16" height="16" viewBox="0 0 16 16">${iconPath}</svg>` : this.getDisplayLabel(prop.name);
      return `
      <button class="pp-toggle ${isActive ? "active" : ""} ${sourceClass} ${iconPath ? "pp-toggle-icon" : ""}" data-prop="${this.escapeHtml(prop.name)}" data-type="boolean" title="${this.escapeHtml(tooltip)}">
        ${content}
      </button>
    `;
    }
    /**
     * Render a single property
     */
    renderProperty(prop) {
      const sourceClass = this.options.showSourceIndicators ? `pp-source-${prop.source}` : "";
      const emptyClass = prop.hasValue === false ? "pp-empty-prop" : "";
      switch (prop.type) {
        case "color":
          return this.renderColorProperty(prop, `${sourceClass} ${emptyClass}`);
        case "boolean":
          return this.renderBooleanProperty(prop, `${sourceClass} ${emptyClass}`);
        case "select":
          return this.renderSelectProperty(prop, `${sourceClass} ${emptyClass}`);
        default:
          return this.renderTextProperty(prop, `${sourceClass} ${emptyClass}`);
      }
    }
    /**
     * Render a color property
     */
    renderColorProperty(prop, sourceClass) {
      const colorValue = prop.isToken ? "" : prop.value;
      const displayValue = prop.value;
      return `
      <div class="pp-row ${sourceClass}" data-prop="${this.escapeHtml(prop.name)}">
        <div class="pp-color-row">
          <span class="pp-color-label">${this.getDisplayLabel(prop.name)}</span>
          <input type="color" class="pp-color-swatch" value="${this.escapeHtml(colorValue)}" data-prop="${this.escapeHtml(prop.name)}">
          <input type="text" class="pp-color-input ${prop.isToken ? "token" : ""}" value="${this.escapeHtml(displayValue)}" data-prop="${this.escapeHtml(prop.name)}" placeholder="Color">
        </div>
      </div>
    `;
    }
    /**
     * Render a boolean property
     */
    renderBooleanProperty(prop, sourceClass) {
      const isActive = prop.value === "true" || prop.value === "" && prop.hasValue !== false;
      const tooltip = prop.description || prop.name;
      return `
      <div class="pp-row ${sourceClass}" data-prop="${this.escapeHtml(prop.name)}">
        <button class="pp-icon-btn ${isActive ? "active" : ""}" data-prop="${this.escapeHtml(prop.name)}" data-type="boolean" title="${this.escapeHtml(tooltip)}">
          <span style="font-size: 9px;">${this.getDisplayLabel(prop.name)}</span>
        </button>
      </div>
    `;
    }
    /**
     * Render a select property
     */
    renderSelectProperty(prop, sourceClass) {
      const options = prop.options || this.getSelectOptions(prop.name);
      const tooltip = prop.description ? `title="${this.escapeHtml(prop.description)}"` : "";
      return `
      <div class="pp-row ${sourceClass}" data-prop="${this.escapeHtml(prop.name)}" ${tooltip}>
        <span class="pp-input-prefix">${this.getDisplayLabel(prop.name)}</span>
        <select class="pp-select" data-prop="${this.escapeHtml(prop.name)}">
          <option value="" ${!prop.value ? "selected" : ""}>-</option>
          ${options.map((opt) => `<option value="${opt}" ${opt === prop.value ? "selected" : ""}>${opt}</option>`).join("")}
        </select>
      </div>
    `;
    }
    /**
     * Render a text/number property
     */
    renderTextProperty(prop, sourceClass) {
      const placeholder = prop.description || prop.name;
      const tooltip = prop.description ? `title="${this.escapeHtml(prop.description)}"` : "";
      return `
      <div class="pp-row ${sourceClass}" data-prop="${this.escapeHtml(prop.name)}" ${tooltip}>
        <div class="pp-input">
          <span class="pp-input-prefix">${this.getDisplayLabel(prop.name)}</span>
          <input type="text" class="${prop.isToken ? "token" : ""}" value="${this.escapeHtml(prop.value)}" data-prop="${this.escapeHtml(prop.name)}" placeholder="${this.escapeHtml(placeholder)}">
        </div>
      </div>
    `;
    }
    /**
     * Attach event listeners to inputs
     */
    attachEventListeners() {
      const closeBtn = this.container.querySelector(".pp-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          this.selectionManager.clearSelection();
        });
      }
      const defineBtn = this.container.querySelector(".pp-define-btn");
      if (defineBtn) {
        defineBtn.addEventListener("click", () => {
          this.handleDefineAsComponent();
        });
      }
      const breadcrumbs = this.container.querySelectorAll(".pp-crumb[data-node-id]");
      breadcrumbs.forEach((crumb) => {
        crumb.addEventListener("click", (e) => {
          const target = e.target;
          const nodeId = target.dataset.nodeId;
          if (nodeId && !target.classList.contains("active")) {
            this.selectionManager.select(nodeId);
          }
        });
      });
      const textInputs = this.container.querySelectorAll('input[type="text"]');
      textInputs.forEach((input) => {
        input.addEventListener("input", (e) => {
          this.handleInputChange(e);
          const target = e.target;
          if (target.value === "$" || target.value.startsWith("$")) {
            this.showTokenAutocomplete(target);
          } else {
            this.hideTokenAutocomplete();
          }
        });
        input.addEventListener("keydown", (e) => {
          this.handleAutocompleteKeydown(e);
        });
        input.addEventListener("blur", (e) => {
          const target = e.target;
          setTimeout(() => {
            if (target.isConnected) {
              this.hideTokenAutocomplete();
            }
          }, 150);
        });
      });
      const colorInputs = this.container.querySelectorAll('input[type="color"]');
      colorInputs.forEach((input) => {
        input.addEventListener("input", (e) => this.handleColorChange(e));
      });
      const boolButtons = this.container.querySelectorAll('[data-type="boolean"]');
      boolButtons.forEach((btn) => {
        btn.addEventListener("click", (e) => this.handleBooleanToggle(e));
      });
      const selects = this.container.querySelectorAll(".pp-select");
      selects.forEach((select) => {
        select.addEventListener("change", (e) => this.handleSelectChange(e));
      });
      const alignCells = this.container.querySelectorAll(".pp-align-cell, .align-cell");
      alignCells.forEach((cell) => {
        cell.addEventListener("click", (e) => this.handleAlignmentClick(e));
      });
      const layoutToggles = this.container.querySelectorAll(".pp-layout-toggle, .pp-toggle-btn[data-layout], .toggle-btn[data-layout]");
      layoutToggles.forEach((toggle) => {
        toggle.addEventListener("click", (e) => this.handleLayoutToggle(e));
      });
      const gapTokens = this.container.querySelectorAll("[data-gap-token]");
      gapTokens.forEach((token) => {
        token.addEventListener("click", (e) => this.handleGapTokenClick(e));
      });
      const wrapToggles = this.container.querySelectorAll("[data-wrap]");
      wrapToggles.forEach((toggle) => {
        toggle.addEventListener("click", (e) => this.handleWrapToggle(e));
      });
      const sizeToggles = this.container.querySelectorAll(".pp-size-toggle");
      sizeToggles.forEach((toggle) => {
        toggle.addEventListener("click", (e) => this.handleSizeConstraintToggle(e));
      });
      const sizeModeToggles = this.container.querySelectorAll("[data-size-mode]");
      sizeModeToggles.forEach((toggle) => {
        toggle.addEventListener("click", (e) => this.handleSizeModeToggle(e));
      });
      const sizeInputs = this.container.querySelectorAll(".pp-size-input");
      sizeInputs.forEach((input) => {
        input.addEventListener("input", (e) => this.handleInputChange(e));
      });
      const gapInputs = this.container.querySelectorAll('.pp-gap-field, .pp-v2-input[data-prop="gap"], .prop-input[data-prop="gap"]');
      gapInputs.forEach((input) => {
        input.addEventListener("input", (e) => this.handleInputChange(e));
      });
      const v2Inputs = this.container.querySelectorAll('.pp-v2-input:not([data-prop="gap"]), .prop-input:not([data-prop="gap"]):not([data-pad-dir])');
      v2Inputs.forEach((input) => {
        input.addEventListener("input", (e) => this.handleInputChange(e));
      });
      const padTokens = this.container.querySelectorAll(".pp-pad-token");
      padTokens.forEach((token) => {
        token.addEventListener("click", (e) => this.handlePadTokenClick(e));
      });
      const padV2Tokens = this.container.querySelectorAll("[data-pad-v2-token]");
      padV2Tokens.forEach((token) => {
        token.addEventListener("click", (e) => this.handlePadV2TokenClick(e));
      });
      const padInputs = this.container.querySelectorAll(".pp-pad-input, .pp-v2-input[data-pad-dir], .prop-input[data-pad-dir]");
      padInputs.forEach((input) => {
        input.addEventListener("input", (e) => this.handlePadInputChange(e));
      });
      const padTokenBtns = this.container.querySelectorAll(".token-btn[data-pad-token]");
      padTokenBtns.forEach((token) => {
        token.addEventListener("click", (e) => this.handlePadTokenBtnClick(e));
      });
      const prototypeExpandBtns = this.container.querySelectorAll(".expand-btn[data-expand]");
      prototypeExpandBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => this.handleExpandBtnClick(e));
      });
      const expandBtns = this.container.querySelectorAll(".pp-pad-expand, [data-pad-expand]");
      expandBtns.forEach((btn) => {
        btn.addEventListener("click", () => this.togglePaddingExpand(true));
      });
      const collapseBtns = this.container.querySelectorAll(".pp-pad-collapse, [data-pad-collapse]");
      collapseBtns.forEach((btn) => {
        btn.addEventListener("click", () => this.togglePaddingExpand(false));
      });
      const fontDropdownBtn = this.container.querySelector("[data-font-dropdown]");
      if (fontDropdownBtn) {
        fontDropdownBtn.addEventListener("click", (e) => this.showFontDropdown(e));
      }
      const fontsizeDropdownBtn = this.container.querySelector("[data-fontsize-dropdown]");
      if (fontsizeDropdownBtn) {
        fontsizeDropdownBtn.addEventListener("click", (e) => this.showFontsizeDropdown(e));
      }
      const weightDropdownBtn = this.container.querySelector("[data-weight-dropdown]");
      if (weightDropdownBtn) {
        weightDropdownBtn.addEventListener("click", (e) => this.showWeightDropdown(e));
      }
      const dropdownBtns = this.container.querySelectorAll(".pp-pad-dropdown:not([data-font-dropdown]):not([data-fontsize-dropdown]):not([data-weight-dropdown])");
      dropdownBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => this.showPaddingDropdown(e));
      });
      const borderWidthPresets = this.container.querySelectorAll(".pp-preset[data-border-width]");
      borderWidthPresets.forEach((preset) => {
        preset.addEventListener("click", (e) => this.handleBorderWidthPreset(e));
      });
      const borderStyleToggles = this.container.querySelectorAll(".pp-toggle[data-border-style], .pp-toggle-btn[data-border-style], .pp-layout-toggle[data-border-style]");
      borderStyleToggles.forEach((toggle) => {
        toggle.addEventListener("click", (e) => this.handleBorderStyleToggle(e));
      });
      const borderColorSwatches = this.container.querySelectorAll(".pp-color-swatch[data-border-color-dir]");
      borderColorSwatches.forEach((input) => {
        input.addEventListener("input", (e) => this.handleBorderColorChange(e));
      });
      const borderColorInputs = this.container.querySelectorAll(".pp-color-input[data-border-color-dir]");
      borderColorInputs.forEach((input) => {
        input.addEventListener("input", (e) => this.handleBorderColorChange(e));
      });
      const radiusPresets = this.container.querySelectorAll(".pp-preset[data-radius]");
      radiusPresets.forEach((preset) => {
        preset.addEventListener("click", (e) => this.handleRadiusPreset(e));
      });
      const fontSizePresets = this.container.querySelectorAll(".pp-pad-token[data-font-size], .pp-token-btn[data-font-size], .token-btn[data-font-size]");
      fontSizePresets.forEach((preset) => {
        preset.addEventListener("click", (e) => this.handleFontSizePreset(e));
      });
      const radiusTokenBtns = this.container.querySelectorAll(".token-btn[data-radius]");
      radiusTokenBtns.forEach((token) => {
        token.addEventListener("click", (e) => this.handleRadiusTokenClick(e));
      });
      const borderWidthToggles = this.container.querySelectorAll(".toggle-btn[data-border-width]");
      borderWidthToggles.forEach((toggle) => {
        toggle.addEventListener("click", (e) => this.handleBorderWidthToggle(e));
      });
      const borderColorSwatchBtns = this.container.querySelectorAll(".color-swatch[data-border-color]");
      borderColorSwatchBtns.forEach((swatch) => {
        swatch.addEventListener("click", (e) => this.handleBorderColorSwatchClick(e));
      });
      const weightPresets = this.container.querySelectorAll(".pp-pad-token[data-weight]");
      weightPresets.forEach((preset) => {
        preset.addEventListener("click", (e) => this.handleWeightPreset(e));
      });
      const textAlignToggles = this.container.querySelectorAll(".pp-pad-token[data-text-align], .pp-toggle-btn[data-text-align], .toggle-btn[data-text-align]");
      textAlignToggles.forEach((toggle) => {
        toggle.addEventListener("click", (e) => this.handleTextAlignToggle(e));
      });
      const textStyleToggles = this.container.querySelectorAll(".pp-pad-token[data-text-style], .pp-toggle-btn[data-text-style], .toggle-btn[data-text-style]");
      textStyleToggles.forEach((toggle) => {
        toggle.addEventListener("click", (e) => this.handleTextStyleToggle(e));
      });
      const v2Selects = this.container.querySelectorAll(".pp-v2-select[data-prop], .prop-select[data-prop]");
      v2Selects.forEach((select) => {
        select.addEventListener("change", (e) => this.handleV2SelectChange(e));
      });
      const v2PropInputs = this.container.querySelectorAll(".pp-v2-input[data-prop], .prop-input[data-prop]");
      v2PropInputs.forEach((input) => {
        input.addEventListener("change", (e) => this.handleV2InputChange(e));
      });
      const shadowToggles = this.container.querySelectorAll(".pp-shadow-toggle");
      shadowToggles.forEach((toggle) => {
        toggle.addEventListener("click", (e) => this.handleShadowToggle(e));
      });
      const opacityPresets = this.container.querySelectorAll(".pp-opacity-preset");
      opacityPresets.forEach((preset) => {
        preset.addEventListener("click", (e) => this.handleOpacityPreset(e));
      });
      const visibilityToggles = this.container.querySelectorAll(".pp-visibility-toggle");
      visibilityToggles.forEach((toggle) => {
        toggle.addEventListener("click", (e) => this.handleVisibilityToggle(e));
      });
      const colorSwatches = this.container.querySelectorAll(".pp-color-swatch, .color-swatch[data-color-prop]");
      colorSwatches.forEach((swatch) => {
        swatch.addEventListener("click", (e) => this.handleColorSwatchClick(e));
      });
      const colorBtns = this.container.querySelectorAll(".pp-color-btn[data-color-prop]");
      colorBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => this.handleColorBtnClick(e));
      });
      const hoverColorBtns = this.container.querySelectorAll(".pp-color-btn[data-hover-prop]");
      hoverColorBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => this.handleHoverColorBtnClick(e));
      });
      const hoverOpacityTokens = this.container.querySelectorAll('.pp-token-btn[data-hover-prop="hover-opacity"]');
      hoverOpacityTokens.forEach((token) => {
        token.addEventListener("click", (e) => this.handleHoverOpacityTokenClick(e));
      });
      const hoverBorderToggles = this.container.querySelectorAll(".pp-toggle-btn[data-hover-bor-width]");
      hoverBorderToggles.forEach((toggle) => {
        toggle.addEventListener("click", (e) => this.handleHoverBorderWidthClick(e));
      });
      const hoverInputs = this.container.querySelectorAll(".pp-v2-input[data-hover-prop]");
      hoverInputs.forEach((input) => {
        input.addEventListener("change", (e) => this.handleHoverInputChange(e));
      });
      const colorPickers = this.container.querySelectorAll(".pp-color-picker");
      colorPickers.forEach((picker) => {
        picker.addEventListener("input", (e) => this.handleColorPickerChange(e));
      });
      const cursorSelect = this.container.querySelector(".pp-cursor-select");
      if (cursorSelect) {
        cursorSelect.addEventListener("change", (e) => this.handleSelectChange(e));
      }
    }
    /**
     * Handle alignment grid click
     */
    handleAlignmentClick(e) {
      const cell = e.target.closest(".pp-align-cell, .align-cell");
      if (!cell || !this.currentElement) return;
      const align = cell.dataset.align;
      if (!align) return;
      const [vertical, horizontal] = align.split("-");
      let newProps;
      if (vertical === "middle" && horizontal === "center") {
        newProps = ["center"];
      } else {
        const vProp = vertical === "top" ? "top" : vertical === "bottom" ? "bottom" : "ver-center";
        const hProp = horizontal === "left" ? "left" : horizontal === "right" ? "right" : "hor-center";
        newProps = [vProp, hProp];
      }
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const result = this.modifyAlignmentInLine(nodeId, newProps);
      if (result) {
        this.onCodeChange(result);
      }
    }
    /**
     * Handle layout toggle click
     */
    handleLayoutToggle(e) {
      const toggle = e.target.closest(".pp-layout-toggle, .pp-toggle-btn[data-layout], .toggle-btn[data-layout]");
      if (!toggle || !this.currentElement) return;
      const layout = toggle.dataset.layout;
      if (!layout) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const result = this.modifyLayoutInLine(nodeId, layout);
      if (result) {
        this.onCodeChange(result);
      }
    }
    /**
     * Handle gap token click (v2)
     */
    handleGapTokenClick(e) {
      const btn = e.target.closest("[data-gap-token]");
      if (!btn || !this.currentElement) return;
      const tokenRef = btn.dataset.tokenRef;
      const value = tokenRef || btn.dataset.gapToken;
      if (!value) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const result = this.codeModifier.updateProperty(nodeId, "gap", value);
      this.onCodeChange(result);
    }
    /**
     * Handle wrap toggle click (v2)
     */
    handleWrapToggle(e) {
      const btn = e.target.closest("[data-wrap]");
      if (!btn || !this.currentElement) return;
      const wrapValue = btn.dataset.wrap;
      if (!wrapValue) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      if (wrapValue === "on") {
        const result = this.codeModifier.updateProperty(nodeId, "wrap", "");
        this.onCodeChange(result);
      } else {
        const result = this.codeModifier.removeProperty(nodeId, "wrap");
        this.onCodeChange(result);
      }
    }
    /**
     * Handle expand button click (prototype)
     */
    handleExpandBtnClick(e) {
      const btn = e.target.closest(".expand-btn[data-expand]");
      if (!btn) return;
      const expandGroup = btn.dataset.expand;
      if (!expandGroup) return;
      const container = this.container.querySelector(`[data-expand-container="${expandGroup}"]`);
      if (container) {
        container.classList.toggle("expanded");
      }
    }
    /**
     * Handle padding token button click (prototype)
     */
    handlePadTokenBtnClick(e) {
      const btn = e.target.closest(".token-btn[data-pad-token]");
      if (!btn || !this.currentElement) return;
      const tokenRef = btn.dataset.tokenRef;
      const value = tokenRef || btn.dataset.padToken;
      const dir = btn.dataset.padDir;
      if (!value || !dir) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const props = this.propertyExtractor?.getProperties(nodeId);
      const padProp = props?.allProperties.find((p) => p.name === "padding" || p.name === "pad" || p.name === "p");
      const currentValue = padProp?.value || "";
      const padParts = currentValue.split(/\s+/).filter(Boolean);
      let tPad = "", rPad = "", bPad = "", lPad = "";
      if (padParts.length === 1) {
        tPad = rPad = bPad = lPad = padParts[0];
      } else if (padParts.length === 2) {
        tPad = bPad = padParts[0];
        rPad = lPad = padParts[1];
      } else if (padParts.length === 4) {
        tPad = padParts[0];
        rPad = padParts[1];
        bPad = padParts[2];
        lPad = padParts[3];
      }
      if (dir === "h") {
        rPad = lPad = value;
      } else if (dir === "v") {
        tPad = bPad = value;
      } else if (dir === "t") {
        tPad = value;
      } else if (dir === "r") {
        rPad = value;
      } else if (dir === "b") {
        bPad = value;
      } else if (dir === "l") {
        lPad = value;
      }
      let newPadValue;
      if (tPad === rPad && rPad === bPad && bPad === lPad) {
        newPadValue = tPad || "0";
      } else if (tPad === bPad && rPad === lPad) {
        newPadValue = `${tPad || "0"} ${rPad || "0"}`;
      } else {
        newPadValue = `${tPad || "0"} ${rPad || "0"} ${bPad || "0"} ${lPad || "0"}`;
      }
      const result = this.codeModifier.updateProperty(nodeId, "pad", newPadValue);
      this.onCodeChange(result);
    }
    /**
     * Handle radius token click (prototype)
     */
    handleRadiusTokenClick(e) {
      const btn = e.target.closest(".token-btn[data-radius]");
      if (!btn || !this.currentElement) return;
      const tokenRef = btn.dataset.tokenRef;
      const value = tokenRef || btn.dataset.radius;
      if (!value) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const result = this.codeModifier.updateProperty(nodeId, "rad", value);
      this.onCodeChange(result);
    }
    /**
     * Handle border width toggle click (prototype)
     */
    handleBorderWidthToggle(e) {
      const btn = e.target.closest(".toggle-btn[data-border-width]");
      if (!btn || !this.currentElement) return;
      const width = btn.dataset.borderWidth;
      if (width === void 0) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      if (width === "0") {
        const result = this.codeModifier.removeProperty(nodeId, "bor");
        this.onCodeChange(result);
      } else {
        const result = this.codeModifier.updateProperty(nodeId, "bor", `${width} #333`);
        this.onCodeChange(result);
      }
    }
    /**
     * Handle border color swatch click (prototype)
     */
    handleBorderColorSwatchClick(e) {
      const btn = e.target.closest(".color-swatch[data-border-color]");
      if (!btn || !this.currentElement) return;
      const color = btn.dataset.borderColor;
      if (!color) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const props = this.propertyExtractor?.getProperties(nodeId);
      const borderProp = props?.allProperties.find((p) => p.name === "border" || p.name === "bor");
      const currentValue = borderProp?.value || "1";
      const parts = currentValue.split(/\s+/).filter(Boolean);
      const width = parts[0] || "1";
      const result = this.codeModifier.updateProperty(nodeId, "bor", `${width} ${color}`);
      this.onCodeChange(result);
    }
    /**
     * Handle size mode toggle click (v2 hug/full)
     */
    handleSizeModeToggle(e) {
      const btn = e.target.closest("[data-size-mode]");
      if (!btn || !this.currentElement) return;
      const mode = btn.dataset.sizeMode;
      if (!mode) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const [prop, value] = mode.split("-");
      const result = this.codeModifier.updateProperty(nodeId, prop, value);
      this.onCodeChange(result);
    }
    /**
     * Handle size constraint toggle click (min-width, max-width, etc.)
     */
    handleSizeConstraintToggle(e) {
      const toggle = e.target.closest(".pp-size-toggle");
      if (!toggle || !this.currentElement) return;
      const constraint = toggle.dataset.sizeConstraint;
      if (!constraint) return;
      const isActive = toggle.classList.contains("active");
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      if (isActive) {
        const result = this.codeModifier.removeProperty(nodeId, constraint);
        this.onCodeChange(result);
      } else {
        const isWidth = constraint.includes("width");
        const baseProp = isWidth ? "width" : "height";
        const baseInput = this.container.querySelector(`.pp-size-input[data-prop="${baseProp}"]`);
        const baseValue = baseInput?.value || "100";
        const result = this.codeModifier.updateProperty(nodeId, constraint, baseValue);
        this.onCodeChange(result);
      }
    }
    /**
     * Handle padding token click
     */
    handlePadTokenClick(e) {
      const btn = e.target.closest(".pp-pad-token");
      if (!btn || !this.currentElement) return;
      const tokenName = btn.dataset.padToken;
      const dir = btn.dataset.padDir;
      if (!tokenName || !dir) return;
      const isActive = btn.classList.contains("active");
      const tokenRef = `$${tokenName}`;
      const vInput = this.container.querySelector('.pp-pad-input[data-pad-dir="v"]');
      const hInput = this.container.querySelector('.pp-pad-input[data-pad-dir="h"]');
      let vVal = vInput?.dataset.tokenRef || vInput?.value || "0";
      let hVal = hInput?.dataset.tokenRef || hInput?.value || "0";
      if (dir === "v") {
        vVal = isActive ? this.resolveTokenValue(tokenName) || "0" : tokenRef;
      } else if (dir === "h") {
        hVal = isActive ? this.resolveTokenValue(tokenName) || "0" : tokenRef;
      }
      const padValue = vVal === hVal ? vVal : `${vVal} ${hVal}`;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const result = this.codeModifier.updateProperty(nodeId, "pad", padValue);
      this.onCodeChange(result);
    }
    /**
     * Handle padding v2 token click
     */
    handlePadV2TokenClick(e) {
      const btn = e.target.closest("[data-pad-v2-token]");
      if (!btn || !this.currentElement) return;
      const value = btn.dataset.padV2Token;
      const dir = btn.dataset.padDir;
      if (!value || !dir) return;
      const vInput = this.container.querySelector('.pp-v2-input[data-pad-dir="v"]');
      const hInput = this.container.querySelector('.pp-v2-input[data-pad-dir="h"]');
      let vVal = vInput?.value || "0";
      let hVal = hInput?.value || "0";
      if (dir === "v") {
        vVal = value;
      } else if (dir === "h") {
        hVal = value;
      } else if (dir === "t" || dir === "b") {
        vVal = value;
      } else if (dir === "r" || dir === "l") {
        hVal = value;
      }
      const padValue = vVal === hVal ? vVal : `${vVal} ${hVal}`;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const result = this.codeModifier.updateProperty(nodeId, "pad", padValue);
      this.onCodeChange(result);
    }
    /**
     * Handle padding input change
     */
    handlePadInputChange(e) {
      const input = e.target;
      if (!input || !this.currentElement) return;
      const dir = input.dataset.padDir;
      if (!dir) return;
      this.debounce("padding", () => {
        this.updatePaddingFromInputs();
      });
    }
    /**
     * Get padding value from input - uses token ref if present, otherwise input value
     */
    getPadValueFromInput(input) {
      if (!input) return "0";
      const tokenRef = input.dataset.tokenRef;
      if (tokenRef && input.readOnly) {
        return tokenRef;
      }
      return input.value || "0";
    }
    /**
     * Update padding from current input values (supports both legacy and v2 inputs)
     */
    updatePaddingFromInputs() {
      if (!this.currentElement) return;
      const spacingGroup = this.container.querySelector(".pp-spacing-group");
      const isExpanded = spacingGroup?.dataset.expanded === "true";
      const getInput = (dir) => {
        return this.container.querySelector(`.pp-pad-input[data-pad-dir="${dir}"]`) || this.container.querySelector(`.pp-v2-input[data-pad-dir="${dir}"]`);
      };
      let padValue;
      if (isExpanded) {
        const t = this.getPadValueFromInput(getInput("t"));
        const r = this.getPadValueFromInput(getInput("r"));
        const b = this.getPadValueFromInput(getInput("b"));
        const l = this.getPadValueFromInput(getInput("l"));
        if (t === b && r === l && t === r) {
          padValue = t;
        } else if (t === b && r === l) {
          padValue = `${t} ${r}`;
        } else {
          padValue = `${t} ${r} ${b} ${l}`;
        }
      } else {
        const v = this.getPadValueFromInput(getInput("v"));
        const h = this.getPadValueFromInput(getInput("h"));
        padValue = v === h ? v : `${v} ${h}`;
      }
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const result = this.codeModifier.updateProperty(nodeId, "pad", padValue);
      this.onCodeChange(result);
    }
    /**
     * Toggle padding expand/collapse
     */
    togglePaddingExpand(expand) {
      const spacingGroup = this.container.querySelector(".pp-spacing-group");
      const compact = this.container.querySelector(".pp-spacing-compact");
      const expanded = this.container.querySelector(".pp-spacing-expanded");
      if (!spacingGroup || !compact || !expanded) return;
      spacingGroup.dataset.expanded = expand ? "true" : "false";
      compact.style.display = expand ? "none" : "flex";
      expanded.style.display = expand ? "flex" : "none";
    }
    /**
     * Toggle border expand/collapse (T/R/B/L)
     */
    toggleBorderExpand(expand) {
      const borderGroup = this.container.querySelector(".pp-border-group");
      const compact = this.container.querySelector(".pp-border-compact");
      const expanded = this.container.querySelector(".pp-border-expanded");
      if (!borderGroup || !compact || !expanded) return;
      borderGroup.dataset.expanded = expand ? "true" : "false";
      compact.style.display = expand ? "none" : "block";
      expanded.style.display = expand ? "block" : "none";
    }
    /**
     * Show padding dropdown with dynamic token values
     */
    showPaddingDropdown(e) {
      const btn = e.target;
      const dir = btn.dataset.padDir;
      if (!dir) return;
      const existing = this.container.querySelector(".pp-pad-dropdown-menu");
      if (existing) existing.remove();
      const tokens = this.getPaddingTokens();
      const dropdown = document.createElement("div");
      dropdown.className = "pp-pad-dropdown-menu";
      if (tokens.length > 0) {
        dropdown.innerHTML = tokens.map(
          (token) => `<button class="pp-pad-preset pp-token-preset" data-value="${token.value}" data-token-ref="$${token.fullName}">
          <span class="pp-token-name">${token.name}</span>
          <span class="pp-token-value">${token.value}</span>
        </button>`
        ).join("") + `<div class="pp-dropdown-divider"></div>` + this.PADDING_PRESETS.map(
          (val) => `<button class="pp-pad-preset pp-numeric-preset" data-value="${val}">${val}</button>`
        ).join("");
      } else {
        dropdown.innerHTML = this.PADDING_PRESETS.map(
          (val) => `<button class="pp-pad-preset" data-value="${val}">${val}</button>`
        ).join("");
      }
      const rect = btn.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      dropdown.style.position = "absolute";
      dropdown.style.top = `${rect.bottom - containerRect.top + 4}px`;
      dropdown.style.left = `${rect.left - containerRect.left}px`;
      this.container.style.position = "relative";
      this.container.appendChild(dropdown);
      dropdown.addEventListener("click", (ev) => {
        const preset = ev.target.closest(".pp-pad-preset");
        if (preset) {
          const value = preset.dataset.value;
          const tokenRef = preset.dataset.tokenRef;
          const input = this.container.querySelector(`.pp-pad-input[data-pad-dir="${dir}"]`);
          if (input && value) {
            input.value = value;
            if (tokenRef) {
              input.dataset.tokenRef = tokenRef;
              input.readOnly = true;
              input.classList.add("pp-token-bound");
            } else {
              delete input.dataset.tokenRef;
              input.readOnly = false;
              input.classList.remove("pp-token-bound");
            }
            this.updatePaddingFromInputs();
          }
          dropdown.remove();
        }
      });
      const closeDropdown = (ev) => {
        if (!dropdown.contains(ev.target)) {
          dropdown.remove();
          document.removeEventListener("click", closeDropdown);
        }
      };
      requestAnimationFrame(() => document.addEventListener("click", closeDropdown));
    }
    /**
     * Show font dropdown with Google Fonts
     */
    showFontDropdown(e) {
      const btn = e.target;
      if (!this.currentElement) return;
      const existing = this.container.querySelector(".pp-pad-dropdown-menu");
      if (existing) existing.remove();
      const fontInput = this.container.querySelector(".pp-font-input");
      const currentFont = fontInput?.value || "";
      const dropdown = document.createElement("div");
      dropdown.className = "pp-pad-dropdown-menu pp-font-dropdown-menu";
      dropdown.innerHTML = this.GOOGLE_FONTS.map(
        (font) => `<button class="pp-pad-preset pp-font-preset ${font === currentFont ? "active" : ""}" data-font="${font}" style="font-family: '${font}', sans-serif">${font}</button>`
      ).join("");
      const rect = btn.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      dropdown.style.position = "absolute";
      dropdown.style.top = `${rect.bottom - containerRect.top + 4}px`;
      dropdown.style.right = `${containerRect.right - rect.right}px`;
      this.container.style.position = "relative";
      this.container.appendChild(dropdown);
      dropdown.addEventListener("click", (ev) => {
        const preset = ev.target.closest(".pp-font-preset");
        if (preset) {
          const font = preset.dataset.font;
          if (font && fontInput) {
            fontInput.value = font;
            const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
            const result = this.codeModifier.updateProperty(nodeId, "font", font);
            this.onCodeChange(result);
          }
          dropdown.remove();
        }
      });
      const closeFontDropdown = (ev) => {
        if (!dropdown.contains(ev.target)) {
          dropdown.remove();
          document.removeEventListener("click", closeFontDropdown);
        }
      };
      requestAnimationFrame(() => document.addEventListener("click", closeFontDropdown));
    }
    /**
     * Show font size dropdown
     */
    showFontsizeDropdown(e) {
      const btn = e.target;
      if (!this.currentElement) return;
      const existing = this.container.querySelector(".pp-pad-dropdown-menu");
      if (existing) existing.remove();
      const fontsizeInput = this.container.querySelector(".pp-fontsize-input");
      const currentFontsize = fontsizeInput?.value || "";
      const sizes = ["11", "12", "14", "16", "18", "20", "24", "32", "48"];
      const dropdown = document.createElement("div");
      dropdown.className = "pp-pad-dropdown-menu pp-fontsize-dropdown-menu";
      dropdown.innerHTML = sizes.map(
        (size) => `<button class="pp-pad-preset pp-fontsize-preset ${size === currentFontsize ? "active" : ""}" data-fontsize="${size}">${size}</button>`
      ).join("");
      const rect = btn.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      dropdown.style.position = "absolute";
      dropdown.style.top = `${rect.bottom - containerRect.top + 4}px`;
      dropdown.style.right = `${containerRect.right - rect.right}px`;
      this.container.style.position = "relative";
      this.container.appendChild(dropdown);
      dropdown.addEventListener("click", (ev) => {
        const preset = ev.target.closest(".pp-fontsize-preset");
        if (preset) {
          const size = preset.dataset.fontsize;
          if (size && fontsizeInput) {
            fontsizeInput.value = size;
            const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
            const result = this.codeModifier.updateProperty(nodeId, "font-size", size);
            this.onCodeChange(result);
          }
          dropdown.remove();
        }
      });
      const closeFontsizeDropdown = (ev) => {
        if (!dropdown.contains(ev.target)) {
          dropdown.remove();
          document.removeEventListener("click", closeFontsizeDropdown);
        }
      };
      requestAnimationFrame(() => document.addEventListener("click", closeFontsizeDropdown));
    }
    /**
     * Show weight dropdown
     */
    showWeightDropdown(e) {
      const btn = e.target;
      if (!this.currentElement) return;
      const existing = this.container.querySelector(".pp-pad-dropdown-menu");
      if (existing) existing.remove();
      const weightInput = this.container.querySelector(".pp-weight-input");
      const currentWeight = weightInput?.value || "";
      const weights = ["300", "400", "500", "600", "700"];
      const dropdown = document.createElement("div");
      dropdown.className = "pp-pad-dropdown-menu pp-weight-dropdown-menu";
      dropdown.innerHTML = weights.map(
        (weight) => `<button class="pp-pad-preset pp-weight-preset ${weight === currentWeight ? "active" : ""}" data-weight="${weight}">${weight}</button>`
      ).join("");
      const rect = btn.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      dropdown.style.position = "absolute";
      dropdown.style.top = `${rect.bottom - containerRect.top + 4}px`;
      dropdown.style.right = `${containerRect.right - rect.right}px`;
      this.container.style.position = "relative";
      this.container.appendChild(dropdown);
      dropdown.addEventListener("click", (ev) => {
        const preset = ev.target.closest(".pp-weight-preset");
        if (preset) {
          const weight = preset.dataset.weight;
          if (weight && weightInput) {
            weightInput.value = weight;
            const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
            const result = this.codeModifier.updateProperty(nodeId, "weight", weight);
            this.onCodeChange(result);
          }
          dropdown.remove();
        }
      });
      const closeWeightDropdown = (ev) => {
        if (!dropdown.contains(ev.target)) {
          dropdown.remove();
          document.removeEventListener("click", closeWeightDropdown);
        }
      };
      requestAnimationFrame(() => document.addEventListener("click", closeWeightDropdown));
    }
    /**
     * Modify layout properties directly in the source line
     * Removes existing layout modes and adds the new one
     */
    modifyLayoutInLine(nodeId, newLayout) {
      const nodeMapping = this.codeModifier.getSourceMap().getNodeById(nodeId);
      if (!nodeMapping) return null;
      const source = this.codeModifier.getSource();
      const lines = source.split("\n");
      const lineIndex = nodeMapping.position.line - 1;
      let line = lines[lineIndex];
      if (!line) return null;
      const layoutKeywords = [
        "\\bhorizontal\\b",
        "\\bhor\\b",
        "\\bvertical\\b",
        "\\bver\\b",
        "\\bstacked\\b",
        "\\bgrid\\b"
      ];
      for (const keyword of layoutKeywords) {
        line = line.replace(new RegExp(`,?\\s*${keyword}\\s*,?`, "g"), (match) => {
          if (match.startsWith(",") && match.endsWith(",")) {
            return ", ";
          }
          return "";
        });
      }
      line = line.replace(/,\s*,/g, ",");
      line = line.replace(/,\s*$/g, "");
      line = line.replace(/,\s*(\n|$)/g, "$1");
      if (newLayout !== "vertical") {
        line = line.trimEnd() + ", " + newLayout;
      }
      lines[lineIndex] = line;
      const newSource = lines.join("\n");
      let fromOffset = 0;
      for (let i = 0; i < lineIndex; i++) {
        fromOffset += source.split("\n")[i].length + 1;
      }
      const toOffset = fromOffset + source.split("\n")[lineIndex].length;
      return {
        success: true,
        newSource,
        change: {
          from: fromOffset,
          to: toOffset,
          insert: line
        }
      };
    }
    /**
     * Modify alignment properties directly in the source line
     * This handles all alignment changes atomically to avoid position corruption
     */
    modifyAlignmentInLine(nodeId, newProps) {
      const nodeMapping = this.codeModifier.getSourceMap().getNodeById(nodeId);
      if (!nodeMapping) return null;
      const source = this.codeModifier.getSource();
      const lines = source.split("\n");
      const lineIndex = nodeMapping.position.line - 1;
      let line = lines[lineIndex];
      if (!line) return null;
      const alignKeywords = ["\\btop\\b", "\\bbottom\\b", "\\bver-center\\b", "\\bleft\\b", "\\bright\\b", "\\bhor-center\\b", "\\bcenter\\b"];
      for (const keyword of alignKeywords) {
        line = line.replace(new RegExp(`,?\\s*${keyword}\\s*,?`, "g"), (match, offset, str) => {
          if (match.startsWith(",") && match.endsWith(",")) {
            return ", ";
          }
          return "";
        });
      }
      line = line.replace(/,\s*,/g, ",");
      line = line.replace(/,\s*$/g, "");
      line = line.replace(/,\s*(\n|$)/g, "$1");
      const insertProps = newProps.join(", ");
      if (line.includes(",") || line.match(/\w+\s+\d+/) || line.match(/\w+\s+\w+/)) {
        line = line.trimEnd() + ", " + insertProps;
      } else {
        line = line.trimEnd() + ", " + insertProps;
      }
      lines[lineIndex] = line;
      const newSource = lines.join("\n");
      let fromOffset = 0;
      for (let i = 0; i < lineIndex; i++) {
        fromOffset += source.split("\n")[i].length + 1;
      }
      const toOffset = fromOffset + source.split("\n")[lineIndex].length;
      return {
        success: true,
        newSource,
        change: {
          from: fromOffset,
          to: toOffset,
          insert: line
        }
      };
    }
    /**
     * Handle text input changes
     */
    handleInputChange(e) {
      const input = e.target;
      const propName = input.dataset.prop;
      if (!propName || !this.currentElement) return;
      this.debounce(propName, () => {
        this.updateProperty(propName, input.value);
      });
    }
    /**
     * Handle color picker changes
     */
    handleColorChange(e) {
      const input = e.target;
      const propName = input.dataset.prop;
      if (!propName || !this.currentElement) return;
      const textInput = this.container.querySelector(`input[type="text"][data-prop="${propName}"]`);
      if (textInput) {
        textInput.value = input.value;
        textInput.classList.remove("token");
      }
      this.updateProperty(propName, input.value);
    }
    /**
     * Handle "Define as Component" button click
     *
     * Extracts inline properties to a component definition in components.mirror
     */
    handleDefineAsComponent() {
      if (!this.currentElement || !this.options.filesAccess) {
        console.warn("PropertyPanel: Cannot define as component - missing element or filesAccess");
        return;
      }
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const result = this.codeModifier.extractToComponentFile(
        nodeId,
        this.options.filesAccess
      );
      if (result.success) {
        this.options.filesAccess.setFile(
          result.componentFileChange.path,
          result.componentFileChange.content
        );
        this.onCodeChange({
          success: true,
          newSource: "",
          // Not used when change is provided
          change: result.currentFileChange
        });
        console.log(
          "PropertyPanel: Component extracted to",
          result.componentFileChange.path,
          result.importAdded ? "(import added)" : ""
        );
      } else {
        console.warn("PropertyPanel: Failed to extract component:", result.error);
      }
    }
    /**
     * Handle boolean button toggle
     */
    handleBooleanToggle(e) {
      const btn = e.target;
      const button = btn.closest('[data-type="boolean"]');
      if (!button) return;
      const propName = button.dataset.prop;
      if (!propName || !this.currentElement) return;
      const isActive = button.classList.contains("active");
      button.classList.toggle("active");
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      if (isActive) {
        const result = this.codeModifier.removeProperty(nodeId, propName);
        this.onCodeChange(result);
      } else {
        this.updateProperty(propName, "true");
      }
    }
    /**
     * Handle select changes
     */
    handleSelectChange(e) {
      const select = e.target;
      const propName = select.dataset.prop;
      if (!propName || !this.currentElement) return;
      this.updateProperty(propName, select.value);
    }
    /**
     * Handle border width preset click
     */
    handleBorderWidthPreset(e) {
      const preset = e.target.closest(".pp-preset[data-border-width]");
      if (!preset || !this.currentElement) return;
      const width = preset.dataset.borderWidth;
      if (width === void 0) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      if (width === "0") {
        const result = this.codeModifier.removeProperty(nodeId, "bor");
        this.onCodeChange(result);
      } else {
        const colorInput = this.container.querySelector('.pp-color-input[data-prop="border-color"]');
        const color = colorInput?.value || "#333";
        const activeStyle = this.container.querySelector(".pp-toggle[data-border-style].active, .pp-toggle-btn[data-border-style].active, .pp-layout-toggle[data-border-style].active");
        const style = activeStyle?.dataset.borderStyle || "solid";
        const borderValue = style === "solid" ? `${width} ${color}` : `${width} ${style} ${color}`;
        const result = this.codeModifier.updateProperty(nodeId, "bor", borderValue);
        this.onCodeChange(result);
      }
    }
    /**
     * Handle border style toggle click
     */
    handleBorderStyleToggle(e) {
      const toggle = e.target.closest(".pp-toggle[data-border-style], .pp-toggle-btn[data-border-style], .pp-layout-toggle[data-border-style]");
      if (!toggle || !this.currentElement) return;
      const style = toggle.dataset.borderStyle;
      if (!style) return;
      const widthInput = this.container.querySelector('.pp-input[data-prop="border-width"]');
      const colorInput = this.container.querySelector('.pp-color-input[data-prop="border-color"]');
      const width = widthInput?.value || "1";
      const color = colorInput?.value || "#333";
      const borderValue = style === "solid" ? `${width} ${color}` : `${width} ${style} ${color}`;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const result = this.codeModifier.updateProperty(nodeId, "bor", borderValue);
      this.onCodeChange(result);
    }
    /**
     * Handle border color change (individual sides)
     */
    handleBorderColorChange(e) {
      const input = e.target;
      const dir = input.dataset.borderColorDir;
      if (!dir || !this.currentElement) return;
      const color = input.value;
      const row = input.closest(".pp-color-row");
      if (row) {
        const swatch = row.querySelector(".pp-color-swatch");
        const textInput = row.querySelector(".pp-color-input");
        if (swatch && swatch !== input) swatch.value = color.startsWith("#") ? color : "#333333";
        if (textInput && textInput !== input) textInput.value = color;
      }
      const line = input.closest(".pp-pad-line");
      const widthInput = line?.querySelector(".pp-pad-input[data-border-dir]");
      const activeStyle = line?.querySelector(".pp-layout-toggle.active[data-border-style], .pp-toggle-btn.active[data-border-style]");
      const width = widthInput?.value || "1";
      const style = activeStyle?.dataset.borderStyle || "solid";
      const borderValue = style === "solid" ? `${width} ${color}` : `${width} ${style} ${color}`;
      const propMap = {
        "t": "bor-t",
        "r": "bor-r",
        "b": "bor-b",
        "l": "bor-l"
      };
      const propName = propMap[dir] || "bor";
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const result = this.codeModifier.updateProperty(nodeId, propName, borderValue);
      this.onCodeChange(result);
    }
    /**
     * Handle radius preset click
     */
    handleRadiusPreset(e) {
      const preset = e.target.closest(".pp-preset[data-radius]");
      if (!preset || !this.currentElement) return;
      const radius = preset.dataset.radius;
      if (!radius) return;
      const radiusValue = radius;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      if (radiusValue === "0") {
        const result = this.codeModifier.removeProperty(nodeId, "rad");
        this.onCodeChange(result);
      } else {
        const result = this.codeModifier.updateProperty(nodeId, "rad", radiusValue);
        this.onCodeChange(result);
      }
    }
    /**
     * Handle font size preset click - reuses pp-pad-token
     */
    handleFontSizePreset(e) {
      const preset = e.target.closest(".pp-pad-token[data-font-size], .pp-token-btn[data-font-size], .token-btn[data-font-size]");
      if (!preset || !this.currentElement) return;
      const size = preset.dataset.fontSize;
      if (!size) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const result = this.codeModifier.updateProperty(nodeId, "font-size", size);
      this.onCodeChange(result);
    }
    /**
     * Handle weight preset click - reuses pp-pad-token
     */
    handleWeightPreset(e) {
      const preset = e.target.closest(".pp-pad-token[data-weight]");
      if (!preset || !this.currentElement) return;
      const weight = preset.dataset.weight;
      if (!weight) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const result = this.codeModifier.updateProperty(nodeId, "weight", weight);
      this.onCodeChange(result);
    }
    /**
     * Handle text align toggle click - reuses pp-pad-token
     */
    handleTextAlignToggle(e) {
      const toggle = e.target.closest(".pp-pad-token[data-text-align], .pp-toggle-btn[data-text-align], .toggle-btn[data-text-align]");
      if (!toggle || !this.currentElement) return;
      const align = toggle.dataset.textAlign;
      if (!align) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const result = this.codeModifier.updateProperty(nodeId, "text-align", align);
      this.onCodeChange(result);
    }
    /**
     * Handle text style toggle click (italic, underline, etc.) - supports prototype
     */
    handleTextStyleToggle(e) {
      const toggle = e.target.closest(".pp-pad-token[data-text-style], .pp-toggle-btn[data-text-style], .toggle-btn[data-text-style]");
      if (!toggle || !this.currentElement) return;
      const style = toggle.dataset.textStyle;
      if (!style) return;
      const isActive = toggle.classList.contains("active");
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      if (isActive) {
        const result = this.codeModifier.removeProperty(nodeId, style);
        this.onCodeChange(result);
      } else {
        const result = this.codeModifier.updateProperty(nodeId, style, "true");
        this.onCodeChange(result);
      }
    }
    /**
     * Handle v2 select change (font, weight dropdowns)
     */
    handleV2SelectChange(e) {
      const select = e.target;
      if (!select || !this.currentElement) return;
      const prop = select.dataset.prop;
      const value = select.value;
      if (!prop) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      if (value === "") {
        const result = this.codeModifier.removeProperty(nodeId, prop);
        this.onCodeChange(result);
      } else {
        const result = this.codeModifier.updateProperty(nodeId, prop, value);
        this.onCodeChange(result);
      }
    }
    /**
     * Handle v2 input change (font-size, etc.)
     */
    handleV2InputChange(e) {
      const input = e.target;
      if (!input || !this.currentElement) return;
      const prop = input.dataset.prop;
      const value = input.value.trim();
      if (!prop) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      if (value === "") {
        const result = this.codeModifier.removeProperty(nodeId, prop);
        this.onCodeChange(result);
      } else {
        const result = this.codeModifier.updateProperty(nodeId, prop, value);
        this.onCodeChange(result);
      }
    }
    /**
     * Handle hover color button click (v2)
     */
    handleHoverColorBtnClick(e) {
      const btn = e.target.closest(".pp-color-btn[data-hover-prop]");
      if (!btn || !this.currentElement) return;
      const prop = btn.dataset.hoverProp;
      const color = btn.dataset.color;
      if (!prop || !color) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const result = this.codeModifier.updateProperty(nodeId, prop, color);
      this.onCodeChange(result);
    }
    /**
     * Handle hover opacity token click (v2)
     */
    handleHoverOpacityTokenClick(e) {
      const token = e.target.closest(".pp-token-btn[data-hover-prop]");
      if (!token || !this.currentElement) return;
      const value = token.dataset.value;
      if (!value) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const result = this.codeModifier.updateProperty(nodeId, "hover-opacity", value);
      this.onCodeChange(result);
    }
    /**
     * Handle hover border width toggle click (v2)
     */
    handleHoverBorderWidthClick(e) {
      const toggle = e.target.closest(".pp-toggle-btn[data-hover-bor-width]");
      if (!toggle || !this.currentElement) return;
      const width = toggle.dataset.hoverBorWidth;
      if (width === void 0) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      if (width === "0") {
        const result = this.codeModifier.removeProperty(nodeId, "hover-bor");
        this.onCodeChange(result);
      } else {
        const row = toggle.closest(".pp-prop-row");
        const activeColorBtn = row?.querySelector('.pp-color-btn.active[data-hover-prop="hover-boc"]');
        const color = activeColorBtn?.dataset.color || "#333";
        const result = this.codeModifier.updateProperty(nodeId, "hover-bor", `${width} ${color}`);
        this.onCodeChange(result);
      }
    }
    /**
     * Handle hover input change (v2)
     */
    handleHoverInputChange(e) {
      const input = e.target;
      if (!input || !this.currentElement) return;
      const prop = input.dataset.hoverProp;
      const value = input.value.trim();
      if (!prop) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      if (value === "") {
        const result = this.codeModifier.removeProperty(nodeId, prop);
        this.onCodeChange(result);
      } else {
        const result = this.codeModifier.updateProperty(nodeId, prop, value);
        this.onCodeChange(result);
      }
    }
    /**
     * Handle shadow toggle click
     */
    handleShadowToggle(e) {
      const toggle = e.target.closest(".pp-shadow-toggle");
      if (!toggle || !this.currentElement) return;
      const shadow = toggle.dataset.shadow;
      if (!shadow) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      if (shadow === "none") {
        const result = this.codeModifier.removeProperty(nodeId, "shadow");
        this.onCodeChange(result);
      } else {
        const result = this.codeModifier.updateProperty(nodeId, "shadow", shadow);
        this.onCodeChange(result);
      }
    }
    /**
     * Handle opacity preset click
     */
    handleOpacityPreset(e) {
      const preset = e.target.closest(".pp-opacity-preset");
      if (!preset || !this.currentElement) return;
      const opacity = preset.dataset.opacity;
      if (!opacity) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const result = this.codeModifier.updateProperty(nodeId, "opacity", opacity);
      this.onCodeChange(result);
    }
    /**
     * Handle visibility toggle click (hidden, visible, disabled)
     */
    handleVisibilityToggle(e) {
      const toggle = e.target.closest(".pp-visibility-toggle");
      if (!toggle || !this.currentElement) return;
      const visibility = toggle.dataset.visibility;
      if (!visibility) return;
      const isActive = toggle.classList.contains("active");
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      if (isActive) {
        const result = this.codeModifier.removeProperty(nodeId, visibility);
        this.onCodeChange(result);
      } else {
        const result = this.codeModifier.updateProperty(nodeId, visibility, "true");
        this.onCodeChange(result);
      }
    }
    /**
     * Handle color swatch click (legacy)
     * Uses token name ($primary.bg) when available, falls back to hex value
     */
    handleColorSwatchClick(e) {
      const swatch = e.target.closest(".pp-color-swatch, .color-swatch");
      if (!swatch || !this.currentElement) return;
      const tokenName = swatch.dataset.token;
      const color = tokenName || swatch.dataset.color;
      if (!color) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const colorProp = swatch.dataset.colorProp;
      if (colorProp) {
        const result = this.codeModifier.updateProperty(nodeId, colorProp, color);
        this.onCodeChange(result);
        return;
      }
      const row = swatch.closest(".pp-color-row");
      const picker = row?.querySelector(".pp-color-picker");
      const prop = picker?.dataset.prop;
      if (prop) {
        const result = this.codeModifier.updateProperty(nodeId, prop, color);
        this.onCodeChange(result);
      }
    }
    /**
     * Handle color button click (v2)
     * Uses token name ($primary.bg) when available, falls back to hex value
     */
    handleColorBtnClick(e) {
      const btn = e.target.closest(".pp-color-btn");
      if (!btn || !this.currentElement) return;
      const tokenName = btn.dataset.token;
      const color = tokenName || btn.dataset.color;
      const prop = btn.dataset.colorProp;
      if (!color || !prop) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const result = this.codeModifier.updateProperty(nodeId, prop, color);
      this.onCodeChange(result);
    }
    /**
     * Handle color picker change
     */
    handleColorPickerChange(e) {
      const picker = e.target;
      if (!picker || !this.currentElement) return;
      const color = picker.value;
      const prop = picker.dataset.prop;
      if (!prop) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const result = this.codeModifier.updateProperty(nodeId, prop, color);
      this.onCodeChange(result);
    }
    /**
     * Update a property value
     */
    updateProperty(propName, value) {
      if (!this.currentElement) return;
      const nodeId = this.currentElement.templateId || this.currentElement.nodeId;
      const result = this.codeModifier.updateProperty(
        nodeId,
        propName,
        value
      );
      this.onCodeChange(result);
    }
    /**
     * Debounce a function call
     */
    debounce(key, fn) {
      const existing = this.debounceTimers.get(key);
      if (existing) {
        window.clearTimeout(existing);
      }
      const timer = window.setTimeout(() => {
        this.debounceTimers.delete(key);
        fn();
      }, this.options.debounceTime);
      this.debounceTimers.set(key, timer);
    }
    /**
     * Clear all debounce timers
     */
    clearDebounceTimers() {
      for (const timer of this.debounceTimers.values()) {
        window.clearTimeout(timer);
      }
      this.debounceTimers.clear();
    }
    /**
     * Get display label for property
     */
    getDisplayLabel(name) {
      const labels = {
        // Layout
        horizontal: "Horizontal",
        hor: "Horizontal",
        vertical: "Vertical",
        ver: "Vertical",
        center: "Center",
        cen: "Center",
        gap: "Gap",
        g: "Gap",
        spread: "Spread",
        wrap: "Wrap",
        stacked: "Stacked",
        grid: "Grid",
        // Alignment
        left: "Left",
        right: "Right",
        "hor-center": "H-Center",
        top: "Top",
        bottom: "Bottom",
        "ver-center": "V-Center",
        // Size
        width: "Width",
        w: "Width",
        height: "Height",
        h: "Height",
        size: "Size",
        "min-width": "Min W",
        minw: "Min W",
        "max-width": "Max W",
        maxw: "Max W",
        "min-height": "Min H",
        minh: "Min H",
        "max-height": "Max H",
        maxh: "Max H",
        // Spacing
        padding: "Padding",
        pad: "Padding",
        p: "Padding",
        margin: "Margin",
        m: "Margin",
        // Colors
        color: "Color",
        col: "Color",
        c: "Color",
        background: "Background",
        bg: "Background",
        "border-color": "Border Color",
        boc: "Border Color",
        // Border
        border: "Border",
        bor: "Border",
        radius: "Radius",
        rad: "Radius",
        // Typography
        "font-size": "Font Size",
        fs: "Font Size",
        weight: "Weight",
        line: "Line Height",
        font: "Font",
        "text-align": "Text Align",
        italic: "Italic",
        underline: "Underline",
        truncate: "Truncate",
        uppercase: "Uppercase",
        lowercase: "Lowercase",
        // Icon
        "icon-size": "Icon Size",
        is: "Icon Size",
        "icon-weight": "Icon Weight",
        iw: "Icon Weight",
        "icon-color": "Icon Color",
        ic: "Icon Color",
        fill: "Fill",
        // Visual
        opacity: "Opacity",
        o: "Opacity",
        shadow: "Shadow",
        cursor: "Cursor",
        z: "Z-Index",
        hidden: "Hidden",
        visible: "Visible",
        disabled: "Disabled",
        rotate: "Rotate",
        rot: "Rotate",
        translate: "Translate",
        // Scroll
        scroll: "Scroll",
        "scroll-ver": "Scroll Y",
        "scroll-hor": "Scroll X",
        "scroll-both": "Scroll Both",
        clip: "Clip",
        // Hover
        "hover-background": "Hover BG",
        "hover-bg": "Hover BG",
        "hover-color": "Hover Color",
        "hover-col": "Hover Color",
        "hover-opacity": "Hover Opacity",
        "hover-opa": "Hover Opacity",
        "hover-scale": "Hover Scale",
        "hover-border": "Hover Border",
        "hover-bor": "Hover Border",
        "hover-border-color": "Hover Border Color",
        "hover-boc": "Hover Border Color",
        "hover-radius": "Hover Radius",
        "hover-rad": "Hover Radius",
        // Content
        content: "Content",
        placeholder: "Placeholder",
        src: "Source",
        href: "Link",
        value: "Value"
      };
      return labels[name] || name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");
    }
    /**
     * Get select options for a property
     */
    getSelectOptions(name) {
      const options = {
        cursor: ["default", "pointer", "text", "move", "not-allowed", "grab", "grabbing"],
        shadow: ["none", "sm", "md", "lg"],
        "text-align": ["left", "center", "right", "justify"]
      };
      return options[name] || [];
    }
    /**
     * Escape HTML
     */
    escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }
    /**
     * Refresh the panel (after external changes)
     * Preserves focus on active input to avoid disrupting user editing
     */
    refresh() {
      const activeElement = document.activeElement;
      const isOurInput = activeElement && this.container.contains(activeElement);
      const focusedProp = isOurInput ? activeElement?.dataset?.prop : null;
      const focusedPadDir = isOurInput ? activeElement?.dataset?.padDir : null;
      const cursorPosition = isOurInput ? activeElement?.selectionStart : null;
      const nodeId = this.selectionManager.getSelection();
      this.updatePanel(nodeId);
      if (focusedProp || focusedPadDir) {
        requestAnimationFrame(() => {
          let inputToFocus = null;
          if (focusedPadDir) {
            inputToFocus = this.container.querySelector(
              `input[data-pad-dir="${focusedPadDir}"]`
            );
          } else if (focusedProp) {
            inputToFocus = this.container.querySelector(
              `input[data-prop="${focusedProp}"]`
            );
          }
          if (inputToFocus) {
            inputToFocus.focus();
            if (cursorPosition !== null && cursorPosition !== void 0) {
              inputToFocus.setSelectionRange(cursorPosition, cursorPosition);
            }
          }
        });
      }
    }
    /**
     * Update dependencies
     */
    updateDependencies(propertyExtractor, codeModifier) {
      this.propertyExtractor = propertyExtractor;
      this.codeModifier = codeModifier;
      this.refresh();
    }
    /**
     * Dispose the panel
     */
    dispose() {
      this.detach();
      this.container.innerHTML = "";
    }
  };
  function createPropertyPanel(container, selectionManager, propertyExtractor, codeModifier, onCodeChange, options) {
    return new PropertyPanel(
      container,
      selectionManager,
      propertyExtractor,
      codeModifier,
      onCodeChange,
      options
    );
  }

  // src/studio/drop-zone-calculator.ts
  var LAYOUT = {
    /** Line thickness in pixels */
    LINE_WIDTH: 2,
    /** Dot diameter in pixels */
    DOT_SIZE: 6,
    /** Offset to center dot on line */
    DOT_CENTER_OFFSET: 2,
    /** Extra offset for dot positioning */
    DOT_END_OFFSET: 3,
    /** Z-index for line indicator */
    LINE_Z_INDEX: "10000",
    /** Z-index for dots (above line) */
    DOT_Z_INDEX: "10001"
  };
  var INDICATOR_STYLES = {
    // Line indicator for before/after placement
    line: {
      position: "absolute",
      backgroundColor: "#3B82F6",
      pointerEvents: "none",
      zIndex: LAYOUT.LINE_Z_INDEX,
      transition: "all 80ms ease-out",
      borderRadius: "1px"
    },
    // Endpoint dots for the line
    dot: {
      position: "absolute",
      width: `${LAYOUT.DOT_SIZE}px`,
      height: `${LAYOUT.DOT_SIZE}px`,
      backgroundColor: "#3B82F6",
      borderRadius: "50%",
      pointerEvents: "none",
      zIndex: LAYOUT.DOT_Z_INDEX,
      transition: "all 80ms ease-out"
    },
    // Inside highlight (container receives drop)
    highlight: {
      backgroundColor: "rgba(59, 130, 246, 0.08)",
      outline: "2px solid #3B82F6",
      outlineOffset: "-2px",
      borderRadius: "4px",
      transition: "all 80ms ease-out"
    }
  };
  var DropZoneCalculator = class {
    container;
    options;
    currentDropZone = null;
    indicatorElement = null;
    startDotElement = null;
    endDotElement = null;
    highlightedElement = null;
    originalHighlightStyles = null;
    // For scroll handling
    lastClientX = 0;
    lastClientY = 0;
    lastSourceNodeId;
    boundScrollHandler;
    constructor(container, options = {}) {
      this.container = container;
      this.options = {
        nodeIdAttribute: options.nodeIdAttribute || "data-mirror-id",
        edgeThreshold: options.edgeThreshold ?? 0.25,
        allowInside: options.allowInside ?? true,
        leafElements: options.leafElements || ["Input", "Textarea", "Icon", "Image"]
      };
      this.boundScrollHandler = this.handleScroll.bind(this);
      this.createIndicatorElement();
    }
    /**
     * Calculate drop zone from mouse position
     * @param sourceNodeId - If provided, prevents self-drop and dropping into descendants
     */
    calculateFromPoint(clientX, clientY, sourceNodeId) {
      const elementAtPoint = document.elementFromPoint(clientX, clientY);
      if (!elementAtPoint || !this.container.contains(elementAtPoint)) {
        return null;
      }
      const targetElement = this.findNodeElement(elementAtPoint);
      if (!targetElement) {
        return null;
      }
      const nodeId = targetElement.getAttribute(this.options.nodeIdAttribute);
      if (!nodeId) {
        return null;
      }
      if (sourceNodeId && nodeId === sourceNodeId) {
        return null;
      }
      if (sourceNodeId && this.isDescendantOf(targetElement, sourceNodeId)) {
        return null;
      }
      const rect = targetElement.getBoundingClientRect();
      const parentElement = this.findParentNodeElement(targetElement);
      const isHorizontalLayout = parentElement ? this.isHorizontalLayout(parentElement) : false;
      const relativePos = isHorizontalLayout ? (clientX - rect.left) / rect.width : (clientY - rect.top) / rect.height;
      let placement;
      const componentName = targetElement.dataset.mirrorName || "";
      const isLeaf = this.options.leafElements.includes(componentName);
      if (isLeaf || !this.options.allowInside) {
        placement = relativePos < 0.5 ? "before" : "after";
      } else {
        if (relativePos < this.options.edgeThreshold) {
          placement = "before";
        } else if (relativePos > 1 - this.options.edgeThreshold) {
          placement = "after";
        } else {
          placement = "inside";
        }
      }
      const parentId = placement === "inside" ? nodeId : parentElement?.getAttribute(this.options.nodeIdAttribute) || "root";
      const dropZone = {
        targetId: nodeId,
        placement,
        element: targetElement,
        parentId,
        siblingId: placement !== "inside" ? nodeId : void 0
      };
      return dropZone;
    }
    /**
     * Update drop zone and visual indicators
     * @param sourceNodeId - If provided, prevents self-drop and dropping into descendants
     */
    updateDropZone(clientX, clientY, sourceNodeId) {
      this.lastClientX = clientX;
      this.lastClientY = clientY;
      this.lastSourceNodeId = sourceNodeId;
      this.startScrollListening();
      const dropZone = this.calculateFromPoint(clientX, clientY, sourceNodeId);
      if (!this.isSameDropZone(dropZone, this.currentDropZone)) {
        this.clearIndicators();
        if (dropZone) {
          this.showIndicator(dropZone);
        }
        this.currentDropZone = dropZone;
      }
      return dropZone;
    }
    /**
     * Handle scroll events during drag - refresh indicator position
     */
    handleScroll() {
      if (this.currentDropZone) {
        const dropZone = this.calculateFromPoint(this.lastClientX, this.lastClientY, this.lastSourceNodeId);
        if (dropZone && this.isSameDropZone(dropZone, this.currentDropZone)) {
          this.clearIndicators();
          this.showIndicator(dropZone);
        } else if (!this.isSameDropZone(dropZone, this.currentDropZone)) {
          this.clearIndicators();
          if (dropZone) {
            this.showIndicator(dropZone);
          }
          this.currentDropZone = dropZone;
        }
      }
    }
    /**
     * Start listening for scroll events on container and its parents
     */
    startScrollListening() {
      this.container.addEventListener("scroll", this.boundScrollHandler, { passive: true });
      window.addEventListener("scroll", this.boundScrollHandler, { passive: true });
    }
    /**
     * Stop listening for scroll events
     */
    stopScrollListening() {
      this.container.removeEventListener("scroll", this.boundScrollHandler);
      window.removeEventListener("scroll", this.boundScrollHandler);
    }
    /**
     * Get current drop zone
     */
    getCurrentDropZone() {
      return this.currentDropZone;
    }
    /**
     * Clear all indicators and reset state
     */
    clear() {
      this.clearIndicators();
      this.currentDropZone = null;
      this.stopScrollListening();
    }
    /**
     * Find sibling element for gap-aware positioning
     */
    findSiblingElement(element, placement) {
      if (placement === "before") {
        let prev = element.previousElementSibling;
        while (prev) {
          if (prev.hasAttribute(this.options.nodeIdAttribute)) {
            return prev;
          }
          prev = prev.previousElementSibling;
        }
      } else if (placement === "after") {
        let next = element.nextElementSibling;
        while (next) {
          if (next.hasAttribute(this.options.nodeIdAttribute)) {
            return next;
          }
          next = next.nextElementSibling;
        }
      }
      return null;
    }
    /**
     * Show visual indicator for drop zone
     */
    showIndicator(dropZone) {
      const { element, placement } = dropZone;
      const rect = element.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      if (placement === "inside") {
        this.highlightElement(element);
      } else {
        const parentElement = this.findParentNodeElement(element);
        const isHorizontal = parentElement ? this.isHorizontalLayout(parentElement) : false;
        const sibling = this.findSiblingElement(element, placement);
        const siblingRect = sibling?.getBoundingClientRect();
        if (this.indicatorElement && this.startDotElement && this.endDotElement) {
          if (isHorizontal) {
            let lineLeft;
            if (placement === "before") {
              if (siblingRect) {
                lineLeft = (siblingRect.right + rect.left) / 2 - containerRect.left;
              } else {
                lineLeft = rect.left - containerRect.left - LAYOUT.LINE_WIDTH / 2;
              }
            } else {
              if (siblingRect) {
                lineLeft = (rect.right + siblingRect.left) / 2 - containerRect.left;
              } else {
                lineLeft = rect.right - containerRect.left - LAYOUT.LINE_WIDTH / 2;
              }
            }
            Object.assign(this.indicatorElement.style, {
              display: "block",
              left: `${lineLeft}px`,
              top: `${rect.top - containerRect.top}px`,
              width: `${LAYOUT.LINE_WIDTH}px`,
              height: `${rect.height}px`
            });
            const dotLeftOffset = lineLeft - LAYOUT.DOT_CENTER_OFFSET;
            Object.assign(this.startDotElement.style, {
              display: "block",
              left: `${dotLeftOffset}px`,
              top: `${rect.top - containerRect.top - LAYOUT.DOT_END_OFFSET}px`
            });
            Object.assign(this.endDotElement.style, {
              display: "block",
              left: `${dotLeftOffset}px`,
              top: `${rect.bottom - containerRect.top - LAYOUT.DOT_END_OFFSET}px`
            });
          } else {
            let lineTop;
            if (placement === "before") {
              if (siblingRect) {
                lineTop = (siblingRect.bottom + rect.top) / 2 - containerRect.top;
              } else {
                lineTop = rect.top - containerRect.top - LAYOUT.LINE_WIDTH / 2;
              }
            } else {
              if (siblingRect) {
                lineTop = (rect.bottom + siblingRect.top) / 2 - containerRect.top;
              } else {
                lineTop = rect.bottom - containerRect.top - LAYOUT.LINE_WIDTH / 2;
              }
            }
            Object.assign(this.indicatorElement.style, {
              display: "block",
              top: `${lineTop}px`,
              left: `${rect.left - containerRect.left}px`,
              width: `${rect.width}px`,
              height: `${LAYOUT.LINE_WIDTH}px`
            });
            const dotTopOffset = lineTop - LAYOUT.DOT_CENTER_OFFSET;
            Object.assign(this.startDotElement.style, {
              display: "block",
              left: `${rect.left - containerRect.left - LAYOUT.DOT_END_OFFSET}px`,
              top: `${dotTopOffset}px`
            });
            Object.assign(this.endDotElement.style, {
              display: "block",
              left: `${rect.right - containerRect.left - LAYOUT.DOT_END_OFFSET}px`,
              top: `${dotTopOffset}px`
            });
          }
        }
      }
    }
    /**
     * Highlight element for "inside" drop (Webflow-style)
     */
    highlightElement(element) {
      this.originalHighlightStyles = {
        background: element.style.backgroundColor,
        outline: element.style.outline,
        outlineOffset: element.style.outlineOffset,
        borderRadius: element.style.borderRadius
      };
      this.highlightedElement = element;
      element.style.backgroundColor = INDICATOR_STYLES.highlight.backgroundColor;
      element.style.outline = INDICATOR_STYLES.highlight.outline;
      element.style.outlineOffset = INDICATOR_STYLES.highlight.outlineOffset;
      element.style.transition = INDICATOR_STYLES.highlight.transition;
    }
    /**
     * Clear all visual indicators
     */
    clearIndicators() {
      if (this.indicatorElement) {
        this.indicatorElement.style.display = "none";
      }
      if (this.startDotElement) {
        this.startDotElement.style.display = "none";
      }
      if (this.endDotElement) {
        this.endDotElement.style.display = "none";
      }
      if (this.highlightedElement) {
        if (this.originalHighlightStyles) {
          this.highlightedElement.style.backgroundColor = this.originalHighlightStyles.background;
          this.highlightedElement.style.outline = this.originalHighlightStyles.outline;
          this.highlightedElement.style.outlineOffset = this.originalHighlightStyles.outlineOffset;
          this.highlightedElement.style.borderRadius = this.originalHighlightStyles.borderRadius;
        } else {
          this.highlightedElement.style.backgroundColor = "";
          this.highlightedElement.style.outline = "";
          this.highlightedElement.style.outlineOffset = "";
        }
        this.highlightedElement.style.transition = "";
        this.highlightedElement = null;
        this.originalHighlightStyles = null;
      }
    }
    /**
     * Create the line indicator and dot elements
     */
    createIndicatorElement() {
      this.indicatorElement = document.createElement("div");
      this.indicatorElement.className = "mirror-drop-indicator";
      Object.assign(this.indicatorElement.style, INDICATOR_STYLES.line);
      this.indicatorElement.style.display = "none";
      this.startDotElement = document.createElement("div");
      this.startDotElement.className = "mirror-drop-indicator-dot";
      Object.assign(this.startDotElement.style, INDICATOR_STYLES.dot);
      this.startDotElement.style.display = "none";
      this.endDotElement = document.createElement("div");
      this.endDotElement.className = "mirror-drop-indicator-dot";
      Object.assign(this.endDotElement.style, INDICATOR_STYLES.dot);
      this.endDotElement.style.display = "none";
      this.container.style.position = this.container.style.position || "relative";
      this.container.appendChild(this.indicatorElement);
      this.container.appendChild(this.startDotElement);
      this.container.appendChild(this.endDotElement);
    }
    /**
     * Find the nearest element with a node ID
     */
    findNodeElement(element) {
      let current = element;
      while (current && current !== this.container) {
        if (current.hasAttribute(this.options.nodeIdAttribute)) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    }
    /**
     * Find parent element with node ID
     */
    findParentNodeElement(element) {
      let current = element.parentElement;
      while (current && current !== this.container) {
        if (current.hasAttribute(this.options.nodeIdAttribute)) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    }
    /**
     * Check if an element is a descendant of an element with the given node ID
     */
    isDescendantOf(element, ancestorNodeId) {
      let current = element.parentElement;
      while (current && current !== this.container) {
        const nodeId = current.getAttribute(this.options.nodeIdAttribute);
        if (nodeId === ancestorNodeId) {
          return true;
        }
        current = current.parentElement;
      }
      return false;
    }
    /**
     * Check if an element has horizontal layout (flex-direction: row)
     */
    isHorizontalLayout(element) {
      const computedStyle = window.getComputedStyle(element);
      const flexDirection = computedStyle.flexDirection;
      const display = computedStyle.display;
      if (display === "flex" || display === "inline-flex") {
        return flexDirection === "row" || flexDirection === "row-reverse";
      }
      if (display === "grid" || display === "inline-grid") {
        const gridTemplateColumns = computedStyle.gridTemplateColumns;
        return gridTemplateColumns !== "none" && gridTemplateColumns.split(" ").length > 1;
      }
      const layout = element.dataset.layout;
      if (layout === "horizontal" || layout === "hor") {
        return true;
      }
      return false;
    }
    /**
     * Check if two drop zones are the same
     */
    isSameDropZone(a, b) {
      if (!a && !b) return true;
      if (!a || !b) return false;
      return a.targetId === b.targetId && a.placement === b.placement;
    }
    /**
     * Ensure indicator elements exist and are in the DOM
     * Call this after preview content updates (which may remove indicators)
     */
    ensureIndicators() {
      const lineInDom = this.indicatorElement && this.container.contains(this.indicatorElement);
      const startDotInDom = this.startDotElement && this.container.contains(this.startDotElement);
      const endDotInDom = this.endDotElement && this.container.contains(this.endDotElement);
      if (!lineInDom || !startDotInDom || !endDotInDom) {
        if (this.indicatorElement && this.indicatorElement.parentNode) {
          this.indicatorElement.parentNode.removeChild(this.indicatorElement);
        }
        if (this.startDotElement && this.startDotElement.parentNode) {
          this.startDotElement.parentNode.removeChild(this.startDotElement);
        }
        if (this.endDotElement && this.endDotElement.parentNode) {
          this.endDotElement.parentNode.removeChild(this.endDotElement);
        }
        this.createIndicatorElement();
      }
    }
    /**
     * Dispose the calculator
     */
    dispose() {
      this.clear();
      if (this.indicatorElement && this.indicatorElement.parentNode) {
        this.indicatorElement.parentNode.removeChild(this.indicatorElement);
      }
      if (this.startDotElement && this.startDotElement.parentNode) {
        this.startDotElement.parentNode.removeChild(this.startDotElement);
      }
      if (this.endDotElement && this.endDotElement.parentNode) {
        this.endDotElement.parentNode.removeChild(this.endDotElement);
      }
      this.indicatorElement = null;
      this.startDotElement = null;
      this.endDotElement = null;
    }
  };
  function createDropZoneCalculator(container, options) {
    return new DropZoneCalculator(container, options);
  }

  // src/studio/drag-drop-manager.ts
  var DragDropManager = class {
    container;
    dropZoneCalculator;
    options;
    codeModifier = null;
    isDragging = false;
    boundHandleDragOver;
    boundHandleDragEnter;
    boundHandleDragLeave;
    boundHandleDrop;
    constructor(container, options = {}) {
      this.container = container;
      this.options = {
        dataType: options.dataType || "application/mirror-component",
        onDrop: options.onDrop || (() => {
        }),
        onDragEnter: options.onDragEnter || (() => {
        }),
        onDragLeave: options.onDragLeave || (() => {
        }),
        onDragOver: options.onDragOver || (() => {
        })
      };
      this.dropZoneCalculator = createDropZoneCalculator(container);
      this.boundHandleDragOver = this.handleDragOver.bind(this);
      this.boundHandleDragEnter = this.handleDragEnter.bind(this);
      this.boundHandleDragLeave = this.handleDragLeave.bind(this);
      this.boundHandleDrop = this.handleDrop.bind(this);
      this.attach();
    }
    /**
     * Update the CodeModifier (call after source/sourceMap changes)
     */
    setCodeModifier(source, sourceMap) {
      this.codeModifier = new CodeModifier(source, sourceMap);
    }
    /**
     * Attach event listeners
     */
    attach() {
      this.container.addEventListener("dragover", this.boundHandleDragOver);
      this.container.addEventListener("dragenter", this.boundHandleDragEnter);
      this.container.addEventListener("dragleave", this.boundHandleDragLeave);
      this.container.addEventListener("drop", this.boundHandleDrop);
    }
    /**
     * Detach event listeners
     */
    detach() {
      this.container.removeEventListener("dragover", this.boundHandleDragOver);
      this.container.removeEventListener("dragenter", this.boundHandleDragEnter);
      this.container.removeEventListener("dragleave", this.boundHandleDragLeave);
      this.container.removeEventListener("drop", this.boundHandleDrop);
      this.dropZoneCalculator.clear();
    }
    /**
     * Handle dragover event
     */
    handleDragOver(e) {
      if (!this.isValidDrag(e)) {
        return;
      }
      e.preventDefault();
      const isMove = this.isMoveDrag(e);
      e.dataTransfer.dropEffect = isMove ? "move" : "copy";
      const sourceNodeId = this.getSourceNodeId(e);
      const dropZone = this.dropZoneCalculator.updateDropZone(e.clientX, e.clientY, sourceNodeId);
      this.options.onDragOver(dropZone);
    }
    /**
     * Handle dragenter event
     */
    handleDragEnter(e) {
      if (!this.isValidDrag(e)) {
        return;
      }
      if (!this.isDragging) {
        this.isDragging = true;
        this.options.onDragEnter();
      }
    }
    /**
     * Handle dragleave event
     */
    handleDragLeave(e) {
      const relatedTarget = e.relatedTarget;
      if (!relatedTarget || !this.container.contains(relatedTarget)) {
        this.isDragging = false;
        this.dropZoneCalculator.clear();
        this.options.onDragLeave();
      }
    }
    /**
     * Handle drop event
     */
    handleDrop(e) {
      e.preventDefault();
      this.isDragging = false;
      const dropZone = this.dropZoneCalculator.getCurrentDropZone();
      this.dropZoneCalculator.clear();
      if (!dropZone) {
        this.options.onDrop({
          success: false,
          dropZone: null,
          modification: null,
          error: "No valid drop zone"
        });
        return;
      }
      const dragData = this.getDragData(e);
      if (!dragData) {
        this.options.onDrop({
          success: false,
          dropZone,
          modification: null,
          error: "No valid drag data"
        });
        return;
      }
      if (!this.codeModifier) {
        this.options.onDrop({
          success: false,
          dropZone,
          modification: null,
          error: "CodeModifier not initialized. Call setCodeModifier first."
        });
        return;
      }
      const modification = this.insertComponent(dropZone, dragData);
      this.options.onDrop({
        success: modification.success,
        dropZone,
        modification,
        error: modification.error
      });
    }
    /**
     * Insert or move a component based on drop zone
     */
    insertComponent(dropZone, dragData) {
      if (!this.codeModifier) {
        return {
          success: false,
          newSource: "",
          change: { from: 0, to: 0, insert: "" },
          error: "CodeModifier not available"
        };
      }
      const { componentName, properties: properties2, textContent, sourceNodeId, isMove } = dragData;
      const { placement, targetId } = dropZone;
      if (isMove && sourceNodeId) {
        return this.codeModifier.moveNode(sourceNodeId, targetId, placement);
      }
      if (placement === "inside") {
        return this.codeModifier.addChild(targetId, componentName, {
          position: "last",
          properties: properties2,
          textContent
        });
      } else {
        return this.codeModifier.addChildRelativeTo(
          targetId,
          componentName,
          placement,
          { properties: properties2, textContent }
        );
      }
    }
    /**
     * Check if this is a move operation (from canvas)
     */
    isMoveDrag(e) {
      if (!e.dataTransfer) return false;
      const types = Array.from(e.dataTransfer.types);
      return types.includes("application/mirror-move");
    }
    /**
     * Get source node ID from drag event (for move operations)
     */
    getSourceNodeId(e) {
      if (!e.dataTransfer) return void 0;
      return this.currentDragSourceId;
    }
    /**
     * Set the current drag source (called from makeCanvasElementDraggable)
     */
    setDragSource(nodeId) {
      this.currentDragSourceId = nodeId;
    }
    currentDragSourceId;
    /**
     * Check if the drag event is valid for this manager
     */
    isValidDrag(e) {
      if (!e.dataTransfer) return false;
      const types = Array.from(e.dataTransfer.types);
      return types.includes(this.options.dataType) || types.includes("text/plain");
    }
    /**
     * Extract drag data from event
     */
    getDragData(e) {
      if (!e.dataTransfer) return null;
      let dataStr = e.dataTransfer.getData(this.options.dataType);
      if (!dataStr) {
        dataStr = e.dataTransfer.getData("text/plain");
      }
      if (!dataStr) return null;
      try {
        const data = JSON.parse(dataStr);
        if (data.componentName) {
          return data;
        }
      } catch {
        return { componentName: dataStr };
      }
      return null;
    }
    /**
     * Get the current drop zone (for external queries)
     */
    getCurrentDropZone() {
      return this.dropZoneCalculator.getCurrentDropZone();
    }
    /**
     * Ensure indicator elements exist in the DOM
     * Call this after preview content updates (which may remove indicators)
     */
    ensureIndicators() {
      this.dropZoneCalculator.ensureIndicators();
    }
    /**
     * Dispose the manager
     */
    dispose() {
      this.detach();
      this.dropZoneCalculator.dispose();
      this.codeModifier = null;
    }
  };
  function createDragDropManager(container, options) {
    return new DragDropManager(container, options);
  }
  function makeDraggable(element, dragData, dataType = "application/mirror-component") {
    element.draggable = true;
    element.addEventListener("dragstart", (e) => {
      if (e.dataTransfer) {
        const dataStr = JSON.stringify(dragData);
        e.dataTransfer.setData(dataType, dataStr);
        e.dataTransfer.setData("text/plain", dataStr);
        e.dataTransfer.effectAllowed = "copy";
      }
    });
  }
  function makeCanvasElementDraggable(element, nodeId, manager, dataType = "application/mirror-component") {
    element.draggable = true;
    const handleDragStart = (e) => {
      e.stopPropagation();
      if (e.dataTransfer) {
        const componentName = element.dataset.mirrorName || element.tagName.toLowerCase();
        const dragData = {
          componentName,
          sourceNodeId: nodeId,
          isMove: true
        };
        const dataStr = JSON.stringify(dragData);
        e.dataTransfer.setData(dataType, dataStr);
        e.dataTransfer.setData("application/mirror-move", nodeId);
        e.dataTransfer.setData("text/plain", dataStr);
        e.dataTransfer.effectAllowed = "move";
        const transparentImg = new Image();
        transparentImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        e.dataTransfer.setDragImage(transparentImg, 0, 0);
        manager.setDragSource(nodeId);
        element.style.opacity = "0.4";
        element.style.outline = "2px dashed #3B82F6";
      }
    };
    const handleDragEnd = () => {
      manager.setDragSource(void 0);
      element.style.opacity = "";
      element.style.outline = "";
    };
    element.addEventListener("dragstart", handleDragStart);
    element.addEventListener("dragend", handleDragEnd);
    return () => {
      element.removeEventListener("dragstart", handleDragStart);
      element.removeEventListener("dragend", handleDragEnd);
      element.draggable = false;
    };
  }

  // src/studio/component-icon-matcher.ts
  var KEYWORD_TO_ICON = {
    // ============================================
    // Navigation & Menu
    // ============================================
    nav: "menu",
    navbar: "menu",
    navigation: "menu",
    menu: "menu",
    menuitem: "menu",
    sidebar: "panel-left",
    drawer: "panel-left",
    tab: "folder",
    tabs: "folders",
    breadcrumb: "chevrons-right",
    breadcrumbs: "chevrons-right",
    pagination: "more-horizontal",
    stepper: "git-commit-horizontal",
    steps: "git-commit-horizontal",
    wizard: "wand-2",
    // ============================================
    // Buttons & Actions
    // ============================================
    button: "mouse-pointer-click",
    btn: "mouse-pointer-click",
    cta: "mouse-pointer-click",
    submit: "send",
    cancel: "x",
    close: "x",
    delete: "trash-2",
    remove: "trash-2",
    trash: "trash-2",
    edit: "pencil",
    update: "pencil",
    modify: "pencil",
    add: "plus",
    create: "plus",
    new: "plus",
    save: "save",
    download: "download",
    upload: "upload",
    share: "share-2",
    copy: "copy",
    duplicate: "copy",
    paste: "clipboard",
    cut: "scissors",
    undo: "undo-2",
    redo: "redo-2",
    refresh: "refresh-cw",
    reload: "refresh-cw",
    sync: "refresh-cw",
    reset: "rotate-ccw",
    clear: "eraser",
    expand: "maximize-2",
    collapse: "minimize-2",
    fullscreen: "maximize",
    minimize: "minimize",
    maximize: "maximize",
    zoom: "zoom-in",
    zoomin: "zoom-in",
    zoomout: "zoom-out",
    print: "printer",
    export: "external-link",
    import: "import",
    send: "send",
    reply: "reply",
    forward: "forward",
    back: "arrow-left",
    next: "arrow-right",
    previous: "arrow-left",
    prev: "arrow-left",
    play: "play",
    pause: "pause",
    stop: "square",
    record: "circle",
    skip: "skip-forward",
    rewind: "rewind",
    fastforward: "fast-forward",
    shuffle: "shuffle",
    repeat: "repeat",
    loop: "repeat",
    mute: "volume-x",
    unmute: "volume-2",
    volume: "volume-2",
    fullscreenenter: "maximize",
    fullscreenexit: "minimize",
    // ============================================
    // Forms & Inputs
    // ============================================
    input: "text-cursor-input",
    textinput: "text-cursor-input",
    textfield: "text-cursor-input",
    field: "text-cursor-input",
    textarea: "align-left",
    select: "chevron-down",
    dropdown: "chevron-down",
    combobox: "chevron-down",
    autocomplete: "search",
    typeahead: "search",
    checkbox: "check-square",
    check: "check",
    checkmark: "check",
    radio: "circle-dot",
    radiobutton: "circle-dot",
    toggle: "toggle-left",
    switch: "toggle-left",
    slider: "sliders-horizontal",
    range: "sliders-horizontal",
    datepicker: "calendar",
    date: "calendar",
    calendar: "calendar",
    timepicker: "clock",
    time: "clock",
    datetime: "calendar-clock",
    colorpicker: "palette",
    color: "palette",
    filepicker: "file",
    fileupload: "upload",
    fileinput: "file-input",
    form: "clipboard-list",
    formfield: "text-cursor-input",
    label: "tag",
    placeholder: "type",
    hint: "help-circle",
    helper: "help-circle",
    error: "alert-circle",
    warning: "alert-triangle",
    success: "check-circle",
    validation: "shield-check",
    required: "asterisk",
    optional: "minus",
    password: "lock",
    secret: "lock",
    hidden: "eye-off",
    visible: "eye",
    show: "eye",
    hide: "eye-off",
    reveal: "eye",
    // ============================================
    // Layout & Containers
    // ============================================
    container: "square",
    wrapper: "square",
    box: "square",
    frame: "square",
    panel: "panel-top",
    section: "layout",
    area: "square",
    region: "square",
    zone: "square",
    card: "square",
    tile: "square",
    grid: "grid-3x3",
    row: "grip-horizontal",
    column: "grip-vertical",
    col: "grip-vertical",
    flex: "move",
    stack: "layers",
    group: "group",
    cluster: "group",
    list: "list",
    listitem: "minus",
    item: "minus",
    divider: "minus",
    separator: "minus",
    spacer: "space",
    gap: "space",
    margin: "square-dashed",
    padding: "square-dashed",
    border: "square",
    outline: "square-dashed",
    // ============================================
    // Media & Images
    // ============================================
    image: "image",
    img: "image",
    photo: "image",
    picture: "image",
    thumbnail: "image",
    thumb: "image",
    gallery: "images",
    carousel: "gallery-horizontal",
    slideshow: "presentation",
    slider2: "gallery-horizontal",
    video: "video",
    videoplayer: "play-circle",
    audio: "volume-2",
    audioplayer: "music",
    music: "music",
    player: "play-circle",
    media: "play-circle",
    icon: "star",
    icons: "star",
    emoji: "smile",
    avatar: "user",
    profile: "user",
    profilepic: "user",
    userpic: "user",
    logo: "hexagon",
    brand: "hexagon",
    banner: "rectangle-horizontal",
    hero: "rectangle-horizontal",
    cover: "image",
    background: "image",
    backdrop: "image",
    poster: "image",
    figure: "image",
    illustration: "image",
    graphic: "image",
    chart: "bar-chart-2",
    graph: "line-chart",
    diagram: "git-branch",
    map: "map",
    location: "map-pin",
    // ============================================
    // Text & Typography
    // ============================================
    text: "type",
    typography: "type",
    font: "type",
    title: "heading",
    heading: "heading",
    headline: "heading",
    h1: "heading-1",
    h2: "heading-2",
    h3: "heading-3",
    h4: "heading-4",
    h5: "heading-5",
    h6: "heading-6",
    subtitle: "text",
    subheading: "text",
    paragraph: "pilcrow",
    body: "align-left",
    content: "file-text",
    description: "align-left",
    summary: "align-left",
    excerpt: "align-left",
    caption: "subtitles",
    quote: "quote",
    blockquote: "quote",
    citation: "quote",
    code: "code",
    codeblock: "code",
    pre: "code",
    monospace: "code",
    inline: "type",
    bold: "bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "strikethrough",
    highlight: "highlighter",
    mark: "highlighter",
    link: "link",
    hyperlink: "link",
    anchor: "anchor",
    url: "link",
    href: "link",
    // ============================================
    // Data Display
    // ============================================
    table: "table",
    datatable: "table",
    datagrid: "table",
    spreadsheet: "table",
    tree: "git-branch",
    treeview: "git-branch",
    hierarchy: "git-branch",
    timeline: "git-commit-horizontal",
    feed: "rss",
    activity: "activity",
    log: "scroll-text",
    history: "history",
    stats: "bar-chart",
    statistics: "bar-chart",
    metrics: "trending-up",
    analytics: "pie-chart",
    dashboard: "layout-dashboard",
    widget: "layout-grid",
    counter: "hash",
    number: "hash",
    percentage: "percent",
    progress: "loader",
    progressbar: "loader",
    loading: "loader",
    spinner: "loader",
    skeleton: "square-dashed",
    placeholder2: "square-dashed",
    empty: "inbox",
    nodata: "inbox",
    notfound: "search-x",
    // ============================================
    // Feedback & Notifications
    // ============================================
    alert: "alert-triangle",
    notification: "bell",
    notif: "bell",
    toast: "message-square",
    snackbar: "message-square",
    message: "message-circle",
    chat: "message-circle",
    comment: "message-square",
    feedback: "message-square",
    review: "star",
    rating: "star",
    stars: "star",
    badge: "badge",
    tag2: "tag",
    chip: "tag",
    pill: "tag",
    status: "circle",
    indicator: "circle",
    dot: "circle",
    pulse: "activity",
    live: "radio",
    online: "wifi",
    offline: "wifi-off",
    connected: "plug",
    disconnected: "plug-zap",
    // ============================================
    // Overlays & Modals
    // ============================================
    modal: "square",
    dialog: "message-square",
    popup: "external-link",
    popover: "message-square",
    tooltip: "message-circle",
    overlay: "layers",
    backdrop2: "square",
    sheet: "panel-bottom",
    bottomsheet: "panel-bottom",
    actionsheet: "panel-bottom",
    lightbox: "image",
    preview: "eye",
    zoom2: "zoom-in",
    fullscreen2: "maximize",
    // ============================================
    // User & Account
    // ============================================
    user: "user",
    users: "users",
    person: "user",
    people: "users",
    account: "user",
    member: "user",
    team: "users",
    group2: "users",
    organization: "building",
    company: "building",
    contact: "contact",
    contacts: "contact",
    addressbook: "book-user",
    friend: "user-plus",
    follower: "user-plus",
    following: "user-check",
    admin: "shield",
    moderator: "shield",
    role: "key",
    permission: "key",
    access: "key",
    auth: "lock",
    authentication: "lock",
    login: "log-in",
    signin: "log-in",
    logout: "log-out",
    signout: "log-out",
    register: "user-plus",
    signup: "user-plus",
    // ============================================
    // Search & Filter
    // ============================================
    search: "search",
    searchbar: "search",
    searchbox: "search",
    searchfield: "search",
    find: "search",
    lookup: "search",
    query: "search",
    filter: "filter",
    filters: "sliders-horizontal",
    sort: "arrow-up-down",
    sorting: "arrow-up-down",
    order: "arrow-up-down",
    orderby: "arrow-up-down",
    asc: "arrow-up",
    desc: "arrow-down",
    ascending: "arrow-up",
    descending: "arrow-down",
    // ============================================
    // Settings & Configuration
    // ============================================
    settings: "settings",
    setting: "settings",
    config: "settings",
    configuration: "settings",
    preferences: "sliders-horizontal",
    options: "settings",
    customize: "palette",
    personalize: "palette",
    theme: "palette",
    appearance: "palette",
    display: "monitor",
    language: "globe",
    locale: "globe",
    region2: "globe",
    timezone: "clock",
    privacy: "shield",
    security: "shield",
    notifications2: "bell",
    sound: "volume-2",
    vibration: "vibrate",
    accessibility: "accessibility",
    a11y: "accessibility",
    // ============================================
    // Files & Documents
    // ============================================
    file: "file",
    files: "files",
    document: "file-text",
    documents: "files",
    doc: "file-text",
    pdf: "file-text",
    word: "file-text",
    excel: "file-spreadsheet",
    powerpoint: "presentation",
    folder: "folder",
    folders: "folders",
    directory: "folder",
    archive: "archive",
    zip: "archive",
    attachment: "paperclip",
    attach: "paperclip",
    clip: "paperclip",
    // ============================================
    // Communication
    // ============================================
    email: "mail",
    mail: "mail",
    inbox: "inbox",
    outbox: "send",
    draft: "file-edit",
    compose: "edit",
    phone: "phone",
    call: "phone",
    telephone: "phone",
    mobile: "smartphone",
    sms: "message-square",
    messenger: "message-circle",
    whatsapp: "message-circle",
    telegram: "send",
    slack: "hash",
    discord: "message-circle",
    video2: "video",
    videocall: "video",
    conference: "users",
    meeting: "users",
    webinar: "presentation",
    broadcast: "radio",
    stream: "radio",
    live2: "radio",
    // ============================================
    // Social & Sharing
    // ============================================
    social: "share-2",
    like: "heart",
    love: "heart",
    favorite: "heart",
    bookmark: "bookmark",
    save2: "bookmark",
    pin: "pin",
    follow: "user-plus",
    unfollow: "user-minus",
    subscribe: "bell-plus",
    unsubscribe: "bell-minus",
    share2: "share-2",
    retweet: "repeat",
    repost: "repeat",
    mention: "at-sign",
    hashtag: "hash",
    // ============================================
    // E-commerce
    // ============================================
    cart: "shopping-cart",
    shoppingcart: "shopping-cart",
    basket: "shopping-basket",
    bag: "shopping-bag",
    checkout: "credit-card",
    payment: "credit-card",
    pay: "credit-card",
    creditcard: "credit-card",
    wallet: "wallet",
    money: "banknote",
    cash: "banknote",
    currency: "dollar-sign",
    price: "tag",
    discount: "percent",
    coupon: "ticket",
    voucher: "ticket",
    gift: "gift",
    wishlist: "heart",
    order2: "package",
    orders: "package",
    shipping: "truck",
    delivery: "truck",
    tracking: "map-pin",
    return: "undo-2",
    refund: "rotate-ccw",
    invoice: "receipt",
    receipt: "receipt",
    product: "box",
    products: "boxes",
    inventory: "warehouse",
    stock: "warehouse",
    store: "store",
    shop: "store",
    marketplace: "store",
    // ============================================
    // Status & State
    // ============================================
    active: "check-circle",
    inactive: "x-circle",
    enabled: "check",
    disabled2: "x",
    on: "toggle-right",
    off: "toggle-left",
    open: "door-open",
    closed: "door-closed",
    locked: "lock",
    unlocked: "unlock",
    public: "globe",
    private: "lock",
    draft2: "file-edit",
    published: "globe",
    archived: "archive",
    deleted: "trash",
    pending: "clock",
    approved: "check-circle",
    rejected: "x-circle",
    completed: "check-circle",
    failed: "x-circle",
    inprogress: "loader",
    paused: "pause-circle",
    scheduled: "calendar",
    expired: "calendar-x",
    // ============================================
    // Misc UI Elements
    // ============================================
    header: "panel-top",
    footer: "panel-bottom",
    main: "layout",
    aside: "panel-right",
    toolbar: "wrench",
    actionbar: "more-horizontal",
    statusbar: "info",
    titlebar: "minus",
    scrollbar: "grip-vertical",
    handle: "grip-vertical",
    grip: "grip-vertical",
    resizer: "move",
    splitter: "split",
    accordion: "chevrons-up-down",
    collapsible: "chevron-down",
    expandable: "chevron-down",
    details: "info",
    info: "info",
    about: "info",
    help: "help-circle",
    faq: "help-circle",
    support: "life-buoy",
    docs: "book-open",
    documentation: "book-open",
    guide: "book-open",
    tutorial: "graduation-cap",
    tour: "compass",
    onboarding: "rocket",
    welcome: "hand",
    intro: "play-circle",
    getting: "rocket",
    started: "rocket"
  };
  var LUCIDE_ICONS = /* @__PURE__ */ new Set([
    "activity",
    "airplay",
    "alert-circle",
    "alert-triangle",
    "align-center",
    "align-justify",
    "align-left",
    "align-right",
    "anchor",
    "aperture",
    "archive",
    "arrow-down",
    "arrow-left",
    "arrow-right",
    "arrow-up",
    "at-sign",
    "award",
    "bar-chart",
    "bar-chart-2",
    "battery",
    "bell",
    "bluetooth",
    "bold",
    "book",
    "book-open",
    "bookmark",
    "box",
    "briefcase",
    "calendar",
    "camera",
    "cast",
    "check",
    "check-circle",
    "check-square",
    "chevron-down",
    "chevron-left",
    "chevron-right",
    "chevron-up",
    "chrome",
    "circle",
    "clipboard",
    "clock",
    "cloud",
    "code",
    "codepen",
    "coffee",
    "columns",
    "command",
    "compass",
    "copy",
    "corner-down-left",
    "cpu",
    "credit-card",
    "crop",
    "crosshair",
    "database",
    "delete",
    "disc",
    "dollar-sign",
    "download",
    "droplet",
    "edit",
    "edit-2",
    "edit-3",
    "external-link",
    "eye",
    "eye-off",
    "facebook",
    "fast-forward",
    "feather",
    "figma",
    "file",
    "file-minus",
    "file-plus",
    "file-text",
    "film",
    "filter",
    "flag",
    "folder",
    "folder-minus",
    "folder-plus",
    "framer",
    "frown",
    "gift",
    "git-branch",
    "git-commit",
    "git-merge",
    "git-pull-request",
    "github",
    "gitlab",
    "globe",
    "grid",
    "hard-drive",
    "hash",
    "headphones",
    "heart",
    "help-circle",
    "hexagon",
    "home",
    "image",
    "inbox",
    "info",
    "instagram",
    "italic",
    "key",
    "layers",
    "layout",
    "life-buoy",
    "link",
    "link-2",
    "linkedin",
    "list",
    "loader",
    "lock",
    "log-in",
    "log-out",
    "mail",
    "map",
    "map-pin",
    "maximize",
    "maximize-2",
    "meh",
    "menu",
    "message-circle",
    "message-square",
    "mic",
    "mic-off",
    "minimize",
    "minimize-2",
    "minus",
    "minus-circle",
    "minus-square",
    "monitor",
    "moon",
    "more-horizontal",
    "more-vertical",
    "mouse-pointer",
    "move",
    "music",
    "navigation",
    "navigation-2",
    "octagon",
    "package",
    "paperclip",
    "pause",
    "pause-circle",
    "pen-tool",
    "percent",
    "phone",
    "phone-call",
    "phone-forwarded",
    "phone-incoming",
    "phone-missed",
    "phone-off",
    "phone-outgoing",
    "pie-chart",
    "play",
    "play-circle",
    "plus",
    "plus-circle",
    "plus-square",
    "pocket",
    "power",
    "printer",
    "radio",
    "refresh-ccw",
    "refresh-cw",
    "repeat",
    "rewind",
    "rotate-ccw",
    "rotate-cw",
    "rss",
    "save",
    "scissors",
    "search",
    "send",
    "server",
    "settings",
    "share",
    "share-2",
    "shield",
    "shield-off",
    "shopping-bag",
    "shopping-cart",
    "shuffle",
    "sidebar",
    "skip-back",
    "skip-forward",
    "slack",
    "slash",
    "sliders",
    "smartphone",
    "smile",
    "speaker",
    "square",
    "star",
    "stop-circle",
    "sun",
    "sunrise",
    "sunset",
    "tablet",
    "tag",
    "target",
    "terminal",
    "thermometer",
    "thumbs-down",
    "thumbs-up",
    "toggle-left",
    "toggle-right",
    "tool",
    "trash",
    "trash-2",
    "trello",
    "trending-down",
    "trending-up",
    "triangle",
    "truck",
    "tv",
    "twitch",
    "twitter",
    "type",
    "umbrella",
    "underline",
    "unlock",
    "upload",
    "upload-cloud",
    "user",
    "user-check",
    "user-minus",
    "user-plus",
    "user-x",
    "users",
    "video",
    "video-off",
    "voicemail",
    "volume",
    "volume-1",
    "volume-2",
    "volume-x",
    "watch",
    "wifi",
    "wifi-off",
    "wind",
    "x",
    "x-circle",
    "x-octagon",
    "x-square",
    "youtube",
    "zap",
    "zap-off",
    "zoom-in",
    "zoom-out"
  ]);
  var PRIMITIVE_ICONS = {
    button: "mouse-pointer-click",
    input: "text-cursor-input",
    textarea: "align-left",
    text: "type",
    frame: "square",
    image: "image",
    icon: "star",
    link: "link",
    select: "chevron-down",
    checkbox: "check-square",
    radio: "circle-dot"
  };
  var FALLBACK_ICON = "square";
  function extractKeywords(name) {
    const parts = name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").replace(/[-_]/g, " ").toLowerCase().split(/\s+/).filter((p) => p.length > 0);
    return parts;
  }
  function findIconForComponent(componentName, primitive) {
    const nameLower = componentName.toLowerCase();
    if (LUCIDE_ICONS.has(nameLower)) {
      return nameLower;
    }
    if (KEYWORD_TO_ICON[nameLower]) {
      return KEYWORD_TO_ICON[nameLower];
    }
    const keywords = extractKeywords(componentName);
    for (const keyword of keywords) {
      if (KEYWORD_TO_ICON[keyword]) {
        return KEYWORD_TO_ICON[keyword];
      }
      if (LUCIDE_ICONS.has(keyword)) {
        return keyword;
      }
    }
    for (const keyword of keywords) {
      for (const [term, icon] of Object.entries(KEYWORD_TO_ICON)) {
        if (term.includes(keyword) || keyword.includes(term)) {
          return icon;
        }
      }
    }
    if (primitive && PRIMITIVE_ICONS[primitive]) {
      return PRIMITIVE_ICONS[primitive];
    }
    return FALLBACK_ICON;
  }
  var ICON_PATHS = {
    "square": '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>',
    "type": '<polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line>',
    "mouse-pointer-click": '<path d="m9 9 5 12 1.8-5.2L21 14Z"></path><path d="M7.2 2.2 8 5.1"></path><path d="m5.1 8-2.9-.8"></path><path d="M14 4.1 12 6"></path><path d="m6 12-1.9 2"></path>',
    "text-cursor-input": '<path d="M5 4h1a3 3 0 0 1 3 3 3 3 0 0 1 3-3h1"></path><path d="M13 20h-1a3 3 0 0 1-3-3 3 3 0 0 1-3 3H5"></path><path d="M5 16H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1"></path><path d="M13 8h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-7"></path><path d="M9 7v10"></path>',
    "image": '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>',
    "star": '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>',
    "link": '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>',
    "chevron-down": '<polyline points="6 9 12 15 18 9"></polyline>',
    "check-square": '<polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>',
    "circle-dot": '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="1"></circle>',
    "align-left": '<line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line>',
    "menu": '<line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line>',
    "user": '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
    "search": '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>',
    "settings": '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle>',
    "heart": '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>',
    "mail": '<rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>',
    "shopping-cart": '<circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>',
    "bell": '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>',
    "home": '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
    "folder": '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>',
    "file": '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline>',
    "trash-2": '<path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line>',
    "plus": '<line x1="12" x2="12" y1="5" y2="19"></line><line x1="5" x2="19" y1="12" y2="12"></line>',
    "x": '<line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line>',
    "check": '<polyline points="20 6 9 17 4 12"></polyline>',
    "pencil": '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path>',
    "eye": '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle>',
    "lock": '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>',
    "calendar": '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line>',
    "clock": '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
    "filter": '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>',
    "download": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line>',
    "upload": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" x2="12" y1="3" y2="15"></line>',
    "refresh-cw": '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M3 21v-5h5"></path>',
    "layers": '<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline>',
    "grid-3x3": '<rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M3 15h18"></path><path d="M9 3v18"></path><path d="M15 3v18"></path>',
    "list": '<line x1="8" x2="21" y1="6" y2="6"></line><line x1="8" x2="21" y1="12" y2="12"></line><line x1="8" x2="21" y1="18" y2="18"></line><line x1="3" x2="3.01" y1="6" y2="6"></line><line x1="3" x2="3.01" y1="12" y2="12"></line><line x1="3" x2="3.01" y1="18" y2="18"></line>',
    "layout-dashboard": '<rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect>',
    "bar-chart-2": '<line x1="18" x2="18" y1="20" y2="10"></line><line x1="12" x2="12" y1="20" y2="4"></line><line x1="6" x2="6" y1="20" y2="14"></line>',
    "pie-chart": '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path>',
    "activity": '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>',
    "message-circle": '<path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path>',
    "message-square": '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
    "phone": '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>',
    "info": '<circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="16" y2="12"></line><line x1="12" x2="12.01" y1="8" y2="8"></line>',
    "help-circle": '<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" x2="12.01" y1="17" y2="17"></line>',
    "alert-triangle": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" x2="12" y1="9" y2="13"></line><line x1="12" x2="12.01" y1="17" y2="17"></line>',
    "alert-circle": '<circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line>',
    "check-circle": '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
    "x-circle": '<circle cx="12" cy="12" r="10"></circle><line x1="15" x2="9" y1="9" y2="15"></line><line x1="9" x2="15" y1="9" y2="15"></line>',
    // Layout property icons
    "grip-horizontal": '<circle cx="12" cy="9" r="1"></circle><circle cx="19" cy="9" r="1"></circle><circle cx="5" cy="9" r="1"></circle><circle cx="12" cy="15" r="1"></circle><circle cx="19" cy="15" r="1"></circle><circle cx="5" cy="15" r="1"></circle>',
    "grip-vertical": '<circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle>',
    "align-horizontal-space-between": '<rect width="6" height="14" x="3" y="5" rx="2"></rect><rect width="6" height="10" x="15" y="7" rx="2"></rect><path d="M3 2v20"></path><path d="M21 2v20"></path>',
    "wrap-text": '<line x1="3" x2="21" y1="6" y2="6"></line><path d="M3 12h15a3 3 0 1 1 0 6h-4"></path><polyline points="16 16 14 18 16 20"></polyline><line x1="3" x2="10" y1="18" y2="18"></line>',
    // Alignment property icons
    "align-center": '<line x1="21" x2="3" y1="6" y2="6"></line><line x1="17" x2="7" y1="12" y2="12"></line><line x1="19" x2="5" y1="18" y2="18"></line>',
    "align-right": '<line x1="21" x2="3" y1="6" y2="6"></line><line x1="21" x2="9" y1="12" y2="12"></line><line x1="21" x2="7" y1="18" y2="18"></line>',
    "align-start-vertical": '<rect width="4" height="6" x="6" y="5" rx="2"></rect><rect width="4" height="10" x="14" y="5" rx="2"></rect><path d="M2 2h20"></path>',
    "align-end-vertical": '<rect width="4" height="6" x="6" y="13" rx="2"></rect><rect width="4" height="10" x="14" y="9" rx="2"></rect><path d="M2 22h20"></path>',
    "align-center-horizontal": '<path d="M2 12h20"></path><rect width="6" height="8" x="9" y="3" rx="2"></rect><rect width="6" height="6" x="9" y="13" rx="2"></rect>',
    "align-center-vertical": '<path d="M12 2v20"></path><rect width="8" height="6" x="3" y="9" rx="2"></rect><rect width="6" height="6" x="13" y="9" rx="2"></rect>'
  };
  function getIconPath(iconName) {
    return ICON_PATHS[iconName] || ICON_PATHS[FALLBACK_ICON];
  }
  function generateIconSVG(iconName, size = 16, strokeWidth = 2) {
    const path = getIconPath(iconName);
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  }
  function findIconsForComponents(components) {
    const result = /* @__PURE__ */ new Map();
    for (const comp of components) {
      result.set(comp.name, findIconForComponent(comp.name, comp.primitive));
    }
    return result;
  }

  // src/__tests__/llm/types.ts
  var SYSTEM_PROMPTS = {
    base: `Generate React/JSX with COMPONENT names (not HTML tag names).

USE THESE NAMES:
- Sidebar (not aside)
- Dashboard, Card, StatCard (not div/article)
- List, ListItem (not ul/li)
- Nav, NavItem (not nav/a)
- Header, Footer (not header/footer)
- Icon, Logo, Title, Label, Value, Text, Button, Input

ROOT: Must be a component name like Sidebar, Dashboard, Card, List, Nav
CHILDREN: Use semantic names like NavItem, ListItem, StatCard

NO JAVASCRIPT: No map, filter, hooks, handlers, conditionals

EXAMPLE:
\`\`\`jsx
function Component() {
  return (
    <Sidebar style={{ width: 240, backgroundColor: '#1A1A23' }}>
      <Logo>App</Logo>
      <NavItem>Home</NavItem>
      <NavItem>Settings</NavItem>
    </Sidebar>
  )
}
\`\`\``,
    withComponents: `Generate React/JSX reusing existing components from context.

RULES:
- Reuse components and tokens from the provided context
- Match existing styling patterns
- ROOT element MUST be semantic (not <div>)
- NO JavaScript logic, hooks, or event handlers

Return ONLY the JSX function.`,
    mixed: `Generate React/JSX. Reuse existing components when available.

RULES:
- Use semantic names: Sidebar, Dashboard, Card, NavItem, etc.
- ROOT element MUST be semantic (not <div>)
- NO JavaScript logic, hooks, or event handlers
- Match existing style patterns`,
    // Template for editor context - filled in dynamically
    editorContext: `
EDITOR CONTEXT:
The user is currently editing code and their cursor/selection provides important context.

{{SELECTION_INFO}}
{{ANCESTOR_INFO}}
{{SURROUNDING_CODE}}

IMPORTANT:
- When the user says "here", "this", "add X", they refer to the current position/selection
- Generate code that fits naturally at the indicated position
- Maintain proper indentation and structure relative to the context
`
  };
  function buildEditorContextPrompt(ctx) {
    const parts = [];
    if (ctx.selectedNodeName) {
      parts.push(`SELECTED ELEMENT: "${ctx.selectedNodeName}"`);
      if (ctx.selectedNodeId) {
        parts.push(`(Node ID: ${ctx.selectedNodeId})`);
      }
    }
    if (ctx.ancestors && ctx.ancestors.length > 0) {
      parts.push(`
LOCATION IN TREE: ${ctx.ancestors.join(" \u2192 ")}${ctx.selectedNodeName ? " \u2192 " + ctx.selectedNodeName : ""}`);
    }
    if (ctx.insideComponent) {
      parts.push(`
INSIDE COMPONENT: The cursor is inside "${ctx.insideComponent}"`);
    }
    if (ctx.surroundingCode) {
      parts.push(`
SURROUNDING CODE:`);
      if (ctx.surroundingCode.before) {
        parts.push(`--- Before cursor ---
${ctx.surroundingCode.before}`);
      }
      parts.push(`--- CURSOR POSITION (line ${ctx.cursorLine}) ---`);
      if (ctx.surroundingCode.after) {
        parts.push(`--- After cursor ---
${ctx.surroundingCode.after}`);
      }
    }
    return SYSTEM_PROMPTS.editorContext.replace("{{SELECTION_INFO}}", ctx.selectedNodeName ? `Selected: "${ctx.selectedNodeName}"` : "No element selected").replace("{{ANCESTOR_INFO}}", ctx.ancestors?.length ? `Path: ${ctx.ancestors.join(" \u2192 ")}` : "").replace("{{SURROUNDING_CODE}}", parts.join("\n"));
  }

  // src/__tests__/llm/react-to-mirror.ts
  var STYLE_TO_MIRROR = {
    "padding": "pad",
    "paddingTop": "pad top",
    "paddingBottom": "pad bottom",
    "paddingLeft": "pad left",
    "paddingRight": "pad right",
    "margin": "m",
    "backgroundColor": "bg",
    "background": "bg",
    "color": "col",
    "borderRadius": "rad",
    "width": "w",
    "height": "h",
    "minWidth": "minw",
    "maxWidth": "maxw",
    "minHeight": "minh",
    "maxHeight": "maxh",
    "gap": "gap",
    "fontSize": "font-size",
    "fontWeight": "weight",
    "fontFamily": "font",
    "textAlign": "text-align",
    "display": "_display",
    "flexDirection": "_flexDirection",
    "alignItems": "_alignItems",
    "justifyContent": "_justifyContent",
    "cursor": "cursor",
    "opacity": "opacity",
    "border": "bor",
    "borderColor": "boc",
    "boxShadow": "shadow"
  };
  var TAG_TO_COMPONENT = {
    "div": "frame",
    "span": "text",
    "button": "button",
    "input": "input",
    "textarea": "textarea",
    "img": "image",
    "a": "link",
    "nav": "frame",
    "header": "frame",
    "footer": "frame",
    "main": "frame",
    "section": "frame",
    "article": "frame",
    "aside": "frame",
    "h1": "text",
    "h2": "text",
    "h3": "text",
    "h4": "text",
    "p": "text",
    "label": "text",
    "select": "frame"
    // Simplified
  };
  var HTML_TAG_NORMALIZATION = {
    "Aside": "Sidebar",
    "Ul": "List",
    "Ol": "List",
    "Li": "ListItem",
    "Article": "Card",
    "Section": "Section",
    "Main": "Main",
    "Figure": "Figure",
    "Figcaption": "Caption",
    "Nav": "Nav"
  };
  function normalizeName(name) {
    return HTML_TAG_NORMALIZATION[name] || name;
  }
  var ReactToMirrorConverter = class {
    indentLevel = 0;
    componentDefinitions = /* @__PURE__ */ new Map();
    usedComponents = /* @__PURE__ */ new Set();
    /**
     * Convert React code to Mirror DSL
     */
    convert(reactCode) {
      try {
        this.componentDefinitions.clear();
        this.usedComponents.clear();
        this.indentLevel = 0;
        const elements = this.parseReact(reactCode);
        const mirror = this.generateMirror(elements);
        return {
          mirror,
          errors: []
        };
      } catch (error) {
        return {
          mirror: "",
          errors: [error.message]
        };
      }
    }
    /**
     * Parse React code into element tree (simplified)
     */
    parseReact(code) {
      const elements = [];
      const jsx = this.extractReturnJSX(code);
      const rootElement = this.parseJSXElement(jsx.trim());
      if (rootElement) {
        elements.push(rootElement);
      }
      return elements;
    }
    /**
     * Extract JSX from return statement by finding balanced parentheses
     */
    extractReturnJSX(code) {
      const returnIndex = code.indexOf("return");
      if (returnIndex === -1) return code;
      let pos = returnIndex + 6;
      while (pos < code.length && code[pos] !== "(" && code[pos] !== "<") {
        pos++;
      }
      if (code[pos] === "<") {
        const jsxStart = pos;
        const tag = code.slice(pos).match(/^<(\w+)/)?.[1];
        if (tag) {
          const closeTag = `</${tag}>`;
          const closeIndex = code.lastIndexOf(closeTag);
          if (closeIndex > jsxStart) {
            return code.slice(jsxStart, closeIndex + closeTag.length).trim();
          }
        }
        return code.slice(pos).trim();
      }
      if (code[pos] !== "(") return code;
      const openParen = pos;
      let depth = 1;
      pos++;
      while (pos < code.length && depth > 0) {
        const char = code[pos];
        if (char === '"' || char === "'" || char === "`") {
          const quote = char;
          pos++;
          while (pos < code.length && code[pos] !== quote) {
            if (code[pos] === "\\") pos++;
            pos++;
          }
        } else if (char === "(") {
          depth++;
        } else if (char === ")") {
          depth--;
        }
        pos++;
      }
      return code.slice(openParen + 1, pos - 1).trim();
    }
    /**
     * Parse a single JSX element
     */
    parseJSXElement(jsx) {
      if (!jsx || jsx.trim() === "") return null;
      if (!jsx.startsWith("<")) {
        return null;
      }
      const openTagMatch = jsx.match(/^<(\w+)([^>]*?)(?:\/>|>)/);
      if (!openTagMatch) return null;
      const tag = openTagMatch[1];
      const propsStr = openTagMatch[2];
      const isSelfClosing = jsx.includes("/>");
      const props = this.parseProps(propsStr);
      const style = props.style;
      delete props.style;
      const element = {
        tag: tag.toLowerCase(),
        component: this.isComponent(tag) ? tag : void 0,
        props,
        style,
        children: []
      };
      if (!isSelfClosing) {
        const childrenMatch = jsx.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*)<\\/${tag}>`, "i"));
        if (childrenMatch) {
          element.children = this.parseChildren(childrenMatch[1]);
        }
      }
      return element;
    }
    /**
     * Parse props string into object
     */
    parseProps(propsStr) {
      const props = {};
      const styleMatch = propsStr.match(/style=\{\{([^}]+)\}\}/);
      if (styleMatch) {
        props.style = this.parseStyleObject(styleMatch[1]);
      }
      const stringProps = propsStr.matchAll(/(\w+)="([^"]*)"/g);
      for (const match of stringProps) {
        props[match[1]] = match[2];
      }
      const boolProps = propsStr.matchAll(/\s(\w+)(?=\s|$|>)/g);
      for (const match of boolProps) {
        if (!match[1].includes("=")) {
          props[match[1]] = true;
        }
      }
      return props;
    }
    /**
     * Parse inline style object
     */
    parseStyleObject(styleStr) {
      const style = {};
      const pairs = styleStr.split(",").map((s) => s.trim()).filter(Boolean);
      for (const pair of pairs) {
        const colonIndex = pair.indexOf(":");
        if (colonIndex === -1) continue;
        let key = pair.slice(0, colonIndex).trim().replace(/['"]/g, "");
        let value = pair.slice(colonIndex + 1).trim().replace(/['"]/g, "");
        value = value.replace(/,\s*$/, "");
        if (value.startsWith("'") || value.startsWith('"')) {
          value = value.slice(1, -1);
        }
        style[key] = value;
      }
      return style;
    }
    /**
     * Parse children content using stack-based approach for proper nesting
     */
    parseChildren(content) {
      const children = [];
      const trimmed = content.trim();
      if (!trimmed) return children;
      if (!trimmed.includes("<")) {
        const textMatch = trimmed.match(/\{([^}]+)\}|([^{]+)/g);
        if (textMatch) {
          for (const match of textMatch) {
            if (match.startsWith("{")) {
              children.push(`{${match.slice(1, -1).trim()}}`);
            } else if (match.trim()) {
              children.push(match.trim());
            }
          }
        }
        return children;
      }
      let pos = 0;
      let textStart = 0;
      while (pos < trimmed.length) {
        if (trimmed[pos] === "{") {
          const exprEnd = this.findMatchingBrace(trimmed, pos);
          if (exprEnd > pos) {
            pos = exprEnd + 1;
            textStart = pos;
            continue;
          }
        }
        const openTagStart = trimmed.indexOf("<", pos);
        if (openTagStart === -1) {
          const text = trimmed.slice(textStart).trim();
          if (text && !text.startsWith("{") && !text.startsWith("</")) {
            children.push(text);
          }
          break;
        }
        const braceBeforeTag = trimmed.lastIndexOf("{", openTagStart);
        if (braceBeforeTag >= textStart) {
          const braceEnd = this.findMatchingBrace(trimmed, braceBeforeTag);
          if (braceEnd > openTagStart) {
            pos = braceEnd + 1;
            textStart = pos;
            continue;
          }
        }
        if (trimmed[openTagStart + 1] === "/") {
          pos = trimmed.indexOf(">", openTagStart) + 1;
          textStart = pos;
          continue;
        }
        if (openTagStart > textStart) {
          const text = trimmed.slice(textStart, openTagStart).trim();
          if (text && !text.startsWith("{") && !text.startsWith("</")) {
            children.push(text);
          }
        }
        const tagNameMatch = trimmed.slice(openTagStart).match(/^<(\w+)/);
        if (!tagNameMatch) {
          pos = openTagStart + 1;
          continue;
        }
        const tagName = tagNameMatch[1];
        const selfCloseMatch = trimmed.slice(openTagStart).match(new RegExp(`^<${tagName}[^>]*/>`));
        if (selfCloseMatch) {
          const element = this.parseJSXElement(selfCloseMatch[0]);
          if (element) {
            children.push(element);
          }
          pos = openTagStart + selfCloseMatch[0].length;
          textStart = pos;
          continue;
        }
        const closeTag = `</${tagName}>`;
        const openTag = new RegExp(`<${tagName}(?:\\s|>|/>)`);
        let depth = 1;
        let searchPos = openTagStart + 1;
        while (depth > 0 && searchPos < trimmed.length) {
          if (trimmed[searchPos] === "{") {
            const exprEnd = this.findMatchingBrace(trimmed, searchPos);
            if (exprEnd > searchPos) {
              searchPos = exprEnd + 1;
              continue;
            }
          }
          const nextOpen = trimmed.slice(searchPos).search(openTag);
          const nextClose = trimmed.indexOf(closeTag, searchPos);
          if (nextClose === -1) {
            depth = 0;
            searchPos = trimmed.length;
            break;
          }
          if (nextOpen !== -1 && searchPos + nextOpen < nextClose) {
            const checkPos = searchPos + nextOpen;
            const selfCheck = trimmed.slice(checkPos).match(new RegExp(`^<${tagName}[^>]*/>`));
            if (!selfCheck) {
              depth++;
            }
            searchPos = checkPos + 1;
          } else {
            depth--;
            if (depth === 0) {
              const fullElement = trimmed.slice(openTagStart, nextClose + closeTag.length);
              const element = this.parseJSXElement(fullElement);
              if (element) {
                children.push(element);
              }
              pos = nextClose + closeTag.length;
              textStart = pos;
            } else {
              searchPos = nextClose + closeTag.length;
            }
          }
        }
        if (depth !== 0) {
          pos = openTagStart + 1;
        }
      }
      return children;
    }
    /**
     * Find the matching closing brace for an opening brace
     */
    findMatchingBrace(str, openPos) {
      if (str[openPos] !== "{") return -1;
      let depth = 1;
      let pos = openPos + 1;
      while (pos < str.length && depth > 0) {
        const char = str[pos];
        if (char === "{") {
          depth++;
        } else if (char === "}") {
          depth--;
        }
        if (char === '"' || char === "'" || char === "`") {
          const quote = char;
          pos++;
          while (pos < str.length && str[pos] !== quote) {
            if (str[pos] === "\\") pos++;
            pos++;
          }
        }
        pos++;
      }
      return depth === 0 ? pos - 1 : -1;
    }
    /**
     * Check if a tag is a custom component
     */
    isComponent(tag) {
      return tag[0] === tag[0].toUpperCase();
    }
    /**
     * Generate Mirror code from parsed elements
     */
    generateMirror(elements) {
      const lines = [];
      for (const element of elements) {
        this.collectComponentDefinitions(element);
      }
      for (const [name, def] of this.componentDefinitions) {
        lines.push(def);
        lines.push("");
      }
      for (const element of elements) {
        const instance = this.generateElement(element, 0);
        lines.push(instance);
      }
      return lines.join("\n").trim();
    }
    /**
     * Collect component definitions from element tree
     */
    collectComponentDefinitions(element) {
      const name = normalizeName(element.component || this.tagToComponentName(element.tag));
      if (!this.componentDefinitions.has(name) && element.style) {
        const baseTag = TAG_TO_COMPONENT[element.tag] || "frame";
        const props = this.styleToMirrorProps(element.style);
        if (props.length > 0) {
          this.componentDefinitions.set(name, `${name} as ${baseTag}:
  ${props.join(", ")}`);
        }
      }
      for (const child of element.children) {
        if (typeof child !== "string") {
          this.collectComponentDefinitions(child);
        }
      }
    }
    /**
     * Generate Mirror code for a single element
     */
    generateElement(element, depth) {
      const indent = "  ".repeat(depth);
      const name = normalizeName(element.component || this.tagToComponentName(element.tag));
      const parts = [];
      parts.push(name);
      if (element.style) {
        const props = this.styleToMirrorProps(element.style);
        if (depth > 0 || !this.componentDefinitions.has(name)) {
          if (props.length > 0) {
            parts.push(props.join(", "));
          }
        }
      }
      const textChildren = element.children.filter((c) => typeof c === "string");
      if (textChildren.length > 0) {
        const text = textChildren.join(" ").trim();
        if (text && !text.startsWith("{")) {
          parts.push(`"${text}"`);
        }
      }
      let line = indent + parts.join(" ");
      const elementChildren = element.children.filter((c) => typeof c !== "string");
      if (elementChildren.length > 0) {
        const childLines = elementChildren.map(
          (child) => this.generateElement(child, depth + 1)
        );
        line += "\n" + childLines.join("\n");
      }
      return line;
    }
    /**
     * Convert tag to Mirror component name
     */
    tagToComponentName(tag) {
      const mapping = {
        "div": "Box",
        "span": "Text",
        "button": "Button",
        "input": "Input",
        "nav": "Nav",
        "header": "Header",
        "footer": "Footer",
        "main": "Main",
        "section": "Section",
        "h1": "Heading",
        "h2": "Heading",
        "h3": "Heading",
        "p": "Text",
        "a": "Link"
      };
      return mapping[tag] || tag.charAt(0).toUpperCase() + tag.slice(1);
    }
    /**
     * Convert style object to Mirror properties
     */
    styleToMirrorProps(style) {
      const props = [];
      let layout = "ver";
      for (const [key, value] of Object.entries(style)) {
        const mirrorKey = STYLE_TO_MIRROR[key];
        if (!mirrorKey) continue;
        if (mirrorKey === "_display" && value === "flex") {
          continue;
        }
        if (mirrorKey === "_flexDirection") {
          layout = value === "row" ? "hor" : "ver";
          continue;
        }
        if (mirrorKey === "_alignItems") {
          const alignMap = {
            "center": "ver-center",
            "flex-start": "top",
            "flex-end": "bottom"
          };
          if (alignMap[value]) {
            props.push(alignMap[value]);
          }
          continue;
        }
        if (mirrorKey === "_justifyContent") {
          const justifyMap = {
            "center": "hor-center",
            "space-between": "spread",
            "flex-start": "left",
            "flex-end": "right"
          };
          if (justifyMap[value]) {
            props.push(justifyMap[value]);
          }
          continue;
        }
        let mirrorValue = this.formatMirrorValue(key, value);
        props.push(`${mirrorKey} ${mirrorValue}`);
      }
      if (layout === "hor") {
        props.unshift("hor");
      }
      return props;
    }
    /**
     * Format a value for Mirror
     */
    formatMirrorValue(key, value) {
      let strValue = String(value);
      if (strValue.startsWith("var(--")) {
        const tokenName = strValue.match(/var\(--([^\)]+)\)/)?.[1];
        return tokenName ? `$${tokenName}` : strValue;
      }
      strValue = strValue.replace(/px/g, "");
      if (strValue.includes("%")) {
        return strValue;
      }
      strValue = strValue.trim();
      return strValue;
    }
  };

  // src/studio/llm-integration.ts
  var REACT_SYSTEM_PROMPT = `You are a UI developer. Generate React/JSX code for the requested UI.

IMPORTANT RULES:
1. Return ONLY JSX code inside a functional component
2. Use inline styles with camelCase properties
3. Use semantic HTML elements (div, button, span, nav, header, etc.)
4. Keep the code clean and minimal
5. Do NOT include imports or exports
6. Do NOT include explanations - just the code

EXAMPLE OUTPUT:
\`\`\`jsx
function Component() {
  return (
    <div style={{ padding: '16px', backgroundColor: '#1A1A23', borderRadius: '8px' }}>
      <span style={{ color: '#E4E4E7' }}>Hello World</span>
    </div>
  )
}
\`\`\`

STYLE GUIDELINES:
- Use hex colors (e.g., '#3B82F6')
- Use pixel values for spacing (e.g., '16px', '12px 24px')
- Common properties: padding, backgroundColor, color, borderRadius, display, flexDirection, gap, alignItems, justifyContent
`;
  function buildReactSystemPrompt(context) {
    let prompt = REACT_SYSTEM_PROMPT;
    if (context.tokens.length > 0) {
      prompt += `

AVAILABLE DESIGN TOKENS (use as CSS variables):
`;
      for (const token of context.tokens.slice(0, 20)) {
        prompt += `- var(--${token.name}): ${token.value}
`;
      }
    }
    if (context.components.length > 0) {
      prompt += `

EXISTING COMPONENTS (for style consistency):
`;
      for (const comp of context.components.slice(0, 10)) {
        prompt += `- ${comp.name}: ${comp.properties.slice(0, 5).join(", ")}
`;
      }
    }
    if (context.editor) {
      prompt += "\n" + buildEditorContextPrompt(context.editor);
    }
    return prompt;
  }
  function extractStudioContext(source, cursorLine, cursorColumn, selectedNodeId, selectedNodeName, ancestors) {
    const lines = source.split("\n");
    const tokens = [];
    const components = [];
    let inTokenBlock = false;
    let tokenBlockPrefix = "";
    let currentComponent = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const indent = line.length - line.trimStart().length;
      if (!trimmed || trimmed.startsWith("//")) continue;
      const tokenMatch = trimmed.match(/^\$?([a-zA-Z0-9._-]+)\s*:\s*(#[a-fA-F0-9]{3,8}|\d+)$/);
      if (tokenMatch && indent === 0) {
        tokens.push({ name: tokenMatch[1], value: tokenMatch[2] });
        continue;
      }
      const tokenBlockMatch = trimmed.match(/^\$([a-zA-Z0-9._-]+)\s*:\s*$/);
      if (tokenBlockMatch) {
        inTokenBlock = true;
        tokenBlockPrefix = tokenBlockMatch[1];
        continue;
      }
      if (inTokenBlock && indent > 0) {
        const blockTokenMatch = trimmed.match(/^([a-zA-Z0-9._-]+)\s+(.+)$/);
        if (blockTokenMatch) {
          tokens.push({
            name: `${tokenBlockPrefix}.${blockTokenMatch[1]}`,
            value: blockTokenMatch[2]
          });
        }
        continue;
      }
      if (indent === 0) {
        inTokenBlock = false;
      }
      const componentMatch = trimmed.match(/^([A-Z][a-zA-Z0-9]*)\s+as\s+(\w+)\s*:/);
      if (componentMatch) {
        if (currentComponent) {
          components.push(currentComponent);
        }
        currentComponent = {
          name: componentMatch[1],
          base: componentMatch[2],
          properties: []
        };
        continue;
      }
      if (currentComponent && indent > 0) {
        const props = trimmed.split(",").map((p) => p.trim().split(" ")[0]);
        currentComponent.properties.push(...props.filter((p) => p && !p.startsWith("//")));
      }
      if (currentComponent && indent === 0 && !trimmed.match(/^[A-Z]/)) {
        components.push(currentComponent);
        currentComponent = null;
      }
    }
    if (currentComponent) {
      components.push(currentComponent);
    }
    const contextLines = 5;
    const beforeLines = lines.slice(Math.max(0, cursorLine - contextLines), cursorLine);
    const afterLines = lines.slice(cursorLine + 1, cursorLine + 1 + contextLines);
    let insideComponent;
    for (let i = cursorLine; i >= 0; i--) {
      const line = lines[i];
      const indent = line.length - line.trimStart().length;
      if (indent === 0 && line.trim()) {
        const match = line.trim().match(/^([A-Z][a-zA-Z0-9]*)/);
        if (match) {
          insideComponent = match[1];
          break;
        }
      }
    }
    return {
      source,
      tokens,
      components,
      editor: {
        cursorLine,
        cursorColumn,
        selectedNodeId,
        selectedNodeName,
        ancestors,
        insideComponent,
        surroundingCode: {
          before: beforeLines.join("\n"),
          after: afterLines.join("\n")
        }
      }
    };
  }
  async function callLLM(prompt, systemPrompt, config) {
    const baseUrl = config.baseUrl || "https://openrouter.ai/api/v1";
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://mirror-studio.local"
      },
      body: JSON.stringify({
        model: config.model || "anthropic/claude-sonnet-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 4e3
      })
    });
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || "API Error");
    }
    return data.choices[0].message.content;
  }
  function extractReactFromResponse(response) {
    const codeBlockMatch = response.match(/```(?:jsx?|tsx?|javascript|typescript)?\s*\n?([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    return response.trim();
  }
  async function generateFromPrompt(userPrompt, context, config) {
    try {
      const systemPrompt = buildReactSystemPrompt(context);
      const llmResponse = await callLLM(userPrompt, systemPrompt, config);
      const reactCode = extractReactFromResponse(llmResponse);
      if (!reactCode) {
        return {
          success: false,
          error: "No code generated"
        };
      }
      const converter = new ReactToMirrorConverter();
      const conversionResult = converter.convert(reactCode);
      if (conversionResult.errors && conversionResult.errors.length > 0) {
        return {
          success: false,
          react: reactCode,
          error: `Conversion error: ${conversionResult.errors.join(", ")}`
        };
      }
      if (!conversionResult.mirror) {
        return {
          success: false,
          react: reactCode,
          error: "Conversion produced empty result"
        };
      }
      const insertPosition = {
        line: context.editor.cursorLine,
        column: context.editor.cursorColumn || 0
      };
      return {
        success: true,
        mirror: conversionResult.mirror,
        react: reactCode,
        insertPosition
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  function prepareCodeForInsertion(mirrorCode, context, insertMode = "insert") {
    const lines = mirrorCode.split("\n");
    if (context.editor.insideComponent && insertMode === "insert") {
      const surroundingLines = context.editor.surroundingCode?.before.split("\n") || [];
      let baseIndent = 0;
      for (const line of surroundingLines.reverse()) {
        if (line.trim()) {
          baseIndent = line.length - line.trimStart().length;
          break;
        }
      }
      const childIndent = baseIndent + 2;
      const indentedLines = lines.map((line) => {
        if (line.trim()) {
          return " ".repeat(childIndent) + line.trim();
        }
        return line;
      });
      return "\n" + indentedLines.join("\n");
    }
    return "\n\n" + mirrorCode;
  }
  if (typeof window !== "undefined") {
    window.MirrorLLM = {
      extractStudioContext,
      buildReactSystemPrompt,
      generateFromPrompt,
      prepareCodeForInsertion,
      callLLM,
      extractReactFromResponse
    };
  }

  // src/studio/editor-sync-manager.ts
  var EditorSyncManager = class {
    sourceMap;
    selectionManager;
    options;
    pendingSync = null;
    lastLine = -1;
    currentOrigin = null;
    originResetTimer = null;
    unsubscribeSelection = null;
    constructor(sourceMap, selectionManager, options = {}) {
      this.sourceMap = sourceMap;
      this.selectionManager = selectionManager;
      this.options = {
        debounceMs: options.debounceMs ?? 150,
        useIdleCallback: options.useIdleCallback ?? true,
        scrollToLine: options.scrollToLine
      };
      this.unsubscribeSelection = this.selectionManager.subscribe((nodeId) => {
        this.handleSelectionChange(nodeId);
      });
    }
    /**
     * Called by EditorView.updateListener when cursor moves
     * IMPORTANT: Only call this when selection changed WITHOUT doc change
     */
    onCursorMove(line) {
      if (line === this.lastLine) return;
      this.lastLine = line;
      this.cancelPending();
      this.pendingSync = window.setTimeout(() => {
        this.pendingSync = null;
        this.executeSyncToPreview(line);
      }, this.options.debounceMs);
    }
    /**
     * Execute sync from editor to preview
     */
    executeSyncToPreview(line) {
      this.setOrigin("editor");
      const syncFn = () => {
        const node = this.sourceMap.getNodeAtLine(line);
        if (node) {
          this.selectionManager.select(node.nodeId);
        }
      };
      if (this.options.useIdleCallback && "requestIdleCallback" in window) {
        window.requestIdleCallback(syncFn, { timeout: 100 });
      } else {
        syncFn();
      }
    }
    /**
     * Handle selection change (for reverse sync: preview → editor)
     */
    handleSelectionChange(nodeId) {
      if (this.currentOrigin === "editor") return;
      if (!this.options.scrollToLine) return;
      if (!nodeId) return;
      const node = this.sourceMap.getNodeById(nodeId);
      if (node) {
        this.setOrigin("preview");
        this.options.scrollToLine(node.position.line);
      }
    }
    /**
     * Set sync origin with auto-reset
     */
    setOrigin(origin) {
      this.currentOrigin = origin;
      if (this.originResetTimer) {
        clearTimeout(this.originResetTimer);
      }
      this.originResetTimer = window.setTimeout(() => {
        this.currentOrigin = null;
        this.originResetTimer = null;
      }, 50);
    }
    /**
     * Get current sync origin (for external checks)
     */
    getOrigin() {
      return this.currentOrigin;
    }
    /**
     * Update source map reference (after recompile)
     */
    updateSourceMap(sourceMap) {
      this.sourceMap = sourceMap;
    }
    /**
     * Cancel any pending sync
     */
    cancelPending() {
      if (this.pendingSync) {
        clearTimeout(this.pendingSync);
        this.pendingSync = null;
      }
    }
    /**
     * Dispose the manager
     */
    dispose() {
      this.cancelPending();
      if (this.originResetTimer) {
        clearTimeout(this.originResetTimer);
        this.originResetTimer = null;
      }
      if (this.unsubscribeSelection) {
        this.unsubscribeSelection();
        this.unsubscribeSelection = null;
      }
    }
  };
  function createEditorSyncManager(sourceMap, selectionManager, options) {
    return new EditorSyncManager(sourceMap, selectionManager, options);
  }

  // src/index.ts
  function compile(code) {
    const ast = parse(code);
    return generateDOM(ast);
  }
  function compileProject(options) {
    const combinedCode = combineProjectFiles(options.listFiles, options.readFile);
    const ast = parse(combinedCode);
    return generateDOM(ast);
  }
  return __toCommonJS(index_exports);
})();
