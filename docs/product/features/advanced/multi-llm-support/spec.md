# Multi-LLM Support Feature Specification

## Metadata
- **Feature ID**: ADV-004
- **Feature Name**: Multi-LLM Support
- **Category**: Advanced
- **Priority**: P2
- **Complexity**: High
- **Target Version**: V3
- **Dependencies**: Core chatbot system, API abstraction layer
- **Owner**: Product Team
- **Status**: Planned

## Summary
Enable users to choose from multiple LLM providers (Anthropic Claude, OpenAI GPT, Meta Llama, Google Gemini) for their chatbot, with the ability to configure model-specific parameters and compare performance. The system provides a unified interface while handling provider-specific nuances, rate limits, and pricing differences.

## User Story
As a Cover user, I want to select and configure different LLM providers for my chatbot so that I can optimize for cost, performance, or specific capabilities, and easily switch providers without rebuilding my knowledge base or losing conversation history.

## Functional Requirements

### FR-001: LLM Provider Selection
- Users can select from supported providers: Claude (Anthropic), GPT (OpenAI), Llama (Meta/self-hosted), Gemini (Google)
- Provider selection available in project settings
- Each project can use a different provider
- Default provider: Claude 3.5 Sonnet
- Provider information displayed: capabilities, pricing, rate limits

### FR-002: Model Selection
- Users can choose specific model within each provider
- Available models per provider:
  - **Claude**: Haiku, Sonnet, Opus (3.5 and 3.0 versions)
  - **GPT**: GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo
  - **Gemini**: Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 1.0 Pro
  - **Llama**: Llama 3.1 (8B, 70B, 405B), Llama 3.2 (1B, 3B)
- Model comparison table shows: context window, cost, speed, capabilities
- Recommendations based on use case (customer support, sales, technical docs)

### FR-003: Provider Configuration
- API key management for each provider
- Option to use Cover-managed keys or bring your own (BYOK)
- Provider-specific parameters:
  - Temperature, top_p, max_tokens (all providers)
  - Frequency/presence penalty (OpenAI)
  - System prompt customization
  - Safety settings (Gemini)
- Configuration presets for common use cases

### FR-004: Unified Message Format
- Single conversation format across all providers
- Automatic conversion between provider-specific formats
- Consistent handling of system messages, user messages, assistant messages
- Support for multi-turn conversations regardless of provider
- Streaming responses normalized across providers

### FR-005: Provider-Specific Features
- Claude: Tool use, vision (when applicable)
- GPT: Function calling, vision, DALL-E integration
- Gemini: Multimodal input, grounding with Google Search
- Llama: Full privacy (self-hosted option), no external API calls
- Feature availability clearly indicated in UI

### FR-006: Fallback & Retry Logic
- Automatic fallback to secondary provider if primary fails
- Configurable retry attempts with exponential backoff
- Error handling for rate limits, API errors, timeouts
- Graceful degradation: Simpler model if primary unavailable
- User notification of provider switches

### FR-007: Cost Tracking & Optimization
- Per-conversation cost tracking by provider and model
- Monthly spend by provider and project
- Cost comparison between providers for historical conversations
- Budget alerts and automatic model downgrade options
- Token usage analytics and optimization suggestions

### FR-008: Performance Monitoring
- Response time tracking per provider and model
- Success rate and error rate monitoring
- User satisfaction correlation with provider
- A/B testing framework for comparing providers
- Performance dashboard with provider comparisons

## UI Mockup

