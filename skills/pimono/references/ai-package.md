# @mariozechner/pi-ai

Unified LLM API with automatic model discovery, provider configuration, token/cost tracking, context persistence, and cross-provider handoffs.

**Note**: Only includes models that support tool calling.

## Installation

```bash
npm install @mariozechner/pi-ai
```

TypeBox exports (`Type`, `Static`, `TSchema`) are re-exported.

## Core Concepts

### Models and Providers

```typescript
import { getModel, getProviders, getModels } from '@mariozechner/pi-ai';

// Get specific model (fully typed)
const model = getModel('anthropic', 'claude-sonnet-4-20250514');

// List providers
const providers = getProviders(); // ['openai', 'anthropic', 'google', ...]

// List models for a provider
const models = getModels('anthropic');
```

### Streaming

```typescript
import { stream } from '@mariozechner/pi-ai';

const s = stream(model, context);

for await (const event of s) {
  switch (event.type) {
    case 'text_delta':
      process.stdout.write(event.delta);
      break;
    case 'toolcall_start':
      console.log(`Tool: ${event.partial.content[event.contentIndex].name}`);
      break;
    case 'toolcall_end':
      console.log(`Args: ${JSON.stringify(event.toolCall.arguments)}`);
      break;
    case 'done':
      console.log(`Finished: ${event.reason}`);
      break;
    case 'error':
      console.error(`Error: ${event.error}`);
      break;
  }
}

// Get final message
const finalMessage = await s.result();
context.messages.push(finalMessage);
```

### Complete (Non-Streaming)

```typescript
import { complete } from '@mariozechner/pi-ai';

const response = await complete(model, context);
for (const block of response.content) {
  if (block.type === 'text') console.log(block.text);
  else if (block.type === 'toolCall') console.log(`Tool: ${block.name}`);
}
```

## Tools

Tools use TypeBox schemas for type safety:

```typescript
import { Type, Tool, StringEnum } from '@mariozechner/pi-ai';

const weatherTool: Tool = {
  name: 'get_weather',
  description: 'Get weather for a location',
  parameters: Type.Object({
    location: Type.String({ description: 'City name' }),
    units: StringEnum(['celsius', 'fahrenheit'], { default: 'celsius' })
  })
};
```

**Note**: Use `StringEnum` instead of `Type.Enum` for Google API compatibility.

### Tool Results

```typescript
context.messages.push({
  role: 'toolResult',
  toolCallId: call.id,
  toolName: call.name,
  content: [{ type: 'text', text: result }],
  isError: false,
  timestamp: Date.now()
});
```

## Streaming Events Reference

| Event | Description |
|-------|-------------|
| `start` | Stream begins |
| `text_start` / `text_delta` / `text_end` | Text blocks |
| `thinking_start` / `thinking_delta` / `thinking_end` | Thinking blocks |
| `toolcall_start` / `toolcall_delta` / `toolcall_end` | Tool calls |
| `done` | Stream complete |
| `error` | Error occurred |

## Images

```typescript
import { readFileSync } from 'fs';

const imageBuffer = readFileSync('image.png');
const base64Image = imageBuffer.toString('base64');

const response = await complete(model, {
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'What is this?' },
      { type: 'image', data: base64Image, mimeType: 'image/png' }
    ]
  }]
});
```

## Thinking/Reasoning

### Simple Interface

```typescript
import { streamSimple, completeSimple } from '@mariozechner/pi-ai';

const response = await completeSimple(model, context, {
  reasoning: 'medium' // 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
});
```

### Provider-Specific Options

```typescript
// Anthropic
await complete(model, context, {
  thinkingEnabled: true,
  thinkingBudgetTokens: 8192
});

// OpenAI
await complete(model, context, {
  reasoningEffort: 'medium',
  reasoningSummary: 'detailed'
});

// Google
await complete(model, context, {
  thinking: { enabled: true, budgetTokens: 8192 }
});
```

## Stop Reasons

- `stop` - Normal completion
- `length` - Hit token limit
- `toolUse` - Model calling tools
- `error` - Error occurred
- `aborted` - Request cancelled

## Error Handling

```typescript
for await (const event of stream) {
  if (event.type === 'error') {
    console.error(`Error (${event.reason}):`, event.error.errorMessage);
  }
}

const message = await stream.result();
if (message.stopReason === 'error') {
  console.error('Failed:', message.errorMessage);
}
```

### Abort

```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 2000);

const s = stream(model, context, { signal: controller.signal });
```

Aborted messages can be added to context and continued:

```typescript
context.messages.push(partial);
context.messages.push({ role: 'user', content: 'Please continue' });
const continuation = await complete(model, context);
```

