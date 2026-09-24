# @mariozechner/pi-coding-agent

Pi is a minimal terminal coding harness. Extend it with TypeScript extensions, skills, prompt templates, and themes.

## Installation

```bash
npm install -g @mariozechner/pi-coding-agent
```

## Authentication

### API Key

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pi
```

### OAuth (Subscription)

```bash
pi
/login
```

Built-in subscriptions: Claude Pro/Max, ChatGPT Plus/Pro (Codex), GitHub Copilot.

## Interactive Mode

### Interface

- **Startup header** - Shortcuts, loaded AGENTS.md, templates, skills, extensions
- **Messages** - User messages, assistant responses, tool calls/results
- **Editor** - Input area (border color = thinking level)
- **Footer** - Working dir, session name, tokens/cost, model

### Editor Features

| Feature | How |
|---------|-----|
| File reference | Type `@` to fuzzy-search files |
| Path completion | Tab |
| Multi-line | Shift+Enter (Ctrl+Enter on Windows Terminal) |
| Images | Ctrl+V (Alt+V on Windows) or drag |
| Bash | `!command` runs and sends output, `!!command` runs without sending |

### Commands

Type `/` to trigger commands:

| Command | Description |
|---------|-------------|
| `/login`, `/logout` | OAuth authentication |
| `/model` | Switch models |
| `/scoped-models` | Enable/disable models for Ctrl+P |
| `/settings` | Thinking level, theme, transport |
| `/resume` | Browse previous sessions |
| `/new` | New session |
| `/name <name>` | Set session name |
| `/session` | Session info |
| `/tree` | Navigate session tree |
| `/fork` | Fork from previous message |
| `/clone` | Duplicate current branch |
| `/compact [prompt]` | Manual compaction |
| `/copy` | Copy last message |
| `/export [file]` | Export to HTML |
| `/share` | Upload as GitHub gist |
| `/reload` | Reload extensions, skills, prompts |
| `/hotkeys` | Show shortcuts |
| `/quit` | Quit |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Ctrl+C | Clear editor |
| Ctrl+C twice | Quit |
| Escape | Cancel/abort |
| Escape twice | Open `/tree` |
| Ctrl+L | Model selector |
| Ctrl+P / Shift+Ctrl+P | Cycle scoped models |
| Shift+Tab | Cycle thinking level |
| Ctrl+O | Collapse/expand tool output |
| Ctrl+T | Collapse/expand thinking |

### Message Queue

Submit while agent is working:
- **Enter** - Queue steering message (delivered after current turn)
- **Alt+Enter** - Queue follow-up (delivered when agent stops)
- **Escape** - Abort and restore queued messages
- **Alt+Up** - Retrieve queued messages

## Sessions

Stored as JSONL files in `~/.pi/agent/sessions/`.

```bash
pi -c                  # Continue most recent
pi -r                  # Browse sessions
pi --no-session        # Ephemeral mode
pi --session <id>     # Open specific session
pi --fork <id>        # Fork session
```

### Branching

- `/tree` - Navigate session tree in-place
- `/fork` - New session from previous message
- `/clone` - Duplicate current branch

## Context Files

Pi loads context files at startup:

- `~/.pi/agent/AGENTS.md` - Global instructions
- `AGENTS.md` or `CLAUDE.md` - From parent directories and current directory

```markdown
# Project Instructions

- Run `npm run check` after code changes.
- Keep responses concise.
```

Run `/reload` after changes.

## CLI Reference

```bash
pi [options] [prompt]

Options:
  -p, --prompt <text>       One-shot prompt
  -c, --continue            Continue last session
  -r, --resume              Resume session
  --no-session              Don't save session
  --session <id>            Use specific session
  --fork <id>              Fork session
  -e, --extension <path>   Load extension
  --skill <path>           Load skill
  --mode <json|rpc>        Output mode
  --provider <name>        Set provider
  --model <pattern>        Set model
  --thinking <level>       Set thinking level
  --session-dir <path>     Custom session directory
  --api-key <key>          API key
  -l, --local               Use project settings
  --offline                 Disable network operations
  --list-models             List available models
```

## Non-Interactive Mode

```bash
pi -p "Summarize this codebase"
cat README.md | pi -p "Summarize"
pi -p @screenshot.png "What's in this image?"
pi --mode json "List files"  # JSON event output
pi --mode rpc                # JSON-RPC over stdin/stdout
```

## Settings

See [Configuration](configuration.md) for full settings reference.

Quick example:

```json
{
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-20250514",
  "defaultThinkingLevel": "medium",
  "theme": "dark",
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}
```

## Customization

- [Extensions](extensions.md) - TypeScript modules for tools, commands, UI
- [Skills](skills.md) - Reusable capability packages
- [Prompt Templates](prompt-templates.md) - Reusable prompts
- [Themes](themes.md) - Terminal themes
- [Pi Packages](packages.md) - Bundle and share resources

## Platform Notes

- [Windows](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/windows.md)
- [Termux (Android)](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/termux.md)
- [tmux](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/tmux.md)
- [Terminal Setup](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/terminal-setup.md)
- [Shell Aliases](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/shell-aliases.md)

## Philosophy

- Minimal core, extended through plugins
- No sub-agents or plan mode by default
- Adapt pi to your workflows, not the other way around
- Share extensions, skills, and themes via npm/git