```
Project Settings - LLM Configuration:
+----------------------------------------------------------+
|  LLM Provider & Model                                     |
+----------------------------------------------------------+
|                                                           |
|  Active Provider                                          |
|  +------------------------------------------------------+|
|  | [Anthropic Claude v]                      [Change]   ||
|  |                                                      ||
|  | Model: Claude 3.5 Sonnet                             ||
|  | Context: 200K tokens | Cost: $3/$15 per 1M tokens   ||
|  | Speed: Fast | Capabilities: Text, Tool Use           ||
|  +------------------------------------------------------+|
|                                                           |
|  Model Selection                                          |
|  +------------------------------------------------------+|
|  | [Claude 3.5 Sonnet (Recommended) v]                  ||
|  |                                                      ||
|  | Other options:                                       ||
|  | - Claude 3.5 Haiku (Faster, cheaper)                 ||
|  | - Claude 3 Opus (Most capable)                       ||
|  | - Claude 3 Sonnet (Previous generation)              ||
|  +------------------------------------------------------+|
|                                                           |
|  Model Parameters                                         |
|  +------------------------------------------------------+|
|  | Temperature:  [=======|---] 0.7                      ||
|  | Max Tokens:   [5000]                                 ||
|  | Top P:        [==========] 1.0                       ||
|  |                                                      ||
|  | [Advanced Settings v]                                ||
|  +------------------------------------------------------+|
|                                                           |
|  API Key Management                                       |
|  +------------------------------------------------------+|
|  | ( ) Use Cover-managed keys (Included in plan)        ||
|  | (•) Use my own API key                               ||
|  |                                                      ||
|  | API Key: [sk-ant-...k4j2] [Update] [Test Connection]||
|  +------------------------------------------------------+|
|                                                           |
|  Fallback Configuration                                   |
|  +------------------------------------------------------+|
|  | [x] Enable automatic fallback                        ||
|  | Fallback provider: [OpenAI GPT-4o-mini v]            ||
|  | Retry attempts: [3]                                  ||
|  +------------------------------------------------------+|
|                                                           |
|                               [Cancel]  [Save Changes]    |
+----------------------------------------------------------+

Provider Comparison Table:
+----------------------------------------------------------+
|  Compare LLM Providers                                    |
+----------------------------------------------------------+
| Feature      | Claude     | GPT-4o     | Gemini     | Llama   |
|              | 3.5 Sonnet | (OpenAI)   | 1.5 Pro    | 3.1 70B |
|--------------|------------|------------|------------|---------|
| Context      | 200K       | 128K       | 1M         | 128K    |
| Input Cost   | $3/1M      | $5/1M      | $3.50/1M   | $0*     |
| Output Cost  | $15/1M     | $15/1M     | $10.50/1M  | $0*     |
| Avg Response | 1.2s       | 1.5s       | 1.8s       | 2.5s**  |
| Vision       | Yes        | Yes        | Yes        | Limited |
| Tool Use     | Yes        | Yes        | Yes        | No      |
| Streaming    | Yes        | Yes        | Yes        | Yes     |
|              |            |            |            |         |
|              | [Select]   | [Select]   | [Select]   | [Select]|
+----------------------------------------------------------+
* Self-hosted, infrastructure costs apply
** Depends on hosting

Cost Analysis:
+----------------------------------------------------------+
|  Provider Cost Analysis (Last 30 Days)                    |
+----------------------------------------------------------+
|                                                           |
|  Current: Claude 3.5 Sonnet                               |
|  Total Spend: $127.45                                     |
|  Conversations: 1,248 | Avg Cost/Conversation: $0.10     |
|                                                           |
|  If you had used:                                         |
|  - GPT-4o: $143.20 (+12% more expensive)                  |
|  - Gemini 1.5 Pro: $95.30 (-25% cheaper)                  |
|  - Claude 3.5 Haiku: $38.15 (-70% cheaper)                |
|                                                           |
|  Recommendation: For your use case (customer support),    |
|  consider Claude 3.5 Haiku to reduce costs by 70% while  |
|  maintaining quality.                      [Switch Model] |
+----------------------------------------------------------+
```

## Technical Approach

### Architecture Overview
```
┌─────────────────────────────────────────────────┐
│           Cover Application Layer                │
├─────────────────────────────────────────────────┤
│         LLM Abstraction Layer (Unified API)      │
├─────────────────────────────────────────────────┤
│  Provider Adapters                               │
│  ┌──────────┬──────────┬──────────┬──────────┐ │
│  │ Claude   │ OpenAI   │ Gemini   │ Llama    │ │
│  │ Adapter  │ Adapter  │ Adapter  │ Adapter  │ │
│  └──────────┴──────────┴──────────┴──────────┘ │
├─────────────────────────────────────────────────┤
│  External LLM APIs                               │
└─────────────────────────────────────────────────┘
```

### Data Model
```typescript
interface LLMConfiguration {
  id: string;
  projectId: string;
  provider: 'claude' | 'openai' | 'gemini' | 'llama';
  model: string; // e.g., 'claude-3-5-sonnet-20241022'
  apiKeySource: 'managed' | 'byok';
  apiKey?: string; // Encrypted
  parameters: {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    [key: string]: any;
  };
  fallbackConfig?: {
    enabled: boolean;
    provider: string;
    model: string;
    retryAttempts: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface LLMUsage {
  id: string;
  projectId: string;
  conversationId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  responseTime: number;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
}
```

### LLM Abstraction Layer
```typescript
interface LLMProvider {
  name: string;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  stream(request: GenerateRequest): AsyncIterator<StreamChunk>;
  countTokens(text: string): number;
  getModels(): Model[];
  validateApiKey(apiKey: string): Promise<boolean>;
}

interface GenerateRequest {
  messages: Message[];
  model: string;
  parameters: Record<string, any>;
  systemPrompt?: string;
  tools?: Tool[];
}

interface GenerateResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  finishReason: string;
  model: string;
}
```

