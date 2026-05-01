# Mirror MCP Server

MCP (Model Context Protocol) Server for Mirror Studio integration with Claude Code.

## Overview

```
Claude Code ←──stdio──→ MCP Server ←──WebSocket──→ Mirror Bridge ←──file watch──→ .mirror files
```

## Components

### 1. MCP Server (`mirror-mcp-server`)

Provides resources and tools to Claude Code:

**Resources:**
- `mirror://file` - Current file content and path
- `mirror://selection` - Selected element info
- `mirror://tokens` - Defined design tokens
- `mirror://components` - Defined components
- `mirror://errors` - Validation errors

**Tools:**
- `mirror_get_element` - Get element details by line number
- `mirror_select_element` - Select element in Mirror Studio
- `mirror_get_status` - Check connection status

### 2. Standalone Bridge (`mirror-bridge`)

File watcher and WebSocket server that runs alongside Mirror Studio:

```bash
# Start the bridge in your project directory
npx mirror-bridge /path/to/project
```

## Installation

```bash
npm install @anthropic/mirror-mcp-server
```

## Claude Code Configuration

Add to your Claude Code settings (`.claude/settings.json`):

```json
{
  "mcpServers": {
    "mirror": {
      "command": "npx",
      "args": ["@anthropic/mirror-mcp-server"]
    }
  }
}
```

## Usage

1. Start the bridge in your project:
   ```bash
   npx mirror-bridge .
   ```

2. Open Claude Code in the same project

3. Claude Code now has context about your Mirror files:
   - Current file content
   - Selected element
   - Defined tokens and components
   - Validation errors

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Run MCP server directly
npm start
```

## Architecture

The MCP Server uses stdio communication with Claude Code (standard MCP protocol).

It connects to the standalone bridge via WebSocket on port 24601 to get real-time state updates from Mirror Studio.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Claude Code   │────▶│   MCP Server    │────▶│  Mirror Bridge  │
│                 │stdio│                 │ ws  │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  .mirror files  │
                                                └─────────────────┘
```
