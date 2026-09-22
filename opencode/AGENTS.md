# Agent Configuration

This directory contains custom agent configurations for OpenCode.

## Sync to Remote Server

To sync this configuration to `ubuntu-dev`:

```bash
cd ~/.config/opencode && ./sync-config.sh
```

The script syncs:
- `agents/` - Custom subagents (feature-executor, validator, refactor-specialist)
- `prompts/` - Custom prompts for plan and explore agents
- `opencode.json` - Main configuration
- `~/.agents/skills/` - Global skills

## Agents

### Custom Subagents

| Agent | Purpose | Mode |
|-------|---------|------|
| `feature-executor` | Implementation specialist | subagent |
| `validator` | Validation and QA | subagent |
| `refactor-specialist` | Refactoring with API contracts | subagent |

### Built-in Overrides

| Agent | Customization |
|-------|--------------|
| `plan` | Auto-invokes @explore before planning |
| `explore` | Structured analysis with Verified/Inferred/Unknown classification |

## Workflow

```
plan -> @explore (discovery) -> plan creation -> @feature-executor/@refactor-specialist -> @validator
```
