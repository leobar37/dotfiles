# Providers

Pi supports subscription providers via OAuth and API key providers via environment variables or auth file.

## Subscriptions (OAuth)

Use `/login` in interactive mode:

- **ChatGPT Plus/Pro (Codex)** - GPT-5.x Codex models
- **Claude Pro/Max** - Anthropic subscription
- **GitHub Copilot** - Copilot subscription

Tokens stored in `~/.pi/agent/auth.json`, auto-refresh when expired.

### OpenAI Codex

Requires ChatGPT Plus or Pro. Officially endorsed by OpenAI.

### Claude Pro/Max

Third-party harness usage draws from extra usage, billed per token.

### GitHub Copilot

If "model not supported", enable in VS Code: Copilot Chat → model selector → select → "Enable".

## API Keys

### Environment Variables

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pi
```

### Auth File

Store in `~/.pi/agent/auth.json`:

```json
{
  "anthropic": { "type": "api_key", "key": "sk-ant-..." },
  "openai": { "type": "api_key", "key": "sk-..." },
  "deepseek": { "type": "api_key", "key": "sk-..." }
}
```

**Priority**: CLI `--api-key` > auth.json > environment variable.

### Key Resolution

The `key` field supports:
- **Shell command**: `"!security find-generic-password -ws 'anthropic'"`
- **Environment variable**: `"MY_ANTHROPIC_KEY"`
- **Literal value**: `"sk-ant-..."`

## Supported Providers

### Anthropic
- Env: `ANTHROPIC_API_KEY`
- Auth key: `anthropic`

### OpenAI
- Env: `OPENAI_API_KEY`
- Auth key: `openai`

### Azure OpenAI Responses
- Env: `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_BASE_URL` or `AZURE_OPENAI_RESOURCE_NAME`
- Optional: `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_DEPLOYMENT_NAME_MAP`
- Auth key: `azure-openai-responses`

### DeepSeek
- Env: `DEEPSEEK_API_KEY`
- Auth key: `deepseek`

### Google Gemini
- Env: `GEMINI_API_KEY`
- Auth key: `google`

### Google Vertex AI
- Uses Application Default Credentials (ADC)
- `gcloud auth application-default login`
- `GOOGLE_CLOUD_PROJECT` + `GOOGLE_CLOUD_LOCATION`

### Mistral
- Env: `MISTRAL_API_KEY`
- Auth key: `mistral`

### Groq
- Env: `GROQ_API_KEY`
- Auth key: `groq`

### Cerebras
- Env: `CEREBRAS_API_KEY`
- Auth key: `cerebras`

### Cloudflare AI Gateway
- Env: `CLOUDFLARE_API_KEY` + `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_GATEWAY_ID`
- Auth key: `cloudflare-ai-gateway`

### Cloudflare Workers AI
- Env: `CLOUDFLARE_API_KEY` + `CLOUDFLARE_ACCOUNT_ID`
- Auth key: `cloudflare-workers-ai`

### xAI
- Env: `XAI_API_KEY`
- Auth key: `xai`

### OpenRouter
- Env: `OPENROUTER_API_KEY`
- Auth key: `openrouter`

### Vercel AI Gateway
- Env: `AI_GATEWAY_API_KEY`
- Auth key: `vercel-ai-gateway`

### Amazon Bedrock
- Env: `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` or `AWS_PROFILE`
- Optional: `AWS_REGION` (default `us-east-1`)
- Also supports ECS task roles and IRSA

```bash
pi --provider amazon-bedrock --model us.anthropic.claude-sonnet-4-20250514-v1:0
```

Bedrock-specific env vars:
- `AWS_BEDROCK_FORCE_CACHE=1` - Enable cache for inference profiles
- `AWS_ENDPOINT_URL_BEDROCK_RUNTIME` - Proxy URL
- `AWS_BEDROCK_SKIP_AUTH=1` - Skip auth
- `AWS_BEDROCK_FORCE_HTTP1=1` - Force HTTP/1.1

### Fireworks
- Env: `FIREWORKS_API_KEY`
- Auth key: `fireworks`

### Kimi For Coding
- Env: `KIMI_API_KEY`
- Auth key: `kimi-coding`

### MiniMax
- Env: `MINIMAX_API_KEY` or `MINIMAX_CN_API_KEY`
- Auth keys: `minimax`, `minimax-cn`

### Xiaomi MiMo
- Env: `XIAOMI_API_KEY`
- Auth key: `xiaomi`

### Xiaomi MiMo Token Plan
- China: `XIAOMI_TOKEN_PLAN_CN_API_KEY`
- Amsterdam: `XIAOMI_TOKEN_PLAN_AMS_API_KEY`
- Singapore: `XIAOMI_TOKEN_PLAN_SGP_API_KEY`

### OpenCode Zen / Go
- Env: `OPENCODE_API_KEY`
- Auth keys: `opencode`, `opencode-go`

### Hugging Face
- Env: `HF_TOKEN`
- Auth key: `huggingface`

## Custom Providers

### Via models.json

Add Ollama, LM Studio, vLLM, or any OpenAI/Anthropic/Google-compatible provider:

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "models": [{ "id": "llama3.1:8b" }]
    }
  }
}
```

Supported APIs: `openai-completions`, `openai-responses`, `anthropic-messages`, `google-generative-ai`.

### Via Extensions

For custom APIs or OAuth, create an extension with `pi.registerProvider()`.

See [Custom Providers](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/custom-provider.md).

## Resolution Order

1. CLI `--api-key` flag
2. `auth.json` entry
3. Environment variable
4. Custom provider keys from `models.json`