## Custom Models

```typescript
const ollamaModel = {
  id: 'llama3.1:8b',
  name: 'Llama 3.1 8B',
  api: 'openai-completions',
  provider: 'ollama',
  baseUrl: 'http://localhost:11434/v1',
  reasoning: false,
  input: ['text'],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128000,
  maxTokens: 32000
};

const response = await stream(ollamaModel, context, { apiKey: 'dummy' });
```

### Compatibility Settings

```typescript
const model = {
  // ...
  compat: {
    supportsDeveloperRole: false,
    supportsReasoningEffort: false,
    maxTokensField: 'max_tokens',
    thinkingFormat: 'qwen',
    cacheControlFormat: 'anthropic'
  }
};
```

## Cross-Provider Handoffs

Switch models mid-conversation while preserving context:

```typescript
const claude = getModel('anthropic', 'claude-sonnet-4-20250514');
const gpt5 = getModel('openai', 'gpt-5-mini');

const context = { messages: [] };

context.messages.push({ role: 'user', content: 'What is 25 * 18?' });
const r1 = await complete(claude, context);
context.messages.push(r1);

context.messages.push({ role: 'user', content: 'Is that correct?' });
const r2 = await complete(gpt5, context); // Claude's thinking converted to <thinking> tags
```

## Context Serialization

```typescript
// Serialize
const serialized = JSON.stringify(context);
localStorage.setItem('conversation', serialized);

// Deserialize
const restored = JSON.parse(localStorage.getItem('conversation'));
```

## Browser Usage

```typescript
// API key must be passed explicitly in browser
const response = await complete(model, context, { apiKey: 'your-key' });
```

**Warning**: Don't expose API keys in frontend code. Use a backend proxy.

**Not supported in browser**:
- Amazon Bedrock
- OAuth login flows

## Environment Variables

| Provider | Variable |
|----------|----------|
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` or `ANTHROPIC_OAUTH_TOKEN` |
| Google | `GEMINI_API_KEY` |
| DeepSeek | `DEEPSEEK_API_KEY` |
| Mistral | `MISTRAL_API_KEY` |
| Groq | `GROQ_API_KEY` |
| xAI | `XAI_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| Azure OpenAI | `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_BASE_URL` |
| Cloudflare | `CLOUDFLARE_API_KEY` + `CLOUDFLARE_ACCOUNT_ID` |
| Bedrock | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` |
| Vertex AI | `GOOGLE_CLOUD_PROJECT` + `GOOGLE_CLOUD_LOCATION` + ADC |

Check env vars:
```typescript
import { getEnvApiKey } from '@mariozechner/pi-ai';
const key = getEnvApiKey('openai');
```

## OAuth

Providers requiring OAuth:
- Anthropic (Claude Pro/Max)
- OpenAI Codex (ChatGPT Plus/Pro)
- GitHub Copilot

### CLI Login

```bash
npx @mariozechner/pi-ai login           # interactive
npx @mariozechner/pi-ai login anthropic # specific provider
npx @mariozechner/pi-ai list            # list providers
```

### Programmatic OAuth

```typescript
import { loginAnthropic, refreshOAuthToken, getOAuthApiKey } from '@mariozechner/pi-ai/oauth';

const credentials = await loginAnthropic({
  onAuth: (url) => console.log(`Open: ${url}`),
  onPrompt: async (prompt) => getUserInput(prompt.message),
  onProgress: (msg) => console.log(msg)
});

// Refresh if needed
const result = await getOAuthApiKey('anthropic', auth);
if (result) {
  auth['anthropic'] = { type: 'oauth', ...result.newCredentials };
}
```

## Supported APIs

| API | Description |
|-----|-------------|
| `anthropic-messages` | Anthropic Messages API |
| `openai-completions` | OpenAI Chat Completions |
| `openai-responses` | OpenAI Responses API |
| `openai-codex-responses` | OpenAI Codex Responses |
| `azure-openai-responses` | Azure OpenAI Responses |
| `google-generative-ai` | Google Generative AI |
| `google-vertex` | Google Vertex AI |
| `mistral-conversations` | Mistral Conversations |
| `bedrock-converse-stream` | Amazon Bedrock Converse |

## Adding a New Provider

See [Adding a New Provider](https://github.com/badlogic/pi-mono/blob/main/packages/ai/README.md#adding-a-new-provider) in the README for the full checklist covering:
1. Core types (`src/types.ts`)
2. Provider implementation (`src/providers/`)
3. Provider exports and lazy registration
4. Model generation (`scripts/generate-models.ts`)
5. Tests (`test/`)
6. Coding Agent integration
7. Documentation
