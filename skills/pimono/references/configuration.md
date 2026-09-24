# Configuration

Pi uses JSON settings files with project settings overriding global settings.

## Settings Locations

| Location | Scope |
|----------|-------|
| `~/.pi/agent/settings.json` | Global |
| `.pi/settings.json` | Project |

Edit directly or use `/settings` in interactive mode.

## Model & Thinking

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `defaultProvider` | string | - | Default provider |
| `defaultModel` | string | - | Default model ID |
| `defaultThinkingLevel` | string | - | `off`, `minimal`, `low`, `medium`, `high`, `xhigh` |
| `hideThinkingBlock` | boolean | `false` | Hide thinking blocks |
| `thinkingBudgets` | object | - | Custom token budgets per level |

```json
{
  "thinkingBudgets": {
    "minimal": 1024,
    "low": 4096,
    "medium": 10240,
    "high": 32768
  }
}
```

## UI & Display

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `theme` | string | `"dark"` | Theme name |
| `quietStartup` | boolean | `false` | Hide startup header |
| `collapseChangelog` | boolean | `false` | Condensed changelog |
| `enableInstallTelemetry` | boolean | `true` | Anonymous install ping |
| `doubleEscapeAction` | string | `"tree"` | `"tree"`, `"fork"`, or `"none"` |
| `treeFilterMode` | string | `"default"` | Default `/tree` filter |
| `editorPaddingX` | number | `0` | Horizontal padding (0-3) |
| `autocompleteMaxVisible` | number | `5` | Max autocomplete items (3-20) |
| `showHardwareCursor` | boolean | `false` | Show terminal cursor |

## Telemetry

- `enableInstallTelemetry`: Controls install/update ping to `https://pi.dev/api/report-install`
- Update checks are separate; disable with `PI_SKIP_VERSION_CHECK=1`
- Disable all network: `--offline` or `PI_OFFLINE=1`

## Compaction

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `compaction.enabled` | boolean | `true` | Enable auto-compaction |
| `compaction.reserveTokens` | number | `16384` | Tokens reserved for response |
| `compaction.keepRecentTokens` | number | `20000` | Recent tokens to keep |

## Branch Summary

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `branchSummary.reserveTokens` | number | `16384` | Tokens for summarization |
| `branchSummary.skipPrompt` | boolean | `false` | Skip summary prompt on `/tree` |

## Retry

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `retry.enabled` | boolean | `true` | Auto-retry on errors |
| `retry.maxRetries` | number | `3` | Max retry attempts |
| `retry.baseDelayMs` | number | `2000` | Base delay (2s, 4s, 8s) |
| `retry.provider.timeoutMs` | number | SDK default | Request timeout |
| `retry.provider.maxRetries` | number | SDK default | Provider retries |
| `retry.provider.maxRetryDelayMs` | number | `60000` | Max delay before failing |

## Message Delivery

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `steeringMode` | string | `"one-at-a-time"` | `"all"` or `"one-at-a-time"` |
| `followUpMode` | string | `"one-at-a-time"` | `"all"` or `"one-at-a-time"` |
| `transport` | string | `"sse"` | `"sse"`, `"websocket"`, or `"auto"` |

## Terminal & Images

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `terminal.showImages` | boolean | `true` | Show images in terminal |
| `terminal.imageWidthCells` | number | `60` | Inline image width |
| `terminal.clearOnShrink` | boolean | `false` | Clear empty rows |
| `images.autoResize` | boolean | `true` | Resize to 2000x2000 max |
| `images.blockImages` | boolean | `false` | Block all images |

## Shell

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `shellPath` | string | - | Custom shell path |
| `shellCommandPrefix` | string | - | Prefix for bash commands |
| `npmCommand` | string[] | - | npm wrapper command |

```json
{
  "npmCommand": ["mise", "exec", "node@20", "--", "npm"]
}
```

## Sessions

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `sessionDir` | string | - | Session storage directory |

## Model Cycling

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabledModels` | string[] | - | Patterns for Ctrl+P cycling |

```json
{
  "enabledModels": ["claude-*", "gpt-4o", "gemini-2*"]
}
```

## Resources

Paths resolve relative to settings file location. Absolute paths and `~` supported.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `packages` | array | `[]` | npm/git packages to load |
| `extensions` | string[] | `[]` | Local extension paths |
| `skills` | string[] | `[]` | Local skill paths |
| `prompts` | string[] | `[]` | Local prompt template paths |
| `themes` | string[] | `[]` | Local theme paths |
| `enableSkillCommands` | boolean | `true` | Register skills as `/skill:name` |

Arrays support glob patterns and exclusions (`!pattern`, `+path`, `-path`).

### Package Sources

```json
{
  "packages": [
    "pi-skills",
    "npm:@org/my-extension@1.0.0",
    "git:github.com/user/repo@v1"
  ]
}
```

Object form filters resources:

```json
{
  "packages": [
    {
      "source": "pi-skills",
      "skills": ["brave-search"],
      "extensions": []
    }
  ]
}
```

## Full Example

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
  },
  "retry": {
    "enabled": true,
    "maxRetries": 3
  },
  "enabledModels": ["claude-*", "gpt-4o"],
  "packages": ["pi-skills"]
}
```

## Project Overrides

Project settings (`.pi/settings.json`) override global. Nested objects are merged.

## Auth File

`~/.pi/agent/auth.json` stores credentials:

```json
{
  "anthropic": { "type": "api_key", "key": "sk-ant-..." },
  "openai": { "type": "api_key", "key": "sk-..." }
}
```

Key formats:
- **Shell command**: `"!command"` (stdout used)
- **Environment variable**: `"VAR_NAME"`
- **Literal**: `"sk-..."`

OAuth tokens stored automatically after `/login`.

## Custom Models

Add models via `~/.pi/agent/models.json`:

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "models": [
        { "id": "llama3.1:8b" }
      ]
    }
  }
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `DEEPSEEK_API_KEY` | DeepSeek API key |
| `GEMINI_API_KEY` | Google API key |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_REGION` | AWS region |
| `PI_SKIP_VERSION_CHECK` | Disable update checks |
| `PI_OFFLINE` | Disable all network |
| `PI_CODING_AGENT_SESSION_DIR` | Session directory |

## CLI Flags

| Flag | Description |
|------|-------------|
| `--api-key <key>` | Override API key |
| `--provider <name>` | Set provider |
| `--model <pattern>` | Set model |
| `--thinking <level>` | Set thinking level |
| `--session-dir <path>` | Custom session dir |
| `--offline` | Disable network |
| `--no-session` | Ephemeral mode |
