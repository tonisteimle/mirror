# Playwright Pool MCP Server

Multi-session Playwright MCP Server - allows multiple Claude Code sessions to use browsers simultaneously without conflicts.

## Problem

The standard Playwright MCP server only allows one browser instance. When multiple Claude Code sessions try to use it, you get:

```
Error: Browser is already in use
```

## Solution

This server manages a **pool of browser sessions**. Each Claude Code session gets its own isolated browser context.

## Installation

```bash
cd tools/playwright-pool
npm install
npm run build
```

## Configuration

Add to your MCP config (`~/.claude/mcp.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": ["/path/to/playwright-pool/dist/index.js"],
      "env": {
        "CLAUDE_SESSION_ID": "${SESSION_ID}",
        "HEADLESS": "false"
      }
    }
  }
}
```

### Environment Variables

| Variable            | Description               | Default        |
| ------------------- | ------------------------- | -------------- |
| `CLAUDE_SESSION_ID` | Unique session identifier | Auto-generated |
| `HEADLESS`          | Run browsers headless     | `false`        |

## Available Tools

| Tool                 | Description                  |
| -------------------- | ---------------------------- |
| `browser_navigate`   | Navigate to a URL            |
| `browser_snapshot`   | Get accessibility tree       |
| `browser_click`      | Click an element             |
| `browser_type`       | Type into an input           |
| `browser_screenshot` | Take a screenshot            |
| `browser_console`    | Get console messages         |
| `browser_evaluate`   | Run JavaScript               |
| `browser_close`      | Close this session's browser |
| `pool_stats`         | Get pool statistics          |

## How It Works

```
┌─────────────────────────────────────────┐
│         Playwright Pool Server          │
├─────────────────────────────────────────┤
│                                         │
│  Session A ──→ Browser Context 1        │
│                    └── Page 1           │
│                                         │
│  Session B ──→ Browser Context 2        │
│                    └── Page 2           │
│                                         │
│  Session C ──→ Browser Context 3        │
│                    └── Page 3           │
│                                         │
├─────────────────────────────────────────┤
│  Auto-cleanup after 5 min inactivity    │
└─────────────────────────────────────────┘
```

## Development

```bash
# Run directly with tsx
npm run dev

# Build
npm run build

# Run built version
npm start
```

## Future Improvements

- [ ] Shared browser instance with isolated contexts (less memory)
- [ ] Configurable timeout
- [ ] Session persistence across restarts
- [ ] WebSocket transport for remote access
- [ ] Browser selection (Firefox, WebKit)