### Provider Adapters
Each provider adapter implements the `LLMProvider` interface:
- **ClaudeAdapter**: Anthropic Messages API
- **OpenAIAdapter**: OpenAI Chat Completions API
- **GeminiAdapter**: Google Generative AI API
- **LlamaAdapter**: Ollama or self-hosted inference endpoint

### Cost Calculation
```typescript
const PRICING = {
  'claude-3-5-sonnet': { input: 3, output: 15 },
  'gpt-4o': { input: 5, output: 15 },
  'gemini-1.5-pro': { input: 3.5, output: 10.5 },
  'llama-3.1-70b': { input: 0, output: 0 }, // Self-hosted
};

function calculateCost(provider: string, model: string, usage: Usage): number {
  const pricing = PRICING[model];
  const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}
```

### API Endpoints
```
GET    /api/llm/providers              - List available providers
GET    /api/llm/providers/:id/models   - Get models for provider
POST   /api/llm/providers/:id/validate - Validate API key
GET    /api/projects/:id/llm-config    - Get project LLM config
PATCH  /api/projects/:id/llm-config    - Update LLM config
GET    /api/projects/:id/llm-usage     - Get usage and cost data
POST   /api/llm/compare                - Compare providers for sample conversation
```

### Error Handling & Fallback
```typescript
async function generateWithFallback(request: GenerateRequest, config: LLMConfig) {
  let attempt = 0;
  while (attempt < config.fallback.retryAttempts) {
    try {
      return await primaryProvider.generate(request);
    } catch (error) {
      attempt++;
      if (error.isRateLimit && config.fallback.enabled) {
        // Try fallback provider
        return await fallbackProvider.generate(request);
      }
      if (attempt >= config.fallback.retryAttempts) throw error;
      await sleep(exponentialBackoff(attempt));
    }
  }
}
```

## Acceptance Criteria

### AC-001: Provider Selection
- Given I am in project settings, I can select from all supported providers
- When I select a provider, available models are displayed
- Provider information (cost, speed, capabilities) is clearly shown
- Changing provider updates model dropdown with provider-specific models

### AC-002: Model Configuration
- Given I select a model, I can configure temperature, max tokens, and top_p
- Parameter changes are validated (e.g., temperature between 0-2)
- Configuration is saved and applied to new conversations
- Existing conversations continue with their original model

### AC-003: API Key Management
- Given I choose BYOK, I can enter and save my API key securely
- API key is validated before saving
- Invalid keys show clear error messages
- Keys are encrypted in database

### AC-004: Provider Switching
- Given I switch providers, new conversations use new provider
- Knowledge base embeddings are regenerated if required
- No data loss occurs during provider switch
- Switch completes within 30 seconds for standard projects

### AC-005: Cost Tracking
- Given I have conversations, usage and cost are tracked per conversation
- Dashboard shows total spend by provider and model
- Cost projections are accurate within 5% of actual
- Cost comparison shows savings with alternative providers

### AC-006: Fallback Functionality
- Given primary provider fails, fallback provider is used automatically
- User is notified of provider switch in conversation
- Fallback usage is tracked separately in analytics
- Fallback configuration can be disabled

### AC-007: Performance Monitoring
- Given multiple conversations, response times are tracked per provider
- Dashboard shows average response time by provider and model
- Error rates are displayed with breakdown by error type
- Performance data is used for provider recommendations

## Out of Scope (V4+)
- Fine-tuned model support
- Multi-model ensemble (combining multiple models)
- Custom model hosting
- Provider-specific advanced features (e.g., GPT-4 Vision for image generation)
- Automatic model selection based on query type
- Training custom Llama models

## Success Metrics
- Percentage of users trying multiple providers
- Provider preference distribution across all projects
- Cost savings achieved through provider optimization
- User satisfaction by provider (CSAT correlation)
- Fallback activation rate and success rate

## Questions & Decisions
- **Q**: Should we support fine-tuned models?
  - **A**: V4 feature, requires additional infrastructure

- **Q**: How to handle provider-specific features (e.g., GPT Vision)?
  - **A**: Show feature availability in UI, disable if provider doesn't support

- **Q**: Default provider for new projects?
  - **A**: Claude 3.5 Sonnet (best balance of quality and cost)

- **Q**: Support for self-hosted Llama?
  - **A**: Yes, via Ollama or custom endpoint configuration

## References
- [Anthropic API Documentation](https://docs.anthropic.com)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Llama Model Documentation](https://llama.meta.com)
- [Roadmap: V3 Advanced Features](/docs/product/roadmap.md)
